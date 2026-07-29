// Worker thread KHUSUS buat ngerender gambar .brat. Dijalanin di THREAD TERPISAH dari bot
// utama, biar proses canvas yang sinkron/nge-blok itu gak bikin bot utama freeze pas lagi
// ada command lain (dari user manapun) yang masuk bebarengan.
const { parentPort } = require("worker_threads");
const { makeBratImage } = require("./bratCanvas");

parentPort.on("message", async (job) => {
  const { id, text, options } = job;
  try {
    const buffer = await makeBratImage(text, options);
    parentPort.postMessage({ id, buffer });
  } catch (err) {
    parentPort.postMessage({ id, error: err.message || String(err) });
  }
});
