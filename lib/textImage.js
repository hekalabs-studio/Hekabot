// sharp di-load LAZY (baru di-require pas dipakai), supaya kalau library ini gak
// tersedia di platform tertentu (misal Termux/Android, gak ada binary sharp buat itu),
// yang error cuma FITUR yang butuh sharp, bukan bikin SELURUH BOT gagal start.
let _sharp;
function getSharp() {
  if (_sharp === undefined) {
    try {
      _sharp = require("sharp");
    } catch {
      _sharp = null;
    }
  }
  if (!_sharp) {
    throw new Error(
      "Fitur ini butuh library 'sharp' yang gak didukung di platform ini (kemungkinan Termux/Android, " +
      "sharp cuma ada binary buat Windows/Linux/Mac). Jalankan fitur ini di komputer biasa, bukan Termux."
    );
  }
  return _sharp;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bagi teks jadi baris-baris supaya muat di lebar tertentu (perkiraan berbasis jumlah karakter) */
function wrapText(text, maxCharsPerLine) {
  const maxChars = Math.max(1, maxCharsPerLine);
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    let remaining = word;
    while (remaining.length > 0) {
      const room = maxChars - current.length - (current ? 1 : 0);

      if (remaining.length <= room) {
        current = current ? `${current} ${remaining}` : remaining;
        remaining = "";
      } else if (remaining.length <= maxChars) {
        if (current) lines.push(current);
        current = remaining;
        remaining = "";
      } else if (room > 0) {
        const chunk = remaining.slice(0, room);
        current = current ? `${current} ${chunk}` : chunk;
        remaining = remaining.slice(room);
        lines.push(current);
        current = "";
      } else {
        lines.push(current);
        current = "";
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Perkiraan lebar rata-rata 1 karakter untuk font Arial (dalam satuan fontSize) */
function estimateCharWidth(fontSize) {
  return fontSize * 0.58;
}

/** Bungkus teks berdasarkan perkiraan lebar piksel asli (bukan cuma jumlah karakter tetap) */
function wrapByPixelWidth(text, fontSize, maxWidth) {
  const maxChars = Math.max(1, Math.floor(maxWidth / estimateCharWidth(fontSize)));
  return wrapText(text, maxChars);
}

/**
 * Gambar ala "brat" - background putih (atau hijau neon), huruf kecil semua,
 * rata kiri-atas, dengan efek blur tipis (ciri khas "brat").
 */
async function makeBratImage(text, { size = 512, neon = false } = {}) {
  const bg = neon ? "#8ace00" : "#ffffff";
  const fg = "#000000";
  const lowerText = String(text).toLowerCase();
  const padding = size * 0.09;
  const maxWidth = size - padding * 2;
  const maxHeight = size - padding * 2;

  let fontSize = 96;
  let lines = wrapByPixelWidth(lowerText, fontSize, maxWidth);
  while (fontSize > 34 && lines.length * fontSize * 1.05 > maxHeight) {
    fontSize -= 4;
    lines = wrapByPixelWidth(lowerText, fontSize, maxWidth);
  }

  const lineHeight = fontSize * 1.05;
  const startY = padding + fontSize;

  const tspans = lines
    .map((line, i) => `<tspan x="${padding}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
          fill="${fg}" font-weight="400" letter-spacing="-1">${tspans}</text>
  </svg>`;

  return getSharp()(Buffer.from(svg)).blur(0.7).png().toBuffer();
}

/** Kartu quote sederhana - background gelap, teks putih besar */
async function makeQuoteCard(text, { size = 512, bg = "#111111", fg = "#ffffff" } = {}) {
  const lines = wrapText(text, 20);
  const fontSize = Math.max(24, Math.min(48, Math.floor(size / (lines.length + 3))));
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = size / 2 - totalHeight / 2 + fontSize * 0.8;

  const tspans = lines
    .map((line, i) => `<tspan x="${size / 2}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}"
          fill="${fg}" font-weight="bold">${tspans}</text>
  </svg>`;

  return getSharp()(Buffer.from(svg)).png().toBuffer();
}

const NAME_COLORS = ["#e17076", "#7bc862", "#5a9ee6", "#a695e7", "#ee7aae", "#3fb7bb", "#faa774", "#7cc576"];

function colorForName(name) {
  let hash = 0;
  const str = String(name || "?");
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

/** Crop foto profil jadi bulat (circular mask) */
async function circularAvatar(avatarBuffer, size) {
  const sharpLib = getSharp();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  const resized = await sharpLib(avatarBuffer).resize(size, size, { fit: "cover" }).png().toBuffer();
  return sharpLib(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

/** Avatar bulat default (inisial huruf) kalau foto profil tidak ada */
async function initialsAvatar(name, size) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  const color = colorForName(name);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
          font-size="${size * 0.45}" fill="white" font-weight="bold">${escapeXml(initial)}</text>
  </svg>`;
  return getSharp()(Buffer.from(svg)).png().toBuffer();
}

/**
 * Kartu Quote V2 - Teks Ekstra Jelas & Tajam (High-Contrast Large Font)
 */
async function makeQuoteCardV2(senderName, text, avatarBuffer) {
  const sharpLib = getSharp();
  const canvasWidth = 600; // Menggunakan lebar ideal stiker
  const marginX = 16;

  // 1. Element Dimensions (Diperbesar)
  const avatarSize = 80;
  const avatarX = marginX;
  const bubbleX = avatarX + avatarSize + 16;
  const maxBubbleWidth = canvasWidth - bubbleX - marginX;

  const bubbleColor = "#182533"; // Dark Mode Background
  const nameColor = colorForName(senderName);
  const bubblePaddingX = 24;
  const bubblePaddingY = 20;

  // Ukuran Nama
  const nameFontSize = 32;
  const rawName = senderName || "Seseorang";
  const maxNameWidth = maxBubbleWidth - bubblePaddingX * 2 - 30;
  const maxNameChars = Math.max(3, Math.floor(maxNameWidth / estimateCharWidth(nameFontSize)));
  const displayName = rawName.length > maxNameChars ? rawName.slice(0, maxNameChars - 1).trimEnd() + "…" : rawName;

  // 2. Ukuran Teks Quote (Diperbesar signifikan)
  const displayText = String(text || "");
  let fontSize = 36; // Ukuran font awal besar
  const minFontSize = 22;

  let lines = wrapByPixelWidth(displayText, fontSize, maxBubbleWidth - bubblePaddingX * 2);
  let lineHeight = fontSize * 1.35;
  let textHeight = lines.length * lineHeight;
  let bubbleHeight = nameFontSize + 16 + textHeight + bubblePaddingY * 2 + 15;

  // Perkecil font HANYA jika teks sangat panjang
  while (fontSize > minFontSize && bubbleHeight > 700) {
    fontSize -= 2;
    lines = wrapByPixelWidth(displayText, fontSize, maxBubbleWidth - bubblePaddingX * 2);
    lineHeight = fontSize * 1.35;
    textHeight = lines.length * lineHeight;
    bubbleHeight = nameFontSize + 16 + textHeight + bubblePaddingY * 2 + 15;
  }

  // Hitung Lebar Bubble
  const longestLine = lines.reduce((a, b) => (b.length > a.length ? b : a), "");
  const textWidth = Math.round(longestLine.length * estimateCharWidth(fontSize));
  const nameWidth = Math.round(displayName.length * estimateCharWidth(nameFontSize));

  const bubbleWidth = Math.min(
    maxBubbleWidth,
    Math.max(220, Math.max(textWidth, nameWidth) + bubblePaddingX * 2 + 40)
  );
  const bubbleRadius = 22;

  // 3. Canvas Height Pas Sesuai Konten (Anti Space Kosong)
  const canvasHeight = Math.max(avatarSize + (marginX * 2), bubbleHeight + (marginX * 2));
  const startY = marginX;
  const avatarY = startY;
  const bubbleY = startY;

  // Posisi Teks & Render
  const nameY = bubbleY + bubblePaddingY + nameFontSize - 2;
  const textStartY = nameY + 16 + fontSize * 0.85;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${bubbleX + bubblePaddingX}" y="${textStartY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  // Timestamp
  const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  const timeX = bubbleX + bubbleWidth - bubblePaddingX - 5;
  const timeY = bubbleY + bubbleHeight - 12;

  // Ekor Bubble Segitiga
  const tailPath = `M ${bubbleX} ${bubbleY + 28} L ${bubbleX - 12} ${bubbleY + 20} L ${bubbleX} ${bubbleY + 12} Z`;

  // SVG Markup
  const cardSvg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
    <!-- Bubble Background -->
    <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="${bubbleRadius}" ry="${bubbleRadius}" fill="${bubbleColor}"/>
    <path d="${tailPath}" fill="${bubbleColor}"/>
    
    <!-- Nama Pengirim (Bold & Clear) -->
    <text x="${bubbleX + bubblePaddingX}" y="${nameY}" font-family="Arial, Helvetica, sans-serif"
          font-size="${nameFontSize}" font-weight="bold" fill="${nameColor}">${escapeXml(displayName)}</text>
    
    <!-- Isi Teks (Bold & Big) -->
    <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600"
          fill="#ffffff">${tspans}</text>

    <!-- Timestamp Waktu -->
    <text x="${timeX}" y="${timeY}" text-anchor="end" font-family="Arial, Helvetica, sans-serif"
          font-size="18" font-weight="bold" fill="#7289da">${timeStr}</text>
  </svg>`;

  const base = sharpLib(Buffer.from(cardSvg));
  const avatarPng = avatarBuffer ? await circularAvatar(avatarBuffer, avatarSize) : await initialsAvatar(senderName, avatarSize);

  return base.composite([{ input: avatarPng, left: avatarX, top: Math.round(avatarY) }]).png().toBuffer();
}

/** Overlay teks meme klasik (putih + outline hitam) di atas/bawah gambar */
async function overlayMemeText(imageBuffer, { top = "", bottom = "" } = {}) {
  const sharpLib = getSharp();
  let img = sharpLib(imageBuffer);
  let meta = await img.metadata();
  let w = meta.width || 512;
  let h = meta.height || 512;

  const MIN_DIMENSION = 800;
  if (Math.min(w, h) < MIN_DIMENSION) {
    const scale = MIN_DIMENSION / Math.min(w, h);
    const newW = Math.round(w * scale);
    const newH = Math.round(h * scale);
    img = sharpLib(await img.resize(newW, newH, { kernel: "lanczos3" }).toBuffer());
    w = newW;
    h = newH;
  }

  const padding = w * 0.045;
  const maxWidth = w - padding * 2;
  const minFontSize = Math.max(14, Math.floor(w / 30));

  function buildBlock(text) {
    if (!text) return null;
    let line = String(text).toUpperCase().replace(/\s+/g, " ").trim();
    let fontSize = Math.floor(Math.max(w, h) / 6.5);

    while (fontSize > minFontSize && line.length * estimateCharWidth(fontSize) > maxWidth) {
      fontSize -= 2;
    }

    const maxChars = Math.max(3, Math.floor(maxWidth / estimateCharWidth(fontSize)));
    if (line.length > maxChars) {
      line = line.slice(0, maxChars - 1).trimEnd() + "…";
    }

    return { line, fontSize };
  }

  function renderBlock(block, anchorY, direction) {
    if (!block) return "";
    const { line, fontSize } = block;
    const strokeWidth = Math.max(1.5, fontSize / 22);
    const y = direction === "down" ? anchorY + fontSize : anchorY;

    return `<text x="50%" y="${y}" text-anchor="middle" font-family="Impact, 'Arial Black', 'Liberation Sans', sans-serif"
              font-size="${fontSize}" fill="white" stroke="black" stroke-width="${strokeWidth}"
              stroke-linejoin="round" font-weight="900">${escapeXml(line)}</text>`;
  }

  const topBlock = buildBlock(top);
  const bottomBlock = buildBlock(bottom);
  const topSvg = renderBlock(topBlock, padding, "down");
  const bottomSvg = renderBlock(bottomBlock, h - padding, "up");

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${topSvg}${bottomSvg}</svg>`;

  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

/** Overlay bar semi-transparan + teks quote di bagian bawah gambar */
async function overlayQuoteBar(imageBuffer, text) {
  const img = getSharp()(imageBuffer);
  const meta = await img.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const fontSize = Math.floor(w / 16);
  const lines = wrapText(text, 28);
  const barHeight = Math.min(h * 0.4, lines.length * fontSize * 1.4 + 30);

  const tspans = lines
    .map((line, i) => `<tspan x="20" dy="${i === 0 ? fontSize : fontSize * 1.3}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${h - barHeight}" width="${w}" height="${barHeight}" fill="black" fill-opacity="0.55"/>
    <text y="${h - barHeight + 10}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white">${tspans}</text>
  </svg>`;

  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

/** Watermark teks kecil di pojok kanan bawah gambar */
async function addWatermark(imageBuffer, text) {
  const img = getSharp()(imageBuffer);
  const meta = await img.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const fontSize = Math.floor(w / 20);

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="${w - 10}" y="${h - 10}" text-anchor="end" font-family="Arial, sans-serif"
          font-size="${fontSize}" fill="white" fill-opacity="0.9" stroke="black" stroke-width="1">
      ${escapeXml(text)}
    </text>
  </svg>`;

  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

module.exports = {
  makeBratImage,
  makeQuoteCard,
  makeQuoteCardV2,
  overlayMemeText,
  overlayQuoteBar,
  addWatermark,
  wrapText,
  escapeXml,
};