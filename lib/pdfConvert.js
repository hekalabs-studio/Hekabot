const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnWithTimeout } = require("./spawnWithTimeout");

const TMP_DIR = path.join(__dirname, "..", "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const SCRIPTS_DIR = path.join(__dirname, "..", "scripts");

// Convert PDF->Office lewat script Python biasanya cepat, tapi PDF yang aneh/berat (banyak
// gambar resolusi tinggi, ratusan halaman) bisa bikin lama -- 3 menit dikasih buat jaga-jaga
// sebelum dianggap macet.
const PDF_CONVERT_TIMEOUT_MS = 3 * 60 * 1000;

const INSTALL_HINT =
  "Fitur ini butuh Python 3 + beberapa library (pdf2docx, pdf2image, python-pptx, openpyxl, pdfplumber).\n" +
  "Linux/Ubuntu/VPS:\n" +
  "  sudo apt install -y python3 python3-pip poppler-utils\n" +
  "  pip3 install --break-system-packages pdf2docx pdf2image python-pptx openpyxl pdfplumber\n" +
  "Windows:\n" +
  "  1. Install Python dari https://www.python.org/downloads/ (WAJIB centang \"Add python.exe to PATH\" pas instalasi)\n" +
  "  2. Kalau tetep kedetect gak jalan padahal udah install: buka Settings > Apps > Advanced app settings > App execution aliases, lalu MATIKAN toggle \"python.exe\" dan \"python3.exe\" (ini alias palsu bawaan Windows yang suka nyamar jadi Python asli)\n" +
  "  3. Download poppler dari https://github.com/oschwartz10612/poppler-windows/releases, extract, lalu copy isi folder `Library\\bin`-nya ke `bin\\poppler\\` di project ini (gak perlu edit PATH sistem)\n" +
  "  4. Buka ulang PowerShell/terminal, lalu jalankan: pip install pdf2docx pdf2image python-pptx openpyxl pdfplumber\n" +
  "Setelah itu fitur ini otomatis jalan lagi.";

// Cache biar gak ngecek binary Python berkali-kali tiap panggil
let cachedPythonBin = null;

/** Cari binary python yang beneran ada & jalan. Urutan dicek beda per OS biar prioritasnya masuk akal. */
function resolvePythonBin() {
  if (cachedPythonBin) return cachedPythonBin;
  // Windows: "py" adalah launcher resmi dari installer python.org, paling gak mungkin ke-nyasar ke
  // alias palsu Microsoft Store, jadi dicek duluan. Linux/Mac: "python3" yang paling standar.
  const order = process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python", "py"];

  for (const bin of order) {
    const res = spawnSync(bin, ["--version"], { encoding: "utf8" });
    // Di Windows, kalau Python belum ke-install, `python`/`python3` adalah alias palsu bawaan
    // Microsoft Store yang "sukses" dijalankan (gak error) tapi gak beneran ngejalanin Python apapun.
    // Makanya wajib dicek juga exit code-nya 0 DAN outputnya beneran mengandung kata "Python".
    const output = `${res.stdout || ""}${res.stderr || ""}`;
    if (!res.error && res.status === 0 && /Python \d/i.test(output)) {
      cachedPythonBin = bin;
      return bin;
    }
  }
  return null; // gak ketemu sama sekali
}

function tmpPath(ext) {
  return path.join(TMP_DIR, `${crypto.randomBytes(6).toString("hex")}.${ext}`);
}

/**
 * Convert PDF -> docx / pptx / xlsx pakai script Python (lebih akurat daripada LibreOffice
 * untuk arah PDF -> Office, karena LibreOffice buka PDF sebagai gambar/Draw, bukan teks editable).
 * scriptName: "pdf_to_docx.py" | "pdf_to_pptx.py" | "pdf_to_xlsx.py"
 */
function convertPdfWithPython(buffer, scriptName, outputExt) {
  return new Promise((resolve, reject) => {
    const pythonBin = resolvePythonBin();
    if (!pythonBin) return reject(new Error(INSTALL_HINT));

    const inputPath = tmpPath("pdf");
    const outputPath = tmpPath(outputExt);
    fs.writeFileSync(inputPath, buffer);

    const { proc, isTimedOut } = spawnWithTimeout(
      pythonBin,
      [path.join(SCRIPTS_DIR, scriptName), inputPath, outputPath],
      { timeoutMs: PDF_CONVERT_TIMEOUT_MS }
    );
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("error", (err) => {
      fs.rmSync(inputPath, { force: true });
      if (err.code === "ENOENT") return reject(new Error(INSTALL_HINT));
      reject(new Error("Gagal menjalankan Python: " + err.message));
    });

    proc.on("close", (code) => {
      fs.rmSync(inputPath, { force: true });

      if (isTimedOut()) {
        fs.rmSync(outputPath, { force: true });
        return reject(new Error(`Proses convert kelamaan/macet (lebih dari ${PDF_CONVERT_TIMEOUT_MS / 1000}s), dipaksa berhenti. Kemungkinan PDF-nya terlalu kompleks/besar.`));
      }

      if (code !== 0 || !fs.existsSync(outputPath)) {
        const looksLikeMissingLib = /ModuleNotFoundError|No module named/i.test(stderr);
        return reject(
          new Error(
            looksLikeMissingLib
              ? INSTALL_HINT
              : `Convert gagal (exit code ${code}). Detail: ${stderr.trim().slice(0, 300) || "(tidak ada detail)"}`
          )
        );
      }

      const result = fs.readFileSync(outputPath);
      fs.rmSync(outputPath, { force: true });
      resolve(result);
    });
  });
}

module.exports = { convertPdfWithPython };
