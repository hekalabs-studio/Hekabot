/**
 * Riwayat chat AI per-percakapan (in-memory), biar Gemini inget konteks sebelumnya
 * dalam 1 sesi chat. Reset otomatis kalau bot di-restart.
 */
const MAX_TURNS = 10; // 10 pasang user+ai (20 pesan)
const histories = new Map(); // jid -> [{role, parts}]

function getHistory(jid) {
  return histories.get(jid) || [];
}

function pushTurn(jid, userText, aiText) {
  const history = histories.get(jid) || [];
  history.push({ role: "user", parts: [{ text: userText }] });
  history.push({ role: "model", parts: [{ text: aiText }] });
  // batasi biar gak kepanjangan/nambah cost token terus-terusan
  while (history.length > MAX_TURNS * 2) history.shift();
  histories.set(jid, history);
}

function clearHistory(jid) {
  histories.delete(jid);
}

module.exports = { getHistory, pushTurn, clearHistory };
