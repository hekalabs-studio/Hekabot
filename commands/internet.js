const { searchWikipedia } = require("../lib/wikipedia");
const { getWeather } = require("../lib/weather");
const { getVerse } = require("../lib/alkitab");
const { getDefinition } = require("../lib/kbbi");
const { searchLyrics } = require("../lib/lyrics");
const { searchPinterest } = require("../lib/pinterestSearch");

module.exports = [
  // wikipedia [Text]
  {
    name: "wikipedia",
    aliases: ["wiki"],
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis yang mau dicari.\nContoh: *wikipedia Soekarno*");
      const result = await searchWikipedia(text);
      if (!result) return reply("Gak ketemu artikel yang cocok di Wikipedia.");
      reply(`📖 *${result.title}*\n\n${result.extract}\n\n${result.url}`);
    },
  },

  // cuaca [Text]
  {
    name: "cuaca",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis nama kotanya.\nContoh: *cuaca Jakarta*");
      const weather = await getWeather(text);
      if (!weather) return reply("Kota gak ketemu, coba nama lain (misal tanpa embel-embel 'Kabupaten/Kota').");
      reply(
        `🌤️ *Cuaca ${weather.location}*\n\n` +
        `Kondisi: ${weather.condition}\n` +
        `Suhu: ${weather.temperature}°C\n` +
        `Kelembapan: ${weather.humidity}%\n` +
        `Kecepatan angin: ${weather.windSpeed} km/j`
      );
    },
  },

  // alkitab [Text]
  {
    name: "alkitab",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis referensi ayatnya.\nContoh: *alkitab Yohanes 3:16*");
      try {
        const verse = await getVerse(text);
        if (!verse) return reply("Ayat gak ketemu, coba format 'Kitab Pasal:Ayat' (contoh: Yohanes 3:16).");
        reply(`📖 *${text}*\n\n${verse}`);
      } catch {
        reply("Sumber ayat lagi gak bisa diakses. Coba lagi beberapa saat lagi.");
      }
    },
  },

  // kbbi [Text]
  {
    name: "kbbi",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis kata yang mau dicari artinya.\nContoh: *kbbi santuy*");
      try {
        const def = await getDefinition(text);
        if (!def) return reply(`Kata "${text}" gak ketemu di KBBI.`);
        reply(`📚 *${text}*\n\n${def}`);
      } catch {
        reply("Sumber KBBI lagi gak bisa diakses. Coba lagi beberapa saat lagi, atau cek manual di kbbi.kemdikbud.go.id");
      }
    },
  },

  // lirik [Text] - format wajib: "Artis - Judul"
  {
    name: "lirik",
    run: async ({ text, reply }) => {
      if (!text || !text.includes("-")) {
        return reply("Format: *lirik Artis - Judul Lagu*\nContoh: *lirik Tulus - Hati-Hati di Jalan*");
      }
      const [artist, ...titleParts] = text.split("-");
      const title = titleParts.join("-").trim();
      try {
        const result = await searchLyrics(artist.trim(), title);
        if (!result) return reply("Lagu gak ketemu, cek lagi penulisan artis/judulnya.");
        reply(
          `🎵 *${artist.trim()} - ${title}*\n\n${result.snippet}` +
          (result.isTruncated ? "\n\n_(cuplikan aja ya, buat lirik lengkap cari di layanan musik resmi)_" : "")
        );
      } catch {
        reply("Lagu gak ketemu di database lirik ini.");
      }
    },
  },

  // pinterest [Text] - cari gambar (via Openverse, bukan scraping Pinterest asli -- lihat catatan di lib/pinterestSearch.js)
  {
    name: "pinterest",
    run: async ({ jid, sock, text, reply }) => {
      if (!text) return reply("Tulis kata kuncinya.\nContoh: *pinterest desain kamar minimalis*");
      try {
        const urls = await searchPinterest(text);
        if (!urls.length) return reply("Gak ketemu hasil, coba kata kunci lain (atau coba dalam Bahasa Inggris).");
        for (const url of urls) await reply({ image: { url } });
      } catch {
        reply("Pencarian gambar lagi gak bisa diakses. Coba lagi nanti.");
      }
    },
  },
];
