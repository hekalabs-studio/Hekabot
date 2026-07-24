const axios = require("axios");

/** Ambil file ID dari berbagai format link Google Drive */
function extractFileId(url) {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Download file dari Google Drive LANGSUNG (pakai URL resmi Google), tanpa API pihak ketiga.
 * Hanya bekerja untuk file yang share setting-nya "Anyone with the link".
 */
async function downloadDriveFile(url) {
  const id = extractFileId(url);
  if (!id) throw new Error("Link Google Drive tidak valid/tidak dikenali.");

  const directUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  let res = await axios.get(directUrl, { responseType: "arraybuffer", maxRedirects: 5 });

  const contentType = res.headers["content-type"] || "";
  // File besar: Google kasih halaman konfirmasi "virus scan warning" dulu, bukan langsung file-nya
  if (contentType.includes("text/html")) {
    const html = Buffer.from(res.data).toString("utf8");
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/) || html.match(/name="confirm"\s+value="([0-9A-Za-z_-]+)"/);
    if (confirmMatch) {
      const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${id}`;
      res = await axios.get(confirmUrl, { responseType: "arraybuffer", maxRedirects: 5 });
    } else {
      throw new Error("File tidak bisa diakses. Pastikan setting share-nya \"Anyone with the link\", atau file terlalu besar/private.");
    }
  }

  return Buffer.from(res.data);
}

module.exports = { downloadDriveFile, extractFileId };
