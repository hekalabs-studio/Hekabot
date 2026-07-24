const config = require("../config");
const { resolveBinary } = require("./binaries");

// wa-sticker-formatter (dan sharp/webpmux di dalamnya) di-load LAZY, supaya kalau
// gak didukung di platform ini (misal Termux/Android), yang gagal cuma fitur sticker,
// bukan bikin SELURUH BOT gagal start.
let _StickerLib;
function getStickerLib() {
  if (_StickerLib === undefined) {
    try {
      _StickerLib = require("wa-sticker-formatter");

      // Supaya wa-sticker-formatter (butuh ffmpeg buat sticker dari video/GIF) nemu ffmpeg
      // yang udah kita taruh di folder bin/ lokal, bukan cuma andalin PATH sistem.
      try {
        const ffmpegPath = resolveBinary("ffmpeg");
        if (ffmpegPath && ffmpegPath !== "ffmpeg") {
          require("fluent-ffmpeg").setFfmpegPath(ffmpegPath);
        }
      } catch {
        // gak masalah kalau gagal -- fallback ke PATH sistem
      }
    } catch {
      _StickerLib = null;
    }
  }
  if (!_StickerLib) {
    throw new Error(
      "Fitur sticker butuh 'wa-sticker-formatter' (+ sharp) yang gak didukung di platform ini " +
      "(kemungkinan Termux/Android). Jalankan fitur ini di komputer biasa, bukan Termux."
    );
  }
  return _StickerLib;
}

/**
 * Ubah gambar/video/GIF jadi WhatsApp sticker (webp) dengan pack & author di-set (EXIF).
 * @param {Buffer} buffer
 * @param {{pack?: string, author?: string}} opts
 */
async function makeSticker(buffer, opts = {}) {
  const { Sticker, StickerTypes } = getStickerLib();
  const sticker = new Sticker(buffer, {
    pack: opts.pack || config.botName,
    author: opts.author || config.ownerName,
    type: StickerTypes.FULL,
    quality: 70,
  });
  return sticker.toBuffer();
}

module.exports = { makeSticker };
