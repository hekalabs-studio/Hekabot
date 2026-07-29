// Auto-loader & registrar untuk file font kustom (termasuk font emoji) di assets/fonts.
//
// Kenapa dibutuhin: font teks biasa (Arial dkk) itu default udah ada di semua OS, tapi buat
// nampilin GAMBAR emoji dengan benar, canvas butuh font emoji khusus yang terdaftar di sistem
// rendering (skia, yang dipakai @napi-rs/canvas). Kalau gak ada font emoji yang terdaftar,
// canvas bakal nampilin kotak kosong ("tofu") atau karakter acak buat emoji.
//
// PENTING: file font emoji-nya sendiri (misalnya NotoColorEmoji.ttf atau TwemojiMozilla.ttf)
// HARUS didownload manual dan ditaruh di folder assets/fonts -- file itu binary berukuran besar
// (~10-25MB) jadi gak bisa/gak pantas ikut di-generate di sini. Kalau folder ini kosong, teks
// biasa tetep jalan normal, cuma emoji-nya aja yang bakal tofu/kotak kayak sebelumnya.
//
// Cara pakai:
//   1. Download salah satu font emoji, misalnya:
//      - Twemoji Mozilla (COLR, ringan, hasil bagus di skia): https://github.com/mozilla/twemoji-colr/releases
//      - Noto Color Emoji: https://github.com/googlefonts/noto-emoji/releases (cari file .ttf)
//   2. Taruh file .ttf/.otf/.ttc hasil download itu di folder assets/fonts/ (bikin sendiri
//      foldernya kalau belum ada -- kode ini juga otomatis bikin foldernya kalau belum ada).
//   3. Restart bot. Semua font di assets/fonts otomatis ke-load & ke-register, gak perlu ubah
//      kode apa pun lagi.
const fs = require("fs");
const path = require("path");
const { GlobalFonts } = require("@napi-rs/canvas");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");

let registered = false;
let emojiFamily = null;

/** Cari family font yang namanya mengandung kata "emoji" di antara semua font yang sudah terdaftar. */
function findEmojiFamily() {
  try {
    const families = GlobalFonts.families.map((f) => f.family);
    return families.find((f) => /emoji/i.test(f)) || null;
  } catch {
    return null;
  }
}

/**
 * Scan & register semua file font di assets/fonts (sekali saja per proses).
 * Aman dipanggil berkali-kali (panggilan kedua dst langsung no-op).
 */
function registerFonts() {
  if (registered) return { count: 0, emojiFamily };
  registered = true;

  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
    console.log(
      `[fontRegistry] Folder assets/fonts belum ada, sudah dibuatkan otomatis. ` +
      `Taruh file font emoji (.ttf/.otf) di situ kalau mau emoji tampil bergambar, bukan kotak.`
    );
    return { count: 0, emojiFamily: null };
  }

  let count = 0;
  try {
    count = GlobalFonts.loadFontsFromDir(FONTS_DIR);
  } catch (err) {
    console.error(`[fontRegistry] Gagal load font dari ${FONTS_DIR}:`, err.message || err);
  }

  emojiFamily = findEmojiFamily();

  if (count > 0) {
    console.log(
      `[fontRegistry] ${count} font berhasil didaftarkan dari assets/fonts.` +
      (emojiFamily
        ? ` Font emoji terdeteksi: "${emojiFamily}".`
        : ` Tidak ada font emoji terdeteksi (family font-nya harus mengandung kata "emoji" -- ` +
          `kalau nama family font kamu beda, ganti manual di lib/fontRegistry.js bagian findEmojiFamily).`)
    );
  } else {
    console.log(
      `[fontRegistry] Belum ada file font ditemukan di assets/fonts -- emoji bakal tampil ` +
      `kotak/tofu sampai file font emoji ditaruh di folder itu (lihat komentar di atas file ini).`
    );
  }

  return { count, emojiFamily };
}

/** Dapetin nama family font emoji yang aktif (null kalau belum ada font emoji terdaftar). */
function getEmojiFontFamily() {
  if (!registered) registerFonts();
  return emojiFamily;
}

module.exports = { registerFonts, getEmojiFontFamily, FONTS_DIR };
