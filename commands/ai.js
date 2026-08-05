const { askGemini } = require("../lib/gemini");
const { clearAllHistories } = require("../lib/aiMemory");
const { isOwner } = require("../lib/owner");
const { getQuotedText } = require("../lib/media");
const config = require("../config");
const p = config.prefix;

// Batas panjang teks pesan yang di-reply yang diikutin sebagai konteks ke AI, biar gak
// kebanyakan/boros token kalau yang di-reply ternyata pesan panjang banget.
const MAX_QUOTED_CONTEXT_CHARS = 4000;

module.exports = [
  {
    name: "ai",
    aliases: ["tanya", "chat", "gemini"],
    run: async ({ jid, m, text, reply }) => {
      // Kalau .ai dipakai buat me-reply pesan lain (baik punya bot sendiri, kayak hasil
      // .wikipedia/.ai sebelumnya, maupun punya orang lain di chat), isi pesan yang di-reply
      // itu ikut dikirim sebagai konteks -- persis kayak cara *.solve* baca foto yang di-reply.
      const rawQuoted = getQuotedText(m);
      const quotedContext = rawQuoted
        ? rawQuoted.length > MAX_QUOTED_CONTEXT_CHARS
          ? rawQuoted.slice(0, MAX_QUOTED_CONTEXT_CHARS) + "…"
          : rawQuoted
        : "";

      if (!text && !quotedContext) return reply(`Mau nanya apa? Contoh: *${p}ai jelasin apa itu lubang hitam*`);

      // Kalau ada reply tapi user gak nulis pertanyaan apa2 (cuma ".ai" doang), anggap dia mau
      // AI-nya nanggapin/jelasin isi pesan yang di-reply itu.
      const userText = text || "Tanggapin atau jelasin isi pesan ini.";
      const prompt = quotedContext
        ? `[Konteks -- ini isi pesan yang di-reply user, jangan disebut ulang mentah-mentah, cukup dipakai buat mahamin maksud user]\n"""\n${quotedContext}\n"""\n\n[Pertanyaan/instruksi user, terkait konteks di atas]\n${userText}`
        : userText;

      // Persona Mitsuri di aiOwnerSystemPrompt CUMA kepake kalau pengirimnya beneran owner bot
      // (dicek via nomor/LID di lib/owner.js) -- selain owner tetap dapet AI asisten biasa.
      const senderJid = m.key.participant || m.key.remoteJid;
      const systemPrompt = isOwner(senderJid) ? config.aiOwnerSystemPrompt : config.aiSystemPrompt;
      // PENTING: riwayat chat di-key per PENGIRIM, bukan cuma per chat/grup. Kalau cuma per
      // `jid`, semua orang di grup yang sama bakal share 1 riwayat -- jadi kalau owner pernah
      // dapet persona Mitsuri di grup itu, riwayatnya ikut kebawa/"bocor" ke user lain yang
      // nge-.ai di grup yang sama walau system prompt-nya udah bener dibedain per orang.
      const memoryKey = `${jid}:${senderJid}`;
      const answer = await askGemini(memoryKey, prompt, systemPrompt);
      reply(answer);
    },
  },
  {
    name: "resetai",
    aliases: ["clearai"],
    // Sebelumnya bisa dipakai siapa aja, cuma reset riwayat punya diri sendiri di chat itu.
    // Sekarang OWNER ONLY, dan resetnya SEKALIGUS SEMUA ORANG (semua chat/grup) -- bukan lagi
    // per-orang. Jadi ini command "bersih-bersih total" buat owner, bukan buat user umum reset
    // punya sendiri lagi.
    ownerOnly: true,
    run: async ({ reply }) => {
      const count = clearAllHistories();
      reply(`✅ Riwayat chat AI SEMUA orang (${count} percakapan) udah direset total.`);
    },
  },
];
