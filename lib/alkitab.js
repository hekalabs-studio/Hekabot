const axios = require("axios");

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ambil ayat Alkitab dari SABDA (alkitab.sabda.org) berdasarkan referensi (mis. "Yohanes 3:16").
 * Catatan: sumber ini bukan JSON resmi, jadi hasilnya di-parse dari HTML -- bisa berubah sewaktu-waktu.
 */
async function getVerse(reference) {
  const res = await axios.get(`http://alkitab.sabda.org/api/passage/${encodeURIComponent(reference)}`, {
    timeout: 20000,
  });
  const text = stripHtml(String(res.data));
  if (!text || text.length < 5) return null;
  return text.slice(0, 2000);
}

module.exports = { getVerse };
