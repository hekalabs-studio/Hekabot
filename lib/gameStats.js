/**
 * Pelacak jumlah kemenangan game per-user - PERSISTEN ke file (data/gamestats.json),
 * sama kayak lib/userStore.js buat data pendaftaran. Jadi kalau bot di-restart, statistik
 * kemenangan TETAP ADA, gak balik ke 0.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "gamestats.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {}; // { [jid]: { [gameName]: winCount } }
  }
}

function saveStore() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

let store = loadStore();

/** Catat 1 kemenangan buat `jid` di game `gameName`. */
function recordWin(jid, gameName) {
  if (!jid || !gameName) return;
  if (!store[jid]) store[jid] = {};
  store[jid][gameName] = (store[jid][gameName] || 0) + 1;
  saveStore();
}

/** Ambil semua statistik kemenangan punya 1 orang -- return { [gameName]: winCount }. */
function getStats(jid) {
  return store[jid] || {};
}

/** Total gabungan semua kemenangan (semua game digabung) punya 1 orang. */
function getTotalWins(jid) {
  const stats = getStats(jid);
  return Object.values(stats).reduce((sum, n) => sum + n, 0);
}

module.exports = { recordWin, getStats, getTotalWins };
