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
  "Kodam Rajawali Ngamuk", "Kodam Elang Petir Malam", "Kodam Buaya Darat Insaf",
  "Kodam Kucing Garong Berdasi", "Kodam Naga Api Ngambek", "Kodam Singa Tidur Siang",
  "Kodam Serigala Baper", "Kodam Harimau Loncat Indah", "Kodam Gajah Ngambek Diem",
  "Kodam Kalajengking Baik Hati", "Kodam Ular Sanca Ngajak Damai", "Kodam Bebek Sakti Mandraguna",
];

const DARK_JOKES = [
  "Kenapa hantu gak pernah bohong? Karena mereka udah gak punya apa-apa buat disembunyiin.",
  "Dokter: 'Bapak tinggal berapa lama lagi ya...' Pasien: 'Loh emang saya nyewa kamar?'",
  "Apa bedanya aku sama tugas kuliah? Tugas kuliah masih ada yang nungguin selesai.",
  "Kenapa baterai HP-ku boros? Karena dia niru hidupku, cepet abis tapi lama nge-charge-nya.",
  "Aku bukan pemalas, cuma lagi hemat energi buat masa depan yang gak jelas.",
];

const FUN_FACTS = [
  "Gurita punya 3 jantung dan darahnya warna biru.",
  "Madu gak pernah basi, bahkan yang umurnya ribuan tahun masih bisa dimakan.",
  "Manusia lebih dekat secara genetik ke pisang daripada yang kamu kira — sekitar 60% DNA-nya mirip.",
  "Bintang laut gak punya otak sama sekali.",
  "Suara petir bisa lebih panas dari permukaan matahari untuk sepersekian detik.",
  "Wortel awalnya berwarna ungu, bukan oranye.",
];

const JODOH_COMMENTS = [
  { min: 90, text: "Wah ini mah soulmate beneran, langsung nikah aja 😳" },
  { min: 70, text: "Cocok banget nih, coba deket-deketin!" },
  { min: 50, text: "Lumayan, ada peluang kalau diusahain." },
  { min: 30, text: "Hmm agak susah, tapi bukan berarti gak mungkin." },
  { min: 0, text: "Mending temenan aja dulu deh 😅" },
];

const RATE_COMMENTS = [
  { min: 90, text: "GILA INI MAH TOP TIER 🔥" },
  { min: 70, text: "Solid, di atas rata-rata!" },
  { min: 50, text: "Standar aja, lumayan lah." },
  { min: 30, text: "Yah, masih perlu usaha lebih." },
  { min: 0, text: "Wah... perlu banyak perbaikan nih 😬" },
];

const TOP_TITLES = [
  "Raja/Ratu Baper Sejagat", "Juara Rebahan Nasional", "Duta Prokrastinasi Resmi",
  "Legenda Chat Di-read Doang", "Master Julid Bersertifikat", "Sultan Insecure Harian",
  "Pemegang Rekor Bangun Siang", "Ikon Overthinking Se-RT",
];

const CARIPACAR_RESPONSES = [
  "Coba mulai dari nyapa duluan, jangan cuma stalking doang 👀",
  "Sabar ya, jodoh emang suka dateng pas lagi gak dicari.",
  "Update dulu foto profil, baru gas cari gebetan.",
  "Kayaknya kamu kudu keluar rumah dulu deh biar ketemu orang baru 😂",
  "Coba deh ikutan circle baru, siapa tau ketemu yang cocok.",
];

const TAUGASIH_FACTS = [
  "Tau gasih, senyum itu bisa nular ke orang sekitar kamu.",
  "Tau gasih, sekali kamu ketawa lepas, otak kamu lepas endorfin yang bikin mood naik.",
  "Tau gasih, orang yang sering bilang makasih biasanya lebih bahagia.",
  "Tau gasih, istirahat cukup itu investasi, bukan kemalasan.",
];

const DREAMWORLD_LINES = [
  "kamu lagi di fase healing, nikmatin dulu prosesnya.",
  "ada kejutan baik nungguin kamu bulan ini, tetap terbuka ya.",
  "waktunya buat berhenti sebentar dan nafas dalam-dalam.",
  "sesuatu yang kamu tunggu-tunggu bakal dateng lebih cepat dari yang kamu kira.",
  "kamu lebih kuat dari yang kamu sadari sekarang.",
];

const FUFUFAFA_RESPONSES = [
  "wkwkwk santuy aja, fufufafa emang gitu orangnya 😹",
  "fufufafa mode: ON. Gaskeun tanpa beban!",
  "kata fufufafa: gak usah baper, dunia gak seserius itu.",
  "fufufafa approved ✅ lanjutkan!",
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
  FUFUFAFA_RESPONSES,
};
