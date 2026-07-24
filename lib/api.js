const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { findUrls } = require("./extract");

/**
 * PENTING - BACA INI:
 * API publik gratis (siputzx) tidak punya dokumentasi path yang 100% akurat/stabil,
 * dan sering ganti struktur tanpa pemberitahuan. Daripada nebak SATU path yang sering salah,
 * setiap fitur di bawah ini punya BEBERAPA kandidat path. Saat dipanggil pertama kali,
 * bot otomatis coba satu-satu sampai ketemu yang berhasil (ada respons valid),
 * lalu MENGINGAT path yang berhasil itu di file `lib/.resolved-endpoints.json`
 * supaya panggilan berikutnya langsung pakai path yang benar (gak perlu coba-coba lagi).
 *
 * Kalau semua kandidat gagal, bot kasih tahu di pesan error, dan kamu bisa:
 * 1. Tambah kandidat path baru sendiri di CANDIDATES di bawah, ATAU
 * 2. Hapus file `lib/.resolved-endpoints.json` kalau mau paksa bot coba ulang dari awal
 *    (misalnya setelah kamu nambah kandidat baru)
 */
const CANDIDATES = {
  // ==== DOWNLOADER (param: url) ====
  capcutdl: ["/api/d/capcut", "/api/download/capcut", "/api/downloader/capcut"],
  fbdl: ["/api/d/facebook", "/api/download/facebook", "/api/downloader/facebook", "/api/facebook"],
  igdl: ["/api/d/igdl", "/api/d/instagram", "/api/download/instagram", "/api/downloader/instagram", "/api/instagram"],
  pinterestdl: ["/api/d/pinterest", "/api/download/pinterest", "/api/downloader/pinterest", "/api/pinterest"],
  rednotedl: ["/api/d/rednote", "/api/d/xiaohongshu", "/api/download/rednote"],
  scribddl: ["/api/d/scribd", "/api/download/scribd", "/api/downloader/scribd"],
  slidesharedl: ["/api/d/slideshare", "/api/download/slideshare", "/api/downloader/slideshare"],
  spotifydl: ["/api/d/spotify", "/api/download/spotify", "/api/downloader/spotify", "/api/spotify"],
  telesticker: ["/api/d/telesticker", "/api/download/telesticker", "/api/tools/telesticker"],
  teradl: ["/api/d/terabox", "/api/download/terabox", "/api/downloader/terabox"],
  teraview: ["/api/d/terabox", "/api/download/terabox", "/api/downloader/terabox"],
  threads: ["/api/d/threads", "/api/download/threads", "/api/downloader/threads"],
  ttmp3: ["/api/d/tiktok", "/api/download/tiktok", "/api/downloader/tiktok", "/api/tiktok"],
  ttmp4: ["/api/d/tiktok", "/api/download/tiktok", "/api/downloader/tiktok", "/api/tiktok"],
  ttslide: ["/api/d/tiktok", "/api/download/tiktok", "/api/downloader/tiktok", "/api/tiktok"],
  twitter: ["/api/d/twitter", "/api/d/x", "/api/download/twitter", "/api/downloader/twitter", "/api/twitter"],
  ytmp3: ["/api/d/ytmp3", "/api/download/ytmp3", "/api/downloader/ytmp3", "/api/youtube/mp3", "/api/yt/mp3"],
  ytmp4: ["/api/d/ytmp4", "/api/download/ytmp4", "/api/downloader/ytmp4", "/api/youtube/mp4", "/api/yt/mp4"],
  yttranscript: ["/api/d/yttranscript", "/api/tools/yttranscript", "/api/youtube/transcript"],
  drivelink: ["/api/d/gdrive", "/api/download/gdrive", "/api/download/googledrive", "/api/downloader/gdrive"],

  // ==== SEARCH (param: query, dipakai fitur play/play2) ====
  play: ["/api/s/youtube", "/api/search/youtube", "/api/youtube/search", "/api/ytsearch"],

  // ==== TOOLS (param: url, gambar yang sudah diupload) ====
  removebg: ["/api/tools/removebg", "/api/removebg", "/api/image/removebg"],
  hdr: ["/api/tools/hd", "/api/tools/remini", "/api/tools/hdr", "/api/tools/upscale"],
  hdrv2: ["/api/tools/remini", "/api/tools/hd", "/api/tools/upscale"],
  hdrv3: ["/api/tools/upscale", "/api/tools/remini", "/api/tools/hd"],
  ocr: ["/api/tools/ocr", "/api/ocr", "/api/image/ocr"],
  recolor: ["/api/tools/colorize", "/api/tools/recolor", "/api/tools/color"],
  kodepos: ["/api/tools/kodepos", "/api/search/kodepos"],
  cekbillpln: ["/api/tools/cekpln", "/api/tools/pln", "/api/tools/tagihanpln"],
};

