/**
 * Cari spesifikasi lengkap HP -- scraping langsung dari GSMArena secara real-time (gak ada
 * dataset lokal buat ribuan HP dari semua merk, jadi ini satu-satunya cara yang masuk akal).
 *
 * PENTING -- kenapa gak pakai package `gsmarena-api` / gak search langsung di www.gsmarena.com:
 * per pertengahan 2026, halaman PENCARIAN di www.gsmarena.com (results.php3) udah dipasangin
 * Cloudflare Turnstile (captcha invisible) yang bikin SEMUA request otomatis (termasuk dari
 * package `gsmarena-api`) balik jadi halaman "verify you're human" -- hasilnya SELALU 0 hasil,
 * bahkan buat HP paling umum sekalipun (iPhone 15 dkk). Untungnya:
 *   1. Versi MOBILE (m.gsmarena.com) buat pencarian TIDAK dipasangin Turnstile, jadi kita pakai
 *      itu buat tahap cari id device-nya.
 *   2. Halaman DETAIL per-device di www.gsmarena.com (bukan halaman pencarian) juga TIDAK
 *      dipasangin Turnstile, jadi tahap ambil spesifikasi lengkap tetap lewat www.gsmarena.com
 *      (markup-nya lebih stabil/gampang di-parse daripada versi mobile).
 *
 * Kalau suatu saat GSMArena nge-block lebih ketat lagi (m.gsmarena.com ikutan dipasangin
 * Turnstile, atau markup detail berubah total), fungsi `looksBlocked()` di bawah bakal kedeteksi
 * dan bot kasih pesan error yang jelas ("lagi diblokir"), BUKAN kesannya "HP gak ketemu" --
 * biar gampang dibedain pas debug nanti.
 */
const axios = require("axios");
const cheerio = require("cheerio");

const client = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  validateStatus: () => true,
});

// Pola href halaman detail HP, contoh: apple_iphone_15-12559.php / motorola_moto_g45-13267.php
const DEVICE_HREF_RE = /^[a-z0-9_+.()-]+-\d+\.php$/i;

/** Deteksi halaman anti-bot (Turnstile/Cloudflare dkk) biar pesan errornya jelas, beda dari "gak ketemu" */
function looksBlocked(html) {
  if (!html) return true;
  const lower = html.toLowerCase();
  return (
    lower.includes("turnstile") ||
    lower.includes("just a moment") ||
    lower.includes("attention required") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("checking your browser")
  );
}

/** Cari HP di GSMArena lewat versi mobile (gak kena Turnstile), balikin daftar kandidat */
async function searchDevices(query) {
  const res = await client.get("https://m.gsmarena.com/results.php3", {
    params: { sQuickSearch: "yes", sName: query },
  });

  if (looksBlocked(res.data)) {
    throw new Error("Situs GSMArena lagi memblokir permintaan otomatis (anti-bot). Coba lagi beberapa saat lagi.");
  }
  if (res.status !== 200) return [];

  const $ = cheerio.load(res.data);
  const seen = new Set();
  const results = [];

  // Gak gantungin diri ke class CSS tertentu (gampang berubah) -- cukup cari semua link yang
  // pola href-nya cocok sama halaman detail HP, lalu skip link navigasi brand (contoh:
  // "apple-phones-48.php", "motorola-phones-4.php" -- itu daftar SEMUA HP satu merk, bukan 1 HP).
  $("a[href$='.php']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Ambil segmen path terakhir aja -- href kadang relatif ("apple_iphone_15-12559.php"),
    // kadang URL absolut penuh ("https://m.gsmarena.com/apple_iphone_15-12559.php"). Dengan
    // .split("/").pop() dua-duanya dapat hasil yang sama, jadi regex di bawah gak perlu peduli.
    const path = (href.split("/").pop() || "").trim();
    if (!path || path.includes("-phones-") || !DEVICE_HREF_RE.test(path)) return;

    const id = path.replace(/\.php$/, "");
    if (seen.has(id)) return;

    const img = $(el).find("img").first();
    const name = (img.attr("title") || $(el).text() || "").replace(/\s+/g, " ").trim();
    if (!name) return;

    seen.add(id);
    results.push({ id, name, img: img.attr("src") || null });
  });

  return results;
}

