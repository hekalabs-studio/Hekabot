const { askGeminiWithImage } = require("../lib/gemini");
const { resolveMedia } = require("../lib/media");

// WhatsApp selalu ngirim ulang foto sebagai JPEG (dikompres otomatis pas upload), jadi
// aman diasumsikan "image/jpeg" -- sama kayak asumsi yang dipakai fitur .ocr/.removebg dkk
// di lib/media.js (ext gambar selalu di-hardcode "jpg").
const IMAGE_MIME = "image/jpeg";

module.exports = [
  {
    name: "solve",
    aliases: ["kerjain", "jawab"],
    run: async ({ sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") {
        return reply(
          "Kirim foto (atau reply foto) dengan caption *.solve* ya.\n" +
          "Bisa foto soal apa aja -- gak cuma matematika: soal pelajaran, potongan kode/error, " +
          "captcha, formulir, tabel, atau apapun yang mau dikerjain/dijelasin.\n\n" +
          "Contoh: kirim foto soal fisika + caption *.solve*, atau reply foto itu terus ketik *.solve jelasin caranya aja*."
        );
      }
      const answer = await askGeminiWithImage(text, media.buffer, IMAGE_MIME);
      reply(answer);
    },
  },
];
