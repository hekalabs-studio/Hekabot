/** Ambil object message yang di-quote/reply, kalau ada */
function getQuoted(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    key: {
      remoteJid: m.key.remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
    },
    message: ctx.quotedMessage,
  };
}

/** Cari tipe media (image/video/audio/document/sticker) dari sebuah message object (sudah di-unwrap) */
function getMediaType(message) {
  if (!message) return null;
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}

const MIME_TO_EXT = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/vnd.rar": "rar",
};

/** Cari ekstensi ASLI sebuah dokumen dari fileName-nya (prioritas) atau mimetype (fallback) */
function getDocumentExt(documentMessage) {
  const fileName = documentMessage?.fileName || "";
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  return MIME_TO_EXT[documentMessage?.mimetype] || "bin";
}

/**
 * Cari media di pesan langsung ATAU di pesan yang di-reply.
 * Return { type, buffer, ext } atau null kalau tidak ada media.
 */
async function resolveMedia(sock, m) {
  const { normalizeMessageContent, downloadMediaMessage } = await import("@whiskeysockets/baileys");

  const directContent = normalizeMessageContent(m.message);
  const direct = getMediaType(directContent);

  const quotedMsgObj = getQuoted(m);
  const quotedContent = quotedMsgObj ? normalizeMessageContent(quotedMsgObj.message) : null;
  const quoted = getMediaType(quotedContent);

  const targetMsg = direct ? m : quoted ? quotedMsgObj : null;
  const targetContent = direct ? directContent : quoted ? quotedContent : null;
  const type = direct || quoted;
  if (!targetMsg || !type) return null;

  // downloadMediaMessage sendiri sudah otomatis unwrap pembungkus di atas, jadi aman dikasih targetMsg asli
  const buffer = await downloadMediaMessage(targetMsg, "buffer", {});

  let ext;
  if (type === "document") {
    ext = getDocumentExt(targetContent.documentMessage);
  } else {
    ext = { image: "jpg", video: "mp4", audio: "mp3", sticker: "webp" }[type] || "bin";
  }

  return { type, buffer, ext };
}

/** Ambil teks dari pesan (caption atau body biasa), termasuk dari pesan yang di-reply */
function getText(m) {
  const msg = m.message;
  // documentMessage yang dikirim DENGAN caption dibungkus WhatsApp ke documentWithCaptionMessage,
  // makanya caption-nya harus diambil dari situ, bukan langsung dari msg.documentMessage
  const unwrapped = msg?.documentWithCaptionMessage?.message;
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    unwrapped?.documentMessage?.caption ||
    ""
  );
}

/** Ambil foto profil WhatsApp seseorang (return null kalau gak ada/private/gagal) */
async function getProfilePicture(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, "image");
    const axios = require("axios");
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

module.exports = { getQuoted, getMediaType, resolveMedia, getText, getProfilePicture };
