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
      // PENTING: riwayat chat di-key per PENGIRIM, bukan cuma per chat/grup. Kalau cuma per
      // `jid`, semua orang di grup yang sama bakal share 1 riwayat -- jadi kalau owner pernah
      // dapet persona Mitsuri di grup itu, riwayatnya ikut kebawa/"bocor" ke user lain yang
      // nge-.ai di grup yang sama walau system prompt-nya udah bener dibedain per orang.
      const memoryKey = `${jid}:${senderJid}`;
      const answer = await askGemini(memoryKey, text, systemPrompt);
      reply(answer);
    },
  },
  {
    name: "resetai",
    aliases: ["clearai"],
    run: async ({ jid, m, reply }) => {
      const senderJid = m.key.participant || m.key.remoteJid;
      clearHistory(`${jid}:${senderJid}`);
      reply("Riwayat chat AI kamu di sini udah direset. Mulai obrolan baru!");
    },
  },
];
