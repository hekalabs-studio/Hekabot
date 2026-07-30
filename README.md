# HekaBot — WhatsApp Bot

Bot WhatsApp berbasis **Baileys**, koneksi via **Pairing Code**, dengan menu Downloader & Tools sesuai desain kamu.

## 1. Persiapan

Wajib ada di komputer/VPS kamu:
- **Node.js v18+** → cek dengan `node -v`
- **ffmpeg** (untuk fitur `tomp3`, `tovn`, `cutmp3`, dan dipakai `yt-dlp` untuk convert ke mp3)

  Pilih salah satu cara:
  1. **Via package manager**: Ubuntu/Debian `sudo apt install ffmpeg -y`, Termux `pkg install ffmpeg`
  2. **Tanpa install ke sistem** (paling gampang di Windows): download dari https://www.gyan.dev/ffmpeg/builds/ (pilih **"release essentials"**), extract file zip-nya, lalu copy **`ffmpeg.exe`** DAN **`ffprobe.exe`** (ada di folder `bin` hasil extract) ke folder `bin/` di dalam project ini. Bot otomatis mendeteksi keduanya duluan sebelum coba cari di PATH sistem.
- **yt-dlp** (untuk fitur `ytmp3`, `ytmp4`, `play`, `ytfull`, `yttranscript` — ini dipakai supaya fitur YouTube **tidak bergantung pada API pihak ketiga yang sering berubah/rusak**)

  Pilih salah satu cara:
  1. **Via pip** (kalau sudah ada Python): `pip install yt-dlp`, lalu **tutup & buka ulang terminal** (PATH baru kebaca setelah restart terminal). Cek: `yt-dlp --version`
  2. **Tanpa Python** (paling gampang di Windows): download `yt-dlp.exe` dari https://github.com/yt-dlp/yt-dlp/releases/latest, lalu taruh filenya di `bin/yt-dlp.exe` di dalam folder project ini. Bot otomatis mendeteksi file itu duluan sebelum coba cari di PATH sistem — jadi gak perlu utak-atik Environment Variables Windows sama sekali.

- **Real-ESRGAN** (untuk fitur `hdr` — upscale/HD gambar pakai AI, **jalan lokal, tanpa API luar**)
  1. Download dari https://github.com/xinntao/Real-ESRGAN/ (pilih file `-windows.zip`)
  2. Extract **semua isinya** (exe + folder `models` + file lain di sebelahnya) ke folder `bin/` di project ini — jangan cuma exe-nya doang, folder `models` **wajib** ikut ke-copy di folder yang sama
  3. Hasil akhirnya: `bin/realesrgan-ncnn-vulkan.exe` dan `bin/models/` ada di folder yang sama

- **LibreOffice** (untuk fitur `topdf` khusus dokumen office seperti docx/xlsx/pptx → pdf, **jalan lokal, tanpa API luar**)
  - Ubuntu/Debian/VPS: `sudo apt install -y libreoffice`
  - Windows: download & install dari https://www.libreoffice.org/download/download-libreoffice/ (pilih tombol "Download" besar, installer biasa next-next-finish). **Gak perlu edit PATH** — bot otomatis nyari di lokasi instalasi default (`C:\Program Files\LibreOffice\program\soffice.exe`)

