const { evaluate } = require("mathjs");
const config = require("../config");
const { apiGet } = require("../lib/api");
const { findUrls, findText } = require("../lib/extract");
const ytdlp = require("../lib/ytdlp");
const { upscaleImage } = require("../lib/upscale");
const { removeBg } = require("../lib/removebg");
const { recognizeText } = require("../lib/ocr");
const { downloadDriveFile } = require("../lib/gdrive");
const { resolveMedia } = require("../lib/media");
const { uploadToCatbox } = require("../lib/transfer");
const { cutAudio } = require("../lib/ffmpeg");
const { searchKodepos, formatKodeposResults } = require("../lib/kodepos");

const startTime = Date.now();

/** Ambil gambar (langsung/reply) -> upload sementara -> proses via API -> kirim balik */
function imageApiCommand(name, endpointKey, { resultType = "image" } = {}) {
  return {
    name,
    run: async ({ jid, sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") {
        return reply(`Kirim/reply gambar dengan caption *${name}* ya.`);
      }

      const tempUrl = await uploadToCatbox(media.buffer, `${name}.jpg`);
      const res = await apiGet(endpointKey, { url: tempUrl });

      if (resultType === "text") {
        const text = findText(res);
        return reply(text || "Tidak ada teks yang terbaca dari gambar ini.");
      }

      const urls = findUrls(res);
      if (!urls.length) return reply("Gagal memproses gambar, coba lagi.");
      await reply({ image: { url: urls[0] } });
    },
  };
}

