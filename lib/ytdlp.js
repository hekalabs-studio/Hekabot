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
      if (code === 0) return resolve(stdout);
      const errOutput = (stderr || stdout).slice(-500);
      reject(new Error("yt-dlp gagal: " + errOutput + buildUpdateHint(errOutput)));
    });
  });
}

// Beberapa pesan error yt-dlp ini biasanya artinya binary yt-dlp yang kepasang ketinggalan
// versi (situs kayak TikTok/YouTube sering ubah struktur, dan yt-dlp baru rilis patch-nya
// hampir tiap minggu) -- bukan bug di bot. Kasih hint update biar user gak bingung.
const OUTDATED_SIGNS = [
  "Unable to extract universal data for rehydration",
  "Unable to extract yt initial data",
  "unable to download video data: HTTP Error 403",
  "Requested format is not available",
  "Sign in to confirm",
];

// Domain platform yang SEHARUSNYA didukung yt-dlp (bukan situs random di luar cakupannya).
// Dipakai buat mbedain "Unsupported URL" karena yt-dlp beneran ketinggalan versi (URL pattern
// baru kayak TikTok /photo/... buat slideshow belum dikenali versi lama) VS "Unsupported URL"
// karena user emang ngasih link dari situs yang emang gak pernah didukung yt-dlp sama sekali.
const KNOWN_PLATFORM_DOMAINS = [
  "tiktok.com", "instagram.com", "facebook.com", "fb.watch",
  "twitter.com", "x.com", "pinterest.com", "threads.net",
];

function buildUpdateHint(errOutput) {
  const looksOutdated = OUTDATED_SIGNS.some((sign) => errOutput.includes(sign));
  const isUnsupportedUrlOnKnownPlatform =
    errOutput.includes("Unsupported URL") && KNOWN_PLATFORM_DOMAINS.some((d) => errOutput.includes(d));

  if (!looksOutdated && !isUnsupportedUrlOnKnownPlatform) return "";

  const extraNote = isUnsupportedUrlOnKnownPlatform
    ? "\n(Ini sering kejadian khusus buat link TikTok /photo/... [slideshow] atau carousel Instagram " +
      "baru -- yt-dlp versi lama belum kenal pola URL itu, tapi versi terbaru biasanya udah support.)"
    : "";

  return (
    "\n\n💡 Error di atas biasanya karena yt-dlp yang kepasang ketinggalan versi " +
    "(TikTok/YouTube sering ubah struktur situsnya). Coba update dulu:" + extraNote + "\n" +
    "- Kalau install via pip: `pip install -U yt-dlp`\n" +
    "- Kalau pakai yt-dlp.exe di folder bin/: download ulang versi terbaru dari " +
    "https://github.com/yt-dlp/yt-dlp/releases/latest"
  );
}

// Paksa yt-dlp pura-pura jadi client Android buat request YouTube -- workaround umum yang
// dipakai komunitas yt-dlp buat ngurangin error "HTTP Error 403: Forbidden" pas YouTube lagi
// ketat-ketatnya soal signature/PO token. Aman dipasang selalu karena namespace-nya "youtube:"
// jadi cuma kepake pas target-nya emang YouTube, di URL lain diabaikan yt-dlp.
const YOUTUBE_ARGS = ["--extractor-args", "youtube:player_client=android,web"];

/** Ambil metadata video/hasil pencarian YouTube tanpa download */
async function getInfo(urlOrQuery) {
  const target = urlOrQuery.startsWith("http") ? urlOrQuery : `ytsearch1:${urlOrQuery}`;
  const out = await run(["--dump-json", "--no-playlist", "--no-warnings", ...YOUTUBE_ARGS, target]);
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
    ...YOUTUBE_ARGS,
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
    ...YOUTUBE_ARGS,
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

// Ekstensi gambar yang dianggap "slide" hasil download carousel/slideshow (Instagram carousel,
// TikTok photo mode/slideshow). Bukan .mp3/.mp4 -- itu biasanya musik latar slideshow-nya, bukan
// slide-nya sendiri, jadi sengaja gak ikut dikirim.
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Download semua GAMBAR (slide) dari sebuah post carousel Instagram atau slideshow/photo-mode
 * TikTok, return { buffers: Buffer[], title }.
 *
 * Beda dari downloadVideo/downloadAudio: sengaja TIDAK pakai `--no-playlist` di sini, karena
 * carousel/slideshow itu sendiri "dianggap" playlist oleh yt-dlp (tiap foto = 1 entry) -- kalau
 * pakai --no-playlist, cuma foto pertama yang kedownload. Juga sengaja gak pakai `-f` (format
 * selector) karena itu cuma berlaku buat video; kalau dipaksa (mis. "best[ext=mp4]/best") malah
 * bikin gagal total di post yang isinya gambar semua (gak ada format video sama sekali).
 */
async function downloadImages(url) {
  const id = crypto.randomBytes(6).toString("hex");
  const outputDir = path.join(TMP_DIR, id);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputTemplate = path.join(outputDir, "%(playlist_index)03d_%(id)s.%(ext)s");

  try {
    await run(["--no-warnings", "--ignore-no-formats-error", "-o", outputTemplate, url]);
  } catch (err) {
    // Bersihin folder sisa sebelum lempar error ke pemanggil
    fs.rmSync(outputDir, { recursive: true, force: true });
    throw err;
  }

  const files = fs
    .readdirSync(outputDir)
    .filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
    .sort();

  if (!files.length) {
    fs.rmSync(outputDir, { recursive: true, force: true });
    throw new Error(
      "Gak ketemu foto/slide di link itu. Pastikan link-nya post carousel (Instagram) atau " +
      "slideshow/photo-mode (TikTok) yang isinya foto -- kalau post-nya sebenernya video biasa, " +
      "pakai command video (igdl/ttmp4) aja."
    );
  }

  const buffers = files.map((f) => fs.readFileSync(path.join(outputDir, f)));
  const info = await getInfo(url).catch(() => null);
  fs.rmSync(outputDir, { recursive: true, force: true });
  return { buffers, title: info?.title || "slide" };
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
    ...YOUTUBE_ARGS,
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

module.exports = { getInfo, downloadAudio, downloadVideo, downloadImages, getTranscript };
