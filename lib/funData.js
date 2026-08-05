// Bank teks buat Fun Menu — generator random lokal, gak butuh API.

/** Angka "acak" tapi konsisten untuk input yang sama (biar hasil gak beda tiap kali dites ulang) */
function seededPercent(seed, min = 0, max = 100) {
  let hash = 0;
  const str = String(seed).toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) % (max - min + 1);
  return min + normalized;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const KODAM_LIST = [
  // Original
  "Kodam Rajawali Ngamuk", "Kodam Elang Petir Malam", "Kodam Buaya Darat Insaf",
  "Kodam Kucing Garong Berdasi", "Kodam Naga Api Ngambek", "Kodam Singa Tidur Siang",
  "Kodam Serigala Baper", "Kodam Harimau Loncat Indah", "Kodam Gajah Ngambek Diem",
  "Kodam Kalajengking Baik Hati", "Kodam Ular Sanca Ngajak Damai", "Kodam Bebek Sakti Mandraguna",
  "Kodam Ayam Kampus Bermartabat", "Kodam Lele Terbang Tanpa Sayap", "Kodam Panda Lari Marathon",
  "Kodam Kecoa Terbang Histeris", "Kodam Landak Pelukan Kepepet", "Kodam Semut Rangrang Syariah",
  "Kodam Kuda Nil Overthinking", "Kodam Cicak Nyimak Obrolan", "Kodam Jangkrik Penasaran",
  "Kodam Cacing Kepanasan Beneran", "Kodam Gorila Merajuk", "Kodam Tupai Lupa Naro Kunci",

  // Expansion
  "Kodam Belalang Tempur Galau", "Kodam Undur-Undur Pantang Mundur", "Kodam Capung Lupa Arah",
  "Kodam Kura-Kura Lari Cepat", "Kodam Musang Berbulu Ayam", "Kodam Tokek Penghitung Takdir",
  "Kodam Kutu Buku Kurang Tidur", "Kodam Tawon Ndas Friendly", "Kodam Kepiting Syariah",
  "Kodam Hamster Roda Kehidupan", "Kodam Bandeng Melayang", "Kodam Ikan Cupang Adu Nasib",
  "Kodam Lumba-Lumba Penyelam Rindu", "Kodam Cendrawasih Introvert", "Kodam Burung Hantu Shift Malam",
  "Kodam Gelatik Panik", "Kodam Kakaktua Julid", "Kodam Merpati Nagih Janji",
  "Kodam Badak Kulit Tebal", "Kodam Kanguru Loncat Pagar", "Kodam Koala Tukang Rehat",
  "Kodam Unta Tahan Haus Kasih Sayang", "Kodam Alpaka Elegan", "Kodam Otter Sibuk Bergandengan",
  "Kodam Chameleon Salah Kostum", "Kodam Komodo Santai Siang", "Kodam Tapir Misterius",
  "Kodam Kukang Slow Motion", "Kodam Beaver Sibuk Nugas", "Kodam Monyet Kena Prank",
  "Kodam Orator Otang-Utang", "Kodam Sloth Kaum Rebahan", "Kodam Penguin Pake Jas",
  "Kodam Walrus Sambil Santai", "Kodam Hippo Tukang Lebay", "Kodam Gurita Tangan Delapan",
  "Kodam Ubur-Ubur Transparan", "Kodam Hiu Makan Bakso", "Kodam Paus Terdampar Rindu"
];

