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

/**
 * Tanya ke Gemini API pakai API key kamu sendiri (config.geminiApiKey).
 * Otomatis bawa riwayat chat sebelumnya di percakapan yang sama sebagai konteks.
 */
async function askGemini(jid, userText) {
  if (!config.geminiApiKey) {
    throw new Error(
      "API key Gemini belum diisi. Buka config.js, isi `geminiApiKey` dengan API key kamu " +
      "(bikin gratis di https://aistudio.google.com/apikey)."
    );
  }

  const history = getHistory(jid);
  const contents = [...history, { role: "user", parts: [{ text: userText }] }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;

  let res;
  try {
    res = await axios.post(
      url,
      {
        contents,
        systemInstruction: { parts: [{ text: config.aiSystemPrompt }] },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.geminiApiKey,
        },
        timeout: 60000,
      }
    );
  } catch (err) {
    const errData = err.response?.data?.error;
    if (err.response?.status === 429 || errData?.status === "RESOURCE_EXHAUSTED") {
      throw new Error(
        "Lagi kena limit gratis Gemini (batas request per menit di tier gratis emang kecil, bukan soal saldo/bayar). " +
        "Tunggu ±1 menit terus coba lagi. Kalau bot ini sering dipakai rame-rame dan sering kena limit, " +
        "pertimbangkan upgrade billing di https://aistudio.google.com biar limitnya lebih longgar."
      );
    }
    const apiError = errData?.message;
    throw new Error(apiError || err.message);
  }

  const rawAnswer = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!rawAnswer) throw new Error("Gemini gak ngasih jawaban (mungkin request-nya diblokir safety filter).");

  const answer = sanitizeForWhatsApp(rawAnswer);
  pushTurn(jid, userText, answer);
  return answer;
}

module.exports = { askGemini };
