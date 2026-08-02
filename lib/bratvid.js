const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { makeBratImageAsync } = require("./bratCanvasAsync");
const { resolveBinary } = require("./binaries");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveBinary("ffmpeg"), args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error("FFmpeg gagal: " + stderr.slice(-500)))));
  });
}

/**
 * Bikin video pendek (mp4) yang nampilin teks "brat" muncul kata demi kata,
 * buat dijadiin sticker animasi (bratvid).
 */
async function makeBratVideo(text) {
  const words = String(text).trim().split(/\s+/);
  const id = crypto.randomBytes(6).toString("hex");
  const frameDir = path.join(TMP_DIR, `brat_${id}`);
  fs.mkdirSync(frameDir, { recursive: true });

  const steps = Math.max(words.length, 1);

  // === OPTIMASI: kirim SEMUA request render frame sekaligus (paralel), bukan satu-satu
  // nunggu satu selesai baru minta yang berikutnya ===
  // makeBratImageAsync() -> lib/bratCanvas.js -> canvas.toBuffer("image/png") itu proses ASYNC
  // (encode PNG-nya jalan di thread pool NATIVE, bukan di thread JS worker yang gambar
  // frame-nya). Artinya selagi frame ke-N lagi di-encode di background, thread JS worker
  // SEBENARNYA nganggur & bisa langsung mulai GAMBAR frame ke-(N+1) -- tapi itu cuma kejadian
  // kalau kita KIRIM request frame ke-(N+1) LEBIH AWAL, bukan nunggu balesan frame ke-N dulu
  // (yang mana itu perilaku lama, satu-satu berurutan lewat for-loop + await).
  // Fix: kirim semua request frame barengan (Promise.all) -- waktu "encode frame ke-N" & waktu
  // "gambar frame ke-(N+1)" jadi TUMPANG TINDIH, video yang dihasilkan tetap identik persis,
  // cuma proses jadinya lebih cepat. Render teks penuh buat 3 frame terakhir tetap cuma
  // DIPANGGIL SEKALI (bukan 3x) -- gambarnya sama, tinggal dipakai ulang, sama seperti sebelumnya.
  const progressivePrompts = [];
  for (let i = 0; i < steps; i++) progressivePrompts.push(words.slice(0, i + 1).join(" "));

  const [frameBuffers, lastBuf] = await Promise.all([
    Promise.all(progressivePrompts.map((prompt) => makeBratImageAsync(prompt))),
    makeBratImageAsync(text),
  ]);

  frameBuffers.forEach((buf, i) => {
    fs.writeFileSync(path.join(frameDir, `f${String(i).padStart(3, "0")}.png`), buf);
  });
  // ulang frame terakhir beberapa kali biar ada jeda sebelum sticker loop
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(frameDir, `f${String(steps + i).padStart(3, "0")}.png`), lastBuf);
  }

  const outputFile = path.join(TMP_DIR, `brat_${id}.mp4`);
  await runFfmpeg([
    "-y", "-framerate", "2",
    "-i", path.join(frameDir, "f%03d.png"),
    "-vf", "scale=512:512", "-pix_fmt", "yuv420p",
    outputFile,
  ]);

  const buffer = fs.readFileSync(outputFile);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.rmSync(outputFile, { force: true });
  return buffer;
}

module.exports = { makeBratVideo };
