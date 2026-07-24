const axios = require("axios");

/**
 * Cari lirik lagu via lyrics.ovh (gratis, tanpa key).
 * Format input WAJIB "Artis - Judul" karena API-nya butuh dua field terpisah.
 * Catatan hak cipta: hasil DIBATASI cuma cuplikan pendek, bukan lirik lengkap.
 */
async function searchLyrics(artist, title) {
  const res = await axios.get(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
    { timeout: 20000 }
  );
  const fullLyrics = res.data?.lyrics;
  if (!fullLyrics) return null;
  const snippet = fullLyrics.trim().split("\n").slice(0, 4).join("\n");
  return { snippet, isTruncated: fullLyrics.trim().split("\n").length > 4 };
}

module.exports = { searchLyrics };
