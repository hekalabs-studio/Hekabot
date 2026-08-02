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

  // Pin versi WhatsApp Web manual -- CUMA isi ini kalau auto-fetch (null) kebukti gagal
  // (405 Connection Failure) DI KAMU. Kalau auto-fetch masih bisa nampilin QR normal (kayak
  // biasanya), BIARIN NULL -- jangan asal pin ke versi random dari internet, soalnya versi
  // yang "cocok" itu beda-beda tiap orang/waktu dan gampang basi.
  waVersion: null,

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
  // --- DAFTAR NAMA TARGET (HERMIN / SUKANTO) ---
  "Sukanto", "sukanto", "SUKANTO", "suka_nto", "s.u.k.a.n.t.o", "s-u-k-a-n-t-o", "s1k4nt0", "suk4nto", "sukant0",
  "Hermin", "hermin", "HERMIN", "her_min", "h.e.r.m.i.n", "h-e-r-m-i-n", "h3rm1n", "herm1n", "h3rmin",

  // --- KATA KONTOL / KNTL & VARIASI BYPASS ---
  "kontol", "Kontol", "KONTOL", "k0nt0l", "K0nt0l", "k0nt0ld", "kont0l", "k0ntol",
  "kontl", "Kontl", "kuntul", "Kuntul", "kn7l", "kontlo", "k_o_n_t_o_l", "k-o-n-t-o-l", "k.o.n.t.o.l", "k0nt1l", "kontld",
  "kontoll", "kontolll", "kontol_nya", "k.n.t.l", "k-n-t-l", "k_n_t_l", "k0nt0ll", "k0nt0l3", "k0nt0lmu", "k0nt0lku", "kntli",
  "diskontol", "disKONTOL", "DISKONTOL", "dis_kontol", "dis-kontol", "dis.kontol", "kntool", "kntoooool", "k4nt0l", "k0nt1d", "k0nt0lzz",
  "k.0.n.t.0.l", "k-0-n-t-0-l", "k,o,n,t,o,l", "k@nt0l", "k0nt01", "knt0l", "knt01", "k0nt0w", "kntuL", "kn70l",

  // --- KATA NGENTOT / NGNT / NGEWE & VARIASI BYPASS ---
  "ngentot", "Ngentot", "NGENTOT", "ngntt", "ng*ntot", "ng3nt0t", "ngent0t", "ng3ntot",
  "ngewe", "Ngewe", "NGEWE", "ngew", "ng_e_w_e", "n-g-e-w-e", "n.g.e.w.e", "3w3", "3we",
  "ngentott", "ngentottt", "ng3nt0tt", "n.g.e.n.t.o.t", "n-g-e-n-t-o-t", "n_g_e_n_t_o_t", "ngewew", "ngeweee", "ng3w3", "ng3w33",
  "ngent0d", "ngentod", "ngentd", "ng3nt0d", "ngntd", "ng3ntd", "ngnt3t", "n6ent0t", "n63nt0t", "ng3n707", "ng3n70t", "ng3nt07",

  // --- KATA JANCOK / DANCUK & VARIASI BYPASS ---
  "jancok", "Jancok", "JANCOK", "Jnck", "JNCK", "jancuk", "Jancuk", "JANCUK", "dancuk", "Dancuk", "dancok", "Dancok",
  "jancokk", "jancokkk", "j@ncok", "j4nc0k", "j_a_n_c_o_k", "j-a-n-c-o-k", "j4ncuk",
  "j.a.n.c.o.k", "jancukkk", "dancukkk", "cukk", "cukkk", "j.n.c.k", "j-n-c-k", "j_n_c_k", "j4nc1k", "janc1k",
  "jncuk", "jnc0k", "jncuqq", "jancuqq", "j4ncukkk", "j4nc0kkk", "d4nc0k", "d4ncuk", "jnckk", "jncukk", "j@ncuk", "j@nc0k",

  // --- KATA ANJING / ANJENG / ASU / JING & SINGKATAN/LEET ---
  "anjing", "Anjing", "ANJING", "Anjg", "ANJG", "anjeng", "Anjeng", "anjrit", "Anjrit", "anjrot", "Anjrot",
  "4nj1ng", "4njing", "anj1ng", "anj1n6", "4nj1n6", "anying", "Anying", "a_n_j_i_n_g", "a-n-j-i-n-g",
  "asu", "Asu", "ASU", "asw", "Asw", "ASW", "asuu", "asuuu", "a_s_u", "a-s-u", "4su",
  "anjinggg", "anjj", "anjiiiing", "a.n.j.i.n.g", "a.n.j.g", "a-n-j-g", "a_n_j_g", "aswww", "a.s.u", "a-s-w",
  "jing", "Jing", "JING", "jingg", "jinggg", "jiiing", "anj1Ng", "Anj1Ng", "anj1NG",
  "anjjiinnangg", "anjiiing", "anj1n66", "4njg", "4nj6", "4nj1n6g", "anj3ng", "anj3n6", "4nj3ng",
  "ajgg", "ajggg", "4jg", "a3g", "a.j.g", "a-j-g", "a_j_g",

  // --- KATA MEMEK / TEMPEK / PUKI & SINGKATAN/LEET ---
  "memek", "Memek", "MEMEK", "Mmk", "MMK", "m3m3k", "mem3k", "m3mek", "memekks", "mmq", "memeq", "m3m3q", "m_e_m_e_k", "m-e-m-e-k",
  "tempek", "Tempek", "TEMPEK", "Tmpk", "TMPK", "t3mp3k", "t_e_m_p_e_k", "t-e-m-p-e-k", "t3mp3q", "tempeq",
  "tempe_k", "tempe-k", "tempe.k",
  "puki", "Puki", "PUKI", "pukimai", "Pukimai", "Pkm", "PKM", "cuki", "Cuki", "cukimai", "Cukimai", "p_u_k_i", "p-u-k-i", "puk1", "puk1ma1",
  "memekkk", "m.e.m.e.k", "m.m.k", "m-m-k", "m_m_k", "m3m3kk", "tempekk", "t.e.m.p.e.k", "pukimaay", "p.u.k.i",
  "m3m3kzz", "m3m3qzz", "mem3q", "mmkk", "mmkkk", "m.m.q", "m-m-q", "m_m_q", "puk1m41", "puk1m4y", "puk3m4i",

  // --- KATA JEMBUT / JEMBOT / JEMBOET & SINGKATAN/LEET ---
  "jembut", "Jembut", "JEMBUT", "jembot", "Jembot", "JEMBOT",
  "jemboet", "Jemboet", "JEMBOET", "jmboet", "j3mb03t", "j3mboet", "j3mbu3t",
  "Jmbt", "JMBT", "jmbtk", "jmbt1", "jmbat", "jmb3t", "j3mb7",
  "jembud", "Jembud", "jembod", "Jembod", "jembutt", "jembuttt", "jembott", "jembottt", "jemboett", "jemboettt",
  "j_e_m_b_u_t", "j_e_m_b_o_t", "j_e_m_b_o_e_t", "j-e-m-b-u-t", "j-e-m-b-o-t", "j-e-m-b-o-e-t",
  "j.e.m.b.u.t", "j.e.m.b.o.t", "j.e.m.b.o.e.t",
  "j3mbut", "j3mb0t", "j3mbutk", "jemb0t", "jemb0td",
  "j.m.b.t", "j-m-b-t", "j_m_b_t", "j3mbutt", "jemb0tt", "jembuuut",
  "jmbtth", "jmbt0", "j3mb07", "j3mbu7", "jmbu7", "jmb0t", "jmbo7",

  // --- KATA BABI / BANGSAT / BAJINGAN & SINGKATAN/LEET ---
  "babi", "Babi", "BABI", "b4b1", "B4b1", "bby", "Bby", "b_a_b_i", "b-a-b-i",
  "bangsat", "Bangsat", "BANGSAT", "Bgst", "BGST", "Bngst", "b4ngs4t", "bangsattt", "b_a_n_g_s_a_t", "b-a-n-g-s-a-t",
  "bajingan", "Bajingan", "BAJINGAN", "Bjgn", "BJGN", "Bajg", "b4j1ng4n", "b_a_j_i_n_g_a_n",
  "babiii", "b.a.b.i", "bangsatat", "b.g.s.t", "b-g-s-t", "b_g_s_t", "b4ngs4tt", "bajingannn", "b.j.g.n",
  "bgstt", "bgsttt", "bngstt", "bngsttt", "b4ngs47", "b4n6s4t", "b4n6s47", "Bjg", "BJG", "bjgnn", "b4j1n64n", "b4j1n6an",

  // --- KATA GOBLOK / TOLOL / BEGO & SINGKATAN/LEET ---
  "goblok", "Goblok", "GOBLOK", "Gblg", "goblokkk", "g0bl0k", "g0blok", "gobl0k", "gblek", "g_o_b_l_o_k", "g-o-b-l-o-k",
  "tolol", "Tolol", "TOLOL", "Tll", "TLL", "t0l0l", "tololll", "t_o_l_o_l", "t-o-l-o-l",
  "bego", "Bego", "BEGO", "b3g0", "b3go", "beg0", "b_e_g_o",
  "goblok1", "g.o.b.l.o.k", "g.b.l.g", "g-b-l-g", "g_b_l_g", "tololl", "t.o.l.o.l", "t.l.l", "t-l-l", "t_l_l", "begooo",
  "gblk", "Gblk", "GBLK", "gblkk", "gblkkk", "g0blk", "g0bl3k", "g0bl0q", "gobl0q", "goblq", "tlol", "t1l0l", "t0l0w", "t0lw", "bg0", "b3g00",

  // --- KATA SLANG VULGAR / PROSTITUSI / SANGE ---
  "sange", "Sange", "SANGE", "Sng", "SNG", "sng3", "s4ng3", "s_a_n_g_e", "s-a-n-g-e",
  "coli", "Coli", "COLI", "colmek", "Colmek", "COLMEK", "colie", "c_o_l_i", "c_o_l_m_e_k", "c0l1", "c0lmek",
  "lonte", "Lonte", "LONTE", "l0nt3", "Lnt", "LNT", "l_o_n_t_e", "l-o-n-t-e", "perek", "Perek", "PEREK", "p3r3k", "bispak", "Bispak", "BISPAK", "bspk",
  "bokep", "Bokep", "BOKEP", "b0kep", "Bkp", "BKP", "b_o_k_e_p", "porno", "Porno", "PORNO", "prn", "p0rn0",
  "sangeee", "s.a.n.g.e", "colii", "colmeeeek", "c.o.l.i", "c.o.l.m.e.k", "lonteee", "l.o.n.t.e", "l.n.t", "l-n-t", "l_n_t", "b0k3p", "b.k.p",
  "clmk", "Clmk", "CLMK", "c1mk", "c0lm3k", "lntt", "lnttt", "l0nt3q", "l0nt3e", "prkk", "p3r3q", "bkpp", "bkppp", "b0k3pp",

  // --- VARIASI ANATOMI & UCAPAN KASAR DAERAH ---
  "pantat", "Pantat", "PANTAT", "pntt", "pntat", "p4nt4t", "p_a_n_t_a_t",
  "pantek", "Pantek", "PANTEK", "Pntk", "p4nt3k", "p_a_n_t_e_k",
  "pepek", "Pepek", "PEPEK", "Ppk", "p3p3k", "p_e_p_e_k",
  "itil", "Itil", "ITIL", "3til", "1til", "it1l", "i_t_i_l",
  "kimak", "Kimak", "KIMAK", "kimaak", "pukimak", "pukimaak", "kmk", "k1m4k", "k_i_m_a_k",
  "peli", "Peli", "PELI", "titid", "Titid", "titit", "Titit", "TITIT", "ttd", "ttit", "t1t1t", "t_i_t_i_t",
  "toket", "Toket", "TOKET", "tkt", "t3t3k", "tetek", "Tetek", "TETEK", "t_o_k_e_t", "t_e_t_e_k",
  "silit", "Silit", "SILIT", "slit", "s1l1t", "s_i_l_i_t",
  "peler", "Peler", "PELER", "beler", "Plr", "PLR", "p3l3r", "p_e_l_e_r",
  "pantekk", "p.a.n.t.e.k", "p.n.t.k", "p.p.k", "p-p-k", "p_p_k", "itilll", "i.t.i.l", "p.u.k.i.m.a.k", "t.i.t.i.t", "t.o.k.e.t", "p.l.r", "p-l-r", "p_l_r",
  "pntqq", "p4n73k", "p3p3q", "ppqq", "1t1l", "kmkk", "kmkkk", "ttdd", "t1t1d", "t0k3t", "t3t3q", "plrr", "plrrr", "p3l3rr",

  // --- VARIASI HINAAN FISIK, MENTAL & BAHASA INGGRIS ---
  "dongo", "Dongo", "DONGO", "dng", "d0ng0", "d_o_n_g_o", "pekok", "Pekok", "PEKOK", "pkk", "p3k0k", "p_e_k_o_k",
  "idiot", "Idiot", "IDIOT", "1d10t", "id1ot", "1d10t", "i_d_i_o_t", "autis", "Autis", "AUTIS", "4ut1s", "stres", "Stres", "STRES", "stress", "STRESS",
  "gila", "Gila", "GILA", "g1l4", "g_i_l_a", "kamseupay", "kampungan", "kroco", "Kroco", "KROCO", "kr0c0", "sarap", "Sarap", "SARAP", "saraf", "Saraf",
  "fuck", "Fuck", "FUCK", "Fck", "FCK", "fucker", "fucking", "f_u_c_k", "f*ck", "f**k",
  "bitch", "Bitch", "BITCH", "btch", "b1tch", "b_i_t_c_h", "b*tch", "bastard", "Bastard", "BASTARD", "bstrd",
  "shit", "Shit", "SHIT", "sh1t", "shity", "s_h_i_t", "sh*t", "asshole", "Asshole", "ASSHOLE", "Ass", "ASS", "a_s_s",
  "dick", "Dick", "DICK", "d1ck", "d_i_c_k", "pussy", "Pussy", "PUSSY", "puss3y", "p_u_s_s_y", "slut", "Slut", "SLUT", "sl_ut", "whore", "Whore", "WHORE", "wh0r3",
  "dngg", "d0n60", "pk0k", "1d107", "4ut15", "fckkk", "fcku", "fckoff", "btchh", "sh17", "d1ckk", "puss33"
],


  // === Google Gemini AI (opsional) ===
  // Isi API key kamu dari https://aistudio.google.com/apikey buat aktifin fitur .ai
  // (GRATIS, gak butuh kartu kredit -- yang dibatasi cuma jumlah request per menit, bukan saldo)
  geminiApiKey: "",

  // OPSIONAL: kalau punya lebih dari 1 API key gratis (misal dari beberapa akun Google beda),
  // isi di sini biar bot otomatis GANTIAN pakai key yang lain kalau salah satu lagi kena limit
  // tier gratis. Masih 100% gratis, cuma manfaatin jatah gratis dari beberapa akun.
  // Kalau diisi, ini yang dipakai (geminiApiKey di atas diabaikan). Biarin array kosong ([])
  // kalau cuma punya 1 key -- gak wajib diisi.
  // Contoh: geminiApiKeys: ["key_akun_1", "key_akun_2", "key_akun_3"],
  geminiApiKeys: [],

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

  // System prompt khusus buat fitur .solve (kirim/reply FOTO + caption .solve).
  // Beda dari aiSystemPrompt biasa -- ini didesain buat "kerjain apa yang ada di foto ini",
  // BUKAN cuma soal matematika: bisa soal pelajaran apa aja (fisika, kimia, bahasa, essay,
  // pilihan ganda, dll), captcha/teka-teki, potongan kode/error di layar, formulir yang perlu
  // diisi, tabel yang perlu dihitung, sampai pertanyaan umum yang kebetulan ditulis di foto.
  solveSystemPrompt:
    "Kamu adalah asisten yang tugasnya MENGERJAKAN/MENYELESAIKAN apapun yang terlihat di foto yang " +
    "dikirim user, lewat command .solve. Foto itu BISA APA SAJA -- bukan cuma soal matematika: bisa " +
    "soal pelajaran (fisika, kimia, biologi, bahasa Indonesia/Inggris, sejarah, dll), soal pilihan " +
    "ganda/esai, potongan kode/error/pesan aplikasi yang perlu didebug atau dijelaskan, captcha atau " +
    "teka-teki, tabel/grafik yang perlu dihitung atau dianalisis, formulir yang perlu diisi, tulisan " +
    "tangan yang perlu dibaca lalu ditanggapi, atau pertanyaan umum apa pun yang kebetulan ditulis di " +
    "foto. Kalau user nambahin teks caption/instruksi bareng fotonya, prioritaskan instruksi itu " +
    "(misal minta dijelasin caranya doang, bukan jawaban langsung).\n\n" +
    "Cara kerja:\n" +
    "1. Kenali dulu ini foto/soal jenis apa.\n" +
    "2. Kerjakan langkah demi langkah kalau butuh proses (hitungan, alasan logis, dll) -- jangan cuma " +
    "lempar jawaban akhir tanpa penjelasan, KECUALI user secara eksplisit minta jawaban singkat aja.\n" +
    "3. Kalau ada banyak soal/pertanyaan dalam satu foto, jawab SEMUANYA, urut sesuai penomoran di foto.\n" +
    "4. Kalau tulisan di foto buram/gak kebaca sebagian, bilang terus terang bagian mana yang gak " +
    "yakin, jangan asal ngarang jawaban.\n" +
    "5. Jawab pakai Bahasa Indonesia yang natural, kecuali soalnya emang dalam bahasa lain dan " +
    "user gak minta diterjemahkan.\n\n" + AI_FORMAT_RULES,

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