/** Ambil detail spesifikasi lengkap 1 HP berdasarkan id (contoh: "apple_iphone_15-12559") */
async function getDeviceDetail(id) {
  const res = await client.get(`https://www.gsmarena.com/${id}.php`);

  if (looksBlocked(res.data)) {
    throw new Error("Situs GSMArena lagi memblokir permintaan otomatis (anti-bot). Coba lagi beberapa saat lagi.");
  }
  if (res.status !== 200) return null;

  const $ = cheerio.load(res.data);
  const name = $(".specs-phone-name-title").text().trim();
  if (!name) return null;

  const quickSpec = [];
  const pushQuick = (label, sel) => {
    const val = $(sel).first().text().replace(/\s+/g, " ").trim();
    if (val) quickSpec.push({ name: label, value: val });
  };
  pushQuick("Layar", "span[data-spec=displaysize-hl]");
  pushQuick("Resolusi", "div[data-spec=displayres-hl]");
  pushQuick("Kamera", ".accent-camera");
  pushQuick("Video", "div[data-spec=videopixels-hl]");
  pushQuick("RAM", ".accent-expansion");
  pushQuick("Chipset", "div[data-spec=chipset-hl]");
  pushQuick("Baterai", ".accent-battery");
  pushQuick("Tipe Baterai", "div[data-spec=battype-hl]");

  // Tabel spesifikasi lengkap ada di dalam #specs-list. Kalau id itu gak ketemu (markup berubah),
  // fallback ke SEMUA <table> di halaman (masih difilter -- cuma yang punya <th> kategori yang dipakai).
  let tableScope = $("#specs-list table");
  if (!tableScope.length) tableScope = $("table");

  const detailSpec = [];
  tableScope.each((_, table) => {
    const category = $(table).find("th").first().text().trim();
    if (!category) return;
    const specs = [];
    $(table)
      .find("tr")
      .each((__, tr) => {
        const label = $(tr).find("td.ttl").text().replace(/\s+/g, " ").trim();
        const value = $(tr).find("td.nfo").text().replace(/\s+/g, " ").trim();
        if (label && value) specs.push({ name: label, value });
      });
    if (specs.length) detailSpec.push({ category, specifications: specs });
  });

  return { name, quickSpec, detailSpec };
}

/** Cari HP berdasarkan nama/keyword, balikin detail spesifikasi lengkap hasil paling relevan */
async function searchDeviceSpecs(query) {
  const results = await searchDevices(query.trim());
  if (!results.length) return null;

  const best = results[0];
  const detail = await getDeviceDetail(best.id);
  if (!detail) return null;

  return { ...detail, totalMatches: results.length };
}

/** Format hasil jadi teks siap kirim ke WhatsApp, dipotong biar gak kepanjangan */
function formatDeviceSpecs(device, query) {
  if (!device) {
    return `Gak ketemu HP dengan nama "${query}". Coba tulis nama lain, misal *cekdevice Poco X6 Pro* atau *cekdevice iPhone 15*.`;
  }

  let text = `『 📱 𝗦𝗣𝗘𝗦𝗜𝗙𝗜𝗞𝗔𝗦𝗜 𝗛𝗣 』\n\n*${device.name}*\n\n`;

  const quick = (device.quickSpec || []).filter((q) => q.value && q.value.trim());
  if (quick.length) {
    text += `*── Ringkasan ──*\n`;
    for (const q of quick) text += `• ${q.name}: ${q.value.trim()}\n`;
    text += `\n`;
  }

  for (const cat of device.detailSpec || []) {
    const specs = (cat.specifications || []).filter((s) => s.name && s.value && s.value.trim());
    if (!specs.length) continue;
    text += `*── ${cat.category} ──*\n`;
    for (const s of specs) text += `• ${s.name.trim()}: ${s.value.trim()}\n`;
    text += `\n`;
  }

  text = text.trim();

  const LIMIT = 4000;
  if (text.length > LIMIT) {
    text = text.slice(0, LIMIT).trim() + `\n\n_(dipotong, spesifikasi lengkapnya lebih panjang dari ini)_`;
  }

  if (device.totalMatches > 1) {
    text += `\n\n_Ditemukan ${device.totalMatches} hasil serupa, ini yang paling relevan. Tulis nama lebih spesifik kalau bukan yang dimaksud._`;
  }

  return text;
}

module.exports = { searchDeviceSpecs, formatDeviceSpecs };
