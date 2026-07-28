// Deteksi kata terlarang dalam sebuah teks. Daftar katanya sendiri ADA DI config.js
// (config.bannedWords) -- file ini cuma logika deteksinya, biar daftar katanya gampang
// diedit sendiri tanpa perlu ngerti/nyentuh kode logikanya.
//
// Deteksi KATA UTUH aja (dipisah spasi/tanda baca/awal-akhir kalimat), BUKAN "kata itu
// nyempil di dalam kata lain". Misal kalau "gg" ada di daftar, itu bakal kena kalau ada
// kata "gg" berdiri sendiri, tapi TIDAK kena di kata "anggur" atau "tinggi" -- soalnya
// itu cuma potongan huruf yang kebetulan sama, bukan kata terlarang yang beneran diketik.

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} text - teks pesan yang mau dicek
 * @param {string[]} bannedWords - daftar kata terlarang (dari config.js)
 * @returns {string|null} - kata terlarang pertama yang ketemu (huruf kecil), atau null kalau bersih
 */
function containsBannedWord(text, bannedWords) {
  if (!text || !bannedWords || bannedWords.length === 0) return null;
  const normalized = text.toLowerCase();

  for (const raw of bannedWords) {
    const word = (raw || "").toLowerCase().trim();
    if (!word) continue;

    // Batas kata: awal/akhir string, atau karakter non huruf-angka (spasi, tanda baca, emoji, dst)
    // di kedua sisinya -- biar "kata utuh", bukan potongan dari kata lain.
    const pattern = `(^|[^a-z0-9])${escapeRegex(word)}([^a-z0-9]|$)`;
    if (new RegExp(pattern, "i").test(normalized)) {
      return word;
    }
  }
  return null;
}

module.exports = { containsBannedWord };
