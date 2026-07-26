const { searchWikipedia } = require("../lib/wikipedia");
const { getWeather } = require("../lib/weather");
const { getPrayerTimes } = require("../lib/prayerTimes");
const { getVerse } = require("../lib/alkitab");
const { getDefinition } = require("../lib/kbbi");
const { searchLyrics } = require("../lib/lyrics");
const { searchOpenverse, getImageBuffer } = require("../lib/openverseSearch");

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
      if (!text) return reply("Tulis nama kotanya.\nContoh: *cuaca Klakah*");
      const weather = await getWeather(text);
      if (!weather) return reply("Kota gak ketemu, coba nama lain (misal tanpa embel-embel 'Kabupaten/Kota').");

      reply(
        `───〔 🌤️ Info Cuaca Lengkap 〕──\n\n` +
        `📍 Lokasi        : ${weather.location}\n` +
        `🕒 Waktu Lokal    : ${weather.localTime}\n` +
        `☁️ Kondisi        : ${weather.condition}\n` +
        `🌡️ Suhu           : ${weather.temperature}°C (${weather.tempF}°F) — Terasa ${weather.feelsLikeC}°C (${weather.feelsLikeF}°F)\n` +
        `🔺 Tertinggi      : ${weather.maxC}°C (${weather.maxF}°F)\n` +
        `🔻 Terendah       : ${weather.minC}°C (${weather.minF}°F)\n` +
        `💦 Kelembaban     : ${weather.humidity}%\n` +
        `🌧️ Peluang Hujan  : ${weather.rainChance}%\n` +
        `💨 Angin          : ${weather.windDir} ${weather.windSpeed} mph (hembusan ${weather.windGust} mph)\n` +
        `⏲️ Tekanan        : ${weather.pressure}\n` +
        `👁️ Visibilitas    : ${weather.visibility} mi\n` +
        `☀️ Indeks UV      : Maks ${weather.uv} (${weather.uvCategory})\n` +
        `💧 Titik Embun    : ${weather.dewPoint}°F\n` +
        `🌅 Matahari Terbit: ${weather.sunrise}\n` +
        `🌇 Matahari Terbenam: ${weather.sunset}\n\n` +
        `Data diolah secara real-time oleh AI.`
      );
    },
  },

  // jadwalsalat [Text]
  {
    name: "jadwalsalat",
    aliases: ["jadwalsholat", "jadwalshalat", "sholat", "sholatjadwal"],
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis nama kotanya.\nContoh: *jadwalsalat Klakah*");
      const jadwal = await getPrayerTimes(text);
      if (!jadwal) return reply("Kota gak ketemu, coba nama lain (misal tanpa embel-embel 'Kabupaten/Kota').");

      reply(
        `───〔 *🕌 Jadwal Sholat* 〕──\n\n` +
        `\`\`\`Kota     :\`\`\` ${jadwal.city}\n` +
        `\`\`\`Provinsi :\`\`\` ${jadwal.province}\n` +
        (jadwal.tanggalMasehi ? `\`\`\`Tanggal  :\`\`\` ${jadwal.tanggalMasehi}\n` : "") +
        (jadwal.tanggalHijriah ? `\`\`\`Hijriah  :\`\`\` ${jadwal.tanggalHijriah}\n` : "") +
        `\n` +
        `\`\`\`Imsak    :\`\`\` ${jadwal.imsak}\n` +
        `\`\`\`Subuh    :\`\`\` ${jadwal.subuh}\n` +
        `\`\`\`Terbit   :\`\`\` ${jadwal.terbit}\n` +
        `\`\`\`Dzuhur   :\`\`\` ${jadwal.dzuhur}\n` +
        `\`\`\`Ashar    :\`\`\` ${jadwal.ashar}\n` +
        `\`\`\`Maghrib  :\`\`\` ${jadwal.maghrib}\n` +
        `\`\`\`Isya     :\`\`\` ${jadwal.isya}\n\n` +
        `_Metode perhitungan: Kemenag RI_`
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

  // openverse [Text]
  {
    name: "openverse",
    aliases: ["image", "gambar"],
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis kata kuncinya.\nContoh: *openverse cat*");

      try {
        const urls = await searchOpenverse(text);

        if (!urls || urls.length === 0) {
          return reply("Gak ketemu hasil gambar, coba kata kunci lain.");
        }

        // Ambil 1 gambar acak dan coba unduh buffer-nya
        let imageBuffer = null;
        let attempts = 0;

        while (!imageBuffer && attempts < 5 && urls.length > 0) {
          const randomIndex = Math.floor(Math.random() * urls.length);
          const selectedUrl = urls.splice(randomIndex, 1)[0];
          imageBuffer = await getImageBuffer(selectedUrl);
          attempts++;
        }

        if (!imageBuffer) {
          return reply("Gagal mengunduh gambar. Silakan coba lagi.");
        }

        // Kirim gambar ke WhatsApp
        await reply({
          image: imageBuffer,
          caption: `🖼️ Hasil pencarian (Openverse): *${text}*`,
        });
      } catch (err) {
        console.error("Openverse Command Error:", err);
        reply("Terjadi kesalahan saat mencari gambar.");
      }
    },
  },
];