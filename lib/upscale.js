const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveBinary } = require("./binaries");
const { spawnWithTimeout } = require("./spawnWithTimeout");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// AI upscale bisa makan waktu lumayan buat gambar gede, tapi tetap harus ada batas -- kalau
// macet gara-gara driver GPU/Vulkan bermasalah, jangan sampai nunggu selamanya.
const UPSCALE_TIMEOUT_MS = 3 * 60 * 1000;

function detectExt(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  return "png";
}

/**
 * Upscale/HD-kan gambar secara LOKAL pakai Real-ESRGAN (realesrgan-ncnn-vulkan),
 * AI upscaler open-source. Gak butuh API luar sama sekali.
 *
 * @param {Buffer} inputBuffer
 * @param {{model?: string, scale?: number}} opts
 *   model: "realesrgan-x4plus" (foto umum, default), "realesrgan-x4plus-anime" (anime/kartun),
 *          "realesrnet-x4plus" (lebih halus, kurang tajam)
 */
async function upscaleImage(inputBuffer, { model = "realesrgan-x4plus", scale = 4 } = {}) {
  const bin = resolveBinary("realesrgan-ncnn-vulkan");
  const binDir = path.dirname(bin);
  const id = crypto.randomBytes(6).toString("hex");
  const inputExt = detectExt(inputBuffer);
  const inputFile = path.join(TMP_DIR, `${id}.${inputExt}`);
  const outputFile = path.join(TMP_DIR, `${id}_out.png`);

  fs.writeFileSync(inputFile, inputBuffer);

  try {
    await new Promise((resolve, reject) => {
      const { proc, isTimedOut } = spawnWithTimeout(
        bin,
        ["-i", inputFile, "-o", outputFile, "-n", model, "-s", String(scale)],
        { timeoutMs: UPSCALE_TIMEOUT_MS, spawnOptions: { cwd: fs.existsSync(binDir) ? binDir : undefined } }
      );
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("error", (err) => {
        reject(
          new Error(
            "Real-ESRGAN tidak ditemukan. Cara install (LOKAL, gak butuh API):\n" +
            "1. Download dari https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases (pilih file -windows.zip)\n" +
            "2. Extract SEMUA isinya (exe + folder models + file .param/.bin) ke folder `bin/` di project ini\n" +
            "   (jangan cuma exe-nya doang, folder `models` di sebelahnya juga wajib ikut di-copy)\n" +
            "Detail: " + err.message
          )
        );
      });
      proc.on("close", (code) => {
        if (isTimedOut()) {
          return reject(new Error(`Real-ESRGAN kelamaan/macet (lebih dari ${UPSCALE_TIMEOUT_MS / 1000}s), proses dipaksa berhenti. Kemungkinan driver GPU/Vulkan bermasalah, atau gambarnya kebesaran.`));
        }
        if (code === 0) resolve();
        else reject(new Error("Real-ESRGAN gagal: " + stderr.slice(-500)));
      });
    });

    if (!fs.existsSync(outputFile)) throw new Error("Hasil upscale tidak ditemukan.");
    return fs.readFileSync(outputFile);
  } finally {
    // PENTING: sebelumnya cleanup ini cuma ada di jalur SUKSES (di akhir fungsi) -- kalau
    // Real-ESRGAN gagal (proses error/exit code bukan 0/output gak ketemu), function-nya
    // langsung `throw` dan inputFile (+ outputFile kalau sempat kebuat) KETINGGALAN selamanya
    // di folder tmp/, gak pernah kehapus. Dibungkus try/finally biar cleanup SELALU jalan,
    // sukses maupun gagal -- sama kayak pola yang udah dipakai konsisten di lib/ffmpeg.js dkk.
    fs.rmSync(inputFile, { force: true });
    fs.rmSync(outputFile, { force: true });
  }
}

module.exports = { upscaleImage };
