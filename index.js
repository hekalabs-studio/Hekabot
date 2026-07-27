const { Boom } = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const qrcode = require("qrcode-terminal");
const config = require("./config");
const { handleMessage } = require("./handler");
const { handleGroupUpdate } = require("./lib/groupEvents");

const logger = pino({ level: "silent" }); // ganti "info" kalau mau lihat log detail baileys

async function startBot() {
  // @whiskeysockets/baileys sekarang pure ESM, jadi harus di-import secara dinamis
  // walaupun project ini CommonJS.
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
  } = await import("@whiskeysockets/baileys");

  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, config.sessionPath.replace("./", ""))
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // kita cetak QR manual pakai qrcode-terminal biar lebih rapi
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ==== QR CODE ====
    if (qr) {
      console.log("\nScan QR code ini di WhatsApp > Perangkat Tertaut > Tautkan Perangkat:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Koneksi terputus.", shouldReconnect ? "Menyambung ulang..." : "Logout, hapus folder session lalu jalankan ulang.");
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log(`\n✅ ${config.botName} berhasil terhubung ke WhatsApp!\n`);
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    try {
      await handleGroupUpdate(sock, update);
    } catch (err) {
      console.error("Error handle group update:", err);
    }
  });

  // Antrian per-chat: command di chat YANG SAMA tetap diproses urut (satu-satu, gak nabrak
  // resource kayak ffmpeg/riwayat AI/game session), TAPI chat yang BEDA diproses PARALEL
  // -- gak saling nunggu. Sebelumnya semua pesan (lintas chat) diproses berurutan pakai satu
  // `await` di for-loop, jadi kalau ada 1 command yang lama (download/convert/ocr dll), semua
  // pesan lain yang masuk bersamaan dari chat lain ikut ketahan ngantri di belakangnya --
  // user ngerasa bot "diem aja" dan baru merespon kalau pesannya diulang/dikirim lagi.
  const chatQueues = new Map();
  function enqueue(jid, task) {
    const prev = chatQueues.get(jid) || Promise.resolve();
    const next = prev.then(task, task); // tetap lanjut walau task sebelumnya gagal
    chatQueues.set(jid, next.catch(() => {})); // simpen versi yang "settled" biar chain gak kebawa reject
    return next;
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    // PENTING: Baileys kadang ngirim LEBIH DARI SATU pesan sekaligus dalam satu event ini
    // (misal kirim beberapa command cepat berturut-turut/bersamaan). Sebelumnya di sini cuma
    // ambil messages[0] doang, jadi pesan lain di batch yang sama ke-skip/gak diproses sama sekali.
    for (const m of messages) {
      if (!m?.message || m.key.fromMe) continue;

      const jid = m.key.remoteJid;
      enqueue(jid, async () => {
        try {
          await handleMessage(sock, m);
        } catch (err) {
          console.error("Error saat handle message:", err);
        }
      });
    }
  });

  return sock;
}

startBot().catch((err) => console.error("Gagal start bot:", err));
