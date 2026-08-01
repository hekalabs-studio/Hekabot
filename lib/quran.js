const axios = require("axios");

// API resmi equran.id (gratis, tanpa API key, no signup) -- sumber datanya dari Aplikasi Quran
// Kementerian Agama RI. Dokumentasi: https://equran.id/apidev/v2
const BASE_URL = "https://equran.id/api/v2";

// Daftar 114 surat (nomor + nama) cuma perlu diambil sekali lalu di-cache di memory selama
// proses bot hidup -- datanya statis (nomor/nama surat gak pernah berubah), jadi gak perlu
// hit API tiap kali ada yang pakai .alquran. Cache di-refresh otomatis kalau lebih dari 24 jam
// (jaga-jaga kalau suatu saat butuh reload tanpa restart bot).
let surahListCache = null;
let surahListCachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // buang spasi, strip, apostrof -- "Al-Baqarah" == "al baqarah" == "albaqoroh"? (yg terakhir tetap beda, ini bukan fuzzy typo-correction, cuma normalisasi format)
}

async function getSurahList() {
  const isStale = Date.now() - surahListCachedAt > CACHE_TTL_MS;
  if (surahListCache && !isStale) return surahListCache;

  const res = await axios.get(`${BASE_URL}/surat`, { timeout: 20000 });
  const list = res.data?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Daftar surat kosong/gak sesuai format dari equran.id");
  }
  surahListCache = list;
  surahListCachedAt = Date.now();
  return list;
}

/**
 * Cari nomor surat dari input user, bisa berupa:
 * - nomor langsung ("2", "36")
 * - nama latin ("Al-Baqarah", "albaqarah", "yasin", "Yaasiin")
 * Return null kalau gak ketemu.
 */
async function findSurah(query) {
  const list = await getSurahList();
  const trimmed = String(query).trim();

  if (/^\d+$/.test(trimmed)) {
    const nomor = parseInt(trimmed, 10);
    return list.find((s) => s.nomor === nomor) || null;
  }

  const target = normalize(trimmed);
  // 1) exact match dulu (setelah normalisasi)
  let found = list.find((s) => normalize(s.namaLatin) === target);
  if (found) return found;
  // 2) kalau gak ada exact match, coba partial match (mis. user cuma ketik "baqarah" tanpa "al")
  found = list.find((s) => normalize(s.namaLatin).includes(target) || target.includes(normalize(s.namaLatin)));
  return found || null;
}

async function getSurahDetail(nomor) {
  const res = await axios.get(`${BASE_URL}/surat/${nomor}`, { timeout: 20000 });
  return res.data?.data || null;
}

/**
 * Ambil tafsir (Kemenag RI) satu surat penuh -- responnya array tafsir per-ayat
 * (field "ayat" = nomor ayat, "teks" = isi tafsirnya). Dipanggil sekali per surat
 * (bukan per ayat) jadi kalau ada range, kita filter di sisi kita aja.
 */
async function getTafsir(nomor) {
  const res = await axios.get(`${BASE_URL}/tafsir/${nomor}`, { timeout: 20000 });
  return res.data?.data?.tafsir || null;
}

module.exports = { findSurah, getSurahDetail, getTafsir, getSurahList };