const RESOLVED_FILE = path.join(__dirname, ".resolved-endpoints.json");

function loadResolved() {
  try {
    return JSON.parse(fs.readFileSync(RESOLVED_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveResolved(resolved) {
  try {
    fs.writeFileSync(RESOLVED_FILE, JSON.stringify(resolved, null, 2));
  } catch (e) {
    console.error("Gagal menyimpan cache endpoint:", e.message);
  }
}

const client = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 60000,
  headers: { "User-Agent": "Mozilla/5.0 HekaBot" },
  validateStatus: () => true, // kita cek status manual, bukan lewat throw
});

/** Cek apakah body response terlihat seperti hasil sukses (bukan error/404/dsb) */
function looksSuccessful(data) {
  if (data === null || data === undefined) return false;
  if (typeof data !== "object") return typeof data === "string" && data.length > 0;
  if (data.status === false) return false;
  if (data.success === false) return false;
  if (data.error) return false;
  if (typeof data.code === "number" && data.code >= 400) return false;
  return Object.keys(data).length > 0;
}

/**
 * GET request ke siputzx dengan auto-discovery path.
 * @param {string} key - key di object CANDIDATES
 * @param {object} params - query params, contoh { url: "https://..." }
 */
async function apiGet(key, params = {}) {
  const candidates = CANDIDATES[key];
  if (!candidates) throw new Error(`Belum ada kandidat endpoint untuk "${key}" di lib/api.js`);

  const resolved = loadResolved();
  const triedPaths = [];

  // 1. Kalau sudah pernah ketemu path yang berhasil, coba itu duluan
  const orderedCandidates = resolved[key]
    ? [resolved[key], ...candidates.filter((c) => c !== resolved[key])]
    : candidates;

  let lastErrorDetail = "";

  for (const p of orderedCandidates) {
    try {
      const res = await client.get(p, { params });
      triedPaths.push(`${p} -> HTTP ${res.status}`);

      if (res.status === 200 && looksSuccessful(res.data)) {
        // Simpan path yang berhasil supaya dipakai duluan lain kali
        if (resolved[key] !== p) {
          resolved[key] = p;
          saveResolved(resolved);
        }
        return res.data;
      }

      lastErrorDetail = typeof res.data === "object" ? JSON.stringify(res.data).slice(0, 150) : String(res.data).slice(0, 150);
    } catch (err) {
      triedPaths.push(`${p} -> ${err.message}`);
      lastErrorDetail = err.message;
    }
  }

  throw new Error(
    `Semua kemungkinan endpoint untuk "${key}" gagal.\n` +
    `Sudah dicoba: ${triedPaths.join(" | ")}\n` +
    `Error terakhir: ${lastErrorDetail}\n` +
    `Kemungkinan API-nya lagi down, atau perlu path baru ditambahkan di lib/api.js (object CANDIDATES).`
  );
}

module.exports = { apiGet, CANDIDATES, client };
