// Semua bank soal game — data statis lokal, gak butuh API/internet.

const ASAHOTAK = [
  { q: "Aku punya kepala dan ekor tapi gak punya badan. Aku apa?", a: "koin" },
  { q: "Semakin banyak diambil dari aku, aku malah semakin besar. Aku apa?", a: "lubang" },
  { q: "Apa yang naik tapi gak pernah turun?", a: "umur" },
  { q: "Punya kunci tapi gak bisa buka pintu. Apa itu?", a: "piano" },
  { q: "Rumah apa yang bisa jalan?", a: "siput" },
  { q: "Berjalan tanpa kaki, punya sayap tapi gak bisa terbang. Apa itu?", a: "kapal" },
  { q: "Aku selalu datang tapi gak pernah sampai. Aku apa?", a: "hari esok" },
  { q: "Apa yang punya banyak gigi tapi gak bisa gigit?", a: "sisir" },
];

const TEBAKTEBAKAN = [
  { q: "Kenapa ayam gak boleh main ke sirkus?", a: "nanti diakuin bebek" },
  { q: "Apa bedanya rumput sama semut?", a: "kalau rumput dipangkas, kalau semut dipijak" },
  { q: "Kenapa telepon gak pernah masuk angin?", a: "karena ada kartunya" },
  { q: "Kenapa kalkulator gak pernah cemburu?", a: "karena dia selalu dapat hasil yang pasti" },
  { q: "Hewan apa yang jalannya paling lambat sedunia?", a: "keong" },
  { q: "Kenapa ikan gak suka main basket?", a: "takut kena net" },
];

const TEBAKBENDERA = [
  { q: "🇯🇵", a: "jepang" },
  { q: "🇰🇷", a: "korea selatan" },
  { q: "🇫🇷", a: "perancis" },
  { q: "🇧🇷", a: "brazil" },
  { q: "🇮🇹", a: "italia" },
  { q: "🇩🇪", a: "jerman" },
  { q: "🇨🇦", a: "kanada" },
  { q: "🇲🇽", a: "meksiko" },
  { q: "🇪🇬", a: "mesir" },
  { q: "🇮🇳", a: "india" },
  { q: "🇸🇦", a: "arab saudi" },
  { q: "🇹🇭", a: "thailand" },
  { q: "🇦🇺", a: "australia" },
  { q: "🇬🇧", a: "inggris" },
  { q: "🇨🇳", a: "china" },
];

const TEBAKKATA = [
  { q: "Alat buat nulis, isinya tinta", a: "pulpen" },
  { q: "Hewan berbelalai panjang, telinganya besar", a: "gajah" },
  { q: "Tempat nyimpen uang di bank", a: "rekening" },
  { q: "Alat masak buat gorengan, bentuknya cekung", a: "wajan" },
  { q: "Benda langit yang muncul malam hari, banyak jumlahnya", a: "bintang" },
  { q: "Kendaraan roda dua yang dikayuh", a: "sepeda" },
  { q: "Tempat orang belajar dari SD sampai SMA", a: "sekolah" },
  { q: "Alat buat lihat waktu, dipakai di tangan", a: "jam tangan" },
];

const SUSUNKATA_WORDS = [
  "komputer", "matahari", "keyboard", "pelangi", "gunung",
  "samudra", "bintang", "kupukupu", "sepatu", "jendela",
  "kalender", "payung", "handphone", "cermin", "gerbang",
];

const TEBAKPRESIDEN = [
  { q: "Presiden pertama RI, proklamator kemerdekaan Indonesia", a: "soekarno" },
  { q: "Presiden kedua RI, menjabat paling lama (32 tahun)", a: "soeharto" },
  { q: "Presiden ke-3 RI, dikenal sebagai bapak teknologi Indonesia", a: "habibie" },
  { q: "Presiden ke-4 RI, dikenal sebagai bapak pluralisme", a: "gus dur" },
  { q: "Presiden wanita pertama RI", a: "megawati" },
  { q: "Presiden ke-6 RI, dari partai demokrat, 2 periode", a: "sby" },
  { q: "Presiden ke-7 RI, mantan Gubernur DKI Jakarta", a: "jokowi" },
  { q: "Presiden ke-8 RI, mantan menteri pertahanan", a: "prabowo" },
];

const TEBAKPOKEMON = [
  { q: "Pokemon api starter Kanto, evolusi akhirnya Charizard", a: "charmander" },
  { q: "Tikus listrik kuning, maskot utama franchise Pokemon", a: "pikachu" },
  { q: "Pokemon air starter Kanto, bentuk kura-kura", a: "squirtle" },
  { q: "Pokemon rumput starter Kanto, ada bunga di punggung pas evolusi", a: "bulbasaur" },
  { q: "Pokemon psikis legendaris, hasil eksperimen kloning dari Mew", a: "mewtwo" },
  { q: "Pokemon hantu ungu, sering nyengir jahil", a: "gengar" },
];

