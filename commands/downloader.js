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
// Scribd & SlideShare — BUKAN lewat apiGet/siputzx (situsnya sekarang diproteksi ketat,
// gak ada JSON API publik yang beneran jalan buat ini -- lihat README bagian relevan).
// Alih-alih pura-pura bisa download langsung padahal gak bisa dijamin, command ini nyusunin
// link siap-pakai ke tool downloader pihak ketiga yang emang didedikasikan khusus buat
// platform ini dan masih aktif jalan. User tinggal buka link-nya & klik tombol download.
// ============================================================

function scribdLinkCommand(name) {
  return {
    name,
    run: async ({ args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link dokumen Scribd-nya juga ya.\nContoh: *${name} https://www.scribd.com/document/123456/Judul-Dokumen*`);

      // Terima subdomain apa aja (www., id., ga ada subdomain, dll), asal path-nya salah satu
      // dari /document/, /doc/, atau /presentation/ -- itu yang didukung tool downloader-nya.
      const match = link.match(/^https?:\/\/(?:[a-z0-9-]+\.)?scribd\.com(\/(?:document|doc|presentation)\/.+)$/i);
      if (!match) {
        return reply(
          "Link ini kelihatannya bukan link dokumen Scribd yang valid.\n" +
          "Formatnya harus /document/, /doc/, atau /presentation/ — contoh:\n" +
          "https://www.scribd.com/document/123456/Judul-Dokumen"
        );
      }

      const downloaderUrl = `https://www.scribd.vdownloaders.com${match[1]}`;
      await reply(
        `📄 *Scribd Downloader*\n\n` +
        `Scribd sekarang diproteksi ketat, jadi bot gak bisa langsung ambilin file-nya ke chat. ` +
        `Tapi ini link siap-pakai ke tool downloader gratis (bukan bikinan HekaBot, tapi masih aktif):\n\n` +
        `${downloaderUrl}\n\n` +
        `Tinggal buka link-nya, klik tombol *"Get Download Now"* di halaman itu.`
      );
    },
  };
}

function slideshareLinkCommand(name) {
  return {
    name,
    run: async ({ args, text, reply }) => {
      const link = getLink(args, text);
      if (!link) return reply(`Kirim link SlideShare-nya juga ya.\nContoh: *${name} https://www.slideshare.net/slideshow/judul/123456*`);

      if (!/^https?:\/\/(?:[a-z0-9-]+\.)?slideshare\.net\//i.test(link)) {
        return reply("Link ini kelihatannya bukan link SlideShare yang valid.");
      }

      const downloaderUrl = `https://downslides.com/en/?url=${encodeURIComponent(link)}`;
      await reply(
        `📊 *SlideShare Downloader*\n\n` +
        `SlideShare sekarang bagian dari Scribd dan diproteksi ketat juga, jadi bot gak bisa langsung ambilin file-nya ke chat. ` +
        `Tapi ini link ke tool downloader gratis (bukan bikinan HekaBot, tapi masih aktif):\n\n` +
        `${downloaderUrl}\n\n` +
        `Kalau link SlideShare-nya belum otomatis keisi di sana, tinggal tempel manual, terus klik Download.`
      );
    },
  };
}

// ============================================================
// YouTube (play/play2/ytmp3/ytmp4) — LOKAL via yt-dlp
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
  ytdlpVideoCommand("igdl", ["instagramdl"]), // catatan: post foto-only Instagram mungkin gak ke-grab, yt-dlp fokus video/reels
  ytdlpVideoCommand("pinterestdl"),
  ytdlpVideoCommand("threads"),
  ytdlpAudioCommand("ttmp3"),
  ytdlpVideoCommand("ttmp4"),
  ytdlpVideoCommand("ttslide"), // catatan: TikTok slideshow/foto, hasil bisa bervariasi
  ytdlpVideoCommand("twitter", ["xdl"]),
  playCommand("play"),
  playCommand("play2"),
  ytmp3Command(),
  ytmp4Command(),

  // --- Masih via API siputzx (yt-dlp gak cover platform ini) ---
  videoCommand("capcutdl", "capcutdl"),
  imageCommand("telesticker", "telesticker"),

  // --- Link-out ke tool downloader pihak ketiga (Scribd/SlideShare gak ada API publik) ---
  scribdLinkCommand("scribddl"),
  slideshareLinkCommand("slidesharedl"),
];
