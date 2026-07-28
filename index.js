const { Boom } = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const qrcode = require("qrcode-terminal");
const NodeCache = require("node-cache");
const config = require("./config");
const { handleMessage } = require("./handler");
const { handleGroupUpdate } = require("./lib/groupEvents");
const { logSpecs } = require("./lib/systemSpecs");

const logger = pino({ level: "warn" }); // "silent" nyembunyiin SEMUA log baileys termasuk error penting
// (misal gagal dekripsi pesan dari sender tertentu, sesi putus, dll) -- "warn" nampilin
// yang penting-penting aja (warning + error) tanpa berisik kayak "info"/"debug".

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

  // Dipakai Baileys buat nyimpen HITUNGAN percobaan "retry receipt" (minta kirim ulang
  // pesan yang gagal di-dekripsi, misal error "No session found to decrypt message" --
  // ini kejadian normal kalau sesi enkripsi ke pengirim tertentu belum "matang", paling
  // sering abis bot baru restart). Tanpa cache ini, mekanisme retry bawaan Baileys kurang
  // konsisten. INI GAK BIKIN 0% GAGAL TOTAL -- protokol enkripsinya sendiri emang gitu --
  // tapi bikin bot lebih andal minta+dapet kiriman ulang otomatis dari HP pengirim.
  const msgRetryCounterCache = new NodeCache();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // kita cetak QR manual pakai qrcode-terminal biar lebih rapi
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    generateHighQualityLinkPreview: true,
    // Default bawaan Baileys keburu abis buat beberapa query internal (misal fetchProps pas
    // baru connect) kalau koneksinya agak lambat -- muncul sebagai "Timed Out (init queries)"
    // di log walau sebenarnya gak ngaruh ke fungsi bot (bot tetap connect & jalan normal).
    // Dinaikin ke 90 detik biar query itu dikasih waktu lebih longgar, jadi log-nya bersih.
    defaultQueryTimeoutMs: 90_000,
    msgRetryCounterCache,
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
    //
    // Antrean/pembatasan command sekarang ditangani di handler.js (bukan di sini lagi), karena
    // di sana baru ketahuan suatu command itu "berat" atau "ringan" (butuh parsing dulu).
    // Command ringan selalu langsung diproses di sini (gak nunggu apa-apa). Command berat
    // diatur giliran + dibatasi jumlahnya PER PENGIRIM oleh handler.js sendiri.
    for (const m of messages) {
      if (!m?.message || m.key.fromMe) continue;
      handleMessage(sock, m).catch((err) => console.error("Error saat handle message:", err));
    }
  });

  return sock;
}

startBot().catch((err) => console.error("Gagal start bot:", err));
