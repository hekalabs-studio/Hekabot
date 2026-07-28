const os = require("os");
const config = require("../config");

// Di bawah ini otomatis dianggap "low-spec" pas performanceMode: "auto" (lihat config.js).
// 4GB dipilih karena command berat (LibreOffice, ffmpeg video, model AI removebg/upscale)
// gampang banget nyundul >1-2GB RAM sendiri-sendiri kalau dipakai bareng OS + Node + WA socket.
const RAM_THRESHOLD_GB = 4;

function getTotalRamGB() {
  return os.totalmem() / 1024 ** 3;
}

function detectMode() {
  const manual = config.performanceMode;
  if (manual === "low" || manual === "high") return manual; // override manual dari config.js
  return getTotalRamGB() < RAM_THRESHOLD_GB ? "low" : "high"; // "auto"
}

const totalRamGB = getTotalRamGB();
const mode = detectMode();
const isLowSpec = mode === "low";

// ==== CEK RAM BEBAS SECARA LIVE (real-time, bukan cuma total RAM device pas startup) ====
// isLowSpec di atas itu cek SEKALI pas bot start (total RAM device). Ini beda: dicek TIAP KALI
// mau jalanin command berat, buat tau kondisi RAM SAAT ITU JUGA -- soalnya RAM device yang
// gedenya cukup pun bisa penuh sementara kalau lagi banyak command berat numpuk dari banyak
// orang sekaligus. Threshold-nya persentase RAM BEBAS (bukan RAM device-nya), jadi otomatis
// nyesuain baik di device kecil maupun gede.
const RAM_FREE_CRITICAL_PERCENT = 10; // di bawah ini dianggap "RAM penuh"

function getFreeRamPercent() {
  return (os.freemem() / os.totalmem()) * 100;
}

function isRamCritical() {
  return getFreeRamPercent() < RAM_FREE_CRITICAL_PERCENT;
}

/** Dipanggil sekali pas bot start biar keliatan di log kenapa mode-nya kepilih gitu. */
function logSpecs() {
  const cpuModel = os.cpus()?.[0]?.model?.trim() || "tidak diketahui";
  const cpuCount = os.cpus()?.length || 0;
  const isAuto = config.performanceMode === "auto";

  console.log(`\n🖥️  Spesifikasi terdeteksi: ${cpuModel} (${cpuCount} core), RAM ${totalRamGB.toFixed(1)}GB`);
  console.log(
    `⚙️  Mode performa: ${mode.toUpperCase()}` +
    (isAuto
      ? ` (otomatis -- RAM ${totalRamGB < RAM_THRESHOLD_GB ? "di bawah" : "di atas/sama dengan"} ${RAM_THRESHOLD_GB}GB)`
      : ` (dipaksa manual lewat performanceMode di config.js)`)
  );
  console.log(
    isLowSpec
      ? "   -> Command berat (removebg, hdr, togif, tomp4, bratvid, dokumen->pdf, pdf->docx/xlsx/pptx) DINONAKTIFKAN biar RAM device gak kewalahan.\n"
      : "   -> Semua command aktif.\n"
  );
}

module.exports = { isLowSpec, mode, totalRamGB, RAM_THRESHOLD_GB, logSpecs, isRamCritical, getFreeRamPercent, RAM_FREE_CRITICAL_PERCENT };
