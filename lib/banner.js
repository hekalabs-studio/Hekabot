const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/**
 * Cari file banner di folder assets/ berdasarkan nama base-nya.
 * Contoh: getBannerPath("banner_menu") bakal cari banner_menu.jpg / .jpeg / .png / .webp
 * Return path-nya kalau ada, null kalau gak ada.
 */
function getBannerPath(baseName = "banner_menu") {
  for (const ext of EXTENSIONS) {
    const p = path.join(ASSETS_DIR, `${baseName}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = { getBannerPath, ASSETS_DIR };
