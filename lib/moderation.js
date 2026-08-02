// Deteksi kata terlarang dalam sebuah teks. Daftar katanya sendiri ADA DI config.js
// (config.bannedWords) -- file ini cuma logika deteksinya, biar daftar katanya gampang
// diedit sendiri tanpa perlu ngerti/nyentuh kode logikanya.
//
// Deteksi KATA UTUH aja (dipisah spasi/tanda baca/awal-akhir kalimat), BUKAN "kata itu
// nyempil di dalam kata lain". Misal kalau "gg" ada di daftar, itu bakal kena kalau ada
// kata "gg" berdiri sendiri, tapi TIDAK kena di kata "anggur" atau "tinggi" -- soalnya
// itu cuma potongan huruf yang kebetulan sama, bukan kata terlarang yang beneran diketik.
//
// === NORMALISASI ANTI-AKAL-AKALAN ===
// Anak-anak (atau siapa pun) yang mau ngakalin filter kata biasanya pakai salah satu dari
// 3 trik ini. Sebelum dicek ke daftar kata, teksnya dinormalisasi dulu buat "membongkar"
// trik-trik itu -- jadi kamu GAK PERLU nulis manual tiap kombinasi angka/simbol/spasi lagi
// di config.js, cukup kata dasarnya aja:
//
//   1. Leetspeak / substitusi angka-simbol jadi huruf: k0nt0l -> kontol, j4nc0k -> jancok,
//      ng3nt0t -> ngentot, b4ngs4t -> bangsat, dst.
//   2. Huruf yang diulang-ulang buat "menyamarkan": goblokkk -> goblok, anjrrrit -> anjrit,
//      asuuuu -> asu.
//   3. Huruf yang dipisah satu-satu pakai spasi/tanda baca: "k o n t o l", "k.o.n.t.o.l",
//      "k_o_n_t_o_l" -> semua jadi "kontol".
//
// Catatan: normalisasi ini CUMA dipakai buat proses pengecekan internal -- pesan asli yang
// dikirim/ditampilkan ke orang lain sama sekali gak diubah/disentuh.

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Peta substitusi leetspeak umum yang dipakai di trik penulisan kata kasar Indonesia.
// Ambigu (misal "1" bisa berarti "i" atau "l") sengaja dipilih makna yang paling sering
// dipakai di kata-kata terlarang Indonesia (contoh: "b4b1" -> "babi", "b4j1ng4n" -> "bajingan").
const LEET_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "l",
  "+": "t",
};
const LEET_PATTERN = new RegExp(`[${Object.keys(LEET_MAP).map(escapeRegex).join("")}]`, "g");

function applyLeetspeak(str) {
  return str.replace(LEET_PATTERN, (ch) => LEET_MAP[ch] ?? ch);
}

// "goblokkk" -> "goblok", "asuuuu" -> "asu", "tololll" -> "tolol"
// PENTING: cuma nangkep 3+ huruf sama berturut-turut (jelas sengaja diulang buat nyamarin),
// BUKAN 2 huruf dobel biasa -- soalnya banyak kata (termasuk kata terlarang itu sendiri,
// misal "ass") yang emang aslinya punya huruf dobel. Kalau ambang batasnya cuma 2+, "ass"
// bakal ke-collapse jadi "as" dan ketuker nyangkut sama input tak bersalah kayak "A5"
// (yang lewat leetspeak "5"->"s" juga jadi "as").
function collapseRepeatedLetters(str) {
  return str.replace(/([a-z])\1{2,}/g, "$1");
}

// "k o n t o l" / "k.o.n.t.o.l" / "k_o_n_t_o_l" -> "kontol"
// Cuma dipicu kalau ada RANGKAIAN minimal 4 huruf yang masing-masing dipisah 1 karakter
// non-alfanumerik -- biar gak salah nangkep kalimat normal (misal "a, b, c" gak akan
// kena karena cuma 3 huruf lepas & bukan pola "dieja satu-satu" yang khas).
function collapseSpelledOutLetters(str) {
  return str.replace(/\b[a-z](?:[^a-z0-9]{1,2}[a-z]){3,}\b/g, (match) => match.replace(/[^a-z0-9]/g, ""));
}

