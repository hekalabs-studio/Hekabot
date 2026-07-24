const axios = require("axios");

/**
 * Cari arti kata di KBBI (via typoonline.com, scraping HTML -- BUKAN API resmi).
 * Catatan: karena bergantung ke struktur halaman pihak ketiga, ini yang paling rawan
 * putus/berubah dibanding fitur lain. Kalau error, kasih tau dan sarankan cek manual
 * di kbbi.kemdikbud.go.id.
 */
async function getDefinition(word) {
  const res = await axios.get(`https://typoonline.com/kbbi/${encodeURIComponent(word.toLowerCase())}`, {
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = String(res.data);
  const match = html.match(/Definisi\/Arti kata[^<]*di Kamus Besar Bahasa Indonesia[^<]*adalah\s*([^<]+)/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim();
}

module.exports = { getDefinition };
