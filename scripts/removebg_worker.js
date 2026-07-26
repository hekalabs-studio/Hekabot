// Script ini SENGAJA dijalanin sebagai proses Node TERPISAH (bukan di-require langsung ke bot),
// karena @imgly/background-removal-node muat model AI ke memory proses yang manggil dia dan gak
// pernah dilepas lagi selama proses itu hidup. Kalau fungsi ini di-require langsung di proses utama
// bot, RAM yang kepake bakal nyangkut permanen walau fitur removebg cuma dipanggil sekali doang.
// Dengan dijadiin proses terpisah, begitu proses ini `exit`, SEMUA memory-nya (termasuk model AI)
// otomatis dikembaliin ke OS -- proses utama bot gak kebawa-bawa sama sekali.
const fs = require("fs");

async function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: node removebg_worker.js <inputPath> <outputPath>");
    process.exit(1);
  }

  const { removeBackground } = require("@imgly/background-removal-node");

  const inputBuffer = fs.readFileSync(inputPath);
  const mime = detectMime(inputBuffer);
  const blob = new Blob([inputBuffer], { type: mime });

  const resultBlob = await removeBackground(blob);
  const arrayBuffer = await resultBlob.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
}

/** Deteksi mime type gambar dari magic bytes di awal buffer */
function detectMime(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "image/jpeg";
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
