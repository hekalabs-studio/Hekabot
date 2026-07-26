const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { findUrls } = require("./extract");

/**
 * PENTING - BACA INI:
 * API publik gratis kayak gini (siputzx, ryzendesu, dst) sering down/lambat, dan gak punya
 * dokumentasi path yang 100% akurat/stabil. Makanya sistem ini punya 2 lapis "coba-coba otomatis":
 *
 * 1. MULTI PROVIDER: config.apiBaseUrls berisi BEBERAPA base URL (bukan cuma satu). Kalau
 *    provider pertama lagi down/gagal, bot otomatis lanjut coba provider berikutnya di list itu.
 * 2. MULTI PATH: tiap fitur di bawah ini (CANDIDATES) punya beberapa kandidat path, karena beda
 *    provider (bahkan versi berbeda dari provider yang sama) suka pakai struktur URL yang beda.
 *
 * Begitu ketemu kombinasi (provider + path) yang berhasil, itu diinget di
 * `lib/.resolved-endpoints.json` supaya panggilan berikutnya langsung pakai yang udah terbukti
 * jalan (gak perlu coba-coba lagi dari awal tiap kali).
 *
 * "Berhasil" di sini artinya HTTP 200 + bentuk JSON yang wajar (bukan error). Buat fitur yang
 * emang butuh URL file/media asli (downloader dokumen/video/gambar), panggil apiGet dengan
 * `{ requireUrl: true }` -- ini nambah lapis validasi: kalau responsnya "kelihatan sukses" tapi
 * ternyata gak ada URL yang bisa diekstrak di dalamnya, itu TETAP dianggap gagal dan bot lanjut
 * coba kandidat lain (bukan langsung ke-cache sebagai "yang benar" padahal salah).
 *
 * Kalau SEMUA provider & SEMUA path gagal, bot kasih tahu di pesan error, dan kamu bisa:
 * 1. Tambah provider baru di config.apiBaseUrls, ATAU
 * 2. Tambah kandidat path baru sendiri di CANDIDATES di bawah, ATAU
 * 3. Hapus file `lib/.resolved-endpoints.json` kalau mau paksa bot coba ulang dari awal
 *    (misalnya setelah kamu nambah provider/kandidat baru)
 *
 * Fitur-fitur lain yang DULU ada di sini (removebg, hdr, ocr, drivelink, play, ytmp3/4, dst)
 * SEKARANG udah pindah ke implementasi LOKAL (yt-dlp/Real-ESRGAN/tesseract.js/dst) yang jauh
 * lebih reliable -- lihat commands/downloader.js dan commands/tools.js. Cuma fitur yang BENERAN
 * gak ada alternatif lokalnya yang masih lewat sini.
 */
