const os = require("os");
const axios = require("axios");
const checkDiskSpace = require("check-disk-space").default;
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

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + " GB";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

/** Sampling pemakaian CPU (%) dalam rentang waktu singkat -- os.loadavg() gak akurat di Windows */
function getCpuUsagePercent(sampleMs = 300) {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      for (let i = 0; i < start.length; i++) {
        const startTimes = start[i].times;
        const endTimes = end[i].times;
        const idleDiff = endTimes.idle - startTimes.idle;
        const totalDiff =
          (endTimes.user - startTimes.user) +
          (endTimes.nice - startTimes.nice) +
          (endTimes.sys - startTimes.sys) +
          (endTimes.irq - startTimes.irq) +
          idleDiff;
        totalIdle += idleDiff;
        totalTick += totalDiff;
      }
      const usage = totalTick > 0 ? 100 - (totalIdle / totalTick) * 100 : 0;
      resolve(Math.max(0, Math.min(100, usage)));
    }, sampleMs);
  });
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
  // bot - info singkat tentang bot + sistem yang dipakai server
  {
    name: "bot",
    run: async ({ reply }) => {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMemPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
      reply(
        `🤖 *${config.botName}*\n\n` +
        `Kode Bot: ${config.botCode}\n` +
        `Owner: ${config.ownerName}\n` +
        `Uptime: ${formatUptime(Date.now() - startTime)}\n\n` +
        `*Sistem yang dipakai server*\n` +
        `Platform: ${os.platform()} ${os.release()} (${os.arch()})\n` +
        `CPU: ${cpus[0]?.model || "-"} (${cpus.length} core)\n` +
        `RAM: ${formatBytes(totalMem)} (terpakai ${usedMemPercent}%)\n` +
        `Node.js: ${process.version}\n\n` +
        `Ketik *menu* buat lihat semua fitur, atau *help* buat panduan pemakaian.\n` +
        `(Mau spek server lebih detail lagi? Owner bisa pakai *.resource*)`
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

  // resource - info spesifikasi & pemakaian server SELENGKAP-LENGKAPNYA (OWNER ONLY - bocorin info server)
  {
    name: "resource",
    ownerOnly: true,
    run: async ({ reply }) => {
      await reply("⏳ Ngambil data spesifikasi & pemakaian server...");

      const cpus = os.cpus();
      const cpuUsagePercent = await getCpuUsagePercent();

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

      let diskInfo = "Gak bisa diambil (kemungkinan izin akses ditolak)";
      try {
        const disk = await checkDiskSpace(process.cwd());
        const diskUsed = disk.size - disk.free;
        const diskPercent = ((diskUsed / disk.size) * 100).toFixed(1);
        diskInfo = `${formatBytes(diskUsed)} / ${formatBytes(disk.size)} terpakai (${diskPercent}%)`;
      } catch (err) {
        diskInfo = `Gagal ambil info disk: ${err.message}`;
      }

      const mem = process.memoryUsage();
      const loadAvg = os.loadavg(); // [1m, 5m, 15m] -- selalu [0,0,0] di Windows, normal aja itu

      reply(
        `💻 *Resource & Spesifikasi Server*\n\n` +
        `*CPU*\n` +
        `Model: ${cpus[0]?.model || "-"}\n` +
        `Jumlah core: ${cpus.length}\n` +
        `Kecepatan: ${cpus[0]?.speed ? (cpus[0].speed / 1000).toFixed(2) + " GHz" : "-"}\n` +
        `Pemakaian saat ini: ${cpuUsagePercent.toFixed(1)}%\n` +
        (loadAvg[0] > 0 ? `Load average: ${loadAvg.map((n) => n.toFixed(2)).join(", ")} (1m, 5m, 15m)\n` : "") +
        `\n*RAM*\n` +
        `${formatBytes(usedMem)} / ${formatBytes(totalMem)} terpakai (${memPercent}%)\n` +
        `\n*Disk (partisi project ini)*\n` +
        `${diskInfo}\n` +
        `\n*Sistem Operasi*\n` +
        `Platform: ${os.platform()} ${os.release()} (${os.arch()})\n` +
        `Hostname: ${os.hostname()}\n` +
        `System uptime: ${formatUptime(os.uptime() * 1000)}\n` +
        `\n*Proses Bot*\n` +
        `Node.js: ${process.version}\n` +
        `RSS (total memory proses): ${formatBytes(mem.rss)}\n` +
        `Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}\n` +
        `Bot uptime: ${formatUptime(Date.now() - startTime)}\n` +
        `PID: ${process.pid}`
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
