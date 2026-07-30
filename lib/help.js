const config = require("../config");

/** Teks panduan pemakaian bot - dipakai buat .help DAN otomatis dikirim ke member baru */
function buildHelpText() {
  const p = config.prefix || "";
  return (
    `📖 *Cara Menggunakan ${config.botName}*\n\n` +
    `1️⃣ *Cara Mendaftar Akun*\n` +
    `Wajib daftar dulu sebelum bisa pakai fitur lain.\n` +
    `➤ \`${p}daftar Nama Kamu\`\n` +
    `Contoh: \`${p}daftar Budi Santoso\`\n\n` +

    `2️⃣ *Cara Membuka Menu*\n` +
    `Lihat semua fitur yang tersedia (dikelompokkan per kategori).\n` +
    `➤ \`${p}menu\`\n\n` +

    `3️⃣ *Cara Menggunakan Command*\n` +
    `Ketik nama fitur yang mau dipakai, kadang perlu tambahan teks/link.\n` +
    `➤ \`${p}namacommand argumen\`\n\n` +

    `4️⃣ *Format Command*\n` +
    `Semua command (kecuali \`menu\`/\`help\`/\`daftar\`) wajib pakai awalan titik *${p}*.\n` +
    `Contoh: \`${p}ytmp3 https://youtu.be/xxxxx\`\n` +
    `Kalau ada tulisan *[Text]* di menu, artinya command itu butuh teks tambahan setelahnya.\n` +
    `Kalau ada tulisan *[Image]*, artinya kirim/reply gambar dulu baru ketik command-nya sebagai caption.\n\n` +

    `5️⃣ *Cara Pakai Fitur AI*\n` +
    `Ngobrol bebas kayak ChatGPT (pakai Gemini API).\n` +
    `➤ \`${p}ai <pertanyaan kamu>\`\n` +
    `Contoh: \`${p}ai jelasin apa itu lubang hitam\`\n` +
    `➤ \`${p}resetai\` — reset ingatan obrolan AI\n` +
    `➤ \`${p}solve\` — kirim/reply FOTO apa aja (soal pelajaran, kode error, captcha, formulir, dll) ` +
    `pakai caption \`${p}solve\`, nanti dikerjain/dijawab. Bisa tambah instruksi, contoh: ` +
    `\`${p}solve jelasin caranya aja, jangan langsung kasih jawaban\`\n\n` +

    `6️⃣ *Cara Pakai Fitur Downloader*\n` +
    `Download video/audio dari YouTube, TikTok, Instagram, dll.\n` +
    `➤ \`${p}ytmp3 <link>\` — audio dari YouTube\n` +
    `➤ \`${p}ytmp4 <link>\` — video dari YouTube\n` +
    `➤ \`${p}ttmp4 <link>\` — video dari TikTok\n` +
    `(cek \`menu\` bagian *DOWNLOADER MENU* buat daftar lengkap)\n\n` +

    `7️⃣ *Cara Pakai Fitur Search/Internet*\n` +
    `➤ \`${p}wikipedia <topik>\`\n` +
    `➤ \`${p}cuaca <nama kota>\`\n` +
    `➤ \`${p}kbbi <kata>\`\n` +
    `(cek \`menu\` bagian *INTERNET MENU* buat daftar lengkap)\n\n` +

    `8️⃣ *Cara Melihat Profil*\n` +
    `➤ \`${p}profile\`\n\n` +

    `9️⃣ *Cara Menghapus Akun Sendiri*\n` +
    `➤ \`${p}hapusakun\`\n\n` +

    `🔟 *Kendala? Hubungi Owner*\n` +
    `➤ \`${p}owner\` — kirim kontak admin ke chat kamu\n\n` +

    `Semoga betah pakai *${config.botName}*! 🎉`
  );
}

module.exports = { buildHelpText };
