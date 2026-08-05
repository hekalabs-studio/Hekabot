const { spawn, exec } = require("child_process");

/**
 * Matiin SELURUH pohon proses (proses utama + semua turunannya), bukan cuma proses utamanya
 * doang. Ini PENTING: `proc.kill()` biasa cuma ngirim sinyal ke 1 proses yang langsung
 * di-spawn -- kalau proses itu SENDIRI nyepawn proses lain di dalamnya (misal yt-dlp yang
 * manggil ffmpeg internal buat gabungin format/post-processing, atau LibreOffice yang
 * arsitekturnya emang multi-proses), matiin cuma proses utamanya BIKIN PROSES TURUNANNYA JADI
 * YATIM (orphan) -- tetap jalan di background, dan yang lebih parah, tetap NAHAN pipe
 * stdout/stderr punya proses utama tadi tetap "terbuka" dari sudut pandang Node, jadi event
 * "close" GAK PERNAH nyala walau proses utamanya udah mati -- persis balik lagi ke masalah
 * "nunggu selamanya" yang mau di-fix di file ini.
 */
function killProcessTree(pid) {
  if (process.platform === "win32") {
    // Windows gak punya process group POSIX -- /T (tree) matiin proses + semua turunannya,
    // /F (force) setara SIGKILL.
    exec(`taskkill /pid ${pid} /T /F`, () => {});
  } else {
    // POSIX: proses di-spawn dengan `detached: true` (lihat spawnWithTimeout di bawah) supaya
    // dia jadi leader dari process group barunya sendiri -- kill ke MINUS pid (bukan pid biasa)
    // itu artinya "kirim sinyal ke SEMUA proses di group itu", bukan cuma 1 proses.
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // Kalau process group udah gak ada (misal race condition, prosesnya udah mati sendiri
      // pas kita mau kill), coba fallback kill biasa -- jangan biarin exception nyasar ke atas.
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  }
}

/**
 * Wrapper di atas child_process.spawn() yang otomatis MATIIN proses (+ reject Promise) kalau
 * gak selesai-selesai dalam batas waktu tertentu.
 *
 * KENAPA INI DIBUTUHIN: sebelumnya, SEMUA proses eksternal di bot ini (ffmpeg, yt-dlp,
 * LibreOffice, Real-ESRGAN, script Python) di-spawn TANPA timeout sama sekali. Kalau salah
 * satu proses itu nge-HANG (bukan error/keluar dengan exit code, tapi beneran diem gak pernah
 * selesai -- LibreOffice headless terutama terkenal suka macet total di dokumen tertentu,
 * ffmpeg juga bisa macet kalau input-nya rusak/aneh), Promise yang nunggu proses itu gak
 * PERNAH resolve atau reject:
 *   1. React ⏳ di WhatsApp gak pernah lanjut ke ✅/❌ -- kelihatan "macet di pending" selamanya.
 *   2. Slot antrean command berat punya user itu (lihat MAX_HEAVY_PENDING di handler.js) KETAHAN
 *      selamanya juga, karena promise-nya gak pernah "selesai" (resolve/reject) -- akibatnya
 *      command BERIKUTNYA dari orang yang sama ditolak terus ("masih ada command yang
 *      jalan/ngantre"), padahal command sebelumnya itu sebenarnya udah gak akan pernah
 *      kelar sendiri.
 *
 * Fix: kasih batas waktu wajar per jenis proses -- begitu kelewat, proses dipaksa mati
 * (SIGKILL) dan Promise-nya reject dengan pesan yang jelas ("proses kelamaan/macet"), bukan
 * dibiarkan nge-gantung tanpa akhir.
 *
 * @param {string} bin - path/nama binary yang mau dijalankan
 * @param {string[]} args
 * @param {{timeoutMs?: number, spawnOptions?: object}} opts
 * @returns {{proc: import('child_process').ChildProcess, whenDone: (onClose: (code: number, timedOut: boolean) => void) => void}}
 */
function spawnWithTimeout(bin, args, { timeoutMs = 180000, spawnOptions = {} } = {}) {
  // `detached: true` di POSIX bikin proses ini jadi leader process group baru sendiri (bukan
  // gabung ke group Node) -- ini yang bikin killProcessTree() di atas bisa matiin proses ini
  // BESERTA semua turunannya sekaligus lewat 1 sinyal ke group-nya. Di Windows gak ngaruh
  // (Windows gak punya konsep process group POSIX), taskkill /T yang urus itu di sana.
  const finalSpawnOptions = process.platform === "win32" ? spawnOptions : { ...spawnOptions, detached: true };
  const proc = spawn(bin, args, finalSpawnOptions);
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    killProcessTree(proc.pid);
  }, timeoutMs);
  timer.unref?.(); // housekeeping doang, jangan sampai nahan proses Node biar gak exit

  proc.once("exit", () => clearTimeout(timer));
  proc.once("error", () => clearTimeout(timer));

  return { proc, isTimedOut: () => timedOut, timeoutMs };
}

module.exports = { spawnWithTimeout };