- **Python 3 + Poppler + beberapa library** (untuk fitur `todocx`, `toexcel`, `topptx` — convert PDF ke Word/Excel/PowerPoint, **jalan lokal, tanpa API luar**)
  - Ubuntu/Debian/VPS: `sudo apt install -y python3 python3-pip poppler-utils`
  - Windows:
    1. Install Python dari https://www.python.org/downloads/ (**wajib centang "Add python.exe to PATH"** saat instalasi)
    2. Download poppler dari https://github.com/oschwartz10612/poppler-windows/releases (ambil file `Release-xx.xx.x-0.zip`)
    3. Extract, lalu **copy folder `Library\bin`-nya (isinya, bukan foldernya)** ke `bin\poppler\` di dalam project ini — jadi hasilnya ada file-file kayak `bin\poppler\pdftoppm.exe`. Sama kayak pola ffmpeg/yt-dlp di bot ini: **gak perlu edit PATH sistem**, bot otomatis nemu dari situ duluan
  - Lanjut di semua OS: `pip3 install --break-system-packages pdf2docx pdf2image python-pptx openpyxl pdfplumber` (di Windows, pakai `py -m pip install pdf2docx pdf2image python-pptx openpyxl pdfplumber` — lebih tahan banting daripada `pip install` polos, apalagi kalau command `python`/`pip` masih ke-alias sama Microsoft Store)

## 2. Install

```bash
cd hekabot
npm install
```

## 3. Konfigurasi

Buka `config.js`, isi:
- `ownerNumber`, `ownerName`, `instagram` → sudah kuisi sesuai identitas HekaBot kamu
- `prefix` → default `.` (bisa diganti string kosong `""` kalau mau tanpa prefix)

## 4. Jalankan & Scan QR

```bash
npm start
```

- Akan muncul **QR code** di terminal.
- Buka WhatsApp di HP → **Perangkat Tertaut** → **Tautkan Perangkat** → scan QR tersebut.
- Setelah berhasil, session tersimpan otomatis di folder `session/` — kamu tidak perlu scan ulang selama folder itu tidak dihapus.
- QR code hanya berlaku ±20 detik. Kalau keburu hilang sebelum sempat di-scan, tunggu saja — bot otomatis generate QR baru.

## 5. Coba fitur

Kirim ke bot:
```
menu
```
untuk melihat semua fitur. Command lain dipanggil dengan prefix, contoh:
```
.ytmp3 https://youtube.com/watch?v=xxxxx
.kalkukator 25*4+10
.removebg   (reply sebuah foto)
```

## 6. Tentang API downloader/tools

Sebagian besar fitur sekarang **jalan lokal** (gak butuh API pihak ketiga sama sekali):
- **yt-dlp**: `ytmp3`, `ytmp4`, `play`, `ytfull`, `yttranscript`, **`fbdl`, `igdl`, `pinterestdl`, `threads`, `ttmp3`, `ttmp4`, `ttslide`, `twitter`** (yt-dlp support 1700+ situs, gak cuma YouTube)
- **ffmpeg**: `tomp3`, `tovn`, `cutmp3`
- **Real-ESRGAN**: `hdr`
- **@imgly/background-removal-node**: `removebg`
- **tesseract.js**: `ocr`
- **Google Drive langsung** (tanpa API): `drivelink`
- **catbox.moe** (upload publik, bukan API tebak-tebakan): `tourl`
- **@damarkuncoro/posindonesia** (dataset offline ~80.000+ data): `kodepos`
- **sharp / wa-sticker-formatter**: `sticker`, `take`, `swm`, `brat`, `bratvid`, `qc`, `smeme`, `squote` (semua sticker menu, jalan lokal)
- Murni lokal tanpa dependency luar: `kalkukator`, `readmore`
- `infodevice` — LOKAL, pakai `getDevice()` dari Baileys buat cek platform WhatsApp pengirim
  (Android/iOS/Web/Desktop). Sekarang buat cek device SI PENGIRIM, bukan spek server bot lagi —
  spek server sekarang dilihat lewat `.bot` (ringkas) atau `.resource` (lengkap, owner only).
  Catatan: WhatsApp gak pernah kasih data hardware asli (RAM/prosesor/model HP) ke bot manapun,
  jadi ini cuma bisa deteksi APLIKASI-nya, bukan spek fisik HP-nya.
- Quote generator API terpisah (bukan siputzx, biasanya stabil): `iqc`

Sisanya masih memanggil API pihak ketiga karena platformnya gak didukung yt-dlp / butuh data real-time:
- `capcutdl`, `telesticker` — belum ketemu path API yang 100% dipastikan bener
- `cekbillpln` — butuh data real-time PLN, gak ada cara lokal
- `recolor` — belum ada model colorize portable kayak Real-ESRGAN

(`rednotedl`, `spotifydl`, `teradl`, `teraview`, `scribddl`, `slidesharedl` udah dihapus dari menu — API-nya gak pernah ketemu path yang jalan/situsnya diproteksi ketat tanpa API publik, dan khusus `spotifydl` emang gak mungkin gratis karena Spotify pakai DRM.)

Untuk mengatasi ini, sistem di `lib/api.js` punya **2 lapis coba-coba otomatis**:
1. **Multi provider**: `config.apiBaseUrls` berisi beberapa base URL (bukan cuma satu). Kalau provider pertama down, otomatis lanjut coba provider berikutnya.
2. **Multi path**: tiap fitur punya beberapa kandidat path, karena beda provider suka pakai struktur URL beda.

Begitu ketemu kombinasi (provider + path) yang berhasil, itu **diingat** di file `lib/.resolved-endpoints.json` — jadi panggilan berikutnya langsung pakai yang benar tanpa coba-coba lagi.

Kalau ada fitur yang masih error setelah semua kandidat & provider dicoba, bot akan kasih tahu di pesan error:
- Provider + path apa saja yang sudah dicoba
- Response/error dari masing-masing

Kalau itu terjadi:
1. Atau tambah provider baru di `config.js` → `apiBaseUrls`, atau kandidat path baru di `lib/api.js` → object `CANDIDATES`
2. Kalau baru nambah kandidat/provider, hapus dulu `lib/.resolved-endpoints.json` (kalau ada) supaya bot coba ulang dari awal
3. Tanya AI :v
## 7. Struktur project

```
hekabot/
├── index.js              # koneksi Baileys + pairing code
├── handler.js             # router command
├── config.js               # identitas bot & pengaturan
├── lib/
│   ├── api.js              # wrapper API multi-provider (endpoint map terpusat)
│   ├── kodepos.js           # cari kode pos Indonesia, LOKAL/offline
│   ├── extract.js          # cari URL/teks di response API yang formatnya beda-beda
│   ├── media.js             # ambil media (gambar/video/audio) dari pesan/reply
│   ├── transfer.js          # download buffer & upload sementara ke catbox.moe
│   ├── ffmpeg.js             # convert audio/video (tomp3, tovn, cutmp3)
│   └── menu.js               # generator teks menu
└── commands/
    ├── downloader.js         # 20 fitur downloader
    └── tools.js                 # 20 fitur tools
