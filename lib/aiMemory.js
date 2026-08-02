/**
 * Riwayat chat AI per-percakapan (in-memory), biar Gemini inget konteks sebelumnya
 * dalam 1 sesi chat. Reset otomatis kalau bot di-restart.
 * Key-nya bebas string apa aja (dari pemanggil) -- commands/ai.js pakai `${jid}:${senderJid}`
 * biar tiap orang punya riwayat sendiri walau chat/grup-nya sama, gak ketuker/bocor ke orang lain.
 */
const MAX_TURNS = 10; // 10 pasang user+ai (20 pesan)

// Riwayat percakapan gak pernah "aktif dipakai" lagi kalau orangnya udah gak chat AI lebih dari
// segini lama -- otomatis dianggap basi & dibuang (lihat cleanup di bawah).
const INACTIVE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 jam
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // cek tiap 30 menit

// === PENTING: kenapa perlu lastActive + cleanup berkala ===
// SEBELUMNYA, key di Map ini (satu per orang yang PERNAH chat AI) gak pernah dibuang otomatis --
// isi obrolannya sendiri sudah dibatasi (MAX_TURNS di atas), tapi JUMLAH ORANGNYA gak dibatasi
// sama sekali. Sekali 1 orang chat `.ai` walau cuma sekali terus gak pernah lagi, entry-nya
// TETAP nempel di RAM selama bot nyala -- gak ilang kecuali di-reset manual sama orangnya sendiri
// atau bot di-restart total. Kalau bot dipakai banyak orang beda-beda selama berminggu-minggu
// tanpa restart, Map ini bakal terus membesar pelan-pelan (memory leak jangka panjang) -- gak
// kerasa hari pertama, tapi bikin bot makin berat RAM-nya makin lama makin jalan.
//
// Fix: tiap entry sekarang nyimpen kapan terakhir dipakai (lastActive), dan ada "petugas
// kebersihan" (setInterval) yang jalan berkala buang entry yang udah gak aktif lebih dari
// INACTIVE_EXPIRY_MS -- orang yang masih aktif chat gak kena dampak apa-apa (setiap pesan baru
// otomatis nge-refresh lastActive-nya), yang kena cuma yang beneran udah lama ditinggal.
const histories = new Map(); // key -> { messages: [{role, parts}], lastActive: number }

function getHistory(key) {
  return histories.get(key)?.messages || [];
}

function pushTurn(key, userText, aiText) {
  const entry = histories.get(key) || { messages: [], lastActive: 0 };
  entry.messages.push({ role: "user", parts: [{ text: userText }] });
  entry.messages.push({ role: "model", parts: [{ text: aiText }] });
  // batasi biar gak kepanjangan/nambah cost token terus-terusan
  while (entry.messages.length > MAX_TURNS * 2) entry.messages.shift();
  entry.lastActive = Date.now();
  histories.set(key, entry);
}

function clearHistory(key) {
  histories.delete(key);
}

function cleanupInactiveHistories() {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of histories) {
    if (now - entry.lastActive > INACTIVE_EXPIRY_MS) {
      histories.delete(key);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[aiMemory] Bersihin ${removed} riwayat chat AI yang udah gak aktif >6 jam (sisa: ${histories.size}).`);
  }
}

// .unref() biar timer ini gak nahan proses Node tetap nyala (gak ganggu proses shutdown bot
// yang normal, misal pas restart lewat pm2/systemd).
setInterval(cleanupInactiveHistories, CLEANUP_INTERVAL_MS).unref();

module.exports = { getHistory, pushTurn, clearHistory };
