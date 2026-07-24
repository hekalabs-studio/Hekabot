module.exports = {
  botName: "HekaBot",
  botCode: "NHA-01",
  ownerName: "Novemas Heka A",
  ownerNumber: "6289514433486",
  // WhatsApp sekarang kadang ngirim ID pengirim dalam format LID (privasi baru), bukan nomor
  // telepon biasa. Kalau fitur owner-only (.database, .status, dll) nolak kamu padahal itu
  // nomor kamu sendiri, isi LID kamu di sini -- caranya: coba command owner-only apa aja,
  // lihat log di terminal (format "xxxxxxxxxxx@lid"), copy angka sebelum "@lid" ke sini.
  ownerLid: "194643790700756",
  instagram: "@novemash3kaa",

  // Prefix command. Set "" (string kosong) kalau mau semua command bisa dipanggil tanpa prefix.
  prefix: ".",

  // Base URL API downloader/tools (gratis, tanpa API key)
  apiBaseUrl: "https://api.siputzx.my.id",

  // Folder session Baileys
  sessionPath: "./session",

  // === Google Gemini AI (opsional) ===
  // Isi API key kamu dari https://aistudio.google.com/apikey buat aktifin fitur .ai
  geminiApiKey: "",
  geminiModel: "gemini-flash-latest", // alias resmi Google, otomatis ke model flash terbaru
  aiSystemPrompt:
    "Kamu adalah asisten AI ramah dan santai bernama HekaBot. Jawab pakai Bahasa Indonesia yang natural, " +
    "gak kaku, dan gak usah kepanjangan kecuali emang diminta detail.\n\n" +
    "PENTING - format teks buat WhatsApp (BUKAN Markdown standar):\n" +
    "- JANGAN PERNAH pakai notasi LaTeX/matematika seperti $$, $...$, \\frac, \\times, \\sigma, dll.\n" +
    "- Tulis rumus dengan simbol biasa: pakai × bukan \\times, ÷ bukan \\div, ² ³ buat pangkat, " +
    "dan tulis pecahan sebagai (a/b) bukan \\frac{a}{b}. Contoh yang BENAR: V = I × R, bukan $V = IR$.\n" +
    "- JANGAN pakai heading Markdown (#, ##, ###). Kalau perlu judul bagian, tulis tebal pakai *judul* lalu baris baru.\n" +
    "- Tebal pakai satu bintang: *tebal* — BUKAN dua bintang (**tebal**).\n" +
    "- Miring pakai satu garis bawah: _miring_. Coret pakai satu tilde: ~coret~.\n" +
    "- Buat daftar poin pakai tanda hubung (-) biasa, bukan penomoran Markdown bersarang.",
  // Kalau true: bot otomatis balas SEMUA chat pribadi (bukan grup) pakai AI tanpa perlu ketik .ai dulu.
  // Kalau false (default): AI cuma aktif kalau dipanggil manual pakai .ai
  aiAutoChatPrivate: false,
  // Kalau true: SEMUA user wajib daftar dulu (pakai .daftar Nama) sebelum bisa pakai fitur bot.
  // Set false kalau mau bot bisa dipakai bebas tanpa daftar.
  requireRegistration: true,

  // Kalau true: bot otomatis kasih salam + tutorial pas ada member baru masuk grup,
  // dan salam perpisahan pas ada yang keluar.
  groupWelcomeEnabled: true,
};
