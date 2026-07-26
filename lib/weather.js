const axios = require("axios");

const WEATHER_CODES = {
  0: "Cerah", 1: "Cerah berawan sebagian", 2: "Berawan sebagian", 3: "Berawan tebal",
  45: "Berkabut", 48: "Kabut es",
  51: "Gerimis ringan", 53: "Gerimis sedang", 55: "Gerimis lebat",
  61: "Hujan ringan", 63: "Hujan sedang", 65: "Hujan lebat",
  71: "Salju ringan", 73: "Salju sedang", 75: "Salju lebat",
  80: "Hujan lokal ringan", 81: "Hujan lokal sedang", 82: "Hujan lokal lebat",
  95: "Badai petir", 96: "Badai petir + hujan es",
};

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Konversi derajat arah angin ke mata angin singkat
function getWindDirection(degree) {
  if (degree === undefined || degree === null) return "";
  const directions = ["U", "UTL", "TL", "TTL", "T", "TM", "TG", "SBD", "S", "SBD", "BD", "BLD", "B", "BL", "BBU", "UBL"];
  const index = Math.round(degree / 22.5) % 16;
  return directions[index] || "";
}

// "2026-07-27T14:32" -> "Senin, 27 Jul 2026 - 14:32 WIB"
function formatLocalDateTime(isoString, tzAbbrev) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  const dayName = DAY_NAMES[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${dayName}, ${day} ${month} ${year} - ${hh}:${mm}${tzAbbrev ? " " + tzAbbrev : ""}`;
}

// "2026-07-27T05:12" -> "05:12"
function formatHM(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toF(celsius) {
  if (celsius === undefined || celsius === null) return null;
  return Math.round((celsius * 9) / 5 + 32);
}

/** Cari lokasi + cuaca lengkap (saat ini + ringkasan harian) pakai Open-Meteo (gratis, tanpa API key) */
async function getWeather(cityName) {
  try {
    const geoRes = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: cityName, count: 1, language: "id" },
      timeout: 20000,
    });
    const place = geoRes.data?.results?.[0];
    if (!place) return null;

    const weatherRes = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "dew_point_2m",
          "weather_code",
          "surface_pressure",
          "wind_speed_10m",
          "wind_gusts_10m",
          "wind_direction_10m",
          "uv_index",
          "visibility",
        ].join(","),
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "sunrise",
          "sunset",
          "precipitation_probability_max",
        ].join(","),
        wind_speed_unit: "mph", // Biar sesuai output mph yang kamu inginkan
        timezone: "auto",
      },
      timeout: 20000,
    });

    const current = weatherRes.data?.current;
    const daily = weatherRes.data?.daily;
    if (!current) return null;

    // Suhu (skala C & F) + terasa seperti (apparent temperature)
    const tempC = Math.round(current.temperature_2m);
    const tempF = toF(current.temperature_2m);
    const feelsC = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : tempC;
    const feelsF = toF(current.apparent_temperature !== undefined ? current.apparent_temperature : current.temperature_2m);

    // Titik embun
    const dewPointF = current.dew_point_2m !== undefined ? toF(current.dew_point_2m) : "-";

    // Konversi Visibilitas ke Miles (Open-Meteo memberikan meter)
    const visMiles = current.visibility ? Math.round(current.visibility / 1609.34) : "-";

    // Kategori Indeks UV
    const uv = current.uv_index !== undefined ? current.uv_index : 0;
    let uvCategory = "Rendah";
    if (uv >= 3 && uv <= 5) uvCategory = "Sedang";
    else if (uv >= 6 && uv <= 7) uvCategory = "Tinggi";
    else if (uv >= 8 && uv <= 10) uvCategory = "Sangat Tinggi";
    else if (uv >= 11) uvCategory = "Ekstrem";

    // Ringkasan harian: tertinggi/terendah, sunrise/sunset, peluang hujan
    const maxC = daily?.temperature_2m_max?.[0];
    const minC = daily?.temperature_2m_min?.[0];
    const rainChance = daily?.precipitation_probability_max?.[0];

    // Format Lokasi: Klakah, Jawa Timur, Indonesia
    const regionName = place.admin1 ? `, ${place.admin1}` : "";
    const countryName = place.country ? `, ${place.country}` : "";
    const locationStr = `${place.name}${regionName}${countryName}`;

    return {
      location: locationStr,
      localTime: formatLocalDateTime(current.time, weatherRes.data?.timezone_abbreviation),
      condition: WEATHER_CODES[current.weather_code] || "Cerah",
      temperature: tempC,
      tempF: tempF,
      feelsLikeC: feelsC,
      feelsLikeF: feelsF,
      maxC: maxC !== undefined ? Math.round(maxC) : "-",
      maxF: maxC !== undefined ? toF(maxC) : "-",
      minC: minC !== undefined ? Math.round(minC) : "-",
      minF: minC !== undefined ? toF(minC) : "-",
      humidity: current.relative_humidity_2m,
      rainChance: rainChance !== undefined ? rainChance : "-",
      windSpeed: Math.round(current.wind_speed_10m),
      windGust: current.wind_gusts_10m !== undefined ? Math.round(current.wind_gusts_10m) : "-",
      windDir: getWindDirection(current.wind_direction_10m),
      pressure: current.surface_pressure ? `${Math.round(current.surface_pressure)} hPa` : "-",
      visibility: visMiles,
      uv: uv,
      uvCategory: uvCategory,
      dewPoint: dewPointF,
      sunrise: formatHM(daily?.sunrise?.[0]),
      sunset: formatHM(daily?.sunset?.[0]),
    };
  } catch {
    return null;
  }
}

module.exports = { getWeather };