const DARK_JOKES = [
  // Original
  "Kenapa hantu gak pernah bohong? Karena mereka udah gak punya apa-apa buat disembunyiin.",
  "Dokter: 'Bapak tinggal berapa lama lagi ya...' Pasien: 'Loh emang saya nyewa kamar?'",
  "Apa bedanya aku sama tugas kuliah? Tugas kuliah masih ada yang nungguin selesai.",
  "Kenapa baterai HP-ku boros? Karena dia niru hidupku, cepet abis tapi lama nge-charge-nya.",
  "Aku bukan pemalas, cuma lagi hemat energi buat masa depan yang gak jelas.",
  "Dulu aku pengen banget mati muda, tapi pas tau biaya pemakaman mahal, aku urungkan niat.",
  "Keluargaku bilang aku bisa jadi apa aja yang aku mau. Ternyata jadi beban keluarga yang paling gampang.",
  "Dompetku kayak bawang merah. Tiap kali dibuka, bawaannya pengen nangis.",
  "Uang tidak bisa membeli kebahagiaan, tapi nangis di dalam mobil Alphard lebih nyaman daripada di atas sepeda ontel.",
  "Rencana masa depanku sangat jelas: bertahan hidup sampai besok pagi.",
  "Gak perlu takut sendirian di kegelapan, matikan lampu kamar dan kamu bakal merasa ada yang mengawasi.",

  // Expansion
  "Dokter bilang saya cuma punya waktu 10 buat hidup. Pasien: '10 apa doc? Tahun? Bulan?' Dokter: '9... 8... 7...'",
  "Penjual: 'Obat nyamuk ini bisa mematikan dalam sekejap.' Pembeli: 'Nyamuknya kan?' Penjual: 'Kita lihat saja nanti.'",
  "Teman saya jatuh dari lantai 20, tapi untung selamat. Dia jatuh di atas ambulans yang mau jemput dia.",
  "Orang tuaku selalu mengajariku untuk memberi pada yang membutuhkan. Makanya aku kasih masalahku ke orang lain.",
  "Hidup ini memang seperti roda berputar. Bedanya, roda saya kempes dan tertancap paku.",
  "Saya pernah berniat jadi penyenang orang banyak. Tapi ternyata jadi pengganggu jauh lebih efisien.",
  "Jangan menganggap dirimu tidak berguna. Ingat, kamu selalu bisa dijadikan contoh buruk.",
  "Terkadang aku merasa kesepian, tapi lalu aku ingat bahwa masalahku selalu setia menemaniku.",
  "Anak indigo bisa melihat masa depan. Sayangnya masa depanku terlalu gelap buat dilihat.",
  "Keluargaku sangat hemat. Bahkan ucapan 'selamat ulang tahun' pun di-recycle dari tahun lalu.",
  "Aku baru tahu kalau uang tidak dibawa mati. Pantas saja uangku habis sebelum sempat mati.",
  "Lampu di ujung terowongan itu bukan harapan, tapi kereta yang jalan ke arah kita.",
  "Aku tidak takut kegagalan. Aku sudah sangat terbiasa sampai rasanya seperti teman lama.",
  "Bekerjalah keras sampai rekening bankmu terlihat seperti nomor telepon. Walaupun sekarang masih kayak angka di dadu.",
  "Jangan menyerah pada mimpimu. Lanjutkan tidurmu.",
  "Harapan itu gratis. Itu kenapa nilainya seringkali nol besar.",
  "Aku tidak pernah kesepian, bayanganku selalu ada. Kecuali kalau mati lampu, dia juga kabur."
];

const FUN_FACTS = [
  // Original
  "Gurita punya 3 jantung dan darahnya warna biru.",
  "Madu gak pernah basi, bahkan yang umurnya ribuan tahun masih bisa dimakan.",
  "Manusia lebih dekat secara genetik ke pisang daripada yang kamu kira — sekitar 60% DNA-nya mirip.",
  "Bintang laut gak punya otak sama sekali.",
  "Suara petir bisa lebih panas dari permukaan matahari untuk sepersekian detik.",
  "Wortel awalnya berwarna ungu, bukan oranye.",
  "Kucing gak bisa merasakannya rasa manis karena kekurangan reseptor rasa.",
  "Satu hari di planet Venus lebih lama dibanding satu tahunnya di sana.",
  "Penguin cuma punya satu pasangan seumur hidup dan sering melamar pasangannya pakai batu kerikil.",
  "Flamingo warnanya merah muda karena makanan utama mereka adalah udang dan alga.",
  "Sidik lidah manusia unik dan berbeda-beda, sama seperti sidik jari.",
  "Kecoa bisa hidup beberapa minggu tanpa kepala sebelum akhirnya mati karena kelaparan.",

  // Expansion
  "Kuda laut jantan adalah yang melahirkan anak, bukan betinanya.",
  "Air liur manusia mengandung zat pereda nyeri alami bernama opiorphin yang lebih kuat dari morfin.",
  "Mata udang mantis bisa melihat jutaan warna yang tidak bisa ditangkap oleh mata manusia.",
  "Pohon bambu bisa tumbuh hingga 90 cm dalam waktu 24 jam saja.",
  "Jantung paus biru ukurannya sebesar mobil kecil dan detaknya bisa terdengar dari jarak 3 km.",
  "Kecoa adalah salah satu hewan purba yang sudah ada sejak zaman dinosaurus.",
  "Ayam adalah kerabat terdekat Tyrannosaurus Rex (T-Rex) yang masih hidup saat ini.",
  "Apel, pir, dan stroberi sebenarnya termasuk dalam keluarga tanaman mawar (Rosaceae).",
  "Awan kumulonimbus rata-rata memiliki berat sekitar 500.000 kg, setara dengan 100 gajah.",
  "Lumba-lumba tidur dengan satu mata terbuka dan setengah otaknya tetap sadar.",
  "Kelinci tidak bisa muntah karena sistem pencernaannya hanya bergerak satu arah.",
  "Koper beroda baru ditemukan pada tahun 1970, puluhan tahun setelah manusia berhasil ke bulan.",
  "Astronaut bisa tumbuh lebih tinggi hingga 5 cm saat berada di ruang angkasa karena kurangnya gravitasi.",
  "Hiu sudah ada di Bumi sebelum adanya pohon pertama.",
  "Beruang kutub sebenarnya memiliki kulit berwarna hitam di balik bulu putihnya.",
  "Gajah adalah satu-satunya mamalia yang tidak bisa melompat.",
  "Semut tidak memiliki paru-paru; mereka bernapas melalui lubang-lubang kecil di tubuhnya.",
  "Kupu-kupu mengecap rasa makanan menggunakan kaki mereka.",
  "Otak unta memiliki struktur khusus yang membuat mereka tidak pusing saat mengalami dehidrasi parah.",
  "Alpukat adalah buah beri raksasa berbiji satu secara botani."
];

