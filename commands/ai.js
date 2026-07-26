const { askGemini } = require("../lib/gemini");
const { clearHistory } = require("../lib/aiMemory");
const { isOwner } = require("../lib/owner");
const config = require("../config");

module.exports = [
  {
    name: "ai",
    aliases: ["tanya", "chat", "gemini"],
    run: async ({ jid, m, text, reply }) => {
      if (!text) return reply("Mau nanya apa? Contoh: *.ai jelasin apa itu lubang hitam*");
      // Persona Mitsuri di aiOwnerSystemPrompt CUMA kepake kalau pengirimnya beneran owner bot
      // (dicek via nomor/LID di lib/owner.js) -- selain owner tetap dapet AI asisten biasa.
      const senderJid = m.key.participant || m.key.remoteJid;
      const systemPrompt = isOwner(senderJid) ? config.aiOwnerSystemPrompt : config.aiSystemPrompt;
      const answer = await askGemini(jid, text, systemPrompt);
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
