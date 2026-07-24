const axios = require("axios");
const FormData = require("form-data");

// Beberapa host suka nolak request yang User-Agent-nya kelihatan seperti bot (axios default),
// makanya kita pura-pura jadi browser biasa.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Download URL jadi Buffer */
async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: { "User-Agent": BROWSER_UA },
  });
  return Buffer.from(res.data);
}

async function uploadCatbox(buffer, filename) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, filename);

  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: { ...form.getHeaders(), "User-Agent": BROWSER_UA },
    timeout: 120000,
  });

  const link = String(res.data).trim();
  if (!link.startsWith("http")) throw new Error("Respon catbox gak berupa link: " + link);
  return link;
}

async function uploadTmpfiles(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, filename);

  const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
    headers: { ...form.getHeaders(), "User-Agent": BROWSER_UA },
    timeout: 120000,
  });

  const url = res.data && res.data.data && res.data.data.url;
  if (!url) throw new Error("Respon tmpfiles gak berupa link.");
  // tmpfiles.org butuh "/dl/" di URL-nya biar jadi direct-download link
  return url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}

async function upload0x0(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, filename);

  const res = await axios.post("https://0x0.st", form, {
    headers: { ...form.getHeaders(), "User-Agent": BROWSER_UA },
    timeout: 120000,
  });

  const link = String(res.data).trim();
  if (!link.startsWith("http")) throw new Error("Respon 0x0.st gak berupa link: " + link);
  return link;
}

/**
 * Upload buffer ke hosting file gratis (tanpa API key), dipakai fitur `tourl`
 * dan converter yang butuh link publik (todocx/toexcel/topptx).
 * Coba catbox dulu, kalau gagal (kena block/rate-limit/dsb) otomatis lanjut ke host cadangan.
 */
async function uploadToCatbox(buffer, filename = "file") {
  const attempts = [
    ["catbox.moe", uploadCatbox],
    ["tmpfiles.org", uploadTmpfiles],
    ["0x0.st", upload0x0],
  ];

  const errors = [];
  for (const [hostName, fn] of attempts) {
    try {
      return await fn(buffer, filename);
    } catch (err) {
      errors.push(`${hostName}: ${err.message}`);
    }
  }

  throw new Error("Semua host upload gagal.\n" + errors.join("\n"));
}

module.exports = { downloadBuffer, uploadToCatbox };