const JODOH_COMMENTS = [
  // Original
  { min: 90, text: "Wah ini mah soulmate beneran, langsung nikah aja 😳" },
  { min: 70, text: "Cocok banget nih, coba deket-deketin!" },
  { min: 50, text: "Lumayan, ada peluang kalau diusahain." },
  { min: 30, text: "Hmm agak susah, tapi bukan berarti gak mungkin." },
  { min: 0, text: "Mending temenan aja dulu deh 😅" },
  { min: 80, text: "Sinyal cinta kuat banget, tinggal tunggu waktu nembak!" },
  { min: 40, text: "Butuh perjuangan ekstra, saingan kamu banyak nih." },
  { min: 15, text: "Zona nyaman alias cuman dianggap adik-kakak." },

  // Expansion
  { min: 95, text: "Takdir udah berbicara, tinggal urus katering pernikahan! 💍" },
  { min: 85, text: "Chemistry kalian menembus batas atmosfer, gas terus!" },
  { min: 75, text: "Saling melengkapi kayak kopi dan suasana hujan ☕" },
  { min: 65, text: "Ada percikan cinta, tapi butuh bensin komunikasi biar nyala." },
  { min: 55, text: "Peluangnya 50:50, tergantung siapa yang berani nyapa duluan." },
  { min: 45, text: "Status: Teman tapi mesra, tapi bingung mau dibawa kemana." },
  { min: 35, text: "Sering salah paham, harus banyak-banyak sabar dan kompromi." },
  { min: 25, text: "Cuma sebatas kenalan yang saling save kontak WhatsApp." },
  { min: 20, text: "Kamu yang berjuang, dia yang jadian sama orang lain 🥲" },
  { min: 10, text: "Masuk kategori 'Dia ramah ke semua orang, bukan cuma ke kamu'." },
  { min: 5, text: "Hilal jodoh belum keliatan, mending perbaiki diri dulu." },
  { min: 1, text: "Beda alam rasa cintanya, mending mundur teratur." }
];

