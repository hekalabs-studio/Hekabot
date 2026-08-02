const config = require("../config");
const { buildHelpText } = require("./help");
const { getBannerPath } = require("./banner");

/** Kirim salam sambutan + tutorial otomatis (member masuk) atau salam perpisahan (member keluar) */
async function handleGroupUpdate(sock, update) {
  if (!config.groupWelcomeEnabled) return;

  const { id: groupJid, participants, action } = update;

  let groupName = "grup ini";
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupName = meta.subject;
  } catch {
    // gagal ambil nama grup, pakai default aja
  }

  for (const participant of participants) {
    const tag = `@${participant.split("@")[0]}`;
    try {
      if (action === "add") {
        const caption =
          `🎉 *SELAMAT DATANG* 🎉\n\n` +
          `Halo ${tag}! 👋 Senang banget kamu gabung di *${groupName}* ✨\n` +
          `Semoga betah dan makin akrab sama member yang lain ya 😄\n\n` +
          `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n` +
          buildHelpText();
        const bannerPath = getBannerPath("banner_intro");
        if (bannerPath) {
          await sock.sendMessage(groupJid, {
            image: { url: bannerPath },
            caption,
            mentions: [participant],
          });
        } else {
          await sock.sendMessage(groupJid, { text: caption, mentions: [participant] });
        }
      } else if (action === "remove") {
        const caption =
          `😢 *SAMPAI JUMPA* 😢\n\n` +
          `${tag} baru saja meninggalkan *${groupName}*.\n` +
          `Terima kasih sudah pernah jadi bagian dari grup ini, semoga sukses selalu! 🙏✨`;
        const bannerPath = getBannerPath("banner_out");
        if (bannerPath) {
          await sock.sendMessage(groupJid, {
            image: { url: bannerPath },
            caption,
            mentions: [participant],
          });
        } else {
          await sock.sendMessage(groupJid, { text: caption, mentions: [participant] });
        }
      }
    } catch (err) {
      console.error("Error kirim salam grup:", err.message);
    }
  }
}

module.exports = { handleGroupUpdate };
