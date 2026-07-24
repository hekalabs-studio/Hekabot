const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveBinary } = require("./binaries");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function tmpFile(ext) {
  return path.join(TMP_DIR, `${crypto.randomBytes(6).toString("hex")}.${ext}`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveBinary("ffmpeg"), args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      reject(
        new Error(
          "FFmpeg tidak ditemukan. Salah satu cara ini:\n" +
          "1) Download dari https://www.gyan.dev/ffmpeg/builds/ (pilih 'release essentials'), " +
          "extract, lalu copy `ffmpeg.exe` DAN `ffprobe.exe` ke folder `bin/` di project ini, atau\n" +
          "2) Install ke sistem lalu tambahkan ke PATH\n" +
          "Detail: " + err.message
        )
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("FFmpeg gagal: " + stderr.slice(-500)));
    });
  });
}

/** Video/audio buffer -> mp3 buffer (fitur tomp3) */
async function toMp3(inputBuffer, inputExt = "mp4") {
  const input = tmpFile(inputExt);
  const output = tmpFile("mp3");
  fs.writeFileSync(input, inputBuffer);
  try {
    await runFfmpeg(["-y", "-i", input, "-vn", "-acodec", "libmp3lame", "-q:a", "2", output]);
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(output, { force: true });
  }
}

/** Audio buffer -> ogg/opus buffer, format voice note WhatsApp (fitur tovn) */
async function toVoiceNote(inputBuffer, inputExt = "mp3") {
  const input = tmpFile(inputExt);
  const output = tmpFile("ogg");
  fs.writeFileSync(input, inputBuffer);
  try {
    await runFfmpeg(["-y", "-i", input, "-c:a", "libopus", "-b:a", "64k", "-vbr", "on", "-application", "voip", output]);
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(output, { force: true });
  }
}

/**
 * Potong audio (fitur cutmp3)
 * @param {Buffer} inputBuffer
 * @param {string} inputExt
 * @param {number} startSec
 * @param {number} durationSec
 */
async function cutAudio(inputBuffer, inputExt, startSec, durationSec) {
  const input = tmpFile(inputExt);
  const output = tmpFile("mp3");
  fs.writeFileSync(input, inputBuffer);
  try {
    await runFfmpeg([
      "-y", "-i", input,
      "-ss", String(startSec),
      "-t", String(durationSec),
      "-acodec", "libmp3lame", "-q:a", "2",
      output,
    ]);
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(output, { force: true });
  }
}

/**
 * Video buffer -> mp4 buffer buat kirim gif-playback WhatsApp (fitur togif).
 * PENTING: WhatsApp gak punya format "GIF" beneran -- animasi ala-GIF itu sebenarnya video mp4
 * BISU yang dikirim dengan flag gifPlayback:true. Kirim file .gif raster asli malah GAGAL/gak
 * ke-animasi karena Baileys expect video buffer di field `video`, bukan `image`.
 */
async function toGif(inputBuffer, inputExt = "mp4") {
  const input = tmpFile(inputExt);
  const output = tmpFile("mp4");
  fs.writeFileSync(input, inputBuffer);
  try {
    await runFfmpeg([
      "-y", "-i", input,
      "-vf", "scale=480:-2:flags=lanczos",
      "-an", // GIF gak ada suara, buang audio
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      output,
    ]);
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(output, { force: true });
  }
}

module.exports = { toMp3, toVoiceNote, cutAudio, toGif, tmpFile, TMP_DIR };