const RATE_COMMENTS = [
  // Original
  { min: 90, text: "GILA INI MAH TOP TIER 🔥" },
  { min: 70, text: "Solid, di atas rata-rata!" },
  { min: 50, text: "Standar aja, lumayan lah." },
  { min: 30, text: "Yah, masih perlu usaha lebih." },
  { min: 0, text: "Wah... perlu banyak perbaikan nih 😬" },
  { min: 85, text: "Keren parah, hampir sempurna!" },
  { min: 60, text: "Gak jelek-jelek amat, masih masuk akal." },
  { min: 10, text: "Aduh, ini mah mending Ulang dari awal." },

  // Expansion
  { min: 98, text: "LEGENDA! Murni tanpa tandingan! 👑" },
  { min: 95, text: "Sempurna sampai bingung mau ngeritik apa." },
  { min: 80, text: "Sangat berkelas, bikin orang lain iri!" },
  { min: 75, text: "Cukup memukau dan layak dapat apresiasi tinggi." },
  { min: 65, text: "Di atas standar, tinggal dipoles dikit lagi." },
  { min: 55, text: "Pas-pasan di garis tengah, aman lah ya." },
  { min: 45, text: "Agak meragukan, tapi masih bisa diselamatkan." },
  { min: 35, text: "Kurang greget, butuh racikan baru." },
  { min: 25, text: "Di bawah ekspektasi, perlu rombak total." },
  { min: 20, text: "Agak mengkhawatirkan kalau dilihat lama-lama." },
  { min: 15, text: "Aduh, Sistem sampai kehabisan kata-kata." },
  { min: 5, text: "Skor darurat, butuh pertolongan pertama!" }
];

const TOP_TITLES = [
  // Original
  "Raja/Ratu Baper Sejagat", "Juara Rebahan Nasional", "Duta Prokrastinasi Resmi",
  "Legenda Chat Di-read Doang", "Master Julid Bersertifikat", "Sultan Insecure Harian",
  "Pemegang Rekor Bangun Siang", "Ikon Overthinking Se-RT",
  "CEO Of Nanti Dulu Dikerjain", "Pakar Stalking Mantan Internasional", "Sesepuh Ghosting Tanpa Alasan",
  "Pahlawan Wacana Jalan-Jalan", "Kolektor Sticker WhatsApp Random", "Duta Keranjang Shopee Penuh",
  "Menteri Urusan Melamun Malam",

  // Expansion
  "Presiden Komunitas Typo Indonesia", "Ketua Umum Wacana Diet Mulai Besok",
  "Pakar Memendam Perasaan Tanpa Kepastian", "Profesor Mengingat Kejadian Memalukan 5 Tahun Lalu",
  "Suhu Menatap Langit-Langit Kamar", "Juara 1 Lomba Ketiduran Pas Nonton Film",
  "Arsitek Rumah Tangga dalam Imajinasi", "Duta Saldo Tinggal Dua Digit",
  "Kolektor Playlist Musik Galau Siang Bolong", "Spesialis Senyum Sendiri Niat Ngetik Chat",
  "Master Ketawa Telat Pas Orang Lain Udah Selesai Ketawa", "Duta Keluar Group Tanpa Pamit",
  "Pahlawan Scroll TikTok Sampai Subuh", "Menteri Urusan Panik Pas Ditanya Kapan Nikah",
  "Suhu Beli Barang Gak Penting Pas Flash Sale", "Pakar Pura-Pura Sibuk Pas Dipanggil",
  "Kolektor Tab Browser Lebih dari 50 Biji", "Juara Bertahan Nonton Story Tanpa Follow"
];

const CARIPACAR_RESPONSES = [
  // Original
  "Coba mulai dari nyapa duluan, jangan cuma stalking doang 👀",
  "Sabar ya, jodoh emang suka dateng pas lagi gak dicari.",
  "Update dulu foto profil, baru gas cari gebetan.",
  "Kayaknya kamu kudu keluar rumah dulu deh biar ketemu orang baru 😂",
  "Coba deh ikutan circle baru, siapa tau ketemu yang cocok.",
  "Kurangin main game/sosmed, perbanyak interaksi di dunia nyata.",
  "Jangan menetapkan standar terlalu tinggi kalau sendirinya masih suka rebahan seharian.",
  "Jodoh itu di tangan Tuhan, tapi kalau gak ada usaha ya tetap di tangan Tuhan.",
  "Perbaiki kualitas diri dulu, nanti orang yang tepat bakal datang sendiri.",

  // Expansion
  "Cobalah ramah sama kasir minimarket, siapa tahu berawal dari kembalian.",
  "Hapus dulu kenangan mantan, baru buka lembaran baru.",
  "Minta tolong temen buat comblangin, kadang ide orang lain lebih manjur.",
  "Jangan cuma nunggu di-chat, sesekali reply story doi pakai umpan yang menarik.",
  "Ubah gaya rambut atau cara berpakaian, suasana baru bisa narik energi baru.",
  "Belajar jadi pendengar yang baik, orang suka sama yang mau mendengarkan.",
  "Jangan terlalu kelihatan 'desperate', santai tapi pasti aja.",
  "Ikut kegiatan relawan atau komunitas hobi, di sana banyak stok orang baik.",
  "Kalo gebetan gak respon, ingat: bumi luas, populasi manusia miliaran.",
  "Coba kurangi standar nyari yang sempurna, carilah yang mau tumbuh bareng."
];

