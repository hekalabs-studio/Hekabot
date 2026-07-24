const config = require("../config");

/**
 * Cek apakah pengirim adalah owner bot.
 * WhatsApp sekarang kadang ngirim ID dalam format LID (privasi baru, "xxxx@lid")
 * bukan nomor telepon biasa ("62xxx@s.whatsapp.net") -- jadi kita cek dua-duanya.
 */
function isOwner(senderJid) {
  const jidStr = String(senderJid);

  if (jidStr.endsWith("@lid")) {
    const lid = jidStr.split("@")[0];
    return Boolean(config.ownerLid) && lid === String(config.ownerLid);
  }

  const number = jidStr.split("@")[0].split(":")[0];
  return number === String(config.ownerNumber);
}

module.exports = { isOwner };