// Kuis Pendidikan Agama Islam - level SMA kelas 12
const KUISISLAMI = [
  { q: "Rukun Islam yang kelima (terakhir) adalah...", a: "haji" },
  { q: "Nabi terakhir dan penutup para nabi adalah Nabi...", a: "muhammad" },
  { q: "Puasa wajib yang dilakukan pada bulan ke-9 kalender Hijriah disebut puasa...", a: "ramadhan" },
  { q: "Zakat yang wajib dikeluarkan menjelang Idul Fitri disebut zakat...", a: "fitrah" },
  { q: "Kitab suci umat Islam bernama...", a: "al quran" },
  { q: "Rukun iman yang keenam (terakhir) adalah iman kepada qada dan...", a: "qadar" },
  { q: "Peristiwa perjalanan malam Nabi Muhammad dari Mekah ke Baitul Maqdis lalu naik ke langit disebut...", a: "isra miraj" },
  { q: "Perang pertama umat Islam melawan kaum Quraisy yang terjadi di dekat sebuah sumur bernama Perang...", a: "badar" },
  { q: "Wahyu pertama yang diturunkan kepada Nabi Muhammad adalah surat Al-'Alaq ayat...", a: "1 5" },
  { q: "Hukum menikah bagi seseorang yang sudah mampu dan takut terjerumus zina adalah...", a: "wajib" },
];

// Kuis Matematika - level SMA kelas 12 (jawaban sengaja dibikin angka/kata pendek biar gampang dicek)
const KUISMTK = [
  { q: "Nilai dari lim(x→2) (x²-4)/(x-2) adalah...", a: "4" },
  { q: "Diketahui f(x) = x² - 4x + 3. Nilai x saat f'(x) = 0 adalah...", a: "2" },
  { q: "Determinan dari matriks [[2,3],[1,4]] adalah...", a: "5" },
  { q: "Median dari data: 3, 5, 7, 8, 9, 10, 12 adalah...", a: "8" },
  { q: "Banyaknya cara menyusun huruf dari kata 'MATA' (ada 2 huruf A yang sama) adalah...", a: "12" },
  { q: "Nilai dari ²log8 + ²log4 adalah...", a: "5" },
  { q: "Jumlah 5 suku pertama deret aritmatika dengan suku pertama 2 dan beda 3 adalah...", a: "40" },
  { q: "Peluang keluar mata dadu genap saat melempar 1 dadu adalah a/b (paling sederhana). Berapa a+b?", a: "3" },
  { q: "Turunan dari f(x) = 5x³ pada x = 1 adalah f'(1) = ...", a: "15" },
  { q: "Jika vektor a = (3,4), panjang (besar) vektor a adalah...", a: "5" },
];

// Terasaurus - tiap entry: kata utama, sinonim, antonim, dan 3 kata gak berhubungan (buat opsi "relasi lain")
const TERASAURUS = [
  { word: "senang", sinonim: "gembira", antonim: "sedih", lain: ["meja", "lari", "biru"] },
  { word: "besar", sinonim: "raksasa", antonim: "kecil", lain: ["sepatu", "dingin", "cepat"] },
  { word: "cepat", sinonim: "kilat", antonim: "lambat", lain: ["gunung", "manis", "hujan"] },
  { word: "tinggi", sinonim: "menjulang", antonim: "rendah", lain: ["pintu", "lapar", "kertas"] },
  { word: "gelap", sinonim: "kelam", antonim: "terang", lain: ["kursi", "manis", "angin"] },
  { word: "kuat", sinonim: "perkasa", antonim: "lemah", lain: ["jendela", "hujan", "kelinci"] },
  { word: "rajin", sinonim: "giat", antonim: "malas", lain: ["piring", "laut", "sepeda"] },
  { word: "berani", sinonim: "gagah", antonim: "takut", lain: ["buku", "batu", "hijau"] },
  { word: "jujur", sinonim: "tulus", antonim: "bohong", lain: ["meja", "api", "pensil"] },
  { word: "kaya", sinonim: "berada", antonim: "miskin", lain: ["awan", "roti", "jam"] },
  { word: "panas", sinonim: "terik", antonim: "dingin", lain: ["sungai", "kabel", "cermin"] },
  { word: "mudah", sinonim: "gampang", antonim: "sulit", lain: ["piano", "jaket", "sepatu"] },
  { word: "baik", sinonim: "ramah", antonim: "jahat", lain: ["lampu", "tas", "gula"] },
  { word: "cantik", sinonim: "molek", antonim: "jelek", lain: ["kayu", "motor", "pisau"] },
  { word: "banyak", sinonim: "berlimpah", antonim: "sedikit", lain: ["rumah", "kucing", "telepon"] },
  { word: "bahagia", sinonim: "riang", antonim: "murung", lain: ["pohon", "kertas", "gelas"] },
];

module.exports = {
  ASAHOTAK,
  TEBAKTEBAKAN,
  TEBAKBENDERA,
  TEBAKKATA,
  SUSUNKATA_WORDS,
  TEBAKPRESIDEN,
  TEBAKPOKEMON,
  KUISISLAMI,
  KUISMTK,
  TERASAURUS,
};
