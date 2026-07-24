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
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Bagi teks jadi baris-baris supaya muat di lebar tertentu (perkiraan berbasis jumlah karakter) */
function wrapText(text, maxCharsPerLine) {
  const maxChars = Math.max(1, maxCharsPerLine);
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const w of words) {
    if (w.length > maxChars) {
      // Kata ini sendirian aja udah lebih panjang dari lebar maksimal (misal ketikan tanpa spasi
      // sama sekali) -- kalau dibiarin, baris ini bakal meluber keluar area walau font udah
      // dikecilkan (soalnya logic shrink cuma ngitung JUMLAH baris, bukan lebar tiap baris).
      // Makanya kata sepanjang ini WAJIB dipaksa dipecah per potongan biar tetep muat.
      if (current) {
        lines.push(current.trim());
        current = "";
      }
      let remaining = w;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
      continue;
    }

    if ((current + " " + w).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
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
 * Font-size otomatis mengecil kalau teksnya panjang, supaya gak pernah kepotong.
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
  // Kecilkan font kalau baris totalnya bakal meluber ke bawah
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

  // Blur tipis buat nuansa "brat" yang khas (dikurangin dikit biar tetap kebaca jelas)
  return getSharp()(Buffer.from(svg)).blur(0.7).png().toBuffer();
}

/** Kartu quote sederhana - background gelap, teks putih besar (versi lama, tanpa avatar) */
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

/** Avatar bulat default (inisial huruf) kalau foto profil gak ada/gak bisa diakses */
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
 * Kartu quote ala Telegram/Quotly - avatar bulat, nama berwarna, teks di sampingnya.
 * @param {string} senderName - nama pengirim
 * @param {string} text - isi pesan
 * @param {Buffer|null} avatarBuffer - foto profil (null kalau gak ada/gak bisa diakses)
 */
async function makeQuoteCardV2(senderName, text, avatarBuffer) {
  const sharpLib = getSharp();
  const canvasSize = 512;
  const avatarSize = 110;
  const padding = 28;
  const cardX = 24;
  const cardWidth = canvasSize - cardX * 2;
  const maxCardHeight = canvasSize - 32;

  const nameColor = colorForName(senderName);
  const textX = cardX + avatarSize + padding * 1.15;
  const availableTextWidth = cardWidth - avatarSize - padding * 2.3;

  let nameFontSize = 36;
  let textFontSize = 44;
  let lines = wrapByPixelWidth(text, textFontSize, availableTextWidth);
  let lineHeight = textFontSize * 1.28;
  let cardHeight = Math.max(avatarSize + padding * 1.6, nameFontSize + 16 + lines.length * lineHeight + padding * 1.6);

  // Kalau teksnya panjang dan kartu bakal kegedean, kecilkan font sampai muat
  while (cardHeight > maxCardHeight && textFontSize > 20) {
    textFontSize -= 2;
    nameFontSize = Math.max(20, textFontSize - 8);
    lines = wrapByPixelWidth(text, textFontSize, availableTextWidth);
    lineHeight = textFontSize * 1.28;
    cardHeight = Math.max(avatarSize + padding * 1.6, nameFontSize + 16 + lines.length * lineHeight + padding * 1.6);
  }

  const cardY = Math.round((canvasSize - cardHeight) / 2);
  const nameY = cardY + padding + nameFontSize * 0.8;
  const textStartY = nameY + lineHeight * 0.95;

  const tspans = lines
    .map((line, i) => `<tspan x="${textX}" y="${textStartY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const cardSvg = `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="22" ry="22" fill="#ffffff"/>
    <text x="${textX}" y="${nameY}" font-family="Arial, sans-serif" font-size="${nameFontSize}"
          fill="${nameColor}" font-weight="700">${escapeXml(senderName || "Seseorang")}</text>
    <text font-family="Arial, sans-serif" font-size="${textFontSize}" fill="#111111">${tspans}</text>
  </svg>`;

  const base = sharpLib(Buffer.from(cardSvg));

  const avatarPng = avatarBuffer ? await circularAvatar(avatarBuffer, avatarSize) : await initialsAvatar(senderName, avatarSize);

  const avatarX = cardX + Math.round(padding * 0.7);
  const avatarY = cardY + Math.round((cardHeight - avatarSize) / 2);

  return base.composite([{ input: avatarPng, left: avatarX, top: avatarY }]).png().toBuffer();
}

/** Overlay teks meme klasik (putih + outline hitam) di atas/bawah gambar */
/**
 * Overlay teks meme klasik (putih + outline hitam tebal, font Impact, ala meme "DUH GUSTI").
 * Font-size otomatis mengecil kalau teksnya panjang, supaya teks GAK PERNAH kepotong/meluber
 * keluar area gambar -- sama pola kayak makeBratImage.
 */
async function overlayMemeText(imageBuffer, { top = "", bottom = "" } = {}) {
  const img = getSharp()(imageBuffer);
  const meta = await img.metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const padding = w * 0.045;
  const maxWidth = w - padding * 2;
  // Tiap blok teks (atas/bawah) dijatah maks ~34% tinggi gambar, biar 2 blok gak numpuk kalau dipakai bareng
  const maxBlockHeight = h * 0.34;
  const minFontSize = Math.max(16, Math.floor(w / 22));

  function buildBlock(text) {
    if (!text) return null;
    const upper = String(text).toUpperCase();
    let fontSize = Math.floor(Math.max(w, h) / 6.5);
    let lines = wrapByPixelWidth(upper, fontSize, maxWidth);

    while (fontSize > minFontSize && lines.length * (fontSize * 1.12) > maxBlockHeight) {
      fontSize -= 2;
      lines = wrapByPixelWidth(upper, fontSize, maxWidth);
    }
    return { lines, fontSize };
  }

  function renderBlock(block, anchorY, direction) {
    if (!block) return "";
    const { lines, fontSize } = block;
    const lineHeight = fontSize * 1.12;
    const strokeWidth = Math.max(2, fontSize / 14);
    // "down": teks ngalir ke bawah mulai dari anchorY (dipakai buat teks atas)
    // "up": teks ngalir ke atas, baris TERAKHIR pas di anchorY (dipakai buat teks bawah)
    const startY = direction === "down" ? anchorY + fontSize : anchorY - (lines.length - 1) * lineHeight;

    const tspans = lines
      .map((line, i) => `<tspan x="50%" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
      .join("");

    return `<text text-anchor="middle" font-family="Impact, 'Arial Black', 'Liberation Sans', sans-serif"
              font-size="${fontSize}" fill="white" stroke="black" stroke-width="${strokeWidth}"
              stroke-linejoin="round" font-weight="900">${tspans}</text>`;
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
