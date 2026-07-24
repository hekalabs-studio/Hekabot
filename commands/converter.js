const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");
const { resolveMedia } = require("../lib/media");
const { uploadToCatbox, downloadBuffer } = require("../lib/transfer");
const { toMp3, toVoiceNote, toGif } = require("../lib/ffmpeg");
const { convertWithLibreOffice } = require("../lib/libreoffice");
const { convertPdfWithPython } = require("../lib/pdfConvert");

/** Convert PDF -> docx/pptx/xlsx pakai script Python (lokal, gak butuh API luar) */
function pdfConvertCommand(name, scriptName, { ext, mimetype }) {
  return {
    name,
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "document" || media.ext !== "pdf") {
        return reply(`Reply file PDF dengan caption *${name}* ya.`);
      }
      try {
        const buffer = await convertPdfWithPython(media.buffer, scriptName, ext);
        await reply({ document: buffer, mimetype, fileName: `hasil.${ext}` });
      } catch (err) {
        reply("Gagal convert: " + err.message);
      }
    },
  };
}

module.exports = [
  // compresspdf [Doc] - LOKAL pakai pdf-lib (re-save dengan object streams, ukuran bisa berkurang)
  {
    name: "compresspdf",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "document") return reply("Reply file PDF dengan caption *compresspdf*.");
      const pdfDoc = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const before = (media.buffer.length / 1024).toFixed(0);
      const after = (bytes.length / 1024).toFixed(0);
      await reply({
        document: Buffer.from(bytes),
        mimetype: "application/pdf",
        fileName: "compressed.pdf",
        caption: `Ukuran: ${before}KB → ${after}KB`,
      });
    },
  },

  // mergepdf [Doc, Text] - reply PDF pertama, teks = link PDF kedua (hasil *tourl* atau link lain)
  {
    name: "mergepdf",
    run: async ({ sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "document") {
        return reply("Reply file PDF pertama, dengan caption *mergepdf [link PDF kedua]*.\nContoh: *mergepdf https://files.catbox.moe/xxxxx.pdf*");
      }
      const link = (text || "").match(/https?:\/\/\S+/i)?.[0];
      if (!link) return reply("Sertakan link PDF kedua di teksnya.\nTips: upload PDF kedua pakai *tourl* dulu buat dapetin link-nya.");

      const secondBuffer = await downloadBuffer(link);
      const pdfA = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
      const pdfB = await PDFDocument.load(secondBuffer, { ignoreEncryption: true });
      const merged = await PDFDocument.create();
      for (const doc of [pdfA, pdfB]) {
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      await reply({ document: Buffer.from(bytes), mimetype: "application/pdf", fileName: "merged.pdf" });
    },
  },

  // splitpdf [Doc, Text] - reply PDF, teks = rentang halaman (mis. "1-3")
  {
    name: "splitpdf",
    run: async ({ sock, m, text, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "document") return reply("Reply file PDF dengan caption *splitpdf halaman-awal-akhir*.\nContoh: *splitpdf 1-3*");
      const match = (text || "").match(/(\d+)\s*-\s*(\d+)/);
      if (!match) return reply("Format halaman salah. Contoh: *splitpdf 1-3* (ambil halaman 1 sampai 3)");

      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      const src = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
      const totalPages = src.getPageCount();
      if (start < 1 || end > totalPages || start > end) {
        return reply(`Rentang halaman gak valid. Dokumen ini punya ${totalPages} halaman.`);
      }

      const result = await PDFDocument.create();
      const indices = [];
      for (let i = start; i <= end; i++) indices.push(i - 1);
      const pages = await result.copyPages(src, indices);
      pages.forEach((p) => result.addPage(p));
      const bytes = await result.save();
      await reply({ document: Buffer.from(bytes), mimetype: "application/pdf", fileName: `hal-${start}-${end}.pdf` });
    },
  },

  // todocx [Doc] - PDF -> Word beneran editable, LOKAL via Python (pdf2docx)
  pdfConvertCommand("todocx", "pdf_to_docx.py", { ext: "docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),

  // toexcel [Doc] - PDF -> Excel (ekstrak tabel kalau ada, fallback teks per baris), LOKAL via Python
  pdfConvertCommand("toexcel", "pdf_to_xlsx.py", { ext: "xlsx", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),

  // togif [Video] - LOKAL pakai ffmpeg
  {
    name: "togif",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "video") return reply("Reply video pendek dengan caption *togif*.");
      const gif = await toGif(media.buffer, "mp4");
      await reply({ image: gif, mimetype: "image/gif", gifPlayback: true });
    },
  },

  // toimg [Sticker] - LOKAL pakai sharp, stiker (webp) -> gambar (png)
  {
    name: "toimg",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "sticker") return reply("Reply stiker dengan caption *toimg*.");
      const png = await sharp(media.buffer).png().toBuffer();
      await reply({ image: png });
    },
  },

  // tojpg [Image] - LOKAL pakai sharp
  {
    name: "tojpg",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply("Reply gambar dengan caption *tojpg*.");
      const jpg = await sharp(media.buffer).flatten({ background: "#fff" }).jpeg({ quality: 90 }).toBuffer();
      await reply({ document: jpg, mimetype: "image/jpeg", fileName: "hasil.jpg" });
    },
  },

  // tomp3 [Video] - LOKAL pakai ffmpeg (dipindah dari tools.js)
  {
    name: "tomp3",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "video") return reply("Reply video dengan caption *tomp3*.");
      const mp3 = await toMp3(media.buffer, "mp4");
      await reply({ audio: mp3, mimetype: "audio/mpeg", fileName: "audio.mp3" });
    },
  },

  // topdf [Doc] - gambar (pdf-lib, cepat) ATAU dokumen office (LibreOffice) -> pdf
  {
    name: "topdf",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media) return reply("Reply gambar atau dokumen dengan caption *topdf*.");

      if (media.type === "image") {
        const pdfDoc = await PDFDocument.create();
        const img = media.buffer[0] === 0xff ? await pdfDoc.embedJpg(media.buffer) : await pdfDoc.embedPng(media.buffer);
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        const pdfBytes = await pdfDoc.save();
        return reply({ document: Buffer.from(pdfBytes), mimetype: "application/pdf", fileName: "hasil.pdf" });
      }

      if (media.type === "document") {
        try {
          const buffer = await convertWithLibreOffice(media.buffer, media.ext, "pdf");
          return reply({ document: buffer, mimetype: "application/pdf", fileName: "hasil.pdf" });
        } catch (err) {
          return reply("Gagal convert: " + err.message);
        }
      }

      return reply("Reply gambar atau dokumen (docx/xlsx/pptx dll) dengan caption *topdf*.");
    },
  },

  // topng [Image] - LOKAL pakai sharp
  {
    name: "topng",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply("Reply gambar dengan caption *topng*.");
      const png = await sharp(media.buffer).png().toBuffer();
      await reply({ document: png, mimetype: "image/png", fileName: "hasil.png" });
    },
  },

  // topptx [Doc] - PDF -> PowerPoint (tiap halaman jadi 1 slide gambar), LOKAL via Python
  pdfConvertCommand("topptx", "pdf_to_pptx.py", { ext: "pptx", mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),

  // tourl [Media] - upload media apapun, dapat link (dipindah dari tools.js)
  {
    name: "tourl",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media) return reply("Reply media (gambar/video/audio/dokumen) dengan caption *tourl*.");
      const url = await uploadToCatbox(media.buffer, `file.${media.ext}`);
      reply(`Link kamu:\n${url}`);
    },
  },

  // tovcf [Text] - LOKAL, generate file kontak vCard. Format: "Nama|Nomor"
  {
    name: "tovcf",
    run: async ({ text, reply }) => {
      if (!text || !text.includes("|")) return reply("Format: *tovcf Nama|Nomor*\nContoh: *tovcf Budi Santoso|6281234567890*");
      const [name, numberRaw] = text.split("|").map((s) => s.trim());
      const number = numberRaw.replace(/[^\d+]/g, "");
      if (!name || !number) return reply("Format: *tovcf Nama|Nomor*\nContoh: *tovcf Budi Santoso|6281234567890*");

      const vcf =
        `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${number}\nEND:VCARD`;
      await reply({ document: Buffer.from(vcf), mimetype: "text/vcard", fileName: `${name}.vcf` });
    },
  },

  // tovn [Audio] - LOKAL pakai ffmpeg (dipindah dari tools.js)
  {
    name: "tovn",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "audio") return reply("Reply audio dengan caption *tovn*.");
      const ogg = await toVoiceNote(media.buffer, "mp3");
      await reply({ audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true });
    },
  },

  // towebp [Image] - LOKAL pakai sharp, gambar -> webp (bukan stiker WA, cuma format file)
  {
    name: "towebp",
    run: async ({ sock, m, reply }) => {
      const media = await resolveMedia(sock, m);
      if (!media || media.type !== "image") return reply("Reply gambar dengan caption *towebp*.");
      const webp = await sharp(media.buffer).webp({ quality: 90 }).toBuffer();
      await reply({ document: webp, mimetype: "image/webp", fileName: "hasil.webp" });
    },
  },
];
