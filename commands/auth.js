const { isRegistered, getUser, registerUser, unregisterUser, deleteUserById } = require("../lib/userStore");
const { isOwner } = require("../lib/owner");

function senderJidOf(m) {
  return m.key.participant || m.key.remoteJid;
}

module.exports = [
  {
    name: "daftar",
    aliases: ["register", "signup"],
    run: async ({ m, text, reply }) => {
      const jid = senderJidOf(m);
      if (isRegistered(jid)) {
        const user = getUser(jid);
        return reply(`Kamu udah terdaftar sebagai *${user.name}* (ID: ${user.id}).\nKetik *profile* buat lihat detail, atau *hapusakun* buat batal daftar.`);
      }
      if (!text) return reply("Daftar dulu ya sebelum bisa pakai bot ini.\nFormat: *daftar Nama Kamu*\nContoh: *daftar Budi Santoso*");
      const user = registerUser(jid, { name: text.trim() });
      reply(`✅ Pendaftaran berhasil! Selamat datang, *${text.trim()}* (ID: ${user.id}).\nSekarang kamu udah bisa pakai semua fitur bot. Ketik *menu* buat lihat daftar fiturnya.`);
    },
  },
  {
    name: "profil",
    aliases: ["profile", "akun"],
    run: async ({ m, reply }) => {
      const jid = senderJidOf(m);
      const user = getUser(jid);
      if (!user) return reply("Kamu belum terdaftar. Ketik *daftar Nama Kamu* dulu.");
      const tgl = new Date(user.registeredAt).toLocaleString("id-ID");
      reply(
        `👤 *Profil Kamu*\nID: ${user.id}\nNama: ${user.name}\nNomor: ${user.number}\n` +
        `Status: ${user.active === false ? "nonaktif" : "aktif"}\nTerdaftar sejak: ${tgl}`
      );
    },
  },
  {
    // .hapusakun (tanpa argumen) -> hapus akun sendiri, bisa siapa aja
    // .hapusakun U001 (dengan ID) -> hapus akun ORANG LAIN, KHUSUS OWNER
    name: "hapusakun",
    aliases: ["unreg", "batalDaftar"],
    run: async ({ m, text, reply }) => {
      const jid = senderJidOf(m);

      if (text && text.trim()) {
        // Mode hapus akun ORANG LAIN by ID -- khusus owner
        if (!isOwner(jid)) return reply("❌ Perintah ini hanya dapat digunakan oleh Owner.");
        const targetId = text.trim();
        const deleted = deleteUserById(targetId);
        if (!deleted) return reply(`User dengan ID *${targetId.toUpperCase()}* gak ketemu.`);
        return reply(`✅ Akun *${deleted.name}* (${deleted.id}) berhasil dihapus.`);
      }

      // Mode hapus akun sendiri -- bisa siapa aja
      if (!isRegistered(jid)) return reply("Kamu belum terdaftar, gak ada yang perlu dihapus.");
      unregisterUser(jid);
      reply("Akun kamu berhasil dihapus. Daftar ulang kapan aja pakai *daftar Nama Kamu*.");
    },
  },
  {
    // .deleteuser U001 -- KHUSUS OWNER, selalu wajib kasih ID
    name: "deleteuser",
    ownerOnly: true,
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis User ID yang mau dihapus.\nContoh: *deleteuser U001*");
      const deleted = deleteUserById(text.trim());
      if (!deleted) return reply(`User dengan ID *${text.trim().toUpperCase()}* gak ketemu.`);
      reply(`✅ Akun *${deleted.name}* (${deleted.id}) berhasil dihapus.`);
    },
  },
];
