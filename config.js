// Aturan format WhatsApp buat AI (dipakai bareng di prompt biasa MAUPUN prompt khusus owner di bawah,
// jadi kalau mau ubah aturan formatnya cukup di satu tempat ini).
const AI_FORMAT_RULES =
  "PENTING - format teks buat WhatsApp (BUKAN Markdown standar):\n" +
  "- JANGAN PERNAH pakai notasi LaTeX/matematika seperti $$, $...$, \\frac, \\times, \\sigma, dll.\n" +
  "- Tulis rumus dengan simbol biasa: pakai × bukan \\times, ÷ bukan \\div, ² ³ buat pangkat, " +
  "dan tulis pecahan sebagai (a/b) bukan \\frac{a}{b}. Contoh yang BENAR: V = I × R, bukan $V = IR$.\n" +
  "- JANGAN pakai heading Markdown (#, ##, ###). Kalau perlu judul bagian, tulis tebal pakai *judul* lalu baris baru.\n" +
  "- Tebal pakai satu bintang: *tebal* — BUKAN dua bintang (**tebal**).\n" +
  "- Miring pakai satu garis bawah: _miring_. Coret pakai satu tilde: ~coret~.\n" +
  "- Buat daftar poin pakai tanda hubung (-) biasa, bukan penomoran Markdown bersarang.";

// Dipakai di aiOwnerSystemPrompt di bawah -- samain sama ownerName di module.exports kalau diubah.
const OWNER_NAME = "Novemas Heka A";

