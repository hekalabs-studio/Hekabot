// Auto-loader & registrar untuk file font kustom (termasuk font emoji) di assets/fonts.
//
// Kenapa dibutuhin: font teks biasa (Arial dkk) itu default udah ada di semua OS, tapi buat
// nampilin GAMBAR emoji dengan benar, canvas butuh font emoji khusus yang terdaftar di sistem
// rendering (skia, yang dipakai @napi-rs/canvas). Kalau gak ada font emoji yang terdaftar dengan
// BENAR, canvas bakal nampilin kotak kosong ("tofu") -- atau, di Windows/Mac, diam-diam malah
// pakai font emoji BAWAAN OS (Segoe UI Emoji di Windows, Apple Color Emoji di Mac) walaupun kamu
// udah taruh font emoji sendiri (misal Noto) di assets/fonts. Itu kejadian sebelumnya: scan
// "cari family yang namanya mengandung emoji" ke-tabrak sama font emoji bawaan Windows yang juga
// otomatis ke-detect duluan oleh @napi-rs/canvas.
//
// Makanya sekarang font di assets/fonts yang namanya mengandung "emoji" didaftarkan dengan ALIAS
// TETAP ("HekaBratEmoji"), bukan dicari lewat nama family aslinya. Ini bikin bot SELALU pakai
// persis file yang kamu taruh sendiri di assets/fonts, apapun OS-nya dan apapun font emoji bawaan
// sistemnya -- gak akan ketimpa/ke-ambil sama font emoji punya OS lagi.
//
// PENTING: file font emoji-nya sendiri (misalnya NotoColorEmoji.ttf) HARUS ada namanya
// mengandung kata "emoji" (huruf besar/kecil bebas) supaya kedetect sebagai font emoji.
//
// Cara ganti font emoji:
//   1. Download font emoji lain yang kamu punya izin pakai (lihat README.md di folder ini).
//   2. Ganti/timpa file yang namanya mengandung "emoji" di assets/fonts/.
//   3. Restart bot -- otomatis ke-load ulang, gak perlu ubah kode apa pun lagi.
const fs = require("fs");
const path = require("path");
const { GlobalFonts } = require("@napi-rs/canvas");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");

// Alias tetap buat font emoji kita sendiri -- SENGAJA bukan nama family asli font-nya, biar gak
// pernah ketabrak/ketimpa sama font emoji bawaan OS (Segoe UI Emoji, Apple Color Emoji, dll) yang
// juga otomatis kedetect oleh @napi-rs/canvas di beberapa OS.
const EMOJI_FONT_ALIAS = "HekaBratEmoji";

let registered = false;
let emojiFamily = null;

/** Scan folder (termasuk subfolder) buat cari semua file font (.ttf/.otf/.ttc). */
function scanFontFiles(dir) {
  let results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanFontFiles(full));
    } else if (/\.(ttf|otf|ttc)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
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
      `Taruh file font emoji (nama filenya harus mengandung kata "emoji") di situ kalau mau ` +
      `emoji tampil bergambar, bukan kotak.`
    );
    return { count: 0, emojiFamily: null };
  }

  const files = scanFontFiles(FONTS_DIR);
  let count = 0;

  for (const file of files) {
    const isEmojiFile = /emoji/i.test(path.basename(file));
    try {
      // Font emoji kita sendiri: paksa pakai alias tetap, biar gak pernah ketabrak sama font
      // emoji bawaan OS. Font lain (kalau ada): register normal pakai nama family asli mereka.
      const ok = isEmojiFile
        ? GlobalFonts.registerFromPath(file, EMOJI_FONT_ALIAS)
        : GlobalFonts.registerFromPath(file);

      if (ok) {
        count++;
        if (isEmojiFile) emojiFamily = EMOJI_FONT_ALIAS;
      } else {
        console.error(`[fontRegistry] Gagal register font: ${file}`);
      }
    } catch (err) {
      console.error(`[fontRegistry] Error register font ${file}:`, err.message || err);
    }
  }

  if (count > 0) {
    console.log(
      `[fontRegistry] ${count} font berhasil didaftarkan dari assets/fonts.` +
      (emojiFamily
        ? ` Font emoji terdeteksi (dari file kamu sendiri, bukan bawaan OS): "${emojiFamily}".`
        : ` Tidak ada file font emoji terdeteksi -- pastikan nama filenya mengandung kata "emoji" ` +
          `(contoh: NotoColorEmoji.ttf).`)
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

module.exports = { registerFonts, getEmojiFontFamily, FONTS_DIR, EMOJI_FONT_ALIAS };
