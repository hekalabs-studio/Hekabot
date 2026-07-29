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
    else job.resolve(Buffer.from(msg.buffer));
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
    pending.set(id, { resolve, reject });
    w.postMessage({ id, text, options });
  });
}

module.exports = { makeBratImageAsync };
