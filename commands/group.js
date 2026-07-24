/** Cari target user dari: reply pesan orangnya / mention (@tag) / nomor yang diketik manual */
function resolveTargetJid(m, text) {
  const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return quotedParticipant;

  const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length) return mentioned[0];

  if (text) {
    const digits = text.replace(/[^0-9]/g, "");
    if (digits.length >= 8) return `${digits}@s.whatsapp.net`;
  }
  return null;
}

module.exports = [
  // kick [Text/Reply/Mention] - keluarkan member dari grup
  {
    name: "kick",
    groupAdminOnly: true,
    run: async ({ jid, sock, m, text, reply }) => {
      const target = resolveTargetJid(m, text);
      if (!target) return reply("Reply pesan orangnya, mention (@tag), atau tulis nomornya.\nContoh: *kick 628xxxxxxxxxx*");
      try {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
        await reply({ text: `✅ Berhasil keluarkan @${target.split("@")[0]} dari grup.`, mentions: [target] });
      } catch {
        reply("Gagal keluarkan member. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // promote [Text/Reply/Mention] - jadikan admin
  {
    name: "promote",
    groupAdminOnly: true,
    run: async ({ jid, sock, m, text, reply }) => {
      const target = resolveTargetJid(m, text);
      if (!target) return reply("Reply pesan orangnya, mention (@tag), atau tulis nomornya.\nContoh: *promote 628xxxxxxxxxx*");
      try {
        await sock.groupParticipantsUpdate(jid, [target], "promote");
        await reply({ text: `✅ @${target.split("@")[0]} sekarang jadi admin.`, mentions: [target] });
      } catch {
        reply("Gagal menjadikan admin. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // demote [Text/Reply/Mention] - turunkan dari admin
  {
    name: "demote",
    groupAdminOnly: true,
    run: async ({ jid, sock, m, text, reply }) => {
      const target = resolveTargetJid(m, text);
      if (!target) return reply("Reply pesan orangnya, mention (@tag), atau tulis nomornya.\nContoh: *demote 628xxxxxxxxxx*");
      try {
        await sock.groupParticipantsUpdate(jid, [target], "demote");
        await reply({ text: `✅ @${target.split("@")[0]} udah bukan admin lagi.`, mentions: [target] });
      } catch {
        reply("Gagal menurunkan admin. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // mute - kunci grup, cuma admin yang bisa chat
  {
    name: "mute",
    aliases: ["kuncigrup", "lockgrup"],
    groupAdminOnly: true,
    run: async ({ jid, sock, reply }) => {
      try {
        await sock.groupSettingUpdate(jid, "announcement");
        reply("🔒 Grup dikunci. Sekarang cuma admin yang bisa kirim pesan.");
      } catch {
        reply("Gagal mengunci grup. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // unmute - buka kunci grup
  {
    name: "unmute",
    aliases: ["bukagrup", "unlockgrup"],
    groupAdminOnly: true,
    run: async ({ jid, sock, reply }) => {
      try {
        await sock.groupSettingUpdate(jid, "not_announcement");
        reply("🔓 Grup dibuka. Semua member bisa kirim pesan lagi.");
      } catch {
        reply("Gagal membuka grup. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // tagall [Text] - mention semua member, daftar nama keliatan di teks
  {
    name: "tagall",
    groupAdminOnly: true,
    run: async ({ jid, sock, text, reply }) => {
      try {
        const meta = await sock.groupMetadata(jid);
        const mentions = meta.participants.map((p) => p.id);
        const list = mentions.map((id) => `@${id.split("@")[0]}`).join(" ");
        await reply({ text: `${text ? text + "\n\n" : ""}${list}`, mentions });
      } catch {
        reply("Gagal tag semua member.");
      }
    },
  },

  // hidetag [Text] - mention semua member TANPA nampilin daftar nama di teks
  {
    name: "hidetag",
    groupAdminOnly: true,
    run: async ({ jid, sock, text, reply }) => {
      if (!text) return reply("Tulis pesannya.\nContoh: *hidetag Woi pada kumpul!*");
      try {
        const meta = await sock.groupMetadata(jid);
        const mentions = meta.participants.map((p) => p.id);
        await reply({ text, mentions });
      } catch {
        reply("Gagal kirim hidetag.");
      }
    },
  },

  // linkgrup - ambil link invite grup
  {
    name: "linkgrup",
    aliases: ["groupinvite", "linkinvite"],
    groupAdminOnly: true,
    run: async ({ jid, sock, reply }) => {
      try {
        const code = await sock.groupInviteCode(jid);
        reply(`🔗 Link grup ini:\nhttps://chat.whatsapp.com/${code}`);
      } catch {
        reply("Gagal ambil link grup. Pastikan bot juga admin grup ini.");
      }
    },
  },

  // clearchat - bersihin riwayat chat ini DI SISI BOT (biar gak numpuk/penuh memory).
  // PENTING: WhatsApp sengaja gak ngasih izin siapapun (termasuk bot) buat hapus chat dari HP
  // lawan bicara -- itu proteksi privasi bawaan WhatsApp, bukan keterbatasan bot ini. Jadi command
  // ini CUMA bersihin chat di sisi bot, chat di HP orang lain/grup member lain tetap seperti biasa.
  {
    name: "clearchat",
    ownerOnly: true,
    run: async ({ jid, sock, m, reply }) => {
      try {
        await sock.chatModify(
          {
            clear: true,
            lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }],
          },
          jid
        );
        await reply(
          "🧹 Riwayat chat ini di sisi bot udah dibersihkan.\n\n" +
          "Catatan: ini cuma bersihin memory di sisi BOT. WhatsApp gak mengizinkan siapapun " +
          "(termasuk bot) menghapus chat dari HP lawan bicara -- itu proteksi privasi bawaan " +
          "WhatsApp sendiri, jadi chat di HP orang lain/member grup lain tetap seperti biasa."
        );
      } catch (err) {
        reply("Gagal bersihin chat: " + err.message);
      }
    },
  },
];
