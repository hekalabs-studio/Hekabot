// Wrapper buat manggil makeBratImage() TAPI lewat worker thread (lib/bratWorker.js), bukan
// langsung di main thread. Satu worker dipakai ulang terus (gak bikin worker baru tiap panggilan
// -- bikin worker itu sendiri ada overhead-nya), dan job-job yang masuk bareng otomatis diantre
// SAMA Node.js secara internal di dalam worker itu (satu-satu, gak saling nge-blok main thread bot).
const path = require("path");
const { Worker } = require("worker_threads");

let worker = null;
let jobIdCounter = 0;
const pending = new Map(); // id -> { resolve, reject }

function getWorker() {
  if (worker) return worker;

  worker = new Worker(path.join(__dirname, "bratWorker.js"));

  worker.on("message", (msg) => {
    const job = pending.get(msg.id);
    if (!job) return;
    pending.delete(msg.id);
    if (msg.error) job.reject(new Error(msg.error));
    else job.resolve(msg.result); // mentah -- interpretasinya (Buffer vs angka) diserahin ke masing-masing fungsi pemanggil di bawah
  });

  worker.on("error", (err) => {
    // Worker crash -> gagalin semua job yang lagi nunggu, terus reset biar worker baru
    // otomatis dibikin lagi pas ada panggilan berikutnya.
    for (const job of pending.values()) job.reject(err);
    pending.clear();
    worker = null;
  });

  worker.on("exit", () => {
    worker = null;
  });

  return worker;
}

/** Sama kayak makeBratImage() di bratCanvas.js, tapi jalan di worker thread terpisah. */
function makeBratImageAsync(text, options) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = ++jobIdCounter;
    pending.set(id, { resolve: (result) => resolve(Buffer.from(result)), reject });
    w.postMessage({ id, text, options });
  });
}

/**
 * Render 1 emoji doang (transparan) lewat worker yang SAMA (dipakai bareng sama .brat) --
 * dipakai buat nge-fix rendering emoji di .smeme (lib/textImage.js). Lihat renderEmojiGlyph()
 * di lib/bratCanvas.js buat penjelasan lengkap kenapa ini perlu jalan di worker thread (bukan
 * langsung di main thread bareng sharp).
 */
function renderEmojiGlyphAsync(emoji, size = 128) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = ++jobIdCounter;
    pending.set(id, { resolve: (result) => resolve(Buffer.from(result)), reject });
    w.postMessage({ id, type: "emoji", emoji, size });
  });
}

/**
 * Ukur lebar teks BENERAN (pixel) buat font Impact/Arial Black di ukuran fontSize tertentu --
 * dipakai buat nentuin posisi emoji yang presisi di .smeme (lihat measureText() di
 * lib/bratCanvas.js). Hasilnya ANGKA (bukan Buffer), beda dari 2 fungsi di atas.
 */
function measureTextAsync(text, fontSize) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = ++jobIdCounter;
    pending.set(id, { resolve, reject }); // langsung diteruskan apa adanya, gak usah dibungkus Buffer
    w.postMessage({ id, type: "measure", text, measureFontSize: fontSize });
  });
}

module.exports = { makeBratImageAsync, renderEmojiGlyphAsync, measureTextAsync };
