const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveBinary } = require("./binaries");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

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

  await new Promise((resolve, reject) => {
    const proc = spawn(bin, ["-i", inputFile, "-o", outputFile, "-n", model, "-s", String(scale)], {
      cwd: fs.existsSync(binDir) ? binDir : undefined, // supaya folder "models" ke-detect (harus 1 folder sama persis dengan exe-nya)
    });
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
      if (code === 0) resolve();
      else reject(new Error("Real-ESRGAN gagal: " + stderr.slice(-500)));
    });
  });

  if (!fs.existsSync(outputFile)) throw new Error("Hasil upscale tidak ditemukan.");
  const result = fs.readFileSync(outputFile);
  fs.rmSync(inputFile, { force: true });
  fs.rmSync(outputFile, { force: true });
  return result;
}

module.exports = { upscaleImage };
