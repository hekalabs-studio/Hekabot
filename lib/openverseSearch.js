const axios = require("axios");

/**
 * Unduh gambar menjadi Buffer agar aman dikirim oleh Baileys
 */
async function getImageBuffer(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });
    return Buffer.from(res.data);
  } catch (e) {
    return null;
  }
}

/**
 * Fitur Pencarian Openverse (Gratis, No API Key, Bebas Limiting)
 */
async function searchOpenverse(query) {
  try {
    const response = await axios.get("https://api.openverse.org/v1/images/", {
      params: {
        q: query,
        page_size: 20,
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const results = response.data?.results;

    if (results && results.length > 0) {
      // Ambil URL gambar langsung dari hasil Openverse
      const urls = results
        .map((item) => item.url)
        .filter((url) => typeof url === "string" && url.startsWith("http"));

      return urls;
    }
  } catch (error) {
    console.error("[Openverse Error]:", error.message);
  }

  return [];
}

module.exports = { searchOpenverse, getImageBuffer };