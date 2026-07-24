const axios = require("axios");

// Wikimedia mewajibkan User-Agent yang jelas, request tanpa ini bakal ditolak (403)
const HEADERS = { "User-Agent": "HekaBot/1.0 (WhatsApp bot; contact: owner)" };

/** Cari artikel Wikipedia Bahasa Indonesia, ambil ringkasannya */
async function searchWikipedia(query) {
  const searchRes = await axios.get("https://id.wikipedia.org/w/api.php", {
    params: { action: "query", list: "search", srsearch: query, format: "json", srlimit: 1 },
    headers: HEADERS,
    timeout: 20000,
  });
  const hit = searchRes.data?.query?.search?.[0];
  if (!hit) return null;

  const summaryRes = await axios.get(
    `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`,
    { headers: HEADERS, timeout: 20000 }
  );
  const data = summaryRes.data;
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
  };
}

module.exports = { searchWikipedia };
