const config = require("./config");
const { buildMenu } = require("./lib/menu");
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
const internetCommands = require("./commands/internet");
const authCommands = require("./commands/auth");
const mainCommands = require("./commands/main");
const groupCommands = require("./commands/group");
const { askGemini } = require("./lib/gemini");
const { isRegistered } = require("./lib/userStore");
const { isOwner } = require("./lib/owner");

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
  ...internetCommands,
  ...authCommands,
  ...mainCommands,
  ...groupCommands,
]) {
  allCommands.set(cmd.name.toLowerCase(), cmd);
  for (const alias of cmd.aliases || []) allCommands.set(alias.toLowerCase(), cmd);
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
  const text = getText(m).trim();
  if (!text) return;

  const jid = m.key.remoteJid;
  const reply = (content) => sock.sendMessage(jid, typeof content === "string" ? { text: content } : content, { quoted: m });

  const lower = text.toLowerCase();

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
        const answer = await askGemini(jid, text);
        await reply(answer);
      } catch (err) {
        console.error("Error AI auto-chat:", err.message);
      }
    }
    return;
  }

  const command = allCommands.get(parsed.cmd);
  if (!command) return; // command tidak dikenal, diamkan (bisa diaktifkan pesan "command tidak ada" kalau mau)

  const senderJid = m.key.participant || m.key.remoteJid;

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
    if (!isRegistered(senderJid)) {
      return reply(
        "🔒 Kamu belum terdaftar. Daftar dulu ya sebelum bisa pakai fitur ini.\n\n" +
        "Format: *daftar Nama Kamu*\nContoh: *daftar Budi Santoso*"
      );
    }
  }

  try {
    await sock.sendPresenceUpdate("composing", jid);
    await command.run({ sock, m, jid, args: parsed.args, text: parsed.text, reply });
  } catch (err) {
    console.error(`Error di command "${parsed.cmd}":`, err.message);
    await reply(`❌ Gagal menjalankan *${parsed.cmd}*.\n${err.message}`);
  }
}

module.exports = { handleMessage, allCommands };
