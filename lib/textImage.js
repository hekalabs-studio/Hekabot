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

  for (const word of words) {
    let remaining = word;
    while (remaining.length > 0) {
      const room = maxChars - current.length - (current ? 1 : 0); // -1 buat spasi kalau baris udah ada isinya

      if (remaining.length <= room) {
        // Muat penuh di sisa baris sekarang
        current = current ? `${current} ${remaining}` : remaining;
        remaining = "";
      } else if (remaining.length <= maxChars) {
        // Gak muat di SISA baris sekarang, tapi kata ini masih muat kalau ditaruh di baris
        // baru -- pindah baris biasa, jangan dipaksa kepotong padahal kata ini masih pendek.
        if (current) lines.push(current);
        current = remaining;
        remaining = "";
      } else if (room > 0) {
        // Kata ini emang lebih panjang dari 1 baris penuh (misal ketikan tanpa spasi sama
        // sekali) -- penuhi dulu sisa ruang baris sekarang sebelum mulai baris baru, biar
        // tiap baris terisi rapat (gak nyisain ruang kosong yang bikin hasil wrap keliatan
        // berantakan/ganjil kayak baris pendek nyempil sendirian).
        const chunk = remaining.slice(0, room);
        current = current ? `${current} ${chunk}` : chunk;
        remaining = remaining.slice(room);
        lines.push(current);
        current = "";
      } else {
        // Udah gak ada sisa ruang sama sekali di baris sekarang -> mulai baris baru
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
 * Kartu quote gaya "chat bubble" - nama pengirim di atas, avatar bulat mengambang di kiri,
 * speech bubble warna solid di kanannya lengkap dengan ekor kecil yang nunjuk balik ke
 * avatar. Teks ditampilkan persis seperti yang diketik user (gak dipaksa uppercase).
 * Font-size otomatis mengecil kalau teksnya panjang biar selalu muat di dalam bubble.
 * @param {string} senderName - nama pengirim, ditampilkan di atas bubble
 * @param {string} text - isi pesan
 * @param {Buffer|null} avatarBuffer - foto profil (null kalau gak ada/gak bisa diakses)
 */
async function makeQuoteCardV2(senderName, text, avatarBuffer) {
  const sharpLib = getSharp();
  const canvasSize = 512;

  const marginX = 24;
  const avatarSize = 104;
  const avatarX = marginX;
  const headerGap = 18; // jarak antara tepi avatar dan mulai teks nama
  const bubbleColor = "#00a3ff";
  const bubblePaddingX = 28;
  const bubblePaddingY = 24;
  const baseNameFontSize = 56; // ukuran maksimal buat nama pendek
  const minNameFontSize = 24; // gak dikecilin lebih dari ini, biar tetep kebaca
  const rowGap = 24; // jarak antara baris avatar+nama dengan bubble di bawahnya
  const nameColor = colorForName(senderName);

  // Avatar dan nama SEJAJAR dalam satu baris (nama di sebelah kanan avatar)
  const nameX = avatarX + avatarSize + headerGap;
  const bubbleX = marginX;
  const maxBubbleWidth = canvasSize - marginX * 2;

  const rawName = senderName || "Seseorang";
  const maxNameWidth = canvasSize - nameX - 16;

  // Makin panjang nama-nya, makin kecil font-nya (bukan langsung dipotong "...") --
  // dikecilin dulu sampai muat, kalau di ukuran minimal masih kepanjangan BARU dipotong.
  let nameFontSize = baseNameFontSize;
  while (nameFontSize > minNameFontSize && rawName.length * estimateCharWidth(nameFontSize) > maxNameWidth) {
    nameFontSize -= 2;
  }
  const maxNameChars = Math.max(3, Math.floor(maxNameWidth / estimateCharWidth(nameFontSize)));
  const displayName = rawName.length > maxNameChars ? rawName.slice(0, maxNameChars - 1).trimEnd() + "…" : rawName;

  const maxBubbleHeight = canvasSize - avatarSize - rowGap - 40;

  const displayText = String(text);
  let fontSize = 46;
  let lines = wrapByPixelWidth(displayText, fontSize, maxBubbleWidth - bubblePaddingX * 2);
  let lineHeight = fontSize * 1.22;
  let bubbleHeight = lines.length * lineHeight + bubblePaddingY * 2;

  // Kalau teksnya panjang dan bubble bakal kegedean, kecilkan font sampai muat
  while (fontSize > 22 && bubbleHeight > maxBubbleHeight) {
    fontSize -= 2;
    lines = wrapByPixelWidth(displayText, fontSize, maxBubbleWidth - bubblePaddingX * 2);
    lineHeight = fontSize * 1.22;
    bubbleHeight = lines.length * lineHeight + bubblePaddingY * 2;
  }

  // Lebar bubble ngikutin baris terpanjang (biar gak kelebaran kalau teksnya pendek)
  const longestLine = lines.reduce((a, b) => (b.length > a.length ? b : a), "");
  const bubbleWidth = Math.min(
    maxBubbleWidth,
    Math.max(190, Math.round(longestLine.length * estimateCharWidth(fontSize) + bubblePaddingX * 2))
  );
  const bubbleRadius = Math.min(36, bubbleHeight / 2.4);

  // Layout dari atas ke bawah: baris [avatar + nama] duluan, BARU bubble chat di bawahnya.
  const headerTopRel = 0;
  const nameBaselineYRel = headerTopRel + avatarSize / 2 + nameFontSize * 0.35; // nama center-align sama avatar
  const bubbleYRel = headerTopRel + avatarSize + rowGap;
  const avatarYRel = headerTopRel;

  const groupTop = headerTopRel;
  const groupBottom = bubbleYRel + bubbleHeight;
  const verticalOffset = Math.round((canvasSize - (groupBottom - groupTop)) / 2 - groupTop);

  const avatarY = avatarYRel + verticalOffset;
  const bubbleY = bubbleYRel + verticalOffset;
  const nameBaselineY = nameBaselineYRel + verticalOffset;

  const textStartY = bubbleY + bubblePaddingY + fontSize * 0.85;
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${bubbleX + bubblePaddingX}" y="${textStartY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  // Ekor kecil segitiga nunjuk ke atas (ke arah baris avatar+nama), nempel di tepi kiri-atas bubble
  const tailAttachX = bubbleX + Math.min(48, bubbleWidth * 0.25);
  const tailPath = `M ${tailAttachX} ${bubbleY}
    L ${tailAttachX - 14} ${bubbleY - 20}
    L ${tailAttachX + 22} ${bubbleY} Z`;

  const cardSvg = `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
    <text x="${nameX}" y="${nameBaselineY}" font-family="Arial, Helvetica, sans-serif"
          font-size="${nameFontSize}" font-weight="800" fill="${nameColor}">${escapeXml(displayName)}</text>
    <path d="${tailPath}" fill="${bubbleColor}"/>
    <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="${bubbleRadius}" ry="${bubbleRadius}" fill="${bubbleColor}"/>
    <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600"
          fill="#ffffff">${tspans}</text>
  </svg>`;

  const base = sharpLib(Buffer.from(cardSvg));

  const avatarPng = avatarBuffer ? await circularAvatar(avatarBuffer, avatarSize) : await initialsAvatar(senderName, avatarSize);

  return base.composite([{ input: avatarPng, left: avatarX, top: Math.round(avatarY) }]).png().toBuffer();
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
