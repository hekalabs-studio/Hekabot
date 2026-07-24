const { createWorker } = require("tesseract.js");

/**
 * Baca teks dari gambar secara LOKAL pakai tesseract.js (OCR engine open-source).
 * Support Bahasa Indonesia + Inggris sekaligus.
 * Catatan: run PERTAMA KALI butuh internet sebentar buat download data bahasanya
 * (resmi dari project tesseract.js, bukan API misterius) — setelah itu ke-cache.
 */
async function recognizeText(inputBuffer) {
  const worker = await createWorker("ind+eng");
  try {
    const { data } = await worker.recognize(inputBuffer);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

module.exports = { recognizeText };
