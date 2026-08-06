const { makeSticker } = require("../lib/stickerMaker");
const { makeQuoteCardV2, overlayMemeText, overlayQuoteBar, addWatermark } = require("../lib/textImage");
const { makeBratImageAsync } = require("../lib/bratCanvasAsync");
const { BRAT_COLORS } = require("../lib/bratCanvas");
const { makeBratVideo } = require("../lib/bratvid");
const { resolveMedia, getProfilePicture } = require("../lib/media");
const config = require("../config");
const p = config.prefix;

/**
 * Command generik buat .brat + 10 varian warnanya (.brathijau, .bratmerah, dst).
 * SEBELUMNYA warna cuma bisa dipilih lewat "brat hijau <teks>" (spasi, cuma 1 warna: hijau).
 * SEKARANG tiap warna jadi command TERSENDIRI tanpa spasi (.brathijau <teks>), dan ada
 * 10 pilihan warna (bukan cuma hijau) -- lihat BRAT_COLORS di lib/bratCanvas.js.
 */
function makeBratCommand(name, bgColor) {
  return {
    name,
    run: async ({ text, reply }) => {
      if (!text) {
        return reply(
          `Tulis teksnya.\nContoh: *${p}${name} capek banget hari ini*\n\n` +
          `🎨 Mau warna lain? Ketik *${p}listwarnabrat* buat lihat semua pilihan warna.`
        );
      }
      try {
        const imageBuffer = await makeBratImageAsync(text, { bgColor });
        const stickerBuf = await makeSticker(imageBuffer, { pack: config.botName, author: config.ownerName });
        await reply({ sticker: stickerBuf });
      } catch (error) {
        // Lempar ulang (bukan reply manual) -- biar react ❌ + log "GAGAL" ditangani konsisten
        // sama catch umum di handler.js, sama kayak command lain yang error.
        console.error(error);
        throw new Error(`Gagal membuat stiker ${name}.`);
      }
    },
  };
}

/** Sama kayak makeBratCommand(), tapi buat versi video (.bratvid + 10 varian warnanya). */
function makeBratVidCommand(name, bgColor) {
  return {
    name,
    heavy: true, // render frame per-frame pakai canvas + rakit video pakai ffmpeg, berat
    run: async ({ text, reply }) => {
      if (!text) {
        return reply(
          `Tulis teksnya.\nContoh: *${p}${name} capek banget hari ini*\n\n` +
          `🎨 Mau warna lain? Ketik *${p}listwarnabrat* buat lihat semua pilihan warna.`
        );
      }
      try {
        const videoBuffer = await makeBratVideo(text, { bgColor });
        const stickerBuf = await makeSticker(videoBuffer, { pack: config.botName, author: config.ownerName });
        await reply({ sticker: stickerBuf });
      } catch (error) {
        console.error(error);
        throw new Error(`Gagal membuat stiker ${name}.`);
      }
    },
  };
}

const bratColorCommands = Object.entries(BRAT_COLORS).map(([warna, hex]) => makeBratCommand(`brat${warna}`, hex));
const bratVidColorCommands = Object.entries(BRAT_COLORS).map(([warna, hex]) => makeBratVidCommand(`bratvid${warna}`, hex));

