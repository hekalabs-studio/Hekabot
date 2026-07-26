// Generator gambar/teks ala "brat" pakai @napi-rs/canvas.
// Perbaikan Final: Proteksi ketat kata panjang agar tidak meluber keluar area kanvas.
const { createCanvas } = require("@napi-rs/canvas");

/** 
 * Memecah kalimat panjang menjadi array baris berdasarkan batas lebar piksel maksimal.
 */
function wrapWordsExact(ctx, text, maxWidth, scaleX) {
  const words = String(text).split(" ").filter(Boolean);
  if (words.length === 0) return [[""]];

  const lines = [];
  let currentLine = [words[0]];
  let currentTextWidth = Math.ceil(ctx.measureText(words[0]).width * scaleX);

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const wordWidth = Math.ceil(ctx.measureText(" " + word).width * scaleX);
    
    if (currentTextWidth + wordWidth < maxWidth) {
      currentLine.push(word);
      currentTextWidth += wordWidth;
    } else {
      lines.push(currentLine);
      currentLine = [word];
      currentTextWidth = Math.ceil(ctx.measureText(word).width * scaleX);
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Menggambar kata-kata dengan transformasi skala X agar huruf kurus tinggi,
 * sekaligus menghitung celah justify rata kanan-kiri kanvas.
 */
function drawJustifiedLine(ctx, words, x, y, maxWidth, scaleX) {
  ctx.textAlign = "left";

  if (words.length === 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, 1);
    ctx.fillText(words[0], 0, 0);
    ctx.restore();
    return;
  }

  const wordWidths = words.map((w) => Math.ceil(ctx.measureText(w).width * scaleX));
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
  const totalGaps = words.length - 1;
  
  const gapWidth = (maxWidth - totalWordsWidth) / totalGaps;

  let cursorX = x;
  for (let i = 0; i < words.length; i++) {
    ctx.save();
    ctx.translate(cursorX, y);
    ctx.scale(scaleX, 1); 
    ctx.fillText(words[i], 0, 0);
    ctx.restore();

    cursorX += wordWidths[i] + gapWidth;
  }
}

/**
 * Fungsi Utama Pembuat Gambar Brat Font Kurus & Tinggi (Anti-Potong)
 */
async function makeBratImage(text, { size = 512, neon = false } = {}) {
  const mainCanvas = createCanvas(size, size);
  const mainCtx = mainCanvas.getContext("2d");

  const textCanvas = createCanvas(size, size);
  const textCtx = textCanvas.getContext("2d");

  // 1. Set warna latar belakang
  mainCtx.fillStyle = neon ? "#8ace00" : "#FFFFFF";
  mainCtx.fillRect(0, 0, size, size);

  // 2. Set gaya teks dasar
  textCtx.fillStyle = "#000000";
  textCtx.textBaseline = "middle";

  const bratText = String(text).toLowerCase();
  
  // Gunakan padding 25 untuk memberikan ruang bernapas (margin) di sisi kanan-kiri
  const padding = 25; 
  const maxWidth = size - padding * 2;
  const maxHeight = size - padding * 2;

  // Skala kompresi horizontal agar huruf kurus tinggi jangkung
  const scaleX = 0.72; 

  // 3. Loop dinamis mencari ukuran font yang murni muat secara vertikal DAN horizontal
  let fontSize = 144; 
  let lines;
  let lineHeight;
  
  do {
    textCtx.font = `${fontSize}px "Arial Narrow", Arial, sans-serif`;
    lines = wrapWordsExact(textCtx, bratText, maxWidth, scaleX);
    lineHeight = fontSize * 0.98;
    
    // PERBAIKAN UTAMA: Validasi apakah ada baris tunggal yang lebarnya nekat melebihi maxWidth
    let isAnyLineTooWide = false;
    for (const line of lines) {
      // Hitung total lebar baris jika digabungkan
      const lineText = line.join(" ");
      const lineWidth = Math.ceil(textCtx.measureText(lineText).width * scaleX);
      if (lineWidth > maxWidth) {
        isAnyLineTooWide = true;
        break;
      }
    }

    // Loop HANYA boleh berhenti jika tinggi total muat DAN tidak ada satu pun baris yang kepanjangan
    if (lines.length * lineHeight <= maxHeight && !isAnyLineTooWide) {
      break;
    }
    
    fontSize -= 4; // Kecilkan ukuran font secara agresif jika teks masih meluber
  } while (fontSize > 16);

  // 4. Gambar tiap baris teks menggunakan efek kurus + justify paksa
  const startY = padding + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    drawJustifiedLine(textCtx, lines[i], padding, startY + i * lineHeight, maxWidth, scaleX);
  }

  // 5. Berikan efek blur tipis global satu kali di akhir
  mainCtx.filter = "blur(2px)";
  mainCtx.drawImage(textCanvas, 0, 0);

  return mainCanvas.toBuffer("image/png");
}

module.exports = { makeBratImage };
