const axios = require("axios");

/**
 * Cari gambar berdasarkan kata kunci pakai Openverse API (api.openverse.org).
 * Ini API RESMI (bukan scraping), gratis, tanpa API key. Sumbernya dari Flickr,
 * Wikimedia, museum, dll -- bukan Pinterest asli (Pinterest gak bisa di-scrape
 * karena datanya dimuat lewat JavaScript, bukan langsung di HTML halamannya).
 */
async function searchPinterest(query) {
  const res = await axios.get("https://api.openverse.org/v1/images/", {
    params: { q: query, page_size: 2 },
    timeout: 20000,
    headers: { "User-Agent": "HekaBot/1.0" },
  });
  const results = res.data?.results || [];
  return results.map((r) => r.url).filter(Boolean).slice(0, 2);
}

module.exports = { searchPinterest };
