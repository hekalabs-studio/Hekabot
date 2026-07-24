const {
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
} = require("../lib/funData");

const QUOTES = [
  "Gak semua yang ditunggu harus terburu-buru, ada waktunya sendiri.",
  "Progress kecil tiap hari lebih berarti dari rencana besar yang gak pernah mulai.",
  "Istirahat itu bagian dari proses, bukan tanda kalah.",
  "Kadang jalan memutar itu yang justru ngajarin paling banyak.",
  "Kamu gak harus selalu kuat, cukup jujur sama diri sendiri.",
  "Yang penting bukan seberapa cepat, tapi seberapa konsisten.",
  "Semua orang punya waktunya sendiri, jangan bandingin start line-mu sama orang lain.",
];

function commentFor(bank, value) {
  return bank.find((c) => value >= c.min).text;
}

module.exports = [
  // caripacar [Text?]
  {
    name: "caripacar",
    run: async ({ text, reply }) => {
      const target = text || "kamu";
      reply(`💘 *Cari Pacar Mode*\n${pickRandom(CARIPACAR_RESPONSES)}${text ? `\n\n(khusus buat: ${target})` : ""}`);
    },
  },

  // cekjodoh [Text] - format: "nama1 nama2"
  {
    name: "cekjodoh",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis 2 nama.\nContoh: *cekjodoh Andi Sarah*");
      const percent = seededPercent(text, 1, 100);
      reply(`💞 *Cek Jodoh*\n${text}\n\nHasil: *${percent}%*\n${commentFor(JODOH_COMMENTS, percent)}`);
    },
  },

  // cekkodam [Text]
  {
    name: "cekkodam",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis nama yang mau dicek.\nContoh: *cekkodam Budi*");
      const idx = seededPercent(text, 0, KODAM_LIST.length - 1);
      reply(`🔮 *Cek Kodam*\n${text}\n\nKodam pendamping: *${KODAM_LIST[idx]}*`);
    },
  },

  // darkjokes - no input
  {
    name: "darkjokes",
    run: async ({ reply }) => {
      reply(`🖤 *Dark Joke*\n${pickRandom(DARK_JOKES)}`);
    },
  },

  // dreamworld [Text]
  {
    name: "dreamworld",
    run: async ({ text, reply }) => {
      const target = text || "kamu";
      reply(`🌙 *Dreamworld*\n${target}, ${pickRandom(DREAMWORLD_LINES)}`);
    },
  },

  // fufufafa [Text?]
  {
    name: "fufufafa",
    run: async ({ text, reply }) => {
      reply(`${pickRandom(FUFUFAFA_RESPONSES)}${text ? `\n\n"${text}"` : ""}`);
    },
  },

  // jadian - no input
  {
    name: "jadian",
    run: async ({ reply }) => {
      const percent = Math.floor(Math.random() * 100) + 1;
      reply(`💑 *Peluang Jadian Hari Ini*: ${percent}%\n${percent > 60 ? "Sikat gas, jangan php-in orang!" : "Sabar dulu, fokus diri sendiri dulu ya."}`);
    },
  },

  // menfess [Text]
  {
    name: "menfess",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis pesan menfess-nya.\nContoh: *menfess buat dia yang lagi baca ini...*");
      reply(`📮 *MENFESS ANONIM*\n━━━━━━━━━━━━━━━\n${text}\n━━━━━━━━━━━━━━━\n_pesan ini dikirim secara anonim_`);
    },
  },

  // quotes [Text] - Text sebagai tema opsional (diabaikan buat pemilihan, cuma dekorasi)
  {
    name: "quotes",
    run: async ({ text, reply }) => {
      const quote = pickRandom(QUOTES);
      reply(`✨ *Quotes${text ? ` - ${text}` : ""}*\n"${quote}"`);
    },
  },

  // rate [Text]
  {
    name: "rate",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis yang mau di-rate.\nContoh: *rate skill masak aku*");
      const percent = seededPercent(text + Date.now(), 0, 100); // beda tiap kali dipanggil
      reply(`📊 *Rate: ${text}*\n\nHasil: *${percent}/100*\n${commentFor(RATE_COMMENTS, percent)}`);
    },
  },

  // soulmatch [Text]
  {
    name: "soulmatch",
    run: async ({ text, m, reply }) => {
      if (!text) return reply("Tulis nama yang mau dicek.\nContoh: *soulmatch Rara*");
      const sender = m.pushName || "kamu";
      const percent = seededPercent(sender + text, 1, 100);
      reply(`💫 *Soul Match*\n${sender} × ${text}\n\nKecocokan: *${percent}%*\n${commentFor(JODOH_COMMENTS, percent)}`);
    },
  },

  // taugasih - no input
  {
    name: "taugasih",
    run: async ({ reply }) => {
      reply(`🤔 ${pickRandom(TAUGASIH_FACTS)}`);
    },
  },

  // top [Text]
  {
    name: "top",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis nama yang mau dikasih gelar.\nContoh: *top Dimas*");
      const idx = seededPercent(text, 0, TOP_TITLES.length - 1);
      reply(`🏆 *${text}* resmi dinobatkan sebagai...\n\n*${TOP_TITLES[idx]}*`);
    },
  },
];
