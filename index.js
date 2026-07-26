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

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    // PENTING: Baileys kadang ngirim LEBIH DARI SATU pesan sekaligus dalam satu event ini
    // (misal kirim beberapa command cepat berturut-turut/bersamaan). Sebelumnya di sini cuma
    // ambil messages[0] doang, jadi pesan lain di batch yang sama ke-skip/gak diproses sama sekali.
    // Diproses satu-satu (bukan Promise.all) biar urutannya tetap sesuai urutan masuk dan gak
    // saling rebutan resource (ffmpeg/riwayat AI/dst) di waktu yang sama.
    for (const m of messages) {
      if (!m?.message || m.key.fromMe) continue;

      try {
        await handleMessage(sock, m);
      } catch (err) {
        console.error("Error saat handle message:", err);
      }
    }
  });

  return sock;
}

startBot().catch((err) => console.error("Gagal start bot:", err));
