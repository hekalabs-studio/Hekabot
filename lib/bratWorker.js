// Worker thread KHUSUS buat ngerender gambar .brat (DAN, sejak baru-baru ini, emoji tunggal
// buat command lain kayak .smeme -- lihat lib/bratCanvas.js: renderEmojiGlyph()). Dijalanin di
// THREAD TERPISAH dari bot utama, biar proses canvas yang sinkron/nge-blok itu gak bikin bot
// utama freeze pas lagi ada command lain (dari user manapun) yang masuk bebarengan.
const { parentPort } = require("worker_threads");
const { makeBratImage, renderEmojiGlyph } = require("./bratCanvas");

parentPort.on("message", async (job) => {
  const { id, type, text, options, emoji, size } = job;
  try {
    const buffer =
      type === "emoji" ? renderEmojiGlyph(emoji, size) : await makeBratImage(text, options);
    parentPort.postMessage({ id, buffer });
  } catch (err) {
    parentPort.postMessage({ id, error: err.message || String(err) });
  }
});
