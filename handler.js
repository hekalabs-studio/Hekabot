const config = require("./config");
const { buildMenu, buildCategoryMenu, resolveMenuAlias } = require("./lib/menu");
const { buildHelpText } = require("./lib/help");
const { getText } = require("./lib/media");
const { getSession, checkAnswer, endSession } = require("./lib/gameSession");
const { getBannerPath } = require("./lib/banner");
const downloaderCommands = require("./commands/downloader");
const toolsCommands = require("./commands/tools");
const converterCommands = require("./commands/converter");
const stickerCommands = require("./commands/sticker");
const funCommands = require("./commands/fun");
const gameCommands = require("./commands/game");
const aiCommands = require("./commands/ai");
const solveCommands = require("./commands/solve");
const internetCommands = require("./commands/internet");
const authCommands = require("./commands/auth");
const mainCommands = require("./commands/main");
const groupCommands = require("./commands/group");
const { askGemini } = require("./lib/gemini");
const { isRegistered } = require("./lib/userStore");
const { isOwner } = require("./lib/owner");
const { isLowSpec, isRamCritical, getFreeRamPercent } = require("./lib/systemSpecs");
const { containsBannedWord } = require("./lib/moderation");

// Command yang tetap bisa dipakai walau belum daftar
const EXEMPT_COMMANDS = ["menu", "help", "daftar", "register", "signup", "profil", "profile", "akun"];