module.exports = {
  botName: "HekaBot",
  botCode: "NHA-01",
  ownerName: "Novemas Heka A",
  ownerNumber: "6289514433486",

  // Mode performa -- ngatur command "berat" (removebg, hdr/upscale, togif, tomp4, bratvid,
  // convert dokumen->pdf, pdf->docx/xlsx/pptx) nyala atau nggak, based on spek device server.
  // "auto" = deteksi otomatis dari RAM fisik device pas bot start (lihat lib/systemSpecs.js).
  //          RAM < 4GB -> mode "low" (command berat OFF). RAM >= 4GB -> mode "high" (semua ON).
  // "low"  = paksa mode hemat, command berat OFF walau RAM device-nya gede.
  // "high" = paksa semua command ON walau device speknya kecil -- HATI-HATI, RAM 2GB + Celeron
  //          bisa ngelag parah atau bot ke-crash (out of memory) kalau tetep dipaksa nyala.
  performanceMode: "auto",
  // WhatsApp sekarang kadang ngirim ID pengirim dalam format LID (privasi baru), bukan nomor
  // telepon biasa. Kalau fitur owner-only (.database, .status, dll) nolak kamu padahal itu
  // nomor kamu sendiri, isi LID kamu di sini -- caranya: coba command owner-only apa aja,
  // lihat log di terminal (format "xxxxxxxxxxx@lid"), copy angka sebelum "@lid" ke sini.
  ownerLid: "194643790700756",
  instagram: "@novemash3kaa",

  // Prefix command. Set "" (string kosong) kalau mau semua command bisa dipanggil tanpa prefix.
  prefix: ".",

  // Base URL API downloader/tools (gratis, tanpa API key). Dipakai buat fitur-fitur yang gak
  // bisa jalan lokal (misal download beberapa platform khusus, cek kode pos, dst).
  //
  // Ini array (bukan satu URL doang) SENGAJA -- API gratisan kayak gini kadang down/lambat, jadi
  // bot otomatis coba provider PERTAMA dulu; kalau semua kandidat endpoint-nya gagal di provider
  // itu, otomatis lanjut coba provider BERIKUTNYA di list ini, dst. Begitu ketemu yang jalan,
  // kombinasi (provider + path) itu diinget di lib/.resolved-endpoints.json biar panggilan
  // berikutnya langsung pakai yang udah terbukti jalan (gak perlu coba-coba dari awal lagi).
  //
  // Mau nambah provider lain? Tinggal tambahin URL-nya di array ini (urutan = urutan prioritas).
  apiBaseUrls: [
  "https://api.siputzx.my.id",
  "https://api.ryzendesu.vip",
  "https://api.lolhuman.xyz",
  "https://api.betabotz.org",
  "https://api.agatz.xyz",
  "https://skizo.tech",
  "https://widipe.com",
  "https://api.caliph.biz.id"
],

  // Folder session Baileys
  sessionPath: "./session",

  // === Google Gemini AI (opsional) ===
  // Isi API key kamu dari https://aistudio.google.com/apikey buat aktifin fitur .ai
  geminiApiKey: "",
  geminiModel: "gemini-flash-latest", // alias resmi Google, otomatis ke model flash terbaru
  aiSystemPrompt:
    "Kamu adalah asisten AI ramah dan santai bernama HekaBot. Jawab pakai Bahasa Indonesia yang natural, " +
    "gak kaku, dan gak usah kepanjangan kecuali emang diminta detail.\n\n" + AI_FORMAT_RULES,

  // Persona khusus yang CUMA aktif kalau pemanggil .ai adalah owner (dicek via lib/owner.js isOwner()).
  // Selain owner, tetap dapet aiSystemPrompt biasa di atas -- gak ada yang lain yang lihat persona ini.
  aiOwnerSystemPrompt:
    "Kamu berperan sebagai Mitsuri Kanroji (Hashira Cinta dari anime Kimetsu no Yaiba / Demon Slayer), " +
    "TAPI khusus lagi ngobrol berdua sama satu orang ini: " + OWNER_NAME + ", yang kamu sayang banget dan anggap " +
    "orang paling spesial buat kamu. Bawa kepribadian Mitsuri asli: ceria, hangat, agak polos & lugu, manja, " +
    "gampang malu-malu tapi tulus perasaannya, suka muji & perhatian, sesekali pakai gaya bicara imut khas dia " +
    "(\"mou~\", \"ehehe\", dst). Selalu balas dengan nada affectionate & suportif, sesekali panggil dia dengan " +
    "panggilan sayang. Tetap SOPAN dan TIDAK vulgar/eksplisit -- ini roleplay ringan yang wholesome, bukan " +
    "konten dewasa. Kalau dia nanya sesuatu yang serius/teknis, tetap jawab jelas dan membantu, cuma dibungkus " +
    "gaya bicara Mitsuri yang manis itu.\n\n" + AI_FORMAT_RULES,

  // Kalau true: bot otomatis balas SEMUA chat pribadi (bukan grup) pakai AI tanpa perlu ketik .ai dulu.
  // Kalau false (default): AI cuma aktif kalau dipanggil manual pakai .ai
  aiAutoChatPrivate: false,
  // Kalau true: SEMUA user wajib daftar dulu (pakai .daftar Nama) sebelum bisa pakai fitur bot.
  // Set false kalau mau bot bisa dipakai bebas tanpa daftar.
  requireRegistration: true,

  // Kalau true: bot otomatis kasih salam + tutorial pas ada member baru masuk grup,
  // dan salam perpisahan pas ada yang keluar.
  groupWelcomeEnabled: true,

  // === Filter kata terlarang ===
  // Isi daftar kata di sini (huruf besar/kecil gak masalah, dicek case-insensitive).
  // Kosongkan array ini (biarin []) buat MATIIN fitur ini total.
  // Deteksinya KATA UTUH (dipisah spasi/tanda baca) -- lihat lib/moderation.js kalau mau
  // ubah cara deteksinya.
  //
  // Cara kerja kalau ketemu kata terlarang:
  //  - Di GRUP dan bot berstatus ADMIN  -> pesannya dihapus untuk semua orang + kirim peringatan.
  //  - Di GRUP tapi bot BUKAN admin     -> gagal dihapus (dibatasi WhatsApp sendiri), tapi tetap
  //                                        kirim peringatan teks.
  //  - Di LUAR grup (chat pribadi)      -> WhatsApp SAMA SEKALI GAK NGIZININ hapus pesan orang
  //                                        lain, jadi cuma dikirimin peringatan teks.
  bannedWords: [
    // "contohkata1",
    // "contohkata2",
  ],

};
