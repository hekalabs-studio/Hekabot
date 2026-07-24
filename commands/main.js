const os = require("os");
const axios = require("axios");
const config = require("../config");
const { DOWNLOADER_MENU, TOOLS_MENU, STICKER_MENU, FUN_MENU, GAME_MENU, INTERNET_MENU, GROUP_MENU, MAIN_MENU } = require("../lib/menu");
const { getAllUsers } = require("../lib/userStore");
const { buildHelpText } = require("../lib/help");

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Format tanggal ISO jadi "20 Juli 2026 09:20 WIB" */
function formatTanggalWIB(isoString) {
  const d = new Date(isoString);
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000); // UTC+7
  const day = wib.getUTCDate();
  const month = BULAN[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm} WIB`;
}

const startTime = Date.now();

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}j ${m}m ${s}d`;
}

function totalFiturCount() {
  return (
    MAIN_MENU.length +
    DOWNLOADER_MENU.length +
    TOOLS_MENU.length +
    STICKER_MENU.length +
    FUN_MENU.length +
    GAME_MENU.length +
    INTERNET_MENU.length +
    GROUP_MENU.length
  );
}

module.exports = [
  // bot - info singkat tentang bot
  {
    name: "bot",
    run: async ({ reply }) => {
      reply(
        `🤖 *${config.botName}*\n\n` +
        `Kode Bot: ${config.botCode}\n` +
        `Owner: ${config.ownerName}\n` +
        `Uptime: ${formatUptime(Date.now() - startTime)}\n` +
        `Node.js: ${process.version}\n\n` +
        `Ketik *menu* buat lihat semua fitur, atau *help* buat panduan pemakaian.`
      );
    },
  },

  // database - listing LENGKAP semua user terdaftar (OWNER ONLY - data pribadi/nomor telepon)
  {
    name: "database",
    ownerOnly: true,
    run: async ({ reply }) => {
      const users = getAllUsers();
      if (!users.length) return reply("📂 *DATABASE HEKABOT*\n\nBelum ada user yang terdaftar.");

      let out = `📂 *DATABASE HEKABOT*\nTotal User: ${users.length}\n`;
      for (const u of users) {
        out +=
          `────────────────\n` +
          `ID: ${u.id}\n` +
          `Nama: ${u.name}\n` +
          `Nomor: ${u.number}\n` +
          `Terdaftar: ${formatTanggalWIB(u.registeredAt)}\n` +
          `Status: ${u.active === false ? "nonaktif" : "aktif"}\n`;
      }
      reply(out);
    },
  },

  // list - ringkasan kategori fitur
  {
    name: "list",
    run: async ({ reply }) => {
      reply(
        `📋 *Daftar Kategori Fitur*\n\n` +
        `• Main: ${MAIN_MENU.length} fitur\n` +
        `• Downloader: ${DOWNLOADER_MENU.length} fitur\n` +
        `• Tools: ${TOOLS_MENU.length} fitur\n` +
        `• Sticker: ${STICKER_MENU.length} fitur\n` +
        `• Fun: ${FUN_MENU.length} fitur\n` +
        `• Game: ${GAME_MENU.length} fitur\n` +
        `• Internet: ${INTERNET_MENU.length} fitur\n` +
        `• Group: ${GROUP_MENU.length} fitur\n\n` +
        `Ketik *menu* buat lihat detail semua fitur per kategori.`
      );
    },
  },

  // owner - kirim kontak owner asli (vCard)
  {
    name: "owner",
    run: async ({ reply }) => {
      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${config.ownerName}\n` +
        `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}\n` +
        "END:VCARD";
      await reply({ contacts: { displayName: config.ownerName, contacts: [{ vcard }] } });
    },
  },

  // ping - cek latensi bot
  {
    name: "ping",
    run: async ({ m, reply }) => {
      const now = Date.now();
      const sentAt = m.messageTimestamp ? m.messageTimestamp * 1000 : now;
      const latency = Math.max(0, now - sentAt);
      reply(`🏓 Pong! ${latency}ms`);
    },
  },

  // resource - info spesifikasi & pemakaian server (OWNER ONLY - bocorin info server)
  {
    name: "resource",
    ownerOnly: true,
    run: async ({ reply }) => {
      const totalMemGb = os.totalmem() / 1024 / 1024 / 1024;
      const freeMemGb = os.freemem() / 1024 / 1024 / 1024;
      const usedMemGb = totalMemGb - freeMemGb;
      const cpus = os.cpus();
      reply(
        `💻 *Resource Server*\n\n` +
        `CPU: ${cpus[0]?.model || "-"} (${cpus.length} core)\n` +
        `RAM: ${usedMemGb.toFixed(2)}GB / ${totalMemGb.toFixed(2)}GB terpakai\n` +
        `Platform: ${os.platform()} ${os.release()}\n` +
        `Node.js: ${process.version}\n` +
        `Proses bot: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`
      );
    },
  },

  // runtime [Text] - lama bot udah nyala (Text opsional buat catatan, gak wajib)
  {
    name: "runtime",
    run: async ({ text, reply }) => {
      reply(`⏱️ *Runtime Bot*\n\nSudah berjalan selama: ${formatUptime(Date.now() - startTime)}${text ? `\nCatatan: ${text}` : ""}`);
    },
  },

  // speedtest - tes kecepatan download koneksi server (OWNER ONLY - bisa disalahgunain buat spam/abisin bandwidth)
  {
    name: "speedtest",
    ownerOnly: true,
    run: async ({ reply }) => {
      await reply("⏳ Sedang tes kecepatan koneksi server...");
      try {
        const testUrl = "https://speed.hetzner.de/10MB.bin";
        const start = Date.now();
        const res = await axios.get(testUrl, { responseType: "arraybuffer", timeout: 30000 });
        const elapsedSec = (Date.now() - start) / 1000;
        const megabits = (res.data.length * 8) / 1_000_000;
        const speedMbps = (megabits / elapsedSec).toFixed(2);
        reply(`🚀 *Speedtest Server*\n\nDownload: ${speedMbps} Mbps\nWaktu: ${elapsedSec.toFixed(2)}s\nFile test: 10MB`);
      } catch {
        reply("Gagal melakukan speedtest, coba lagi nanti.");
      }
    },
  },

  // status [Text] - set status "About" WhatsApp bot (OWNER ONLY)
  {
    name: "status",
    ownerOnly: true,
    run: async ({ sock, text, reply }) => {
      if (!text) return reply("Set status WhatsApp bot ini.\nContoh: *status Lagi online, siap bantu!*");
      try {
        await sock.updateProfileStatus(text);
        reply(`✅ Status bot berhasil diubah jadi:\n"${text}"`);
      } catch (err) {
        reply("Gagal update status: " + err.message);
      }
    },
  },

  // help - panduan cara pakai bot
  {
    name: "help",
    run: async ({ reply }) => {
      reply(buildHelpText());
    },
  },
];
