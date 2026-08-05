const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveBinary, BIN_DIR } = require("./binaries");
const { spawnWithTimeout } = require("./spawnWithTimeout");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ==== BATAS UKURAN FILE (safety net RAM/disk) ====
// downloadVideo/downloadAudio nge-buffer SELURUH file hasil download ke RAM
// (fs.readFileSync) sebelum dikirim ke WhatsApp -- tanpa batas, link ke video yang
// sangat panjang/resolusi tinggi bisa bikin RAM/disk device membengkak gak kekontrol,
// apalagi kalau beberapa user minta bareng-bareng. "--max-filesize" bikin yt-dlp
// BERHENTI dari awal (sebelum download kelar) begitu ukurannya udah kelewat batas,
// jadi gagalnya cepat & jelas -- bukan nunggu download penuh dulu baru ketahuan berat.
// WhatsApp sendiri juga punya batas ukuran kirim media (video/audio ~sekitar 100MB via
// Baileys), jadi angka ini juga sekalian nyaring file yang kemungkinan gagal terkirim.
const MAX_FILESIZE = "100M";

// 5 menit per percobaan -- yt-dlp sendiri punya retry logic (lihat RETRY_DELAYS_MS di bawah),
// jadi timeout di sini cuma jaga-jaga kalau proses-nya BENERAN macet (bukan cuma lambat karena
// internet lelet/server sumbernya lambat -- itu udah wajar butuh waktu, coba amati durasi
// ttmp4/ytmp4 yang berhasil di log kamu sebelumnya bisa 30-60 detik, itu normal).
const YTDLP_TIMEOUT_MS = 5 * 60 * 1000;

function runOnce(args) {
  return new Promise((resolve, reject) => {
    const bin = resolveBinary("yt-dlp");

    // Kalau ffmpeg.exe ada di folder bin/ lokal, kasih tahu yt-dlp lokasinya secara eksplisit
    // (yt-dlp butuh ffmpeg buat convert ke mp3/dsb)
    const localFfmpeg = process.platform === "win32" ? path.join(BIN_DIR, "ffmpeg.exe") : path.join(BIN_DIR, "ffmpeg");
    const finalArgs = fs.existsSync(localFfmpeg) ? ["--ffmpeg-location", BIN_DIR, ...args] : args;

    const { proc, isTimedOut } = spawnWithTimeout(bin, finalArgs, { timeoutMs: YTDLP_TIMEOUT_MS });
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
      if (isTimedOut()) {
        // Sengaja BUKAN ditandain "transient" (gak di-retry otomatis) -- kalau proses ini aja
        // udah butuh 5 menit dan masih macet, kemungkinan besar retry langsung juga bakal
        // macet lagi (total waktu tunggu bisa sampai puluhan menit kalau tetap dipaksa retry).
        return reject(new Error(`yt-dlp kelamaan/macet (lebih dari ${YTDLP_TIMEOUT_MS / 1000 / 60} menit), proses dipaksa berhenti. Coba lagi beberapa saat lagi.`));
      }
      if (code === 0) return resolve(stdout);
      const errOutput = (stderr || stdout).slice(-500);
      if (/max-filesize|File is larger than max-filesize/i.test(errOutput)) {
        reject(
          new Error(
            `File-nya lebih gede dari batas maksimal (${MAX_FILESIZE}) yang diizinkan bot ini -- ` +
            "sengaja dibatasi biar RAM/disk device gak kewalahan pas download file besar. " +
            "Coba link/video lain yang lebih pendek/resolusinya lebih kecil."
          )
        );
        return;
      }
      const err = new Error("yt-dlp gagal: " + errOutput + buildUpdateHint(errOutput));
      err.rawOutput = errOutput; // dipakai retry logic di run() buat cek pola transient
      reject(err);
    });
  });
}

// Pola error yang keliatannya cuma GANGGUAN SESAAT (rate-limit/anti-bot TikTok/IG yang lagi
// ketat), BUKAN masalah permanen -- dibuktikan dari laporan nyata: link YANG SAMA gagal 2x
// dengan pesan ini, terus BERHASIL di percobaan ke-3 tanpa ada yang diubah sama sekali (yt-dlp
// gak di-update, link gak diganti). Beda sama misal "Requested format is not available" yang
// sifatnya lebih pasti/struktural (link itu emang gak punya format yang diminta -- diulang pun
// hasilnya bakal sama, gak ada gunanya retry).
const TRANSIENT_SIGNS = [
  "Unable to extract universal data for rehydration",
  "Unable to extract yt initial data",
  "unable to download video data: HTTP Error 403",
  "Sign in to confirm",
  "HTTP Error 429",
  "Read timed out",
  "Connection reset",
];

const RETRY_DELAYS_MS = [3000, 6000, 10000]; // nyoba ulang 3x (total 4x percobaan), jeda makin lama tiap kali (backoff)

/**
 * Sama kayak runOnce(), tapi kalau errornya kelihatan TRANSIENT (lihat TRANSIENT_SIGNS di
 * atas), otomatis dicoba ulang sampai 2x sebelum beneran nyerah -- biar user gak perlu
 * ngetik ulang command manual pas TikTok/IG lagi rewel sesaat.
 */
async function run(args) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await runOnce(args);
    } catch (err) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      const looksTransient = err.rawOutput && TRANSIENT_SIGNS.some((sign) => err.rawOutput.includes(sign));
      if (isLastAttempt || !looksTransient) throw err;

      const delay = RETRY_DELAYS_MS[attempt];
      console.log(`[ytdlp] Kelihatan gangguan sesaat (percobaan ${attempt + 1} gagal) -- nyoba ulang dalam ${delay / 1000} detik...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
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
    "\n\n💡 Bot udah otomatis coba ulang beberapa kali sebelum nyerah, tapi tetap gagal. Error di atas " +
    "biasanya karena salah satu dari dua hal:\n" +
    "1) yt-dlp yang kepasang ketinggalan versi (TikTok/YouTube sering ubah struktur situsnya), atau\n" +
    "2) platform-nya (TikTok/Instagram/dst) lagi rate-limit/anti-bot ketat sesaat -- coba lagi " +
    "beberapa menit lagi kalau yt-dlp kamu udah paling baru." + extraNote + "\n" +
    "Cara update yt-dlp (buat kemungkinan #1):\n" +
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
    "--max-filesize", MAX_FILESIZE,
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

  // === Preferensi codec H.264 (avc1) buat kompatibilitas HP ===
  // SEBELUMNYA cuma "best[ext=mp4]/best" -- ambil kualitas TERTINGGI apa adanya tanpa peduli
  // codec-nya. Masalahnya: sebagian video (terutama resolusi tinggi) di-encode pakai H.265/HEVC
  // atau profile H.264 yang berat, dan gak semua HP (terutama yang lebih tua/spek rendah) punya
  // hardware decoder yang sanggup mutar itu -- WhatsApp nolak muter dengan pesan "ada masalah
  // dengan file video", padahal file-nya sendiri gak rusak. H.264 (avc1) adalah codec paling
  // UNIVERSAL didukung hampir semua HP dari jaman baheula sampai sekarang, jadi diprioritaskan
  // duluan kalau tersedia -- baru fallback ke "apa aja yang penting mp4"/"apa aja yang ada" kalau
  // sumbernya emang cuma nyediain codec lain.
  await run([
    "-f", "best[vcodec^=avc1][ext=mp4]/best[ext=mp4]/best",
    "--no-playlist", "--no-warnings",
    "--max-filesize", MAX_FILESIZE,
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
