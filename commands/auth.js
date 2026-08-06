const { isRegistered, getUser, registerUser, unregisterUser, deleteUserById } = require("../lib/userStore");
const { getStats, getTotalWins } = require("../lib/gameStats");
const { isOwner } = require("../lib/owner");
const config = require("../config");
const p = config.prefix;

// Daftar SEMUA game yang bisa dimenangin + nama tampilan & emoji-nya buat di .profile --
// key-nya harus SAMA PERSIS kayak `gameName`/nama command yang dipakai pas recordWin()
// dipanggil (lihat handler.js buat game tebak-tebakan, commands/game.js buat minesweeper
// & ulartangga), biar nyambung ke jumlah kemenangan yang bener.
const GAME_LIST = [
  ["asahotak", "🧠 Asah Otak"],
  ["tebaktebakan", "😂 Tebak-tebakan"],
  ["tebakbendera", "🚩 Tebak Bendera"],
  ["tebakkata", "🔤 Tebak Kata"],
  ["tebakpresiden", "🇮🇩 Tebak Presiden"],
  ["tebakpokemon", "⚡ Tebak Pokemon"],
  ["susunkata", "🔠 Susun Kata"],
  ["terasaurus", "🧩 Terasaurus"],
  ["minesweeper", "💣 Minesweeper"],
  ["ulartangga", "🎲 Ular Tangga"],
  ["kuisislami", "🕌 Kuis Islami"],
  ["kuiskristen", "✝️ Kuis Kristen"],
  ["kuismtk", "📐 Kuis Matematika"],
];

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
        return reply(`Kamu udah terdaftar sebagai *${user.name}* (ID: ${user.id}).\nKetik *${p}profile* buat lihat detail, atau *${p}hapusakun* buat batal daftar.`);
      }
      if (!text) return reply(`Daftar dulu ya sebelum bisa pakai bot ini.\nFormat: *${p}daftar Nama Kamu*\nContoh: *${p}daftar Budi Santoso*`);
      const user = registerUser(jid, { name: text.trim() });
      reply(`✅ Pendaftaran berhasil! Selamat datang, *${text.trim()}* (ID: ${user.id}).\nSekarang kamu udah bisa pakai semua fitur bot. Ketik *${p}menu* buat lihat daftar fiturnya.`);
    },
  },
  {
    name: "profil",
    aliases: ["profile", "akun"],
    run: async ({ m, reply }) => {
      const jid = senderJidOf(m);
      const user = getUser(jid);
      if (!user) return reply(`Kamu belum terdaftar. Ketik *${p}daftar Nama Kamu* dulu.`);
      const tgl = new Date(user.registeredAt).toLocaleString("id-ID");

      const stats = getStats(jid);
      const totalWins = getTotalWins(jid);
      const gameLines = GAME_LIST.map(([key, label]) => `   ${label}: *${stats[key] || 0}*`).join("\n");

      reply(
        `👤 *Profil Kamu*\nID: ${user.id}\nNama: ${user.name}\nNomor: ${user.number}\n` +
        `Status: ${user.active === false ? "nonaktif" : "aktif"}\nTerdaftar sejak: ${tgl}\n\n` +
        `🏆 *Statistik Kemenangan Game* (total: *${totalWins}*)\n${gameLines}`
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
      reply(`Akun kamu berhasil dihapus. Daftar ulang kapan aja pakai *${p}daftar Nama Kamu*.`);
    },
  },
  {
    // .deleteuser U001 -- KHUSUS OWNER, selalu wajib kasih ID
    name: "deleteuser",
    ownerOnly: true,
    run: async ({ text, reply }) => {
      if (!text) return reply(`Tulis User ID yang mau dihapus.\nContoh: *${p}deleteuser U001*`);
      const deleted = deleteUserById(text.trim());
      if (!deleted) return reply(`User dengan ID *${text.trim().toUpperCase()}* gak ketemu.`);
      reply(`✅ Akun *${deleted.name}* (${deleted.id}) berhasil dihapus.`);
    },
  },
];
