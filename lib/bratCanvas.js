// Generator gambar/teks ala "brat" pakai @napi-rs/canvas.
// Perbaikan Final: Proteksi ketat kata panjang agar tidak meluber keluar area kanvas.
const { createCanvas } = require("@napi-rs/canvas");
const { registerFonts, getEmojiFontFamily } = require("./fontRegistry");

// Auto-load & register font kustom (termasuk font emoji kalau ada) dari assets/fonts.
// Sekali jalan aja per proses -- lihat lib/fontRegistry.js buat detail & cara nambah font emoji.
registerFonts();

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
// 10 pilihan warna latar buat .brat/.bratvid (selain default putih bawaan). Dipilih warna-warna
// yang cukup TERANG/CERAH biar teks item (yang WARNANYA SELALU HITAM, gak berubah-ubah) tetap
// gampang dibaca -- sama kayak estetika asli "brat" (warna solid cerah + teks hitam kecil).
// "hijau" sengaja dipertahankan kode warna yang SAMA PERSIS kayak sebelumnya (`neon: true` versi
// lama), biar orang yang udah biasa pakai `.brat hijau` sebelumnya gak notice bedanya sama sekali.
const BRAT_COLORS = {
  hijau: "#8ace00",
  merah: "#ff5c5c",
  biru: "#5cb3ff",
  kuning: "#fff45c",
  pink: "#ff8dc7",
  ungu: "#c9a0ff",
  oranye: "#ffa54d",
  tosca: "#5cf0e0",
  abuabu: "#d3d3d3",
  coklat: "#d2a679",
};

