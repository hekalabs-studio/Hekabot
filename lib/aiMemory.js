/**
 * Riwayat chat AI per-percakapan (in-memory), biar Gemini inget konteks sebelumnya
 * dalam 1 sesi chat. Reset otomatis kalau bot di-restart.
 * Key-nya bebas string apa aja (dari pemanggil) -- commands/ai.js pakai `${jid}:${senderJid}`
 * biar tiap orang punya riwayat sendiri walau chat/grup-nya sama, gak ketuker/bocor ke orang lain.
 */
const MAX_TURNS = 10; // 10 pasang user+ai (20 pesan)
const histories = new Map(); // key -> [{role, parts}]

function getHistory(key) {
  return histories.get(key) || [];
}

function pushTurn(key, userText, aiText) {
  const history = histories.get(key) || [];
  history.push({ role: "user", parts: [{ text: userText }] });
  history.push({ role: "model", parts: [{ text: aiText }] });
  // batasi biar gak kepanjangan/nambah cost token terus-terusan
  while (history.length > MAX_TURNS * 2) history.shift();
  histories.set(key, history);
}

function clearHistory(key) {
  histories.delete(key);
}

module.exports = { getHistory, pushTurn, clearHistory };