/** Upscale/HD gambar secara LOKAL pakai Real-ESRGAN (lib/upscale.js), bukan API luar */
function upscaleCommand(name, model) {
  return {
    name,
    heavy: true, // Real-ESRGAN (native binary AI upscaler) berat di CPU+RAM
    run: async ({ jid, sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply(`Kirim/reply gambar dengan caption *${name}* ya.`);

      const scale = [2, 3, 4].includes(parseInt(text)) ? parseInt(text) : 4;
      const result = await upscaleImage(media.buffer, { model, scale });
      await reply({ image: result, caption: `HD ✓ (${scale}x)` });
    },
  };
}

module.exports = [
  // 1. cekbillpln - masih via API (butuh data real-time dari PLN, gak ada cara lokal)
  {
    name: "cekbillpln",
    run: async ({ text, reply }) => {
      if (!text) return reply("Masukkan ID pelanggan PLN.\nContoh: *cekbillpln 530000000000*");
      const res = await apiGet("cekbillpln", { id: text.trim() });
      reply(findText(res) || JSON.stringify(res, null, 2).slice(0, 1500));
    },
  },

  // 2. cutmp3 - reply audio, teks: "start,durasi" detik. Contoh: cutmp3 10,15
  {
    name: "cutmp3",
    run: async ({ m, sock, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "audio") return reply("Reply audio yang mau dipotong, dengan caption *cutmp3 start,durasi* (detik). Contoh: `cutmp3 10,15`");
      const [start, dur] = text.split(",").map((v) => parseFloat(v.trim()));
      if (isNaN(start) || isNaN(dur)) return reply("Format salah. Contoh: *cutmp3 10,15* (mulai detik ke-10, durasi 15 detik)");

      const buffer = await cutAudio(media.buffer, "mp3", start, dur);
      await reply({ audio: buffer, mimetype: "audio/mpeg", fileName: "cut.mp3" });
    },
  },

  // 3. drivelink - download LANGSUNG dari Google Drive (bukan API pihak ketiga)
  {
    name: "drivelink",
    run: async ({ jid, sock, text, reply }) => {
      const link = (text.match(/https?:\/\/\S+/i) || [])[0];
      if (!link) return reply("Kirim link Google Drive-nya.\nContoh: *drivelink https://drive.google.com/...*");
      const buffer = await downloadDriveFile(link);
      await reply({ document: buffer, fileName: "drivefile", mimetype: "application/octet-stream" });
    },
  },

  // 4. hdr - image enhance/upscale, LOKAL pakai Real-ESRGAN (lib/upscale.js)
  upscaleCommand("hdr", "realesrgan-x4plus"), // foto umum

  // 7. infodevice
  {
    name: "infodevice",
    run: async ({ reply }) => {
      const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(uptimeSec / 3600);
      const mnt = Math.floor((uptimeSec % 3600) / 60);
      const s = uptimeSec % 60;
      reply(
        `『 𝗜𝗡𝗙𝗢 𝗗𝗘𝗩𝗜𝗖𝗘 』\n` +
        `• Bot     : ${config.botName}\n` +
        `• Platform: ${process.platform}\n` +
        `• Node.js : ${process.version}\n` +
        `• RAM     : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB\n` +
        `• Uptime  : ${h}j ${mnt}m ${s}d`
      );
    },
  },

  // 8. iqc - quote image dari teks yang direply/ditulis (pakai bot.lyo.su quotly)
  {
    name: "iqc",
    run: async ({ jid, sock, text, m, reply }) => {
      if (!text) return reply("Tulis teks yang mau dijadikan quote.\nContoh: *iqc Hidup itu singkat*");
      const pushname = m.pushName || "User";
      const payload = {
        type: "quote",
        format: "png",
        backgroundColor: "#FFFFFF",
        messages: [
          {
            entities: [],
            avatar: true,
            from: { id: 1, name: pushname },
            text,
            replyMessage: {},
          },
        ],
      };
      const res = await require("axios").post("https://bot.lyo.su/quote/generate", payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      });
      const base64 = res.data?.result?.image;
      if (!base64) return reply("Gagal membuat quote image.");
      await reply({ image: Buffer.from(base64, "base64") });
    },
  },

  // 9. kalkukator - lokal, tanpa API
  {
    name: "kalkukator",
    aliases: ["kalkulator"],
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis operasi hitungnya.\nContoh: *kalkukator (25*4)+10/2*");
      try {
        const result = evaluate(text);
        reply(`${text} = *${result}*`);
      } catch {
        reply("Operasi matematika tidak valid.");
      }
    },
  },

  // 10. kodepos - masih via API (belum ketemu dataset lokal yang bisa dipastikan akurat)
  {
    name: "kodepos",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis nama daerah (kelurahan/kecamatan/kota) atau kode pos 5 digit.\nContoh: *kodepos Cikarang* atau *kodepos 17530*");
      const results = await searchKodepos(text);
      reply(formatKodeposResults(results, text));
    },
  },

  // 11. ocr - LOKAL pakai tesseract.js (bukan API luar)
  {
    name: "ocr",
    run: async ({ m, sock, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply("Kirim/reply gambar dengan caption *ocr* ya.");
      const text = await recognizeText(media.buffer);
      reply(text || "Tidak ada teks yang terbaca dari gambar ini.");
    },
  },

  // 12. readmore - trik pesan panjang WA (teks pendek terlihat, sisanya "Baca selengkapnya")
  {
    name: "readmore",
    run: async ({ text, reply }) => {
      if (!text.includes("|")) return reply("Format: *readmore [teks pendek]|[teks panjang]*\nContoh: *readmore Judul Berita|Isi berita lengkap di sini...*");
      const [short, long] = text.split("|");
      const hidden = "\u200E".repeat(4001); // memaksa WA menyembunyikan teks setelahnya di balik "Baca selengkapnya"
      reply(`${short.trim()}${hidden}\n${long.trim()}`);
    },
  },

  // 13. recolor - masih via API (belum ada model colorize lokal yang portable seperti Real-ESRGAN)
  imageApiCommand("recolor", "recolor"),

  // 14. removebg - LOKAL pakai @imgly/background-removal-node (bukan API luar)
  {
    name: "removebg",
    heavy: true, // load model AI (ONNX) ke RAM tiap dipanggil, paling boros di antara semua command
    run: async ({ jid, sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply("Kirim/reply gambar dengan caption *removebg* ya.");
      const result = await removeBg(media.buffer);
      await reply({ image: result });
    },
  },

  // 15. ytfull - info lengkap video YouTube (teks saja, tanpa download), pakai yt-dlp
  {
    name: "ytfull",
    run: async ({ text, reply }) => {
      if (!text) return reply("Tulis judul atau link video YouTube.\nContoh: *ytfull Tulus Hati-Hati di Jalan*");
      const info = await ytdlp.getInfo(text);
      const durMin = Math.floor((info.duration || 0) / 60);
      const durSec = (info.duration || 0) % 60;
      reply(
        `『 𝗬𝗧 𝗙𝗨𝗟𝗟 𝗜𝗡𝗙𝗢 』\n` +
        `• Judul    : ${info.title}\n` +
        `• Channel  : ${info.uploader || "-"}\n` +
        `• Durasi   : ${durMin}m ${durSec}d\n` +
        `• Views    : ${info.view_count?.toLocaleString("id-ID") || "-"}\n` +
        `• Link     : ${info.webpage_url || info.original_url || "-"}`
      );
    },
  },

  // 20. yttranscript - pakai yt-dlp (subtitle otomatis)
  {
    name: "yttranscript",
    run: async ({ text, reply }) => {
      const link = (text.match(/https?:\/\/\S+/i) || [])[0];
      if (!link) return reply("Kirim link video YouTube-nya.\nContoh: *yttranscript https://youtu.be/...*");
      const transcript = await ytdlp.getTranscript(link);
      reply(transcript.slice(0, 4000) || "Transkrip tidak ditemukan untuk video ini.");
    },
  },
];
