const { makeSticker } = require("../lib/stickerMaker");
const { makeQuoteCardV2, overlayMemeText, overlayQuoteBar, addWatermark } = require("../lib/textImage");
const { makeBratImageAsync } = require("../lib/bratCanvasAsync");
const { makeBratVideo } = require("../lib/bratvid");
const { resolveMedia, getProfilePicture } = require("../lib/media");
const config = require("../config");
const p = config.prefix;

module.exports = [
  // brat [Text] - LOKAL (render @napi-rs/canvas, teks justify), otomatis jadi STICKER.
  // Ketik "brat hijau <teks>" buat versi hijau neon.
  {
    name: "brat",
    run: async ({ jid, sock, text, reply }) => {
      if (!text) return reply(`Tulis teksnya.\nContoh: *${p}brat capek banget hari ini* (atau *${p}brat hijau capek banget* buat versi neon)`);
      const neon = /^hijau\s+/i.test(text);
      const cleanText = neon ? text.replace(/^hijau\s+/i, "") : text;
      try {
        const imageBuffer = await makeBratImageAsync(cleanText, { neon });
        const stickerBuf = await makeSticker(imageBuffer, { pack: config.botName, author: config.ownerName });
        await reply({ sticker: stickerBuf });
      } catch (error) {
        console.error(error);
        reply("Gagal membuat stiker brat.");
      }
    },
  },

  // bratvid [Text] - LOKAL (render frame @napi-rs/canvas, teks justify + ffmpeg), otomatis jadi STICKER animasi.
  {
    name: "bratvid",
    heavy: true, // render frame per-frame pakai canvas + rakit video pakai ffmpeg, berat
    run: async ({ jid, sock, text, reply }) => {
      if (!text) return reply(`Tulis teksnya.\nContoh: *${p}bratvid capek banget hari ini*`);
      try {
        const videoBuffer = await makeBratVideo(text);
        const stickerBuf = await makeSticker(videoBuffer, { pack: config.botName, author: config.ownerName });
        await reply({ sticker: stickerBuf });
      } catch (error) {
        console.error(error);
        reply("Gagal membuat stiker bratvid.");
      }
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
        console.error("Error pada command QC:", error);
        reply("Gagal membuat stiker quote.");
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
