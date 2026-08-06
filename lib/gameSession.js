/**
 * Session game sederhana per-chat (in-memory). Dipakai buat game tebak-tebakan
 * yang nunggu jawaban dari chat (tanpa prefix), kayak tebakbendera, susunkata, dst.
 */
const sessions = new Map(); // jid -> { answer, timer, startedAt, ... }

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function endSession(jid) {
  const s = sessions.get(jid);
  if (s?.timer) clearTimeout(s.timer);
  sessions.delete(jid);
}

/**
 * @param {string} jid
 * @param {{answer: string, timeoutMs?: number, onTimeout: (session) => void}} opts
 */
function startSession(jid, opts) {
  endSession(jid);
  const timeoutMs = opts.timeoutMs || 45000;
  const session = { answer: opts.answer, gameName: opts.gameName, startedAt: Date.now() };
  session.timer = setTimeout(() => {
    sessions.delete(jid);
    opts.onTimeout?.(session);
  }, timeoutMs);
  sessions.set(jid, session);
  return session;
}

function getSession(jid) {
  return sessions.get(jid);
}

/** Cek jawaban user terhadap session aktif. Return null kalau gak ada session aktif. */
function checkAnswer(jid, text) {
  const s = sessions.get(jid);
  if (!s) return null;
  const correct = normalize(text) === normalize(s.answer);
  return { session: s, correct };
}

module.exports = { startSession, getSession, endSession, checkAnswer, normalize };
