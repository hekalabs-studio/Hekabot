const axios = require("axios");

/** Ubah "HH:MM" (kadang ada embel-embel zona waktu di belakang) jadi "HH:MM" jam Indonesia (24 jam) */
function formatTime24(time24) {
  if (!time24) return "-";
  const clean = time24.split(" ")[0].trim(); // buang "(WIB)" dsb kalau ada
  const [hStr, mStr] = clean.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return "-";
  const hh = String(h).padStart(2, "0");
  return `${hh}:${mStr}`;
}

/** Cari lokasi + jadwal sholat hari ini pakai Open-Meteo (geocoding) + AlAdhan (waktu sholat, metode Kemenag RI) */
async function getPrayerTimes(cityName) {
  try {
    const geoRes = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: cityName, count: 1, language: "id" },
      timeout: 20000,
    });
    const place = geoRes.data?.results?.[0];
    if (!place) return null;

    const timingsRes = await axios.get("https://api.aladhan.com/v1/timings", {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        method: 20, // Kementerian Agama Republik Indonesia
      },
      timeout: 20000,
    });

    const timings = timingsRes.data?.data?.timings;
    const dateInfo = timingsRes.data?.data?.date;
    if (!timings) return null;

    return {
      city: place.name,
      province: place.admin1 || "-",
      country: place.country || "Indonesia",
      tanggalHijriah: dateInfo?.hijri
        ? `${dateInfo.hijri.day} ${dateInfo.hijri.month?.en || ""} ${dateInfo.hijri.year} H`
        : null,
      tanggalMasehi: dateInfo?.gregorian
        ? `${dateInfo.gregorian.day} ${dateInfo.gregorian.month?.en || ""} ${dateInfo.gregorian.year}`
        : null,
      imsak: formatTime24(timings.Imsak),
      subuh: formatTime24(timings.Fajr),
      terbit: formatTime24(timings.Sunrise),
      dzuhur: formatTime24(timings.Dhuhr),
      ashar: formatTime24(timings.Asr),
      maghrib: formatTime24(timings.Maghrib),
      isya: formatTime24(timings.Isha),
    };
  } catch {
    return null;
  }
}

module.exports = { getPrayerTimes };
