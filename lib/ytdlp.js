const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveBinary, BIN_DIR } = require("./binaries");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function run(args) {
  return new Promise((resolve, reject) => {
    const bin = resolveBinary("yt-dlp");

    // Kalau ffmpeg.exe ada di folder bin/ lokal, kasih tahu yt-dlp lokasinya secara eksplisit
    // (yt-dlp butuh ffmpeg buat convert ke mp3/dsb)
    const localFfmpeg = process.platform === "win32" ? path.join(BIN_DIR, "ffmpeg.exe") : path.join(BIN_DIR, "ffmpeg");
    const finalArgs = fs.existsSync(localFfmpeg) ? ["--ffmpeg-location", BIN_DIR, ...args] : args;

    const proc = spawn(bin, finalArgs);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      reject(
        new Error(
          "yt-dlp tidak ditemukan. Salah satu cara ini:\n" +
          "1) pip install yt-dlp (lalu BUKA ULANG terminal), atau\n" +
          "2) Download yt-dlp.exe dari https://github.com/yt-dlp/yt-dlp/releases/latest, " +
          "taruh di folder `bin/yt-dlp.exe` di dalam project ini\n" +
          "Detail: " + err.message
        )
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error("yt-dlp gagal: " + (stderr || stdout).slice(-500)));
    });
  });
}

/** Ambil metadata video/hasil pencarian YouTube tanpa download */
async function getInfo(urlOrQuery) {
  const target = urlOrQuery.startsWith("http") ? urlOrQuery : `ytsearch1:${urlOrQuery}`;
  const out = await run(["--dump-json", "--no-playlist", "--no-warnings", target]);
  const firstLine = out.trim().split("\n")[0];
  return JSON.parse(firstLine);
}

/** Download audio (mp3) dari URL/judul YouTube, return { buffer, title } */
async function downloadAudio(urlOrQuery) {
  const target = urlOrQuery.startsWith("http") ? urlOrQuery : `ytsearch1:${urlOrQuery}`;
  const id = crypto.randomBytes(6).toString("hex");
  const outputTemplate = path.join(TMP_DIR, `${id}.%(ext)s`);

  await run([
    "-x", "--audio-format", "mp3", "--audio-quality", "5",
    "--no-playlist", "--no-warnings",
    "-o", outputTemplate,
    target,
  ]);

  const finalFile = path.join(TMP_DIR, `${id}.mp3`);
  if (!fs.existsSync(finalFile)) throw new Error("File hasil download tidak ditemukan.");

  const info = await getInfo(urlOrQuery).catch(() => null);
  const buffer = fs.readFileSync(finalFile);
  fs.rmSync(finalFile, { force: true });
  return { buffer, title: info?.title || "audio" };
}

/** Download video (mp4) dari URL YouTube, return { buffer, title } */
async function downloadVideo(url) {
  const id = crypto.randomBytes(6).toString("hex");
  const outputTemplate = path.join(TMP_DIR, `${id}.%(ext)s`);

  await run([
    "-f", "best[ext=mp4]/best",
    "--no-playlist", "--no-warnings",
    "-o", outputTemplate,
    url,
  ]);

  const files = fs.readdirSync(TMP_DIR).filter((f) => f.startsWith(id));
  if (!files.length) throw new Error("File hasil download tidak ditemukan.");
  const finalFile = path.join(TMP_DIR, files[0]);

  const info = await getInfo(url).catch(() => null);
  const buffer = fs.readFileSync(finalFile);
  fs.rmSync(finalFile, { force: true });
  return { buffer, title: info?.title || "video" };
}

/** Ambil transkrip (subtitle otomatis) video YouTube sebagai teks polos */
async function getTranscript(url) {
  const id = crypto.randomBytes(6).toString("hex");
  const outputTemplate = path.join(TMP_DIR, id);

  await run([
    "--write-auto-sub", "--skip-download",
    "--sub-lang", "id,en",
    "--sub-format", "vtt",
    "--no-warnings",
    "-o", outputTemplate,
    url,
  ]);

  const files = fs.readdirSync(TMP_DIR).filter((f) => f.startsWith(id) && f.endsWith(".vtt"));
  if (!files.length) throw new Error("Transkrip tidak tersedia untuk video ini (tidak ada subtitle otomatis).");

  const raw = fs.readFileSync(path.join(TMP_DIR, files[0]), "utf8");
  fs.rmSync(path.join(TMP_DIR, files[0]), { force: true });

  const lines = raw
    .split("\n")
    .filter((l) => l.trim() && !l.includes("-->") && !/^WEBVTT/.test(l) && !/^\d+$/.test(l) && !/^Kind:|^Language:/.test(l))
    .map((l) => l.replace(/<[^>]+>/g, "").trim());

  return [...new Set(lines)].join(" ");
}

module.exports = { getInfo, downloadAudio, downloadVideo, getTranscript };