/** Cek apakah pengirim adalah admin di grup tempat pesan ini dikirim */
async function isGroupAdmin(sock, jid, senderJid) {
  if (!jid.endsWith("@g.us")) return false;
  try {
    const meta = await sock.groupMetadata(jid);
    const participant = meta.participants.find((p) => p.id === senderJid);
    return participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {
    return false;
  }
}

// Gabungkan semua command jadi satu Map: nama -> handler
const allCommands = new Map();
for (const cmd of [
  ...downloaderCommands,
  ...toolsCommands,
  ...converterCommands,
  ...stickerCommands,
  ...funCommands,
  ...gameCommands,
  ...aiCommands,
  ...solveCommands,
  ...internetCommands,
  ...authCommands,
  ...mainCommands,
  ...groupCommands,
]) {
  allCommands.set(cmd.name.toLowerCase(), cmd);
  for (const alias of cmd.aliases || []) allCommands.set(alias.toLowerCase(), cmd);
}

// Penjaga anti-duplikat: kadang WhatsApp/Baileys ngirim ulang event pesan yang SAMA PERSIS
// (misal abis reconnect/re-sync), yang kalau gak dijaga bisa bikin 1 command asli diproses 2x
// dan hasilnya keluar dobel. Simpen id pesan yang baru diproses, buang otomatis setelah 2 menit.
const recentlyProcessed = new Map();
function isDuplicateMessage(messageId) {
  if (!messageId) return false;
  const now = Date.now();
  for (const [id, ts] of recentlyProcessed) {
    if (now - ts > 2 * 60 * 1000) recentlyProcessed.delete(id);
  }
  if (recentlyProcessed.has(messageId)) {
    console.log(`[dedup] pesan id=${messageId} dianggap DUPLIKAT, gak diproses ulang.`);
    return true;
  }
  recentlyProcessed.set(messageId, now);
  return false;
}

// ==== ANTREAN + LIMIT KHUSUS COMMAND BERAT (per-pengirim) ====
// Command RINGAN gak lewat sini sama sekali -- selalu langsung diproses kapanpun, walau
// pengirim yang sama lagi punya command berat yang jalan/ngantre.
// Command BERAT dari orang yang SAMA tetap diproses satu-satu/runtut (gak boleh dobel jalan
// bareng, biar gak numpuk pemakaian RAM/CPU dari 1 orang), TAPI dibatasi maksimal
// MAX_HEAVY_PENDING (jalan + ngantre digabung) dalam satu waktu. Kalau kelebihan, langsung
// ditolak dengan pesan suruh nunggu -- BUKAN ikut masuk antrean tanpa batas.
const MAX_HEAVY_PENDING = 3;
const heavyState = new Map(); // senderJid -> { pending: number, queue: Promise<void> }

function runHeavy(senderJid, task) {
  const state = heavyState.get(senderJid) || { pending: 0, queue: Promise.resolve() };
  state.pending += 1;
  heavyState.set(senderJid, state);
  const finished = state.queue.then(task, task).finally(() => {
    state.pending -= 1;
    if (state.pending <= 0) heavyState.delete(senderJid); // beresin memori kalau udah kosong
  });
  state.queue = finished.catch(() => {}); // chain lanjut jalan walau task sebelumnya gagal
  return finished;
}

function parseCommand(text) {
  const prefix = config.prefix || "";
  if (prefix && !text.startsWith(prefix)) return null;
  const body = prefix ? text.slice(prefix.length) : text;
  const [cmdRaw, ...rest] = body.trim().split(/\s+/);
  if (!cmdRaw) return null;
  return { cmd: cmdRaw.toLowerCase(), args: rest, text: rest.join(" ") };
}

async function handleMessage(sock, m) {
  if (isDuplicateMessage(m.key?.id)) return; // pesan yang sama udah pernah diproses, skip

  const text = getText(m).trim();
  if (!text) return;

  const jid = m.key.remoteJid;
  // Di grup, pengirim asli ada di `participant`; di chat pribadi sama aja dengan `jid`.
  const senderJid = m.key.participant || jid;
  // PENTING: reply() dipakai di 70+ tempat (semua file di commands/) dan kebanyakan TIDAK
  // di-await/di-catch di pemanggilnya (fire-and-forget). Kalau sock.sendMessage() reject
  // (misal koneksi lagi lemot/timeout karena ping tinggi, socket putus, dsb) dan tidak ada
  // yang nangkep, itu jadi "unhandled promise rejection". Di Node.js versi >=15, default-nya
  // itu langsung MEMATIKAN seluruh proses bot (bukan cuma command yang gagal doang) --
  // makanya bot bisa keliatan "centang tapi abis itu diem selamanya" tanpa error jelas di layar.
  // Perbaikannya cukup di SATU titik pusat ini: reply() sendiri yang nangkep errornya,
  // jadi promise yang dikembalikan ke pemanggil manapun (di-await atau tidak) tidak akan
  // pernah reject/unhandled lagi.
  // reply() sekarang retry SATU KALI sebelum nyerah kalau pengiriman gagal (misal socket lagi
  // timeout/error sesaat -- kayak kejadian "Timed Out"/"stream errored out" yang sering nongol
  // pas koneksi WA lagi goyang). Kalau retry-nya juga gagal, baru dicatat sebagai gagal PERMANEN
  // dengan detail lengkap (jid, command asal, cuplikan isi balasan) -- biar kalau ada laporan
  // "kok gak dibales" lagi, tinggal grep "GAGAL KIRIM BALASAN" di file log/ dan langsung ketahuan
  // pesan mana yang kena, bukan nebak-nebak dari screenshot lagi.
  const reply = async (content, _isRetry = false) => {
    const payload = typeof content === "string" ? { text: content } : content;
    try {
      return await sock.sendMessage(jid, payload, { quoted: m });
    } catch (err) {
      if (!_isRetry) {
        console.warn(`[reply] Percobaan pertama gagal kirim ke ${jid} (id pesan asal=${m.key?.id}), retry sekali:`, err.message);
        await new Promise((r) => setTimeout(r, 1500));
        return reply(content, true);
      }
      const preview = typeof content === "string" ? content.slice(0, 120) : "(pesan non-teks/media)";
      console.error(
        `[reply] GAGAL KIRIM BALASAN (setelah retry) ke ${jid} untuk pesan asal id=${m.key?.id} teks-asal="${text.slice(0, 60)}": ${err.message} | draft balasan="${preview}"`
      );
      return null;
    }
  };

  const lower = text.toLowerCase();

  // === FILTER KATA TERLARANG ===
  // Jalan buat SEMUA pesan teks (command maupun obrolan biasa). Kalau config.bannedWords
  // kosong (default), fungsi containsBannedWord langsung return null dan blok ini gak ngapa2in,
  // jadi gak ada overhead sama sekali kalau fiturnya gak dipakai.
  const bannedWordHit = containsBannedWord(text, config.bannedWords);
  if (bannedWordHit) {
    const isGroup = jid.endsWith("@g.us");
    if (isGroup) {
      // Hapus untuk semua orang -- CUMA berhasil kalau bot berstatus ADMIN di grup ini
      // (dibatasi WhatsApp sendiri, bukan batasan kode kita). Kalau gagal (bot bukan admin,
      // atau sebab lain), kita tetap lanjut kirim peringatan teks di bawah -- jangan sampai
      // gagal hapus bikin bot diem total tanpa nindak apa-apa.
      try {
        await sock.sendMessage(jid, {
          delete: { remoteJid: jid, fromMe: false, id: m.key.id, participant: senderJid },
        });
      } catch (err) {
        console.error(`Gagal hapus pesan kata terlarang di ${jid} (kemungkinan bot bukan admin):`, err.message);
      }
      // SENGAJA gak pakai reply()/quoted -- pesannya udah dihapus, jadi kirim pemberitahuan
      // sebagai pesan BIASA (berdiri sendiri), bukan reply/quote ke pesan yang kena banned.
      await sock
        .sendMessage(jid, {
          text: `⚠️ @${senderJid.split("@")[0]} pesannya mengandung kata yang gak pantas dan sudah dihapus. Mohon jaga sopan santun di grup ya.`,
          mentions: [senderJid],
        })
        .catch((err) => console.error(`Gagal kirim pemberitahuan kata terlarang ke ${jid}:`, err.message));
    } else {
      // Di luar grup, WhatsApp SAMA SEKALI gak ngizinin hapus pesan orang lain -- apapun
      // statusnya. Paling cuma bisa dikasih peringatan teks -- tetap sebagai pesan biasa,
      // bukan reply/quote ke pesan yang kena banned.
      await sock
        .sendMessage(jid, { text: "⚠️ Tolong jangan pakai kata-kata kasar ya." })
        .catch((err) => console.error(`Gagal kirim pemberitahuan kata terlarang ke ${jid}:`, err.message));
    }
    return; // stop di sini, jangan lanjut proses command/AI-chat dari pesan yang kena filter ini
  }

  // "menu" tanpa prefix supaya gampang dipanggil -- kirim BANNER dengan caption daftar menu
  // (jadi satu pesan aja, bukan gambar + teks terpisah)
  if (["menu", `${config.prefix}menu`].includes(lower)) {
    const bannerPath = getBannerPath("banner_menu");
    if (bannerPath) {
      try {
        return await reply({ image: { url: bannerPath }, caption: buildMenu() });
      } catch (err) {
        console.error("Gagal kirim banner menu:", err.message);
        // fallback: kalau gambar gagal terkirim, tetep kirim teks menunya
        return reply(buildMenu());
      }
    }
    return reply(buildMenu());
  }

  // Menu per-kategori (misal "menudl" buat downloader, "menutl" buat tools) --
  // dicek baik dengan prefix maupun tanpa prefix, sama kayak "menu" biasa.
  const menuAliasCandidate =
    config.prefix && lower.startsWith(config.prefix) ? lower.slice(config.prefix.length) : lower;
  const menuCategory = resolveMenuAlias(menuAliasCandidate);
  if (menuCategory) {
    const bannerPath = getBannerPath("banner_menu");
    const categoryText = buildCategoryMenu(menuCategory.key);
    if (bannerPath) {
      try {
        return await reply({ image: { url: bannerPath }, caption: categoryText });
      } catch (err) {
        console.error("Gagal kirim banner menu kategori:", err.message);
        return reply(categoryText);
      }
    }
    return reply(categoryText);
  }

  // "help" tanpa prefix -- panduan pemakaian bot (beda dari menu)
  if (["help", `${config.prefix}help`].includes(lower)) {
    return reply(buildHelpText());
  }

  // Kalau ada game tebak-tebakan yang lagi aktif di chat ini, cek dulu apakah ini jawabannya
  // (jawaban gak pakai prefix, biar natural kayak jawab pertanyaan biasa)
  const activeSession = getSession(jid);
  const looksLikeCommand = config.prefix && text.startsWith(config.prefix);
  if (activeSession && !looksLikeCommand) {
    if (["nyerah", "give up", "skip"].includes(lower)) {
      endSession(jid);
      return reply(`Oke, nyerah ya. Jawabannya: *${activeSession.answer}*`);
    }
    const result = checkAnswer(jid, text);
    if (result?.correct) {
      endSession(jid);
      return reply(`✅ Benar! Jawabannya *${activeSession.answer}*`);
    }
    return; // jawaban salah, diemin aja biar gak spam chat
  }

  const parsed = parseCommand(text);
  if (!parsed) {
    // Bukan command sama sekali (gak ada prefix). Kalau auto-chat AI diaktifin
    // dan ini chat pribadi (bukan grup), lempar ke Gemini sebagai obrolan biasa.
    if (config.aiAutoChatPrivate && !jid.endsWith("@g.us") && config.geminiApiKey) {
      try {
        // Chat pribadi (bukan grup) -> jid = lawan bicara itu sendiri, jadi bisa langsung dicek isOwner.
        const systemPrompt = isOwner(jid) ? config.aiOwnerSystemPrompt : config.aiSystemPrompt;
        const answer = await askGemini(jid, text, systemPrompt);
        await reply(answer);
      } catch (err) {
        console.error("Error AI auto-chat:", err.message);
      }
    }
    return;
  }

  const command = allCommands.get(parsed.cmd);
  if (!command) return; // command tidak dikenal, diamkan (bisa diaktifkan pesan "command tidak ada" kalau mau)

  // Command "berat" (LibreOffice/ffmpeg video/model AI removebg&upscale dkk) dimatiin otomatis
  // kalau device server kedeteksi low-spec (lihat lib/systemSpecs.js + performanceMode di config.js),
  // biar RAM-nya gak kewalahan sampai bot nge-lag atau crash.
  if (command.heavy && isLowSpec) {
    return reply(
      `🐢 Command *${parsed.cmd}* butuh RAM/CPU lumayan besar, jadi dinonaktifkan otomatis di device ini ` +
      `(kedeteksi low-spec). Kalau device-nya sebenernya lebih kuat dari itu, owner bisa paksa nyalain ` +
      `lewat \`performanceMode: "high"\` di config.js.`
    );
  }

  // Command khusus owner
  if (command.ownerOnly && !isOwner(senderJid)) {
    console.log(`[owner-check] Ditolak. senderJid = "${senderJid}", ownerNumber di config.js = "${config.ownerNumber}"`);
    return reply("❌ Perintah ini hanya dapat digunakan oleh Owner.");
  }

  // Command khusus admin grup (owner bot tetap boleh, di grup manapun)
  if (command.groupAdminOnly && !isOwner(senderJid)) {
    if (!jid.endsWith("@g.us")) {
      return reply("🔒 Command ini cuma bisa dipakai di dalam grup.");
    }
    const admin = await isGroupAdmin(sock, jid, senderJid);
    if (!admin) {
      return reply("🔒 Command ini cuma bisa dipakai admin grup.");
    }
  }

  // Gate pendaftaran: command di luar daftar EXEMPT_COMMANDS wajib udah daftar dulu
  if (config.requireRegistration && !EXEMPT_COMMANDS.includes(parsed.cmd)) {
    if (!isRegistered(senderJid) && !isOwner(senderJid)) {
      return reply(
        "🔒 Kamu belum terdaftar. Daftar dulu ya sebelum bisa pakai fitur ini.\n\n" +
        "Format: *.daftar Nama Kamu*\nContoh: *.daftar Budi Santoso*"
      );
    }
  }

  // Jalanin command sebenarnya: react ⏳ (nandain lagi diproses) -> command.run() -> react ✅/❌.
  // Dipisah jadi fungsi sendiri karena dipanggil dari 2 jalur: langsung (command ringan)
  // atau lewat antrean runHeavy (command berat).
  const runCommand = async () => {
    const react = (emoji) =>
      sock.sendMessage(jid, { react: { text: emoji, key: m.key } }).catch((err) => {
        console.error(`[react] Gagal kirim react "${emoji}" ke ${jid} untuk pesan id=${m.key?.id}:`, err.message);
      });
    try {
      // PENTING: presence update ("mengetik...") sama react ⏳ ini cuma kosmetik, BUKAN
      // sesuatu yang command butuh buat bisa jalan. Sebelumnya dua-duanya di-`await` DULU
      // sebelum command.run() dipanggil -- artinya kalau salah satu SANGKUT (bukan error,
      // cuma gak pernah selesai/resolve, misal gara-gara koneksi WA lagi lag dikit), maka
      // command-nya SAMA SEKALI GAK PERNAH MULAI JALAN, padahal user udah kirim commandnya.
      // Ini kejadian ke SEMUA command (bukan cuma yang berat) karena semua command lewat sini.
      // Fix: jangan ditunggu (gak di-`await`) -- jalanin di background, command-nya langsung
      // eksekusi gak usah nunggu dua hal kosmetik ini beres duluan.
      sock.sendPresenceUpdate("composing", jid).catch(() => {});
      react("⏳"); // sengaja gak di-await
      await command.run({ sock, m, jid, args: parsed.args, text: parsed.text, reply });
      await react("✅"); // command sukses dijalankan
    } catch (err) {
      console.error(`Error di command "${parsed.cmd}":`, err.message);
      await react("❌"); // command gagal
      await reply(`❌ Gagal menjalankan *${parsed.cmd}*.\n${err.message}`);
    }
  };

  if (!command.heavy) {
    // Command ringan: SELALU langsung diproses, gak peduli pengirim ini lagi punya
    // command berat yang jalan/ngantre atau nggak.
    return runCommand();
  }

  // Command berat: cek dulu apa pengirim ini udah kena limit (jalan + ngantre digabung).
  const state = heavyState.get(senderJid);
  if (state && state.pending >= MAX_HEAVY_PENDING) {
    return reply(
      `⏳ Kamu masih punya ${state.pending} command berat yang lagi jalan/ngantre ` +
      `(maksimal ${MAX_HEAVY_PENDING} bersamaan). Tunggu salah satu selesai dulu ya baru kirim command berat lagi.\n` +
      `Command ringan lain (menu, brat, dll) tetap bisa kamu pakai kok selagi nunggu.`
    );
  }

  // Cek RAM device SAAT INI JUGA -- ini beda dari limit di atas (yang ngitung punya SATU orang).
  // Ini ngecek RAM SELURUH device, jadi bisa nolak walau si pengirim belum kena limit
  // personalnya sendiri, misal kondisinya RAM lagi penuh gara-gara banyak ORANG LAIN yang
  // numpuk command berat bersamaan. Tujuannya: kasih tau user daripada bot jadi lemot/nge-hang
  // diam-diam kalau dipaksa proses terus, dan biar mereka gak spam ngirim ulang command yang sama.
  if (isRamCritical()) {
    return reply(
      `🧠 RAM device lagi penuh (cuma tersisa ~${getFreeRamPercent().toFixed(0)}% kosong). ` +
      `Tunggu proses yang lagi jalan selesai dulu ya, baru coba lagi -- biar bot-nya gak makin berat/nge-hang.`
    );
  }

  return runHeavy(senderJid, runCommand);
}

module.exports = { handleMessage, allCommands };