/** Normalisasi teks buat keperluan pengecekan kata terlarang (bukan buat ditampilkan). */
function normalizeForModeration(text) {
  let s = text.toLowerCase();
  s = applyLeetspeak(s);
  s = collapseSpelledOutLetters(s);
  s = collapseRepeatedLetters(s);
  return s;
}

// === CACHE PATTERN, SUPAYA GAK DI-COMPILE ULANG TIAP PESAN ===
// Sebelumnya, tiap ada 1 pesan masuk (bukan cuma command -- SEMUA chat, karena filter ini
// jalan di semua pesan teks), containsBannedWord() bikin `new RegExp(...)` dari NOL buat
// SETIAP kata di config.bannedWords (bisa ratusan entri) -- padahal daftar katanya sendiri
// gak berubah-ubah selama bot jalan (config.js cuma dibaca sekali pas start, lihat catatan
// di index.js). Nge-compile ratusan regex per pesan itu kerjaan sia-sia yang keulang trus,
// dan bisa jadi beban CPU nyata kalau grup lagi rame (banyak pesan/detik).
//
// Fix: compile semua pattern SEKALI SAJA per array `bannedWords` yang dipakai (di-cache
// pakai WeakMap, key-nya referensi array-nya sendiri), lalu panggilan berikutnya tinggal
// pakai RegExp yang udah jadi -- gak bikin objek baru lagi. Kalau suatu saat ada mekanisme
// reload config tanpa restart (bikin array bannedWords baru), cache lama otomatis gak
// kepake lagi (WeakMap based on array reference), jadi tetap aman/gak nyangkut ke data basi.
const patternCache = new WeakMap(); // bannedWords (array) -> [{ original, regex }]

function getCompiledPatterns(bannedWords) {
  const cached = patternCache.get(bannedWords);
  if (cached) return cached;

  const compiled = [];
  for (const raw of bannedWords) {
    const original = (raw || "").toLowerCase().trim();
    if (!original) continue;

    // Normalisasi juga kata di daftarnya -- biar entry yang KAMU TULIS SENDIRI pakai
    // leetspeak/huruf ganda (misal "g0bl0k", "tololll") tetap match seperti biasa, sekaligus
    // otomatis "menyerap" variasi lain dari kata dasar yang sama tanpa perlu ditulis manual.
    const normalizedWord = normalizeForModeration(original);
    if (!normalizedWord) continue;

    // Batas kata: awal/akhir string, atau karakter non huruf-angka (spasi, tanda baca, emoji, dst)
    // di kedua sisinya -- biar "kata utuh", bukan potongan dari kata lain.
    const pattern = `(^|[^a-z0-9])${escapeRegex(normalizedWord)}([^a-z0-9]|$)`;
    compiled.push({ original, regex: new RegExp(pattern, "i") });
  }

  patternCache.set(bannedWords, compiled);
  return compiled;
}

/**
 * @param {string} text - teks pesan yang mau dicek
 * @param {string[]} bannedWords - daftar kata terlarang (dari config.js)
 * @returns {string|null} - kata terlarang pertama yang ketemu (huruf kecil, versi asli di
 *   config.js), atau null kalau bersih
 */
function containsBannedWord(text, bannedWords) {
  if (!text || !bannedWords || bannedWords.length === 0) return null;
  const normalized = normalizeForModeration(text);
  const patterns = getCompiledPatterns(bannedWords);

  for (const { original, regex } of patterns) {
    if (regex.test(normalized)) return original;
  }
  return null;
}

module.exports = { containsBannedWord, normalizeForModeration };
