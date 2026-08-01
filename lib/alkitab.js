const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Ambil ayat Alkitab dari alkitab.sabda.org berdasarkan referensi (mis. "Yohanes 3:16").
 *
 * CATATAN PENTING (per Agustus 2026): endpoint lama `alkitab.sabda.org/api/passage/<ref>`
 * yang dipakai versi sebelumnya SUDAH TIDAK ADA/tidak dikenali lagi oleh server (itu sebabnya
 * command .alkitab selalu jatuh ke pesan "Sumber ayat lagi gak bisa diakses"). Situsnya sekarang
 * cuma expose halaman `passage.php?mode=text` (bukan API JSON murni, tapi versi HTML ringkas
 * "Bible Text Only" -- lebih bersih dari halaman utamanya yang penuh menu/navigasi).
 * Kalau di masa depan endpoint ini juga berubah lagi, cek ulang lewat browser:
 * https://alkitab.sabda.org/passage.php?passage=<referensi>&mode=text
 */
async function getVerse(reference) {
  const res = await axios.get("https://alkitab.sabda.org/passage.php", {
    params: { passage: reference, mode: "text" },
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0 (HekaBot)" },
  });

  const $ = cheerio.load(res.data);
  // Halaman mode=text isinya: menu versi Alkitab, lalu judul perikop, lalu isi ayat,
  // lalu footer "Sumber: ...". Kita ambil full text body dulu, baru dipotong pakai penanda.
  $("script, style").remove();
  const fullText = $("body").text().replace(/\s+/g, " ").trim();

  // Isi ayat selalu diawali pola "<pasal>:<ayat> " (mis. "3:16 ") -- pola ini gak pernah
  // muncul di bagian menu/navigasi di atasnya, jadi aman dipakai sebagai penanda mulai.
  const startMatch = fullText.match(/\d+:\d+\s/);
  if (!startMatch) return null; // referensi gak valid / kitab gak ketemu / dsb.

  const startIdx = startMatch.index;
  const endIdx = fullText.indexOf("Sumber:", startIdx);
  const raw = (endIdx > -1 ? fullText.slice(startIdx, endIdx) : fullText.slice(startIdx)).trim();

  if (!raw || raw.length < 5) return null;
  // Filter kasus "Boks Temuan" / versi gak punya PL atau PB / hasil kosong.
  if (/tidak memiliki teks|tidak ditemukan/i.test(raw)) return null;

  // Pecah jadi per-ayat berdasarkan penanda "pasal:ayat " -- biar pemanggilnya (commands/internet.js)
  // bisa nampilin nomor ayat cuma sekali per ayat (gak dobel sama header), dan bisa nge-format
  // rapi kalau referensinya berupa range beberapa ayat sekaligus.
  const markers = [...raw.matchAll(/(\d+:\d+)\s/g)];
  const verses = markers.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : raw.length;
    return { ref: m[1], text: raw.slice(start, end).trim() };
  });

  return verses.length ? verses : null;
}

module.exports = { getVerse };
