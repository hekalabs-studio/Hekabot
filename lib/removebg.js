// Di-load LAZY, karena @imgly/background-removal-node (via onnxruntime-node) gak
// support Android/Termux sama sekali -- biar itu gak bikin seluruh bot gagal start.
let _removeBackground;
function getRemoveBackground() {
  if (_removeBackground === undefined) {
    try {
      _removeBackground = require("@imgly/background-removal-node").removeBackground;
    } catch {
      _removeBackground = null;
    }
  }
  if (!_removeBackground) {
    throw new Error(
      "Fitur ini butuh '@imgly/background-removal-node' yang gak didukung di platform ini " +
      "(kemungkinan Termux/Android, dependency-nya cuma ada buat Windows/Linux/Mac). " +
      "Jalankan fitur ini di komputer biasa, bukan Termux."
    );
  }
  return _removeBackground;
}

/** Deteksi mime type gambar dari magic bytes di awal buffer */
function detectMime(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "image/jpeg"; // fallback paling umum (WhatsApp biasanya kirim jpeg)
}

/**
 * Hapus background gambar secara LOKAL (AI jalan di komputer sendiri).
 * Catatan: run PERTAMA KALI butuh internet sebentar buat download model AI-nya
 * (resmi dari IMG.LY, bukan API misterius) — setelah itu ke-cache, jalan offline.
 */
async function removeBg(inputBuffer) {
  const removeBackground = getRemoveBackground();
  const mime = detectMime(inputBuffer);
  const blob = new Blob([inputBuffer], { type: mime });
  const resultBlob = await removeBackground(blob);
  const arrayBuffer = await resultBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { removeBg };
