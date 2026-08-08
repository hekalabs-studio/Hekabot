# Panduan Lengkap: HekaBot di Termux (Android, proot-distro Ubuntu)

Panduan ini khusus untuk menjalankan HekaBot di HP Android lewat Termux + proot-distro Ubuntu.
Sudah diuji di **Moto G45 (Snapdragon 6s Gen 3, ARM64/aarch64, RAM 8GB)**, tapi berlaku umum
untuk HP Android ARM64 lainnya dengan RAM cukup (disarankan minimal 4GB).

## 1. Install Termux & proot-distro Ubuntu

Di Termux (bukan di dalam proot):
```bash
pkg update && pkg upgrade -y
pkg install proot-distro tmux -y
proot-distro install ubuntu
termux-setup-storage
```

Masuk ke Ubuntu:
```bash
proot-distro login ubuntu
```
Mulai sini sampai selesai, semua command dijalankan **di dalam** Ubuntu (prompt: `root@localhost:~#`).

## 2. Node.js 20, tools dasar & git via HTTPS

```bash
apt update && apt upgrade -y
apt install -y curl git ffmpeg python3 python3-pip build-essential libreoffice poppler-utils unzip nano cmake file

# Node.js 20 LTS (WAJIB 20+, bukan 18 — baileys mensyaratkan ini)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # pastikan v20.x.x

# Biar git clone submodule pakai HTTPS, bukan SSH (hindari error "Permission denied publickey")
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

## 3. yt-dlp & library Python

```bash
pip3 install --break-system-packages yt-dlp
pip3 install --break-system-packages pdf2docx pdf2image python-pptx openpyxl pdfplumber
```

## 4. Font asli Microsoft (biar `.brat` & `.smeme` tampil sama seperti di PC)

`.brat` pakai font `Arial`/`Arial Narrow`, dan `.smeme` pakai `Impact`/`Arial Black`. Font-font
itu bawaan Windows/Mac, tidak ada di Linux secara default — hasilnya teks brat tidak muncul sama
sekali, dan smeme jatuh ke font tipis (bukan tebal seperti Impact).

```bash
apt install -y software-properties-common
add-apt-repository multiverse -y
apt update
echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
apt install -y ttf-mscorefonts-installer
fc-cache -f -v
```

Verifikasi:
```bash
fc-list | grep -i impact
fc-list | grep -i arial
```

## 5. Pindahkan project bot ke Ubuntu

Keluar dari proot dulu:
```bash
exit
```
Pastikan file zip project bot ada di `~/storage/downloads/` (Termux biasa), lalu:
```bash
proot-distro login ubuntu
mkdir -p ~/hekabot
cp /root/storage/downloads/hekabot.zip ~/hekabot/
cd ~/hekabot
unzip hekabot.zip
cd hekabot     # sesuaikan nama folder hasil extract
```

## 6. Install dependency bot

```bash
npm install
```

## 7. Konfigurasi

```bash
cp .env.example .env
nano .env
```
Isi minimal:
```
GEMINI_API_KEY_1=isi_key_dari_aistudio.google.com/apikey
OWNER_NUMBER=628xxxxxxxxxx
```
Simpan: `Ctrl+O` → Enter → `Ctrl+X`.

```bash
nano config.js
```
Cek `ownerName`, `prefix`, dll sesuai keinginan. `performanceMode: "auto"` sudah pas untuk RAM
≥4GB (semua command berat otomatis nyala).

## 8. (OPSIONAL, TIDAK DISARANKAN di HP) Build Real-ESRGAN untuk fitur `hdr` versi lokal

> ⚠️ **Update penting**: setelah dicoba langsung, Real-ESRGAN lokal **praktis tidak bisa dipakai**
> di HP Android lewat Termux/proot-distro — bukan soal spek HP, tapi karena (1) proot tidak bisa
> akses GPU asli, dan (2) overhead `proot` sendiri (yang intersep tiap system call) bikin proses
> AI inference yang harusnya beberapa detik jadi puluhan jam. Sudah dites dengan `LP_NUM_THREADS=1`
> segala macam, tetap tidak jalan dalam waktu wajar.
>
> **Makanya `hdr` sekarang defaultnya sudah diganti ke API pihak ketiga** (lihat `lib/api.js`,
> key `hdr` di `CANDIDATES`), pakai sistem multi-provider/multi-path yang sama kayak fitur
> `recolor`/`cekbillpln`. Kamu **tidak perlu** ikuti langkah build di bawah ini untuk pemakaian
> normal di HP.
>
> Bagian ini saya biarkan cuma untuk referensi/dokumentasi — kalau suatu saat kamu pindahkan bot
> ini ke PC/VPS beneran (bukan proot, idealnya ada GPU), baru langkah ini jadi relevan lagi.

Tidak ada build resmi Linux ARM64 untuk `realesrgan-ncnn-vulkan` (cuma Windows/Linux-x86/macOS),
jadi harus compile dari source:

```bash
apt install -y libvulkan-dev glslang-tools mesa-vulkan-drivers libomp-dev

