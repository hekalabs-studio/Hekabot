const axios = require("axios");
const config = require("../config");
const { getHistory, pushTurn } = require("./aiMemory");

/**
 * Jaring pengaman: bersihin sisa notasi LaTeX/Markdown yang gak didukung WhatsApp,
 * kalau-kalau AI-nya masih "kelupaan" instruksi format di system prompt.
 */
function sanitizeForWhatsApp(text) {
  let t = text;

  // Pecahan \frac{a}{b} -> (a/b)
  t = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1/$2)");
  t = t.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  t = t.replace(/\\text\{([^{}]*)\}/g, "$1");

  // Simbol umum LaTeX -> karakter biasa
  const symbolMap = [
    [/\\times/g, "×"], [/\\cdot/g, "·"], [/\\div/g, "÷"], [/\\pm/g, "±"],
    [/\\varepsilon|\\epsilon/g, "ε"], [/\\Sigma/g, "Σ"], [/\\sigma/g, "σ"],
    [/\\Delta/g, "Δ"], [/\\pi/g, "π"], [/\\approx/g, "≈"], [/\\geq/g, "≥"],
    [/\\leq/g, "≤"], [/\\neq/g, "≠"], [/\\infty/g, "∞"], [/\\left|\\right/g, ""],
  ];
  for (const [pattern, repl] of symbolMap) t = t.replace(pattern, repl);

  // Superscript/subscript kasar: X^{2} -> X^2, X_{1} -> X1
  t = t.replace(/\^\{([^{}]+)\}/g, "^$1");
  t = t.replace(/_\{([^{}]+)\}/g, "$1");

  // Hapus delimiter LaTeX $$...$$ dan $...$ (isinya udah dikonversi di atas)
  t = t.replace(/\$\$([^$]+)\$\$/g, "$1");
  t = t.replace(/\$([^$]+)\$/g, "$1");

  // Heading Markdown (#, ##, ###) -> bold biasa
  t = t.replace(/^#{1,6}\s*(.+)$/gm, "*$1*");

  // **bold** (Markdown standar) -> *bold* (WhatsApp standar)
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Sisa command LaTeX yang belum ke-cover, buang backslash-nya
  t = t.replace(/\\([a-zA-Z]+)/g, "$1");

  return t.trim();
}

// ==== DUKUNGAN MULTI API KEY (SEMUA GRATIS, gak ada yang berbayar) ====
// Tier gratis Gemini itu beneran gratis selamanya -- yang dibatasi cuma JUMLAH REQUEST
// PER MENIT per API key/akun, bukan soal saldo/kartu kredit. Jadi kalau sering kena limit,
// solusinya BUKAN bayar, tapi: (a) bikin bot nunggu+coba lagi otomatis pas kena limit, dan/atau
// (b) siapin lebih dari satu API key gratis (dari akun Google yang beda-beda, tiap akun boleh
// bikin API key gratis sendiri di https://aistudio.google.com/apikey) biar kalau key yang satu
// lagi kena limit, bot otomatis gantian coba pakai key yang lain -- masih 100% gratis.
//
// Cara isi lebih dari 1 key: di config.js pakai `geminiApiKeys: ["key1", "key2", "key3"]`
// (array). Kalau cuma punya 1 key, `geminiApiKey: "key1"` (cara lama) masih tetap jalan normal.
function getApiKeys() {
  if (Array.isArray(config.geminiApiKeys) && config.geminiApiKeys.length) {
    return config.geminiApiKeys.map((k) => (k || "").trim()).filter(Boolean);
  }
  return config.geminiApiKey ? [config.geminiApiKey.trim()].filter(Boolean) : [];
}

let keyCursor = 0; // rotasi round-robin -- key yang dipakai duluan gantian tiap panggilan, biar beban kepencar rata

function isRateLimitError(err) {
  const errData = err.response?.data?.error;
  return err.response?.status === 429 || errData?.status === "RESOURCE_EXHAUSTED";
}

async function callGemini(apiKey, url, body) {
  return axios.post(url, body, {
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    timeout: 60000,
  });
}

function extractAnswer(res) {
  const rawAnswer = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!rawAnswer) throw new Error("Gemini gak ngasih jawaban (mungkin request-nya diblokir safety filter).");
  return sanitizeForWhatsApp(rawAnswer);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureApiKeys() {
  const keys = getApiKeys();
  if (!keys.length) {
    throw new Error(
      "API key Gemini belum diisi. Buka config.js, isi `geminiApiKey` (atau `geminiApiKeys` " +
      "buat lebih dari satu) dengan API key GRATIS kamu -- bikin gratis di https://aistudio.google.com/apikey, " +
      "gak butuh kartu kredit/bayar apa pun."
    );
  }
  return keys;
}