const TAUGASIH_FACTS = [
  // Original
  "Tau gasih, senyum itu bisa nular ke orang sekitar kamu.",
  "Tau gasih, sekali kamu ketawa lepas, otak kamu lepas endorfin yang bikin mood naik.",
  "Tau gasih, orang yang sering bilang makasih biasanya lebih bahagia.",
  "Tau gasih, istirahat cukup itu investasi, bukan kemalasan.",
  "Tau gasih, minum air putih cukup bisa ningkatin fokus dan ngurangin cemas.",
  "Tau gasih, mendengar musik favorit bisa menurunkan tingkat stres hanya dalam 5 menit.",
  "Tau gasih, menulis perasaan di kertas bisa bantu meredakan beban pikiran.",
  "Tau gasih, jalan kaki 15 menit sehari bisa ningkatin kreativitas kamu.",

  // Expansion
  "Tau gasih, merapikan tempat tidur di pagi hari bisa ngasih rasa pencapaian pertama buat memulai hari.",
  "Tau gasih, pelukan selama 20 detik bisa melepas hormon oksitosin yang bikin kamu merasa aman.",
  "Tau gasih, memelihara tanaman di dalam ruangan bisa bantu menyaring udara dan meredakan stres mental.",
  "Tau gasih, belajar hal baru setiap hari bisa menjaga otak tetap awet muda.",
  "Tau gasih, mengonsumsi cokelat hitam dalam jumlah wajar bisa ningkatin fungsi otak.",
  "Tau gasih, menghabiskan waktu di alam terbuka (green time) bisa menurunkan kadar hormon kortisol.",
  "Tau gasih, menceritakan kebaikan orang lain di belakang mereka bisa bikin kamu lebih disukai.",
  "Tau gasih, menarik napas dalam 4 detik dan menghembuskan 6 detik bisa langsung menenangkan saraf panik."
];

const DREAMWORLD_LINES = [
  // Original
  "kamu lagi di fase healing, nikmatin dulu prosesnya.",
  "ada kejutan baik nungguin kamu bulan ini, tetap terbuka ya.",
  "waktunya buat berhenti sebentar dan nafas dalam-dalam.",
  "sesuatu yang kamu tunggu-tunggu bakal dateng lebih cepat dari yang kamu kira.",
  "kamu lebih kuat dari yang kamu sadari sekarang.",
  "pintu baru bakal terbuka begitu kamu berani nutup pintu yang lama.",
  "gak apa-apa capek, yang penting jangan menyerah.",
  "fokus ke apa yang bisa kamu kontrol, sisanya biarlah berlalu.",
  "langkah kecil hari ini bakal ngebawa kamu ke perubahan besar besok.",

  // Expansion
  "semua rasa bingung ini cuma transit, kamu bakal nemuin arah yang pas sebentar lagi.",
  "pilihan yang kamu ragukan kemarin ternyata bakal ngebawa hasil yang manis.",
  "jangan terlalu keras sama diri sendiri, kamu udah berusaha sejauh ini.",
  "semesta lagi menata hal-hal baik di balik layar, bersabarlah sedikit lagi.",
  "apa yang lepas dari genggamanmu memang diciptakan bukan untuk kamu simpan.",
  "akan ada seseorang yang benar-benar mengerti dan menghargai caramu tersenyum.",
  "badai yang kamu hadapi hari ini sedang menyiapkan tanah yang subur buat masadepanmu.",
  "percaya pada prosesmu sendiri, tidak perlu membandingkan kecepatanmu dengan orang lain.",
  "kesempatan kedua seringkali datang dalam wujud yang tidak kamu duga sebelumnya."
];

module.exports = {
  seededPercent,
  pickRandom,
  KODAM_LIST,
  DARK_JOKES,
  FUN_FACTS,
  JODOH_COMMENTS,
  RATE_COMMENTS,
  TOP_TITLES,
  CARIPACAR_RESPONSES,
  TAUGASIH_FACTS,
  DREAMWORLD_LINES,
};
