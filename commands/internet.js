const { searchWikipedia } = require("../lib/wikipedia");
const { getWeather } = require("../lib/weather");
const { getPrayerTimes } = require("../lib/prayerTimes");
const { getVerse } = require("../lib/alkitab");
const { findSurah, getSurahDetail, getTafsir } = require("../lib/quran");
const { getDefinition } = require("../lib/kbbi");
const { searchLyrics } = require("../lib/lyrics");
const { searchOpenverse, getImageBuffer } = require("../lib/openverseSearch");
const config = require("../config");
const p = config.prefix;

module.exports = [
  // wikipedia [Text]
  {
    name: "wikipedia",
    aliases: ["wiki"],
    run: async ({ text, reply }) => {
      if (!text) return reply(`Tulis yang mau dicari.\nContoh: *${p}wikipedia Soekarno*`);
      const result = await searchWikipedia(text);
      if (!result) return reply("Gak ketemu artikel yang cocok di Wikipedia.");
      reply(`📖 *${result.title}*\n\n${result.extract}\n\n${result.url}`);
    },
  },

  // cuaca [Text]
  {
    name: "cuaca",
    run: async ({ text, reply }) => {
      if (!text) return reply(`Tulis nama kotanya.\nContoh: *${p}cuaca Klakah*`);
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
      if (!text) return reply(`Tulis nama kotanya.\nContoh: *${p}jadwalsalat Klakah*`);
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
      if (!text) return reply(`Tulis referensi ayatnya.\nContoh: *${p}alkitab Yohanes 3:16*`);
      try {
        const verses = await getVerse(text);
        if (!verses) return reply("Ayat gak ketemu, coba format 'Kitab Pasal:Ayat' (contoh: Yohanes 3:16).");

        // Kalau cuma 1 ayat, nomor ayatnya udah kepampang jelas di header -- gak perlu diulang
        // lagi di body (itu yang bikin sebelumnya kelihatan dobel, mis. "3:16 3:16 ...").
        // Kalau lebih dari 1 ayat (range/pasal penuh), tiap ayat dikasih nomor sendiri biar jelas batasnya.
        const body =
          verses.length === 1
            ? verses[0].text
            : verses.map((v) => `*${v.ref}* ${v.text}`).join("\n\n");

        reply(`📖 *${text}*\n━━━━━━━━━━━━━━\n\n${body}`.slice(0, 4000));
      } catch {
        reply("Sumber ayat lagi gak bisa diakses. Coba lagi beberapa saat lagi.");
      }
    },
  },

  // alquran [Text] -- pasangan .alkitab, biar yang beda agama juga bisa pakai command serupa.
  // Format: "<nama surat> <nomor ayat>" atau "<nama surat> <ayat awal>-<ayat akhir>".
  // Nomor surat juga bisa dipakai langsung (mis. "2 255" = Al-Baqarah ayat 255 = Ayat Kursi).
  // Kalau cuma nama surat tanpa nomor ayat, dibalikin info suratnya aja (biar gak ngirim
  // ratusan ayat sekaligus ke chat -- Al-Baqarah aja isinya 286 ayat).
  {
    name: "alquran",
    aliases: ["quran"],
    run: async ({ text, reply }) => {
      if (!text) return reply(`Tulis nama surat dan nomor ayatnya.\nContoh: *${p}alquran Al-Baqarah 255*\nAtau range: *${p}alquran Yasin 1-5*`);

      const parts = text.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      const rangeMatch = last.match(/^(\d+)(?:-(\d+))?$/);
      const surahQuery = rangeMatch ? parts.slice(0, -1).join(" ") : text;

      if (!surahQuery) return reply(`Tulis nama suratnya juga ya.\nContoh: *${p}alquran Al-Baqarah 255*`);

      try {
        const surah = await findSurah(surahQuery);
        if (!surah) return reply(`Surat "${surahQuery}" gak ketemu. Cek lagi penulisan namanya, mis. *Al-Fatihah*, *Al-Baqarah*, *Yasin*.`);

        if (!rangeMatch) {
          return reply(
            `📖 *${surah.namaLatin}* (${surah.arti})\n` +
              `Turun di: ${surah.tempatTurun} | Jumlah ayat: ${surah.jumlahAyat}\n\n` +
              `Tulis nomor ayatnya buat baca isinya.\nContoh: *${p}alquran ${surah.namaLatin} 1*`
          );
        }

        const from = parseInt(rangeMatch[1], 10);
        const to = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : from;
        if (from < 1 || to < from || to - from > 20) {
          return reply("Rentang ayatnya gak valid, atau kebanyakan (maks 20 ayat sekali baca).");
        }

        const detail = await getSurahDetail(surah.nomor);
        if (!detail?.ayat?.length) return reply("Sumber ayat lagi gak bisa diakses. Coba lagi beberapa saat lagi.");

        const ayatList = detail.ayat.filter((a) => a.nomorAyat >= from && a.nomorAyat <= to);
        if (ayatList.length === 0) {
          return reply(`Surat *${surah.namaLatin}* cuma sampai ayat ${surah.jumlahAyat}.`);
        }

        // Tafsir itu pelengkap (bukan yang utama) -- kalau gagal diambil, jangan sampe bikin
        // seluruh command gagal. Cukup bagian "Kesimpulan"-nya aja yang di-skip.
        let tafsirByAyat = {};
        try {
          const tafsirList = await getTafsir(surah.nomor);
          if (Array.isArray(tafsirList)) {
            for (const t of tafsirList) tafsirByAyat[t.ayat] = t.teks;
          }
        } catch {
          // diamkan -- kesimpulan cuma gak dimunculin, ayat/arti/latinnya tetap jalan normal
        }

        // Tiap ayat dikasih blok jelas: Arab -> latin -> arti -> kesimpulan, dipisah label +
        // baris kosong, biar 4 jenis teks (yang panjang-panjang dan gaya tulisan beda) gak
        // nempel jadi satu gumpalan. Antar-ayat (kalau range) dikasih garis pemisah biar gak ketuker.
        //
        // PENTING soal _latin_: WhatsApp cuma nge-render jadi miring kalau underscore-nya
        // NEMPEL LANGSUNG ke teksnya, gak boleh ada spasi di antaranya (mis. "_teks _" GAK akan
        // miring). teksLatin dari API kadang kebawa spasi nyangkut di ujung -- makanya di-trim()
        // dulu sebelum dibungkus underscore.
        const body = ayatList
          .map((a) => {
            const latin = String(a.teksLatin || "").trim();
            const kesimpulan = tafsirByAyat[a.nomorAyat];
            let block =
              `*${surah.namaLatin} : ${a.nomorAyat}*\n\n` +
              `${a.teksArab}\n\n` +
              `_${latin}_\n\n` +
              `Artinya:\n${a.teksIndonesia}`;
            if (kesimpulan) {
              const ringkas = kesimpulan.length > 500 ? kesimpulan.slice(0, 500).trim() + "..." : kesimpulan;
              block += `\n\nKesimpulan:\n${ringkas}`;
            }
            return block;
          })
          .join("\n\n━━━━━━━━━━━━━━\n\n");

        reply(`📖 ${body}`.slice(0, 4000));
      } catch {
        reply("Sumber ayat lagi gak bisa diakses. Coba lagi beberapa saat lagi.");
      }
    },
  },

  // kbbi [Text]
  {
    name: "kbbi",
    run: async ({ text, reply }) => {
      if (!text) return reply(`Tulis kata yang mau dicari artinya.\nContoh: *${p}kbbi santuy*`);
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
        return reply(`Format: *${p}lirik Artis - Judul Lagu*\nContoh: *${p}lirik Tulus - Hati-Hati di Jalan*`);
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
      if (!text) return reply(`Tulis kata kuncinya.\nContoh: *${p}openverse cat*`);

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