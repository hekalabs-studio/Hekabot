const { askGemini } = require("../lib/gemini");
const { clearHistory } = require("../lib/aiMemory");

module.exports = [
  {
    name: "ai",
    aliases: ["tanya", "chat", "gemini"],
    run: async ({ jid, text, reply }) => {
      if (!text) return reply("Mau nanya apa? Contoh: *.ai jelasin apa itu lubang hitam*");
      const answer = await askGemini(jid, text);
      reply(answer);
    },
  },
  {
    name: "resetai",
    aliases: ["clearai"],
    run: async ({ jid, reply }) => {
      clearHistory(jid);
      reply("Riwayat chat AI di sini udah direset. Mulai obrolan baru!");
    },
  },
];
