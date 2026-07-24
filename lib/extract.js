/**
 * API publik gratis sering punya struktur response beda-beda
 * (ada yang { data: { url } }, ada { result: [...] }, ada { data: { download: { url } } } dll).
 * Fungsi ini "menyelam" ke dalam object/array secara rekursif dan mengambil
 * semua string yang berbentuk URL, supaya command tetap jalan walau strukturnya beda-beda.
 */
function findUrls(obj, depth = 0) {
  const found = [];
  if (depth > 6 || obj === null || obj === undefined) return found;

  if (typeof obj === "string") {
    if (/^https?:\/\/\S+$/i.test(obj.trim())) found.push(obj.trim());
    return found;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) found.push(...findUrls(item, depth + 1));
    return found;
  }

  if (typeof obj === "object") {
    // prioritaskan key yang umum dipakai untuk url media
    const priorityKeys = ["url", "download", "downloadUrl", "download_url", "link", "media", "mp3", "mp4", "audio", "video", "image", "hd", "no_watermark", "nowm"];
    const keys = Object.keys(obj).sort((a, b) => {
      const ai = priorityKeys.indexOf(a);
      const bi = priorityKeys.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    for (const key of keys) found.push(...findUrls(obj[key], depth + 1));
    return found;
  }

  return found;
}

/** Ambil URL pertama (paling relevan) dari response API */
function firstUrl(response) {
  const urls = findUrls(response);
  return urls.length ? urls[0] : null;
}

/** Ambil teks caption/judul kalau ada (title, caption, description, text) */
function findText(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== "object") return null;
  const textKeys = ["title", "caption", "description", "text", "desc"];
  for (const key of textKeys) {
    if (typeof obj[key] === "string" && obj[key].trim()) return obj[key].trim();
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      const res = findText(obj[key], depth + 1);
      if (res) return res;
    }
  }
  return null;
}

module.exports = { findUrls, firstUrl, findText };