module.exports = [
  // brat [Text] - LOKAL (render @napi-rs/canvas, teks justify), otomatis jadi STICKER. Putih (default).
  makeBratCommand("brat", "#FFFFFF"),
  // 10 varian warna: brathijau, bratmerah, bratbiru, bratkuning, bratpink, bratungu,
  // bratoranye, brattosca, bratabuabu, bratcoklat
  ...bratColorCommands,

  // bratvid [Text] - LOKAL (render frame @napi-rs/canvas, teks justify + ffmpeg), otomatis jadi STICKER animasi. Putih (default).
  makeBratVidCommand("bratvid", "#FFFFFF"),
  // 10 varian warna: bratvidhijau, bratvidmerah, dst (sama kayak di atas, versi video)
  ...bratVidColorCommands,

  // listwarnabrat - daftar semua warna yang bisa dipakai buat .brat<warna>/.bratvid<warna>
  {
    name: "listwarnabrat",
    aliases: ["warnabrat"],
    run: async ({ reply }) => {
      const list = Object.keys(BRAT_COLORS)
        .map((warna) => `   • *${p}brat${warna}* / *${p}bratvid${warna}*`)
        .join("\n");
      reply(
        `🎨 *Pilihan Warna Brat*\n\n` +
        `Default (putih): *${p}brat* / *${p}bratvid*\n\n` +
        `${list}\n\n` +
        `_Contoh: *${p}bratmerah capek banget hari ini*_`
      );
    },
  },

  // qc [Text] - LOKAL, kartu quote ala Telegram/Quotly (avatar + nama + teks)
  // qc [Text] - LOKAL, kartu quote ala Telegram/Quotly (avatar + nama + teks)
  {
    name: "qc",
    run: async ({ jid, sock, text, m, reply }) => {
      // 1. Ambil teks dari input ATAU dari pesan yang di-reply
      let quoteText = text;
      if (!quoteText && m.quoted && m.quoted.text) {
        quoteText = m.quoted.text;
      }
      if (!quoteText) {
        return reply(`Tulis teksnya atau reply sebuah pesan.\nContoh: *${p}qc Hidup itu singkat*`);
      }

      // 2. Tentukan pengirim (jika reply pesan, gunakan sender pesan yang di-reply)
      const senderJid = m.quoted ? m.quoted.sender : (m.key.participant || m.key.remoteJid);
      const senderName = m.quoted ? (m.quoted.pushName || "Seseorang") : (m.pushName || "Seseorang");

      try {
        // 3. Ambil foto profil & buat gambar quote card
        const avatarBuffer = await getProfilePicture(sock, senderJid);
        const img = await makeQuoteCardV2(senderName, quoteText, avatarBuffer);

        // 4. Buat stiker
        const stickerBuf = await makeSticker(img, {
          pack: config.botName,
          author: config.ownerName,
        });

        await reply({ sticker: stickerBuf });
      } catch (error) {
        // Sama kayak fix di command "brat" di atas -- lempar ulang biar react/log konsisten.
        console.error("Error pada command QC:", error);
        throw new Error("Gagal membuat stiker quote.");
      }
    },
  },

  // smeme [Image, Text] - format teks: "atas|bawah"
  {
    name: "smeme",
    run: async ({ jid, sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply(`Kirim/reply gambar dengan caption *${p}smeme teks atas|teks bawah*.`);
      const [top, bottom] = text.split("|").map((s) => (s || "").trim());
      if (!top && !bottom) return reply(`Kasih teksnya. Contoh: *${p}smeme KETIKA SENIN|TAPI TETAP KUAT*`);
      const img = await overlayMemeText(media.buffer, { top, bottom });
      const stickerBuf = await makeSticker(img, { pack: config.botName, author: config.ownerName });
      await reply({ sticker: stickerBuf });
    },
  },

  // squote [Image, Text]
  {
    name: "squote",
    run: async ({ jid, sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply(`Kirim/reply gambar dengan caption *${p}squote teks quote-nya*.`);
      if (!text) return reply("Kasih teks quote-nya juga ya.");
      const img = await overlayQuoteBar(media.buffer, text);
      const stickerBuf = await makeSticker(img, { pack: config.botName, author: config.ownerName });
      await reply({ sticker: stickerBuf });
    },
  },

  // sticker [Image] - convert biasa jadi sticker
  {
    name: "sticker",
    aliases: ["s"],
    run: async ({ jid, sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || (media.type !== "image" && media.type !== "video")) {
        return reply(`Kirim/reply gambar (atau video pendek/GIF) dengan caption *${p}sticker*.`);
      }
      const stickerBuf = await makeSticker(media.buffer, { pack: config.botName, author: config.ownerName });
      await reply({ sticker: stickerBuf });
    },
  },

  // swm [Image, Text] - sticker + watermark
  {
    name: "swm",
    run: async ({ jid, sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply(`Kirim/reply gambar dengan caption *${p}swm teks watermark*.`);
      const watermark = text || config.botName;
      const img = await addWatermark(media.buffer, watermark);
      const stickerBuf = await makeSticker(img, { pack: config.botName, author: config.ownerName });
      await reply({ sticker: stickerBuf });
    },
  },

  // take [Sticker, Text] - "ambil" stiker orang lain, re-brand pack/author-nya
  // format teks (opsional): "Nama Pack|Nama Author"
  {
    name: "take",
    run: async ({ jid, sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "sticker") {
        return reply(`Reply sebuah stiker dengan caption *${p}take* (opsional: *${p}take Nama Pack|Nama Author*).`);
      }
      const [pack, author] = text ? text.split("|").map((s) => s.trim()) : [];
      const stickerBuf = await makeSticker(media.buffer, {
        pack: pack || config.botName,
        author: author || config.ownerName,
      });
      await reply({ sticker: stickerBuf });
    },
  },
];
