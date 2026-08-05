const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { resolveBinary } = require("./binaries");
const { spawnWithTimeout } = require("./spawnWithTimeout");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// LibreOffice headless TERKENAL suka macet total (bukan error, beneran diem) di dokumen
// tertentu (misal ada dialog/prompt yang normalnya muncul tapi gak bisa di mode headless).
// 3 menit dikasih waktu cukup longgar buat dokumen ukuran wajar, tapi tetap ada batasnya.
const LIBREOFFICE_TIMEOUT_MS = 3 * 60 * 1000;

function tmpPath(dir, ext) {
  return path.join(dir, `${crypto.randomBytes(6).toString("hex")}.${ext}`);
}

const INSTALL_HINT =
  "LibreOffice belum ter-install/gak ketemu di server ini.\n" +
  "Cara pasang (Ubuntu/Debian VPS):\n" +
  "  sudo apt update && sudo apt install -y libreoffice\n" +
  "Kalau OS lain, cari 'install libreoffice headless <nama OS kamu>'. Setelah kepasang, fitur ini otomatis jalan lagi.";

/**
 * Convert buffer dokumen (docx/xlsx/pptx/pdf/dll) ke format lain pakai LibreOffice headless.
 * targetFormat contoh: "pdf", "docx", "xlsx", "pptx"
 *
 * Tiap panggilan dikasih folder kerja + user-profile LibreOffice yang UNIK (via -env:UserInstallation).
 * Ini penting banget: kalau semua panggilan share 1 profile default, panggilan yang barengan/beruntun
 * bisa saling kunci ("profile in use") dan bikin proses gagal nulis file output (error kayak
 * "SfxBaseModel::impl_store failed" / Write Code:12) -- sering kejadian terutama di Windows.
 */
function convertWithLibreOffice(buffer, inputExt, targetFormat) {
  return new Promise((resolve, reject) => {
    const workDir = fs.mkdtempSync(path.join(TMP_DIR, "lo-"));
    const profileDir = fs.mkdtempSync(path.join(TMP_DIR, "lo-profile-"));
    const inputPath = tmpPath(workDir, inputExt);
    fs.writeFileSync(inputPath, buffer);

    const cleanup = () => {
      fs.rmSync(workDir, { recursive: true, force: true });
      fs.rmSync(profileDir, { recursive: true, force: true });
    };

    const { proc, isTimedOut } = spawnWithTimeout(resolveBinary("soffice"), [
      `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
      "--headless",
      "--norestore",
      "--convert-to", targetFormat,
      "--outdir", workDir,
      inputPath,
    ], { timeoutMs: LIBREOFFICE_TIMEOUT_MS });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.stdout.on("data", () => {}); // biar gak nge-block kalau buffer penuh

    proc.on("error", (err) => {
      cleanup();
      if (err.code === "ENOENT") return reject(new Error(INSTALL_HINT));
      reject(new Error("Gagal menjalankan LibreOffice: " + err.message));
    });

    proc.on("close", (code) => {
      const outputPath = inputPath.replace(new RegExp(`\\.${inputExt}$`), `.${targetFormat}`);

      if (isTimedOut()) {
        cleanup();
        return reject(new Error(`LibreOffice kelamaan/macet (lebih dari ${LIBREOFFICE_TIMEOUT_MS / 1000}s), proses dipaksa berhenti. Kemungkinan dokumennya bermasalah -- coba dokumen lain atau format ulang dokumennya.`));
      }

      if (!fs.existsSync(outputPath)) {
        cleanup();
        return reject(
          new Error(
            `Convert gagal (LibreOffice exit code ${code}). ` +
            "Kemungkinan file sumbernya rusak/gak didukung, atau LibreOffice gagal nulis file (coba lagi sekali lagi).\n" +
            (stderr ? "Detail: " + stderr.trim().slice(0, 300) : "")
          )
        );
      }

      const result = fs.readFileSync(outputPath);
      cleanup();
      resolve(result);
    });
  });
}

module.exports = { convertWithLibreOffice, TMP_DIR };
