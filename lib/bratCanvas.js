// Generator gambar/teks ala "brat" pakai @napi-rs/canvas (bukan sharp/SVG lagi).
// Dipakai oleh command .brat (gambar) dan .bratvid (video, lewat lib/bratvid.js).
const { createCanvas } = require("@napi-rs/canvas");

/** Pecah teks panjang jadi array baris, tiap baris berupa array kata (buat di-justify per kata) */
function wrapWords(ctx, text, maxWidth) {
  const words = String(text).split(" ").filter(Boolean);
  if (words.length === 0) return [[""]];

  const lines = [];
  let currentLine = [words[0]];
  let currentText = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testText = currentText + " " + word;
    const width = ctx.measureText(testText).width;
    if (width < maxWidth) {
      currentLine.push(word);
      currentText = testText;
    } else {
      lines.push(currentLine);
      currentLine = [word];
      currentText = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Gambar 1 baris dengan alignment "justify" (rata kiri-kanan) - jarak antar kata direnggangkan
 * supaya baris itu pas selebar maxWidth persis, sama seperti gaya asli brat.
 * Baris terakhir (atau baris isi 1 kata) TIDAK di-justify, cukup rata kiri biasa.
 */
function drawJustifiedLine(ctx, words, x, y, maxWidth, isLastLine) {
  ctx.textAlign = "left";

  if (isLastLine || words.length === 1) {
    ctx.fillText(words.join(" "), x, y);
    return;
  }

  const wordWidths = words.map((w) => ctx.measureText(w).width);
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
  const totalGaps = words.length - 1;
  const gapWidth = (maxWidth - totalWordsWidth) / totalGaps;

  let cursorX = x;
  for (let i = 0; i < words.length; i++) {
    ctx.fillText(words[i], cursorX, y);
    cursorX += wordWidths[i] + gapWidth;
  }
}

/**
 * Bikin gambar brat (512x512), background abu-abu muda (#F0F0F0), huruf kecil semua,
 * rata kiri-kanan (justify) per baris, teks mulai dari ATAS (bukan di tengah), dengan
 * efek blur tipis. Font-size gede & otomatis mengecil kalau teksnya panjang biar gak kepotong.
 * Ketik "hijau <teks>" (lewat opsi neon: true) buat versi hijau neon ala album asli.
 */
async function makeBratImage(text, { size = 512, neon = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // 1. Warnai background
  ctx.fillStyle = neon ? "#8ace00" : "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // 2. Efek blur tipis khas album brat
  ctx.filter = "blur(3px)";

  // 3. Atur gaya teks (lowercase & Arial Narrow/Arial)
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";

  const bratText = String(text).toLowerCase();
  const padding = 15;
  const maxWidth = size - padding * 2;
  const maxHeight = size - padding * 2;

  // 4. Cari font-size terbesar yang bikin semua baris tetap muat di dalam canvas
  let fontSize = 96;
  let lines;
  let lineHeight;
  do {
    ctx.font = `bold ${fontSize}px "Arial Narrow", Arial, sans-serif`;
    lines = wrapWords(ctx, bratText, maxWidth);
    lineHeight = fontSize * 1.05;
    if (lines.length * lineHeight <= maxHeight || fontSize <= 24) break;
    fontSize -= 4;
  } while (true);

  // 5. Gambar tiap baris rata kiri-kanan (justify), mulai dari ATAS canvas (bukan tengah)
  const startY = padding + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    const isLastLine = i === lines.length - 1;
    drawJustifiedLine(ctx, lines[i], padding, startY + i * lineHeight, maxWidth, isLastLine);
  }

  // 6. Ubah hasil canvas jadi Buffer gambar PNG
  return canvas.toBuffer("image/png");
}

module.exports = { makeBratImage, wrapWords };