const CANDIDATES = {
  // ==== DOWNLOADER khusus platform yang gak di-cover yt-dlp (param: url) ====
  capcutdl: ["/api/d/capcut", "/api/download/capcut", "/api/downloader/capcut"],
  telesticker: ["/api/d/telesticker", "/api/download/telesticker", "/api/tools/telesticker"],

  // ==== TOOLS yang beneran belum ada alternatif lokal ====
  cekbillpln: ["/api/tools/cekpln", "/api/tools/pln", "/api/tools/tagihanpln"],
  recolor: ["/api/tools/colorize", "/api/tools/recolor", "/api/tools/color"],
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

// Satu axios client per base URL di config.apiBaseUrls, biar tiap provider gampang dicoba gantian
const baseUrls = config.apiBaseUrls && config.apiBaseUrls.length ? config.apiBaseUrls : [config.apiBaseUrl];
const clients = baseUrls.map((baseURL) =>
  axios.create({
    baseURL,
    timeout: 60000,
    headers: { "User-Agent": "Mozilla/5.0 HekaBot" },
    validateStatus: () => true, // kita cek status manual, bukan lewat throw
  })
);

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
 * GET request dengan auto-discovery: coba tiap provider di config.apiBaseUrls satu-satu, dan buat
 * tiap provider coba tiap kandidat path satu-satu, sampai ketemu yang beneran berhasil.
 * @param {string} key - key di object CANDIDATES
 * @param {object} params - query params, contoh { url: "https://..." }
 * @param {object} [options]
 * @param {boolean} [options.requireUrl] - kalau true, response HTTP 200 yang "kelihatan sukses"
 *   tetap dianggap GAGAL (dan lanjut coba kandidat lain) kalau ternyata gak ada URL media/file
 *   yang bisa diekstrak di dalamnya. Penting buat fitur downloader/tools yang emang butuh URL
 *   nyata -- tanpa validasi ini, endpoint yang KEBETULAN balikin JSON "sukses" tapi gak relevan
 *   bisa ke-cache permanen sebagai "endpoint yang benar" di lib/.resolved-endpoints.json, padahal
 *   salah -- bikin fitur itu gagal terus-terusan setiap dipanggil walau kandidat lain sebenarnya
 *   valid, karena yang salah itu keburu keceklis "sukses".
 */
async function apiGet(key, params = {}, { requireUrl = false } = {}) {
  const candidates = CANDIDATES[key];
  if (!candidates) throw new Error(`Belum ada kandidat endpoint untuk "${key}" di lib/api.js`);

  const resolved = loadResolved();
  const triedPaths = [];
  let lastErrorDetail = "";

  // Kalau sebelumnya udah pernah ketemu kombinasi provider+path yang berhasil, coba itu DULUAN
  const savedChoice = resolved[key]; // { baseUrlIndex, path }
  const providerOrder =
    savedChoice && clients[savedChoice.baseUrlIndex]
      ? [savedChoice.baseUrlIndex, ...clients.map((_, i) => i).filter((i) => i !== savedChoice.baseUrlIndex)]
      : clients.map((_, i) => i);

  for (const baseUrlIndex of providerOrder) {
    const client = clients[baseUrlIndex];
    const orderedCandidates =
      savedChoice && savedChoice.baseUrlIndex === baseUrlIndex
        ? [savedChoice.path, ...candidates.filter((c) => c !== savedChoice.path)]
        : candidates;

    for (const p of orderedCandidates) {
      try {
        const res = await client.get(p, { params });
        const httpOk = res.status === 200 && looksSuccessful(res.data);
        const contentOk = !requireUrl || (httpOk && findUrls(res.data).length > 0);

        triedPaths.push(
          `[${baseUrls[baseUrlIndex]}]${p} -> HTTP ${res.status}` +
            (httpOk && requireUrl && !contentOk ? " (200 tapi gak ada URL file di dalam responnya)" : "")
        );

        if (httpOk && contentOk) {
          // Simpan kombinasi provider+path yang berhasil supaya dipakai duluan lain kali
          if (!savedChoice || savedChoice.baseUrlIndex !== baseUrlIndex || savedChoice.path !== p) {
            resolved[key] = { baseUrlIndex, path: p };
            saveResolved(resolved);
          }
          return res.data;
        }

        lastErrorDetail = typeof res.data === "object" ? JSON.stringify(res.data).slice(0, 150) : String(res.data).slice(0, 150);
      } catch (err) {
        triedPaths.push(`[${baseUrls[baseUrlIndex]}]${p} -> ${err.message}`);
        lastErrorDetail = err.message;
      }
    }
  }

  throw new Error(
    `Semua kemungkinan endpoint untuk "${key}" gagal di semua provider (${baseUrls.join(", ")}).\n` +
    `Sudah dicoba: ${triedPaths.join(" | ")}\n` +
    `Error terakhir: ${lastErrorDetail}\n` +
    `Kemungkinan semua provider lagi down bareng, atau perlu path baru ditambahkan di lib/api.js (object CANDIDATES).`
  );
}

module.exports = { apiGet, CANDIDATES, baseUrls, clients };