/**
 * Inti pemanggilan Gemini yang dipakai bareng oleh askGemini (teks/riwayat) DAN
 * askGeminiWithImage (vision/.solve) -- isinya cuma logika rotasi multi-key + retry kena limit,
 * gak peduli `contents` yang dikirim isinya teks doang atau ada gambarnya juga.
 *
 * Kalau kena limit tier gratis (429): coba key lain dulu (kalau ada lebih dari 1), dan kalau
 * SEMUA key kena limit barengan, bot nunggu bentar terus coba ulang otomatis (bukan langsung
 * nyerah) -- jadi user gak perlu ngetik ulang commandnya manual.
 */
async function generateAnswer(contents, systemPrompt) {
  const keys = ensureApiKeys();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;
  const body = { contents, systemInstruction: { parts: [{ text: systemPrompt }] } };

  // RETRY_WAITS_MS: kalau SEMUA key udah dicoba dan semuanya kena limit, tunggu makin lama
  // di tiap percobaan ulang (biar gak langsung nembak lagi pas limitnya jelas belum reset).
  const RETRY_WAITS_MS = [15_000, 30_000];

  for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt++) {
    let lastErr;
    let lastWasRateLimit = false;

    // Coba tiap key gantian (mulai dari key giliran sekarang, rotasi round-robin)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[(keyCursor + i) % keys.length];
      try {
        const res = await callGemini(key, url, body);
        keyCursor = (keyCursor + i + 1) % keys.length; // key berikutnya mulai dari sini, biar gantian rata
        return extractAnswer(res);
      } catch (err) {
        lastErr = err;
        lastWasRateLimit = isRateLimitError(err);
        if (lastWasRateLimit) continue; // key ini kena limit, coba key berikutnya (kalau ada)
        // Error LAIN (bukan limit, misal API key salah/invalid) -- gak ada gunanya coba key
        // lain buat error jenis ini, langsung lempar aja.
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    }

    // Semua key udah dicoba dan SEMUANYA kena limit tier gratis. Kalau masih ada jatah retry,
    // tunggu terus coba ulang dari awal (bukan langsung nyerah ke user).
    if (lastWasRateLimit && attempt < RETRY_WAITS_MS.length) {
      await sleep(RETRY_WAITS_MS[attempt]);
      continue;
    }

    if (lastWasRateLimit) {
      throw new Error(
        `Lagi kena limit gratis Gemini di ${keys.length > 1 ? "semua " + keys.length + " API key" : "API key"} kamu ` +
        "(batas request per menit di tier gratis emang kecil, BUKAN soal saldo/bayar -- tier gratisnya tetap gratis " +
        "selamanya). Bot udah otomatis coba ulang beberapa kali tapi masih penuh. Tunggu ±1 menit lagi baru coba, " +
        "atau tambahin API key gratis lain (dari akun Google lain) di `geminiApiKeys` di config.js biar makin jarang mentok."
      );
    }
    throw new Error(lastErr?.response?.data?.error?.message || lastErr?.message || "Gagal menghubungi Gemini.");
  }
}

/**
 * Tanya ke Gemini API pakai API key gratis kamu (config.geminiApiKey / config.geminiApiKeys).
 * Otomatis bawa riwayat chat sebelumnya di percakapan yang sama sebagai konteks.
 *
 * @param {string} jid - key riwayat chat (bisa jid chat biasa, atau `${jid}:${senderJid}` biar per-orang)
 * @param {string} userText
 * @param {string} [systemPrompt] - override system prompt (dipakai buat persona khusus owner di .ai)
 */
async function askGemini(jid, userText, systemPrompt = config.aiSystemPrompt) {
  ensureApiKeys();
  const history = getHistory(jid);
  const contents = [...history, { role: "user", parts: [{ text: userText }] }];
  const answer = await generateAnswer(contents, systemPrompt);
  pushTurn(jid, userText, answer);
  return answer;
}

/**
 * Sama kayak askGemini, tapi buat gambar (vision) -- dipakai fitur .solve.
 * SEKALI JALAN doang (gak nyambung ke riwayat chat aiMemory), soalnya .solve dipakai buat
 * "kerjain ini" per-foto, bukan obrolan berkelanjutan kayak .ai.
 *
 * @param {string} userText - caption/instruksi tambahan dari user (boleh kosong)
 * @param {Buffer} imageBuffer
 * @param {string} mimeType - mimetype gambar asli dari WhatsApp (misal "image/jpeg")
 * @param {string} [systemPrompt] - default: config.solveSystemPrompt
 */
async function askGeminiWithImage(userText, imageBuffer, mimeType, systemPrompt = config.solveSystemPrompt) {
  ensureApiKeys();
  const promptText = userText?.trim()
    ? userText.trim()
    : "Kerjakan/selesaikan apa yang ada di foto ini.";
  const contents = [
    {
      role: "user",
      parts: [
        { text: promptText },
        { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBuffer.toString("base64") } },
      ],
    },
  ];
  return generateAnswer(contents, systemPrompt);
}

module.exports = { askGemini, askGeminiWithImage };