async function makeBratImage(text, { size = 512, bgColor = "#FFFFFF", _useEmojiFont = true } = {}) {
  const mainCanvas = createCanvas(size, size);
  const mainCtx = mainCanvas.getContext("2d");

  const textCanvas = createCanvas(size, size);
  const textCtx = textCanvas.getContext("2d");

  // 1. Set warna latar belakang
  mainCtx.fillStyle = bgColor;
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

  // Kalau ada font emoji yang terdaftar (assets/fonts), taruh di paling depan font stack.
  // Skia/canvas otomatis "fallback" ke font ini per-karakter kalau glyph-nya gak ada di
  // Arial Narrow/Arial (persis kayak emoji), jadi teks biasa tetap pakai Arial Narrow seperti
  // biasa dan cuma emoji-nya aja yang diambil dari font emoji itu.
  //
  // `_useEmojiFont` (parameter internal, bukan buat dipanggil dari luar) dipakai buat FALLBACK:
  // di sebagian sistem/kombinasi font tertentu, font emoji custom bisa bikin rendering native-nya
  // gagal (hasil gambar kosong/rusak, biasanya kelihatan dari warning GLib-GObject di log) --
  // kalau itu kejadian, lihat retry logic di makeBratImageSafe() di bawah, yang manggil ulang
  // fungsi ini dengan `_useEmojiFont: false` biar minimal teksnya tetap jadi (emoji-nya aja
  // yang gak berwarna/tampil kotak, daripada gagal total gak ada sticker sama sekali).
  const emojiFamily = _useEmojiFont ? getEmojiFontFamily() : null;
  const fontStack = emojiFamily
    ? `"${emojiFamily}", "Arial Narrow", Arial, sans-serif`
    : `"Arial Narrow", Arial, sans-serif`;

  // 3. Loop dinamis mencari ukuran font yang murni muat secara vertikal DAN horizontal
  let fontSize = 144; 
  let lines;
  let lineHeight;
  
  do {
    textCtx.font = `${fontSize}px ${fontStack}`;
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

// Kalau font emoji custom ketauan bikin hasil korup/error, diinget di sini (SEKALI ketauan,
// buat SISA proses bot jalan) -- biar request BERIKUTNYA gak perlu buang waktu nyoba+gagal lagi
// (di kasus nyata yang dilaporkan, satu percobaan yang gagal itu makan waktu 10+ detik sebelum
// akhirnya ketauan error -- kalau tiap orang yang minta `.brat` harus nunggu 10 detik gagal
// dulu baru dapet hasil dari fallback, itu pengalaman yang buruk banget).
let emojiFontKnownBroken = false;

/**
 * Cek cepat apakah buffer itu PNG yang valid (magic bytes + ukuran wajar).
 *
 * CATATAN PERUBAHAN: sempat dicoba diperketat pakai `sharp` buat beneran decode isinya (bukan
 * cuma ngintip byte awal) -- tapi itu DIBATALKAN. Alasannya: ada indikasi kuat (dari laporan
 * nyata di Windows) kalau `@napi-rs/canvas` (dipakai di worker thread ini) dan `sharp` bisa
 * saling ganggu kalau dipakai BARENGAN dalam proses/thread yang sama di sistem tertentu --
 * manggil `sharp` di SINI (di dalam worker thread yang sama tempat canvas jalan) berisiko
 * MEMPERPARAH masalah itu, bukan membantu. Makanya balik ke pengecekan ringan (gak melibatkan
 * `sharp` sama sekali di sini) -- kurang menyeluruh, tapi lebih aman gak nambah faktor risiko.
 */
function isValidPng(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length > 100 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  );
}

/**
 * Wrapper aman buat makeBratImage(): kalau hasilnya kosong/rusak (kejadian yang pernah
 * dilaporkan di sebagian sistem, biasanya bareng warning GLib-GObject di log -- kemungkinan
 * ketidakcocokan antara font emoji custom dengan library rendering native di sistem tertentu),
 * otomatis DICOBA ULANG SEKALI TANPA font emoji custom. Jadi minimal teksnya tetap jadi sticker
 * (emoji-nya aja yang gak tampil berwarna/jadi kotak) -- daripada gagal total gak dapet apa-apa.
 *
 * Dibungkus try/catch juga di SETIAP percobaan (bukan cuma cek buffer-nya doang) -- soalnya
 * kegagalannya bisa muncul dalam 2 bentuk: (a) makeBratImage() throw exception langsung, ATAU
 * (b) dia gak throw tapi buffer yang di-return-nya korup. Percobaan pertama nge-fix ini cuma
 * nangani bentuk (b), sekarang dua-duanya ditangani.
 */
async function makeBratImageSafe(text, options = {}) {
  if (!emojiFontKnownBroken) {
    try {
      const buf = await makeBratImage(text, options);
      if (await isValidPng(buf)) return buf;
      console.error(
        "[bratCanvas] Hasil render pakai font emoji custom gak valid/korup (lolos cek awal tapi " +
        "gagal di-decode ulang) -- nyoba ulang TANPA font emoji custom, DAN bakal diinget biar " +
        "request berikutnya gak nyoba jalur ini lagi (biar gak lama-lama tiap kali)."
      );
      emojiFontKnownBroken = true;
    } catch (err) {
      console.error(
        "[bratCanvas] Render dengan font emoji custom throw error:", err.message || err,
        "-- nyoba ulang TANPA font emoji custom, DAN bakal diinget buat request berikutnya."
      );
      emojiFontKnownBroken = true;
    }
  }

  try {
    const fallbackBuf = await makeBratImage(text, { ...options, _useEmojiFont: false });
    if (await isValidPng(fallbackBuf)) return fallbackBuf;
  } catch (err) {
    console.error("[bratCanvas] Fallback TANPA font emoji custom juga throw error:", err.message || err);
  }

  // Dua-duanya tetap gagal -- kemungkinan masalahnya bukan di font sama sekali, lempar error
  // biar ketahuan jelas di log (bukan diem-diem ngirim gambar kosong ke user).
  throw new Error("Gagal render gambar brat (hasil kosong/rusak, dicoba dengan & tanpa font emoji custom).");
}

/**
 * Render SATU karakter/cluster emoji doang (transparan, gak ada background/teks lain) jadi
 * buffer PNG kecil -- dipakai buat nge-fix emoji di command LAIN yang bukan .brat (misal
 * .smeme di lib/textImage.js) yang render tekstnya lewat sharp/SVG (librsvg), bukan canvas.
 *
 * KENAPA INI PERLU: librsvg (dipakai sharp buat render SVG) andelin font emoji dari SISTEM
 * (fontconfig), BUKAN font yang kita daftarin sendiri lewat GlobalFonts.registerFromPath()
 * (itu cuma kevisible ke @napi-rs/canvas/Skia, gak nyambung ke Pango/librsvg). Kalau sistemnya
 * (misal Windows tanpa font emoji yang proper) gak nemu font emoji yang valid, hasilnya jadi
 * kotak/garis hitam (glyph "tofu") -- itu yang dilaporkan user buat .smeme.
 *
 * Fix-nya: emoji-nya di-render TERPISAH lewat @napi-rs/canvas (yang PASTI kepake font emoji
 * kita sendiri, udah kebukti jalan di .brat), hasilnya baru di-composite sebagai <image> ke SVG
 * punya .smeme -- teks non-emoji-nya SAMA SEKALI GAK BERUBAH (font/style/stroke tetap
 * dari kode/SVG asli punya .smeme).
 */
function renderEmojiGlyph(emoji, size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  // Background TRANSPARAN (bukan diisi warna) -- biar pas di-composite ke SVG .smeme,
  // cuma emoji-nya doang yang keliatan, gak nutupin gambar di belakangnya.
  const emojiFamily = getEmojiFontFamily();
  ctx.font = `${Math.floor(size * 0.85)}px "${emojiFamily || "sans-serif"}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.03);
  return canvas.toBuffer("image/png");
}

/**
 * Ukur lebar teks BENERAN (bukan perkiraan kasar per-karakter) pakai canvas -- dipakai KHUSUS
 * buat nentuin posisi emoji di overlayMemeText() (.smeme), soalnya estimasi kasar yang dipakai
 * di tempat lain (estimateCharWidth di lib/textImage.js, dikalibrasi buat font Arial biasa)
 * ternyata terlalu LEBAR buat font Impact/Arial Black yang dipakai .smeme -- Impact itu font
 * yang lebih RAMPING per karakter walau keliatan tebal/bold, jadi estimasi yang kepakai
 * sebelumnya bikin teks "dianggap" lebih lebar dari aslinya, dan itu yang bikin emoji ke-dorong
 * kejauhan ke kanan (ada jarak yang gak seharusnya ada di antara teks & emoji).
 */
function measureText(text, fontSize) {
  const canvas = createCanvas(10, 10); // ukuran gak penting, cuma butuh context buat ngukur
  const ctx = canvas.getContext("2d");
  ctx.font = `900 ${fontSize}px "Impact", "Arial Black", "Liberation Sans", sans-serif`;
  return ctx.measureText(text).width;
}

module.exports = { makeBratImage: makeBratImageSafe, BRAT_COLORS, renderEmojiGlyph, measureText };