```

## 8. Menambah fitur baru nanti

Tinggal tambah object baru di `commands/downloader.js` atau `commands/tools.js`:
```js
{
  name: "namafitur",
  run: async ({ jid, sock, text, args, reply, m }) => {
    // logika fitur di sini
  },
}
```
Otomatis kebaca oleh `handler.js`, tidak perlu registrasi manual di tempat lain.

## 9. Fun Menu & Game Menu

**Fun Menu (13 fitur)**: semuanya jalan 100% lokal, generator teks random (kadang deterministik berdasarkan nama/teks yang dikasih, kadang murni acak). Gak butuh API.

**Game Menu (12 fitur)**: semuanya jalan penuh, gak ada yang placeholder. Mekanismenya tanya-jawab (nunggu jawaban di chat tanpa prefix, ada timer 45 detik, bisa ketik *nyerah*), kecuali `minesweeper` & `ulartangga` yang interaktif pakai perintah lanjutan:
- `asahotak`, `tebaktebakan`, `tebakbendera`, `tebakkata`, `tebakpresiden`, `tebakpokemon`, `susunkata`, `terasaurus`
- `minesweeper` (grid interaktif, ketik koordinat kayak `minesweeper A1`)
- `ulartangga` (dadu, ketik `ulartangga roll`)
- `kuisislami`, `kuismtk` (kuis edukasi level SMA kelas 12)

Game-game yang dulu direncanain tapi gak sempat dibikinin bank soalnya (`tebakdrakor`, `tebaklirik`, `werewolf`, dan lain-lain yang butuh kurasi konten/hak cipta) udah **dihapus dari menu** — bukan dibiarin jadi placeholder, biar menu-nya jujur cuma nampilin yang beneran jalan.

Bank soal ada di `lib/gameData.js` dan `lib/funData.js` — tinggal tambah item baru di array-nya kalau mau nambah variasi soal. Catatan: sistem jawabnya cocok-cocokan teks persis (setelah dibersihin spasi/simbol), jadi kadang variasi ejaan jawaban gak kebaca sama persis kayak yang diharapkan — kalau nemu itu, kabari aku, bisa disesuain.

## 10. Fitur AI (Gemini)

Buat aktifin `.ai` (chat kayak AI beneran, pakai Gemini API kamu sendiri):

1. Bikin API key gratis di **https://aistudio.google.com/apikey**
2. Buka `config.js`, isi:
   ```js
   geminiApiKey: "API_KEY_KAMU_DI_SINI",
   ```
3. Restart bot (`Ctrl+C` → `npm start`)

Cara pakai:
```
.ai jelasin apa itu lubang hitam
.ai gimana caranya masak nasi goreng enak
.resetai        ← reset riwayat obrolan (biar AI "lupa" konteks sebelumnya)
```

Bot inget konteks obrolan sebelumnya (10 giliran terakhir) selama belum di-reset atau bot di-restart.

**`.solve` — kerjain soal dari FOTO** (pakai model vision Gemini, `gemini-flash-latest` udah support gambar):
```
.solve                              ← kirim/reply foto, caption .solve doang
.solve jelasin caranya aja          ← boleh tambah instruksi setelah .solve
```
Kirim foto langsung dengan caption `.solve`, atau reply foto yang udah ada di chat lalu ketik `.solve`.
Foto-nya **bebas jenis apa aja** — bukan cuma soal matematika: soal pelajaran (fisika, kimia, bahasa, dll),
potongan kode/pesan error, captcha/teka-teki, tabel yang perlu dihitung, formulir, tulisan tangan, dan
lain-lain. Beda dari `.ai`, `.solve` gak nyambung ke riwayat obrolan (sekali jalan per-foto) dan pakai
system prompt sendiri (`solveSystemPrompt` di `config.js`) yang didesain buat "kerjain apa yang ada di foto",
bukan ngobrol bebas.

**Opsional — mode auto-chat** (bot otomatis bales SEMUA chat pribadi kayak asisten AI, gak perlu ketik `.ai` dulu): buka `config.js`, ubah:
```js
aiAutoChatPrivate: true,
```
Ini **cuma aktif di chat pribadi** (japri), bukan di grup — biar bot gak spam bales semua orang di grup tanpa diminta.

## 11. Internet Menu

| Fitur | Sumber | Reliabilitas |
|---|---|---|
| `wikipedia` | Wikipedia REST API resmi | ✅ Solid, gak akan bermasalah |
| `cuaca` | Open-Meteo (gratis, tanpa key) | ✅ Solid, gak akan bermasalah |
| `ai` / `resetai` | Gemini API kamu | ✅ Solid (asal API key diisi, lihat bagian 10) |
| `solve` | Gemini API kamu (vision) | ✅ Solid (asal API key diisi, lihat bagian 10) |
| `alkitab` | SABDA (alkitab.sabda.org) | ⚠️ Bukan API resmi/JSON, hasil di-parse dari HTML — bisa berubah sewaktu-waktu |
| `kbbi` | Scraping typoonline.com | ⚠️ Paling rawan putus, bergantung struktur halaman pihak ketiga |
| `lirik` | lyrics.ovh | ⚠️ Wajib format *Artis - Judul*; hasil DIBATASI cuma cuplikan (bukan lirik lengkap, demi hak cipta) |
| `pinterest` | Scraping pinterest.com | ⚠️ Pinterest cukup agresif soal anti-bot, paling mungkin diblokir sewaktu-waktu |

Kalau `alkitab`/`kbbi`/`pinterest` mulai error, kirim pesan errornya ke saya (Claude), nanti dicek lagi sumbernya.

## 12. Sistem Pendaftaran

Sekarang **wajib daftar dulu** sebelum bisa pakai fitur bot (kecuali `menu`, `help`, `daftar`, `profil`).

```
.daftar Budi Santoso    ← daftar
.profil                 ← cek data diri
.hapusakun              ← batal daftar
```

Data tersimpan di **file** `data/users.json` (bukan cuma di memori) — jadi **aman biar bot di-restart** (`Ctrl+C` → `npm start` lagi, atau laptop mati-nyala biasa). Data cuma hilang kalau file/folder `data/` sengaja dihapus.

Mau matiin fitur wajib daftar ini? Buka `config.js`, ubah:
```js
requireRegistration: false,
```

## 13. Main Menu

Fitur umum/info bot, plus sistem pendaftaran dipindah ke sini:

| Fitur | Fungsi |
|---|---|
| `bot` | Info singkat bot (uptime, owner) + sistem server (platform/CPU/RAM/Node.js) |
| `daftar` | Daftar (wajib sebelum pakai fitur lain) |
| `database` | Statistik: jumlah user terdaftar, total fitur |
| `hapusakun` | Batal daftar |
| `help` | Panduan cara pakai bot (bisa diakses walau belum daftar) |
| `list` | Ringkasan jumlah fitur per kategori |
| `menu` | Daftar lengkap semua fitur |
| `owner` | Kirim kontak asli owner (vCard) |
| `ping` | Cek latensi bot |
| `profile` | Lihat profil pendaftaran kamu (alias dari `profil`) |
| `resource` | Spesifikasi & pemakaian server (CPU/RAM) |
| `runtime` | Lama bot udah nyala |
| `speedtest` | Tes kecepatan download koneksi server |
| `status` | Set status "About" WhatsApp bot |

## 14. Salam Sambutan Grup + Auto-Tutorial

Kalau bot ada di sebuah grup:
- **Member baru masuk** → bot otomatis kirim salam sambutan (tag nama) + kirim tutorial cara pakai bot
- **Member keluar** → bot kirim salam perpisahan

Mau matiin ini? Buka `config.js`, ubah:
```js
groupWelcomeEnabled: false,
```

## 15. Group Menu (admin grup only)

| Fitur | Fungsi |
|---|---|
| `kick` | Keluarkan member (reply/mention/nomor) |
| `promote` | Jadikan admin |
| `demote` | Turunkan dari admin |
| `mute` | Kunci grup (cuma admin bisa chat) |
| `unmute` | Buka kunci grup |
| `tagall` | Mention semua member (kelihatan daftarnya) |
| `hidetag` | Mention semua member (tanpa nampilin daftar nama) |
| `linkgrup` | Ambil link invite grup |

**Wajib**: cuma bisa dipakai kalau kamu **admin di grup itu** (atau owner bot, bisa dari grup manapun). Kalau dipakai di luar grup (chat pribadi), otomatis ditolak.

**Penting**: fitur-fitur ini butuh **bot-nya sendiri juga jadi admin** di grup itu — kalau bot bukan admin, WhatsApp bakal nolak semua aksi ini (kick, mute, dll), gak peduli siapa yang minta.

## 16. Database User & Hapus Akun Orang Lain (Owner)

`.database` sekarang nampilin **listing lengkap** semua user terdaftar (ID, nama, nomor, tanggal daftar, status) — **khusus owner**, karena isinya data pribadi/nomor telepon orang.

Hapus akun orang lain (khusus owner), 2 cara:
```
.hapusakun U001
.deleteuser U001
```
`.hapusakun` **tanpa** argumen tetap seperti biasa — hapus akun **diri sendiri**, bisa dipakai siapa aja.

## 17. Banner buat `.menu`

Sekarang `.menu` kirim **gambar banner dulu**, baru daftar menunya. **Taruh file banner kamu di:**
```
hekabot/assets/banner.jpg
```
(boleh juga `.jpeg`, `.png`, atau `.webp` — pakai salah satu nama file: `banner.jpg`/`banner.jpeg`/`banner.png`/`banner.webp`)

Kalau file itu belum ada, bot otomatis skip bagian gambar dan langsung kirim menu teks aja (gak error).

## Catatan penting

- Ini pakai WhatsApp Web multi-device (tidak resmi/unofficial). Gunakan nomor sekunder, jangan nomor utama, untuk menghindari risiko banned oleh WhatsApp.
- Jangan spam request ke API publik — bisa kena rate limit/block IP.
