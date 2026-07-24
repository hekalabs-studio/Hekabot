const fs = require("fs");
const path = require("path");

const BIN_DIR = path.join(__dirname, "..", "bin");

// Lokasi instalasi default yang biasa dipakai installer resmi -- biar gak perlu edit PATH manual
const KNOWN_INSTALL_PATHS = {
  soffice: {
    win32: [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ],
    linux: ["/usr/bin/soffice", "/usr/lib/libreoffice/program/soffice"],
    darwin: ["/Applications/LibreOffice.app/Contents/MacOS/soffice"],
  },
};

/**
 * Cari lokasi sebuah binary (ffmpeg, ffprobe, yt-dlp, soffice, dst), urutan prioritas:
 * 1. Folder `bin/` di dalam project ini (paling diprioritaskan, gak perlu install apapun)
 * 2. Lokasi instalasi default yang umum dipakai installer resmi (soffice dsb, gak perlu edit PATH)
 * 3. Fallback ke PATH sistem (asumsi sudah ter-install & terdaftar di PATH)
 */
function resolveBinary(name) {
  const candidates =
    process.platform === "win32"
      ? [path.join(BIN_DIR, `${name}.exe`), path.join(BIN_DIR, name)]
      : [path.join(BIN_DIR, name)];

  const knownPaths = (KNOWN_INSTALL_PATHS[name] && KNOWN_INSTALL_PATHS[name][process.platform]) || [];
  candidates.push(...knownPaths);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return name; // andalkan PATH sistem
}

module.exports = { resolveBinary, BIN_DIR };
