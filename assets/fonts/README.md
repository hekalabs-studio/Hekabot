# assets/fonts

Taruh file font di folder ini (`.ttf`, `.otf`, atau `.ttc`) supaya otomatis ke-load dan
ke-register pas bot start (lihat `lib/fontRegistry.js`).

## Font emoji yang sudah disertakan: Noto Color Emoji (Google)

`NotoColorEmoji.ttf` di folder ini adalah font emoji resmi dari Google, open source
(SIL Open Font License), didownload langsung dari repo resminya:
https://github.com/googlefonts/noto-emoji

Gak perlu setup apa-apa lagi -- begitu bot start, font ini otomatis kedeteksi
("Noto Color Emoji") dan langsung dipakai buat render emoji di fitur `/brat`.
Cek log saat start untuk konfirmasi:

```
[fontRegistry] 1 font berhasil didaftarkan dari assets/fonts. Font emoji terdeteksi: "Noto Color Emoji".
```

### Kenapa bukan emoji Meta/Facebook?

Meta (Facebook/Messenger) tidak mempublikasikan font emoji mereka sebagai open
source yang boleh dipakai/didistribusikan bebas -- beda dengan Google (Noto) atau
Mozilla (Twemoji). File "Facebook Emoji.ttf" yang beredar di internet itu hasil
ekstrak dari aplikasi Meta tanpa izin resmi, jadi gak dipakai di sini.

### Mau ganti ke gaya emoji lain?

Tinggal hapus/ganti file `NotoColorEmoji.ttf` di folder ini dengan font emoji lain
yang kamu punya izin pakai, misalnya:

- **Twemoji Mozilla** (gaya X/Twitter, format COLR, ringan):
  https://github.com/mozilla/twemoji-colr/releases
- **JoyPixels** (gaya paling mirip Facebook lama, tapi lisensi komersial):
  https://www.joypixels.com/fonts

Restart bot setelah ganti file, otomatis kedeteksi lagi lewat `lib/fontRegistry.js`.
