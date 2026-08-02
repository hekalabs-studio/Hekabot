const { Boom } = require("@hapi/boom");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const NodeCache = require("node-cache");
const config = require("./config");
const { handleMessage } = require("./handler");
const { getText } = require("./lib/media");
const { handleGroupUpdate } = require("./lib/groupEvents");
const { logSpecs } = require("./lib/systemSpecs");

// ==== LOG PERSISTEN KE FILE ====
// SEBELUMNYA: semua log (console.log biasa DAN log Baileys/pino) cuma tampil di layar
// terminal, gak pernah ditulis ke disk. Begitu terminal di-scroll/ke-clear/ditutup,
// log-nya HILANG PERMANEN -- jadi kalau ada laporan "pesan X gak diproses" beberapa jam
// setelahnya, gak ada cara verifikasi penyebabnya (pesan gak pernah nyampe ke bot, atau
// nyampe tapi gagal dibales) karena bukti log-nya udah kebuang.
// Fix: tulis SEMUA log (baileys + console.log/error/warn) ke file di folder logs/,
// satu file per kali bot di-start (nama file pakai timestamp startup), SELAIN tetap
// tampil di terminal seperti biasa. File lama gak ketimpa/kehapus otomatis --
// hapus manual sendiri kalau folder logs/ udah kebesaran.
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFileName = `bot-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
const logFilePath = path.join(logsDir, logFileName);
const logFileStream = fs.createWriteStream(logFilePath, { flags: "a" });
console.log(`📝 Log sesi ini juga disimpen ke: ${logFilePath}`);

// Tee console.log/warn/error: tetap tampil di terminal SEPERTI BIASA, tapi sekarang juga
// ditulis ke file di atas dengan timestamp. Gak perlu ubah satupun console.log/error yang
// udah ada di file lain (handler.js, dll) -- ini nge-patch sekali di titik pusat.
for (const level of ["log", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    original(...args);
    const line = args
      .map((a) => (typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
      .join(" ");
    logFileStream.write(`[${new Date().toISOString()}] [${level}] ${line}\n`);
  };
}

const logger = pino({
  level: "warn",
  hooks: {
    // Baileys nge-log "unexpected error in 'init queries'" (level ERROR, JSON gede + stack trace
    // lengkap) tiap kali query internal fetchProps/fetchBlocklist/fetchPrivacySettings gak dapet
    // balesan dari server WhatsApp dalam waktu yang ditentuin (defaultQueryTimeoutMs) abis baru
    // connect. INI SUDAH DIKONFIRMASI HARMLESS -- banyak dilaporkan pengguna Baileys lain juga
    // (termasuk versi2 lama library-nya), dan TIDAK ngaruh ke koneksi maupun fungsi bot (bot tetap
    // connect & jalan normal, chat/command tetap diproses seperti biasa). Daripada nampilin JSON
    // error+stack-trace segede itu tiap kali kejadian (bikin kesan bot crash/error serius padahal
    // bukan), di sini di-downgrade jadi satu baris info singkat yang jelas & gak bikin panik.
    logMethod(inputArgs, method) {
      const msg = inputArgs[inputArgs.length - 1];
      if (typeof msg === "string" && msg.startsWith("unexpected error in 'init queries'")) {
        return method.call(
          this,
          "ℹ️  [baileys] Query internal 'init queries' gak dapet balesan WhatsApp tepat waktu -- ini NORMAL, sering kejadian abis baru connect, dan gak ngaruh ke bot (bisa diabaikan)."
        );
      }
      return method.apply(this, inputArgs);
    },
  },
}, pino.multistream([
  { stream: process.stdout }, // tetap tampil di terminal seperti biasa
  { stream: logFileStream },  // DAN ditulis ke file persisten yang sama kayak console.* di atas
])); // "silent" nyembunyiin SEMUA log baileys termasuk error penting
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

// ==== BACKOFF RECONNECT ====
// Dipakai buat ngitung berapa kali GAGAL KONEK BERTURUT-TURUT (bukan cuma disconnect biasa
// abis udah pernah konek sukses). Kalau gagal berturut-turut, jeda sebelum coba lagi makin
// lama (bukan diem 5 detik doang tiap kali) -- soalnya nembak reconnect rapat-rapat ke server
// WhatsApp pas lagi bermasalah bisa bikin akunnya makin dicurigain sebagai bot/otomatisasi.
let consecutiveFailures = 0;

async function startBot() {
  logSpecs(); // log spek device + mode performa (auto/low/high) yang kepilih

  // Log konfirmasi config.js yang KEBACA SAAT INI (bukan versi lama yang mungkin masih
  // "nyangkut" di proses lama yang belum di-restart). config.js cuma dibaca SEKALI pas bot
  // start -- kalau kamu edit file config.js (misal nambah bannedWords) SETELAH bot udah
  // jalan, perubahannya BARU kepakai kalau bot di-stop (Ctrl+C) terus dijalanin ulang.
  // Kalau angka di bawah ini beda dari yang kamu kira, itu tandanya bot belum restart.
  console.log(
    `📋 Kata terlarang termuat: ${config.bannedWords?.length ?? 0} entri dari config.js`
  );
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
  // === FIX buat error "405 Connection Failure" ===
  // Ini bug lagi di Baileys sendiri (dilaporkan banyak orang, per pertengahan 2026 belum ada
  // fix resmi): versi WhatsApp Web yang di-fetch OTOMATIS lewat fetchLatestBaileysVersion()
  // kadang justru versi yang lagi DITOLAK server WhatsApp, jadi konek gagal terus sebelum
  // sempat nampilin QR. Workaround yang kebukti kerja buat banyak orang: PIN versi manual
  // lewat config.waVersion, bukan pakai hasil fetch otomatis.
  // Kalau config.waVersion dikosongin (null), fallback ke cara lama (fetch otomatis).
  const version = config.waVersion || (await fetchLatestBaileysVersion()).version;
  console.log(`   Pakai versi WhatsApp Web: ${version.join(".")}${config.waVersion ? " (pinned manual)" : " (auto-fetch)"}`);

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
      const errorMsg = lastDisconnect?.error?.message || "(gak ada pesan error)";
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      // Nama-nama reason code Baileys, biar log-nya kebaca manusia (bukan cuma angka doang)
      const reasonNames = {
        [DisconnectReason.badSession]: "badSession (401) -- session korup, biasanya perlu scan ulang QR",
        [DisconnectReason.connectionClosed]: "connectionClosed (428) -- koneksi ditutup, biasanya sementara",
        [DisconnectReason.connectionLost]: "connectionLost (408) -- koneksi ke server WA putus, biasanya sementara/internet",
        [DisconnectReason.connectionReplaced]: "connectionReplaced (440) -- akun WA dipakai buka sesi LAIN di tempat lain (misal WA Web/device lain login pakai sesi yang sama), bot ke-kick",
        [DisconnectReason.loggedOut]: "loggedOut (401) -- akun di-unlink/logout dari WhatsApp, HARUS scan QR ulang",
        [DisconnectReason.restartRequired]: "restartRequired (515) -- normal, biasanya cuma sekali abis konek pertama kali",
        [DisconnectReason.timedOut]: "timedOut (408) -- koneksi timeout, biasanya sementara/internet lambat",
        [DisconnectReason.multideviceMismatch]: "multideviceMismatch (411) -- versi Baileys gak cocok/kadaluarsa, coba update baileys",
        [DisconnectReason.forbidden]: "forbidden (403) -- WhatsApp nolak koneksi, bisa jadi akun kena batasan/flag dari WA",
        405: "405 Connection Failure -- server WhatsApp nolak koneksi dari awal (SEBELUM sempat login/QR). " +
          "Ini bug yang lagi dilaporin banyak orang ke Baileys (belum ada fix resmi dari mereka per skrip ini dibuat). " +
          "Coba: pastiin config.waVersion keisi, coba jaringan lain (hotspot HP), atau tunggu beberapa jam.",
      };
      const reasonLabel = reasonNames[statusCode] || `kode ${statusCode} (gak dikenali)`;

      console.log(`Koneksi terputus. Alasan: ${reasonLabel}`);
      console.log(`   Detail error: ${errorMsg}`);

      if (!shouldReconnect) {
        console.log("Logout, hapus folder session lalu jalankan ulang.");
        return;
      }

      if (statusCode === DisconnectReason.restartRequired) {
        // Normal, biasanya cuma sekali abis konek pertama kali -- gak dihitung sebagai kegagalan.
        console.log("Menyambung ulang...");
        startBot();
        return;
      }

      // Belum pernah konek sukses / gagal lagi setelah sempat sukses -> hitung sebagai kegagalan
      // beruntun, dan jeda sebelum reconnect MAKIN LAMA tiap gagal lagi (bukan diem 5 detik terus
      // menerus tanpa henti) -- biar gak dianggap otomatisasi mencurigakan sama WhatsApp kalau
      // penyebabnya emang lagi ada masalah beneran (misal bug 405 di atas).
      consecutiveFailures++;
      const MAX_AUTO_RETRIES = 6;
      if (consecutiveFailures > MAX_AUTO_RETRIES) {
        console.log(
          `\n⛔ Udah gagal konek ${consecutiveFailures}x berturut-turut. Bot BERHENTI nyoba otomatis dulu, ` +
          "biar akun WA-nya gak makin dicurigain WhatsApp gara-gara nembak reconnect terus-terusan.\n" +
          "   Cek dulu penyebabnya (lihat 'Alasan' di atas), baru jalankan ulang manual (npm start) kalau udah kebenerin.\n"
        );
        return;
      }
      const reconnectDelayMs = Math.min(5_000 * 2 ** (consecutiveFailures - 1), 5 * 60_000); // 5s, 10s, 20s, ... maks 5 menit
      console.log(`   Percobaan ke-${consecutiveFailures}/${MAX_AUTO_RETRIES}. Nyambung ulang dalam ${Math.round(reconnectDelayMs / 1000)} detik...`);
      setTimeout(startBot, reconnectDelayMs);
    } else if (connection === "open") {
      consecutiveFailures = 0; // reset -- udah konek sukses lagi
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

  // PENTING: sock.sendMessage() di reply() (lihat handler.js) bisa aja RESOLVE sukses
  // (dari sisi bot, pesannya "berhasil dikirim ke server") padahal SERVER WhatsApp
  // sebenarnya NOLAK pesan itu belakangan -- penolakan ini baru nongol lewat event
  // "messages.update" (bukan lewat promise reject), makanya sebelumnya diem-diam gak
  // kelihatan sama sekali di log. Paling sering kejadian: kode 463 ("reach-out time-lock"),
  // sebuah pembatasan dari SERVER WHATSAPP SENDIRI (biasanya kena di akun yang pernah
  // dibanned/di-unban, atau nomor yang belum "dipanaskan") -- BUKAN bug di kode bot ini,
  // dan sampai skrip ini dibuat pun Baileys masih investigasi resmi soal ini
  // (github.com/WhiskeySockets/Baileys/issues/2441).
  sock.ev.on("messages.update", (updates) => {
    for (const { key, update } of updates) {
      const stubParams = update?.messageStubParameters;
      if (!Array.isArray(stubParams) || !stubParams[0]) continue;
      const [code, desc] = stubParams;
      if (code === "463") {
        console.error(
          `\n⚠️  [ack] Balasan ke ${key.remoteJid} (id pesan=${key.id}) DITOLAK server WhatsApp, kode 463` +
          (desc ? ` ("${desc}")` : "") + `.\n` +
          `    Ini BUKAN bug di kode bot -- ini pembatasan "reach-out time-lock" dari server WhatsApp sendiri,\n` +
          `    paling sering kena di akun yang PERNAH di-banned/di-unban, atau nomor baru yang belum\n` +
          `    "dipanaskan" (jarang dipakai chat manual sebelumnya). Kalau sering muncul:\n` +
          `    1) Jangan kirim pesan ke banyak nomor asing berbeda dalam waktu singkat.\n` +
          `    2) Pastikan @whiskeysockets/baileys dipakai versi terbaru (npm update @whiskeysockets/baileys).\n` +
          `    3) Kalau nomor bot ini emang pernah kena pembatasan WhatsApp, mungkin perlu nunggu beberapa\n` +
          `       hari, atau coba pakai nomor lain yang lebih "bersih" riwayatnya.\n`
        );
      } else {
        console.warn(`[ack] Update status pesan ${key.id} ke ${key.remoteJid}: kode=${code}${desc ? ` ("${desc}")` : ""}`);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // LOG DULU sebelum difilter apa pun -- biar kalau ada batch yang "hilang" tanpa jejak,
    // ketahuan jelas dari sini apakah penyebabnya type-nya bukan "notify" (misal history sync
    // pas bot reconnect -- Baileys suka ngirim ulang pesan lama dengan type "append"/"replace",
    // BUKAN pesan baru beneran, jadi memang sengaja gak diproses/dibales) atau sebab lain.
    if (type !== "notify") {
      console.log(
        `[upsert] batch DILEWATIN karena type="${type}" (bukan "notify", biasanya history sync pas reconnect) -- berisi ${messages.length} pesan, id=[${messages.map((m) => m?.key?.id).join(", ")}]`
      );
      return;
    }

    // PENTING: Baileys kadang ngirim LEBIH DARI SATU pesan sekaligus dalam satu event ini
    // (misal kirim beberapa command cepat berturut-turut/bersamaan). Sebelumnya di sini cuma
    // ambil messages[0] doang, jadi pesan lain di batch yang sama ke-skip/gak diproses sama sekali.
    //
    // Antrean/pembatasan command sekarang ditangani di handler.js (bukan di sini lagi), karena
    // di sana baru ketahuan suatu command itu "berat" atau "ringan" (butuh parsing dulu).
    // Command ringan selalu langsung diproses di sini (gak nunggu apa-apa). Command berat
    // diatur giliran + dibatasi jumlahnya PER PENGIRIM oleh handler.js sendiri.
    // LOG DIAGNOSTIK: nyatet SETIAP pesan yang beneran nyampe dari Baileys, sebelum diproses
    // apa-apa. Ini buat mastiin kalau ada command yang "gak dijawab" pas bareng2, apa pesannya
    // emang gak pernah sampai ke bot sama sekali (berarti masalah di sesi WhatsApp/Baileys,
    // BUKAN di kode bot) atau pesannya sampai tapi macet di suatu tempat pas diproses.
    // Kalau semua pesan yang dikirim user muncul di log ini dengan id BEDA-BEDA tapi ada yang
    // gak pernah kelar diproses/dibales, baru itu tandanya ada bug beneran di kode. Kalau ada
    // pesan yang KELIATAN dikirim user tapi TIDAK PERNAH muncul sama sekali di log ini,
    // berarti WhatsApp/Baileys sendiri yang gak nerusin pesannya ke bot (di luar kendali kode ini).
    console.log(
      `[upsert] batch berisi ${messages.length} pesan${messages.length > 1 ? " (>1 pesan bareng satu event!)" : ""}`
    );
    for (const m of messages) {
      const from = m?.key?.participant || m?.key?.remoteJid || "?";
      const preview = getText(m).slice(0, 60).replace(/\n/g, " ") || "(non-teks)";
      if (!m?.message || m.key.fromMe) {
        console.log(`[upsert] lewatin pesan id=${m?.key?.id} dari=${from} (fromMe atau kosong)`);
        continue;
      }
      console.log(`[upsert] terima pesan id=${m.key.id} dari=${from} teks="${preview}"`);
      handleMessage(sock, m)
        .then(() => console.log(`[upsert] selesai proses id=${m.key.id}`))
        .catch((err) => console.error(`[upsert] Error saat handle message id=${m.key.id}:`, err));
    }
  });

  return sock;
}

startBot().catch((err) => console.error("Gagal start bot:", err));