cd ~
git clone --recursive https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan.git
cd Real-ESRGAN-ncnn-vulkan
git submodule update --init --recursive

ls src/ncnn        # pastikan tidak kosong sebelum lanjut
ls src/libwebp     # pastikan tidak kosong sebelum lanjut

cd src
mkdir build && cd build
cmake ../ -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build . -j$(nproc)

ls                             # harus muncul file "realesrgan-ncnn-vulkan"
file realesrgan-ncnn-vulkan    # harus ada tulisan "aarch64", bukan "x86-64"
```

Kalau berhasil, salin ke folder bot:
```bash
mkdir -p ~/hekabot/hekabot/bin
cp realesrgan-ncnn-vulkan ~/hekabot/hekabot/bin/
cp -r ../models ~/hekabot/hekabot/bin/
chmod +x ~/hekabot/hekabot/bin/realesrgan-ncnn-vulkan
```

Catatan: karena tidak ada driver GPU asli yang bisa diakses dari proot, binary ini jalan pakai
software Vulkan (`mesa-vulkan-drivers`/lavapipe) — tetap berfungsi, tapi lebih lambat daripada
kalau ada GPU asli (bisa puluhan detik–beberapa menit per gambar, tergantung ukuran).

## 9. Jalankan bot

```bash
cd ~/hekabot/hekabot
npm start
```
Scan QR yang muncul lewat WhatsApp: **Perangkat Tertaut → Tautkan Perangkat**. Session tersimpan
di folder `session/`, jadi tidak perlu scan ulang tiap restart.

## 10. Supaya bot tetap jalan di background

Tekan `Ctrl+C` dulu untuk stop, lalu keluar ke Termux biasa (`exit`), dan jalankan lewat `tmux`:
```bash
tmux new -s hekabot
proot-distro login ubuntu
cd ~/hekabot/hekabot
npm start
```
Lepas sesi tanpa mematikan bot: tekan `Ctrl+B` lalu `D`. Masuk lagi kapan saja:
`tmux attach -t hekabot`.

Aktifkan juga **Acquire wakelock** dari notifikasi Termux, dan matikan battery optimization untuk
Termux di pengaturan Android supaya tidak di-*kill* sistem saat idle.

## 11. Uji coba

Kirim `menu` ke nomor bot untuk lihat semua fitur, lalu tes beberapa command:
```
.ytmp3 <link youtube>
.brat halo
.smeme hello| world
.togif   (reply video pendek)
.tomp4   (reply stiker animasi)
.hdr     (reply foto)
```

## Troubleshooting umum

| Masalah | Penyebab | Solusi |
|---|---|---|
| `npm install` error "requires Node.js 20+" | Masih pakai Node 18 | `apt remove -y nodejs && apt autoremove -y`, lalu ulangi langkah 2 install Node 20 |
| `git submodule` gagal, `Permission denied (publickey)` | `.gitmodules` pakai URL SSH (`git@github.com:...`) | Jalankan `git config --global url."https://github.com/".insteadOf "git@github.com:"` sebelum clone/submodule update |
| `cmake` error "Compatibility with CMake < 3.5 has been removed" | Versi CMake di Ubuntu terlalu baru untuk `ncnn` lama | Tambahkan flag `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` ke command `cmake ../` |
| `cmake` error "The submodules were not downloaded!" | Submodule belum lengkap (biasanya karena error SSH di atas) | Perbaiki dulu masalah SSH, lalu jalankan ulang `git submodule update --init --recursive` sebelum `cmake` lagi |
| `.brat` tidak ada teks (cuma kotak warna polos), tidak ada error di log | Font `Arial`/`Arial Narrow` tidak ada di Linux | Install `ttf-mscorefonts-installer` (lihat langkah 4) |
| `.smeme` tampil tapi fontnya tipis, tidak tebal seperti Impact | Font `Impact`/`Arial Black` tidak ada, fallback ke `Liberation Sans` | Install `ttf-mscorefonts-installer` (lihat langkah 4) |
| Download binary `realesrgan-ncnn-vulkan` dari GitHub Releases tidak jalan (`exec format error`) | Release resminya cuma untuk x86-64, HP Android itu ARM64 | Wajib compile dari source (lihat langkah 8), bukan download binary siap pakai |
