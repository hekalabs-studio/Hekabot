const { Boom } = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const qrcode = require("qrcode-terminal");
const config = require("./config");
const { handleMessage } = require("./handler");
const { handleGroupUpdate } = require("./lib/groupEvents");
const { logSpecs } = require("./lib/systemSpecs");

const logger = pino({ level: "silent" }); // ganti "info" kalau mau lihat log detail baileys

// ==== JARING PENGAMAN GLOBAL ====
// Node.js versi >=15 DEFAULT-nya langsung mematikan seluruh proses kalau ada
// "unhandled promise rejection" (promise yang reject tapi gak ada .catch()/try-catch
// yang nangkep). Ini penyebab paling umum bot keliatan "diem/crash diam-diam" abis
// sebelumnya sempet jalan normal -- gak ada log jelas, proses cuma berhenti.
// reply() di handler.js udah dibenerin supaya gak lagi memicu ini, tapi jaring pengaman
// ini tetap dipasang di level proses biar promise LAIN (dari lib mana pun, sekarang atau
// yang ditambahin nanti) yang kelewat tanpa await/catch juga gak sampai mematikan bot --
// cuma di-log errornya, prosesnya tetap lanjut jalan.
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled promise rejection (bot tetap jalan):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception (bot tetap jalan):", err);
});

async function startBot() {
  logSpecs(); // log spek device + mode performa (auto/low/high) yang kepilih
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

  // Antrian per-(chat, pengirim): command BERUNTUN dari ORANG YANG SAMA di chat yang sama
  // tetap diproses urut (satu-satu, gak nabrak resource kayak ffmpeg/riwayat AI/game session
  // milik dia), TAPI command dari ORANG LAIN -- walau di GRUP YANG SAMA -- diproses PARALEL,
  // gak ikut ngantri.
  // CATATAN: sebelumnya kunci antrean cuma `jid` (id chat/grup) doang, bukan per-pengirim.
  // Akibatnya di grup, kalau 1 member ngirim command berat (misal .ttmp4 -- download+convert
  // video, lumayan lama), SEMUA member lain di grup itu yang ngirim command apapun -- termasuk
  // yang ringan kayak .menu/.brat -- ikut ketahan nunggu command berat itu selesai duluan,
  // karena somehow dianggap "chat yang sama" padahal pengirimnya beda orang. Sekarang tiap
  // pengirim punya antreannya sendiri-sendiri per chat, jadi command berat dari 1 orang gak lagi
  // memblokir orang lain.
  const chatQueues = new Map();
  function enqueue(queueKey, task) {
    const prev = chatQueues.get(queueKey) || Promise.resolve();
    const next = prev.then(task, task); // tetap lanjut walau task sebelumnya gagal
    chatQueues.set(queueKey, next.catch(() => {})); // simpen versi yang "settled" biar chain gak kebawa reject
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
      // Di grup, pengirim asli ada di `participant`; di chat pribadi sama aja dengan `jid`.
      const senderJid = m.key.participant || jid;
      const queueKey = `${jid}::${senderJid}`;
      enqueue(queueKey, async () => {
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
