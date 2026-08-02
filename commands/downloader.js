const { apiGet } = require("../lib/api");
const { findUrls, findText } = require("../lib/extract");
const ytdlp = require("../lib/ytdlp");

function getLink(args, text) {
  const found = (args[0] || "").match(/^https?:\/\/\S+$/i);
  return found ? found[0] : (text.match(/https?:\/\/\S+/i) || [])[0];
}

/**
 * Pesan fallback kalau apiGet() balikin response tapi ternyata gak ada URL yang bisa diekstrak
 * (normalnya udah gak kejadian lagi sejak apiGet dipanggil pakai `{ requireUrl: true }` -- itu
 * bakal keburu lempar error yang lebih detail duluan. Ini cuma jaring pengaman.)
 */
function noUrlFoundMessage(name, res) {
  const snippet = typeof res === "object" ? JSON.stringify(res).slice(0, 300) : String(res).slice(0, 300);
  return (
    `Gagal ambil file dari *${name}* — API-nya merespons, tapi gak ketemu link file di dalam responnya.\n\n` +
    `Detail respons (buat didiagnosis): ${snippet}`
  );
}

// ============================================================
// LOKAL via yt-dlp (TikTok, Twitter/X, Facebook, Instagram, Pinterest, Threads)
// yt-dlp support 1700+ situs, jadi gak perlu API pihak ketiga buat ini.
// ============================================================

/** Command generik LOKAL: link -> yt-dlp -> kirim video */
function ytdlpVideoCommand(name, aliases = []) {
  return {
    name,
    aliases,
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link-nya juga ya.\nContoh: *${name} https://...*`);
      const { buffer, title } = await ytdlp.downloadVideo(link);
      await reply({ video: buffer, caption: title });
    },
  };
}

/** Command generik LOKAL: link -> yt-dlp -> ekstrak audio (mp3) */
function ytdlpAudioCommand(name, aliases = []) {
  return {
    name,
    aliases,
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link-nya juga ya.\nContoh: *${name} https://...*`);
      const { buffer, title } = await ytdlp.downloadAudio(link);
      await reply({ audio: buffer, mimetype: "audio/mpeg", fileName: `${title}.mp3` });
    },
  };
}

/**
 * Command generik LOKAL: link -> yt-dlp -> kirim SEMUA foto/slide (carousel Instagram,
 * slideshow/photo-mode TikTok) sebagai gambar terpisah, bukan video.
 */
function ytdlpImagesCommand(name, aliases = []) {
  return {
    name,
    aliases,
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link-nya juga ya.\nContoh: *${name} https://...*`);
      const { buffers, title } = await ytdlp.downloadImages(link);
      for (let i = 0; i < buffers.length; i++) {
        await reply({ image: buffers[i], caption: i === 0 ? title : undefined });
      }
    },
  };
}

// ============================================================
// Masih via API siputzx (yt-dlp gak support platform ini: CapCut export,
// RedNote/Xiaohongshu, Scribd, SlideShare, Spotify [DRM], Telegram sticker, Terabox)
// ============================================================

function videoCommand(name, endpointKey, aliases = []) {
  return {
    name,
    aliases,
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link-nya juga ya.\nContoh: *${name} https://...*`);
      const res = await apiGet(endpointKey, { url: link }, { requireUrl: true });
      const urls = findUrls(res);
      if (!urls.length) return reply(noUrlFoundMessage(name, res));
      const caption = findText(res) || `Diunduh via ${name}`;
      await reply({ video: { url: urls[0] }, caption });
    },
  };
}

function imageCommand(name, endpointKey, aliases = []) {
  return {
    name,
    aliases,
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link-nya juga ya.\nContoh: *${name} https://...*`);
      const res = await apiGet(endpointKey, { url: link }, { requireUrl: true });
      const urls = findUrls(res).slice(0, 10);
      if (!urls.length) return reply(noUrlFoundMessage(name, res));
      for (const u of urls) await reply({ image: { url: u } });
    },
  };
}

// ============================================================
// YouTube (play/ytmp3/ytmp4) — LOKAL via yt-dlp
// ============================================================

function playCommand(name) {
  return {
    name,
    run: async ({ jid, sock, text, reply }) => {
      if (!text) return reply(`Ketik judul lagu/videonya (atau link YouTube).\nContoh: *${name} Tulus - Hati-hati di Jalan*`);
      const { buffer, title } = await ytdlp.downloadAudio(text);
      await reply({ audio: buffer, mimetype: "audio/mpeg", fileName: `${title}.mp3` });
    },
  };
}

function ytmp3Command() {
  return {
    name: "ytmp3",
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply("Kirim link YouTube-nya juga ya.\nContoh: *ytmp3 https://youtu.be/...*");
      const { buffer, title } = await ytdlp.downloadAudio(link);
      await reply({ audio: buffer, mimetype: "audio/mpeg", fileName: `${title}.mp3` });
    },
  };
}

function ytmp4Command() {
  return {
    name: "ytmp4",
    run: async ({ jid, sock, args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply("Kirim link YouTube-nya juga ya.\nContoh: *ytmp4 https://youtu.be/...*");
      const { buffer, title } = await ytdlp.downloadVideo(link);
      await reply({ video: buffer, caption: title });
    },
  };
}

module.exports = [
  // --- LOKAL via yt-dlp ---
  ytdlpVideoCommand("fbdl", ["facebookdl"]),
  ytdlpVideoCommand("igdl", ["instagramdl"]), // video/reels Instagram -- buat post foto/carousel pakai .igslide
  ytdlpImagesCommand("igslide", ["instagramslide", "igcarousel"]), // foto/carousel Instagram
  ytdlpVideoCommand("pinterestdl"),
  ytdlpVideoCommand("threads"),
  ytdlpAudioCommand("ttmp3"),
  ytdlpVideoCommand("ttmp4"),
  ytdlpImagesCommand("ttslide", ["tiktokslide"]), // slideshow/photo-mode TikTok (foto, bukan video)
  ytdlpVideoCommand("twitter", ["xdl"]),
  playCommand("play"),
  ytmp3Command(),
  ytmp4Command(),

  // --- Masih via API siputzx (yt-dlp gak cover platform ini) ---
  videoCommand("capcutdl", "capcutdl"),
  imageCommand("telesticker", "telesticker"),
];
