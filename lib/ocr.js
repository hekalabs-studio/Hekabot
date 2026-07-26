const { createWorker } = require("tesseract.js");

/**
 * Worker Tesseract di-reuse antar pemanggilan (bukan bikin worker baru + `terminate()`
 * tiap kali dipanggil kayak sebelumnya). Yang paling berat/lambat dari OCR ini justru
 * proses INIT worker-nya (load engine + data bahasa ind+eng), bukan proses recognize-nya
 * sendiri -- jadi kalau bikin ulang tiap request, tiap panggilan `.ocr` kebuang-buang
 * waktu/CPU buat load ulang hal yang sama.
 *
 * Worker otomatis dimatikan sendiri kalau nganggur cukup lama, biar gak nahan RAM
 * terus-terusan pas fitur ini gak lagi dipakai.
 */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit nganggur -> worker dimatiin otomatis

let workerPromise = null;
let idleTimer = null;

function scheduleIdleShutdown() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const pending = workerPromise;
    workerPromise = null;
    idleTimer = null;
    try {
      const worker = await pending;
      await worker.terminate();
    } catch {
      // worker kemungkinan udah gagal/mati duluan -- aman diabaikan
    }
  }, IDLE_TIMEOUT_MS);
  idleTimer.unref?.(); // timer housekeeping doang, jangan sampai nahan proses Node biar gak exit
}

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("ind+eng");
  }
  return workerPromise;
}

/**
 * Baca teks dari gambar secara LOKAL pakai tesseract.js (OCR engine open-source).
 * Support Bahasa Indonesia + Inggris sekaligus.
 * Catatan: run PERTAMA KALI butuh internet sebentar buat download data bahasanya
 * (resmi dari project tesseract.js, bukan API misterius) — setelah itu ke-cache.
 */
async function recognizeText(inputBuffer) {
  if (idleTimer) clearTimeout(idleTimer); // lagi dipakai, batalin dulu rencana shutdown-nya

  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(inputBuffer);
    return data.text.trim();
  } catch (err) {
    // Worker kemungkinan korup/ke-terminate di tengah jalan -- buang instance-nya biar
    // panggilan berikutnya bikin worker baru yang fresh, bukan kepake terus yang rusak.
    workerPromise = null;
    throw err;
  } finally {
    scheduleIdleShutdown();
  }
}

module.exports = { recognizeText };
