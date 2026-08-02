const config = require("../config");

const DIVIDER = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";

/** Teks panduan pemakaian bot - dipakai buat .help DAN otomatis dikirim ke member baru */
function buildHelpText() {
  const p = config.prefix || "";
  return (
    `╭─❍ 📖 *PANDUAN ${config.botName.toUpperCase()}* ❍─╮\n` +
    `Yuk kenalan sama semua fitur bot ini, dari nol sampai jago 🚀\n` +
    `╰────────────────────╯\n\n` +

    `1️⃣ *Daftar Akun Dulu* 📝\n` +
    `Wajib daftar dulu sebelum bisa pakai fitur lain.\n` +
    `➤ \`${p}daftar Nama Kamu\`\n` +
    `_Contoh:_ \`${p}daftar Budi Santoso\`\n\n${DIVIDER}\n\n` +

    `2️⃣ *Buka Menu Fitur* 📋\n` +
    `Lihat semua fitur yang tersedia, dikelompokkan per kategori.\n` +
    `➤ \`${p}menu\`\n\n${DIVIDER}\n\n` +

    `3️⃣ *Pakai Sebuah Command* ⌨️\n` +
    `Ketik nama fitur yang mau dipakai, kadang perlu tambahan teks/link.\n` +
    `➤ \`${p}namacommand argumen\`\n\n${DIVIDER}\n\n` +

    `4️⃣ *Format Command* 🧩\n` +
    `Semua command (kecuali \`menu\`/\`help\`/\`daftar\`) wajib pakai awalan titik *${p}*.\n` +
    `_Contoh:_ \`${p}ytmp3 https://youtu.be/xxxxx\`\n` +
    `🔸 *[Text]* di menu → command itu butuh teks tambahan setelahnya.\n` +
    `🔸 *[Image]* di menu → kirim/reply gambar dulu, command-nya jadi caption.\n\n${DIVIDER}\n\n` +

    `5️⃣ *Ngobrol Sama AI* 🤖✨\n` +
    `Ngobrol bebas kayak ChatGPT (pakai Gemini API).\n` +
    `➤ \`${p}ai <pertanyaan kamu>\`\n` +
    `_Contoh:_ \`${p}ai jelasin apa itu lubang hitam\`\n` +
    `➤ \`${p}resetai\` — reset ingatan obrolan AI\n` +
    `➤ \`${p}solve\` — kirim/reply FOTO apa aja (soal pelajaran, kode error, captcha, formulir, dll) ` +
    `pakai caption \`${p}solve\`, nanti dikerjain/dijawab. Bisa tambah instruksi, contoh: ` +
    `\`${p}solve jelasin caranya aja, jangan langsung kasih jawaban\`\n\n${DIVIDER}\n\n` +

    `6️⃣ *Download Video/Audio* ⬇️\n` +
    `Download dari YouTube, TikTok, Instagram, dll.\n` +
    `➤ \`${p}ytmp3 <link>\` — audio dari YouTube\n` +
    `➤ \`${p}ytmp4 <link>\` — video dari YouTube\n` +
    `➤ \`${p}ttmp4 <link>\` — video dari TikTok\n` +
    `_(cek \`menu\` bagian DOWNLOADER MENU buat daftar lengkap)_\n\n${DIVIDER}\n\n` +

    `7️⃣ *Cari Info & Internet* 🌐\n` +
    `➤ \`${p}wikipedia <topik>\`\n` +
    `➤ \`${p}cuaca <nama kota>\`\n` +
    `➤ \`${p}kbbi <kata>\`\n` +
    `_(cek \`menu\` bagian INTERNET MENU buat daftar lengkap)_\n\n${DIVIDER}\n\n` +

    `8️⃣ *Lihat Profil Kamu* 👤\n` +
    `➤ \`${p}profile\`\n\n${DIVIDER}\n\n` +

    `9️⃣ *Hapus Akun Sendiri* 🗑️\n` +
    `➤ \`${p}hapusakun\`\n\n${DIVIDER}\n\n` +

    `🔟 *Butuh Bantuan?* 🆘\n` +
    `➤ \`${p}owner\` — kirim kontak admin ke chat kamu\n` +
    `➤ \`${p}support\` — lihat lisensi bot & link dukungan/donasi ke owner\n\n` +

    `Semoga betah pakai *${config.botName}*! 🎉`
  );
}

module.exports = { buildHelpText };
