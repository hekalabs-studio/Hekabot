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

// Konversi derajat arah angin ke mata angin singkat
function getWindDirection(degree) {
  if (degree === undefined || degree === null) return "";
  const directions = ["U", "UTL", "TL", "TTL", "T", "TM", "TG", "SBD", "S", "SBD", "BD", "BLD", "B", "BL", "BBU", "UBL"];
  const index = Math.round(degree / 22.5) % 16;
  return directions[index] || "";
}

/** Cari lokasi + cuaca saat ini pakai Open-Meteo (gratis, tanpa API key) */
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
          "dew_point_2m",
          "weather_code",
          "surface_pressure",
          "wind_speed_10m",
          "wind_direction_10m",
          "uv_index",
          "visibility"
        ].join(","),
        wind_speed_unit: "mph", // Biar sesuai output mph yang kamu inginkan
        timezone: "auto",
      },
      timeout: 20000,
    });

    const current = weatherRes.data?.current;
    if (!current) return null;

    // Hitung Suhu dan Titik Embun Fahrenheit
    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((current.temperature_2m * 9/5) + 32);
    const dewPointF = current.dew_point_2m !== undefined ? Math.round((current.dew_point_2m * 9/5) + 32) : "-";

    // Konversi Visibilitas ke Miles (Open-Meteo memberikan meter)
    const visMiles = current.visibility ? Math.round(current.visibility / 1609.34) : "-";

    // Kategori Indeks UV
    const uv = current.uv_index !== undefined ? current.uv_index : 0;
    let uvCategory = "Rendah";
    if (uv >= 3 && uv <= 5) uvCategory = "Sedang";
    else if (uv >= 6 && uv <= 7) uvCategory = "Tinggi";
    else if (uv >= 8 && uv <= 10) uvCategory = "Sangat Tinggi";
    else if (uv >= 11) uvCategory = "Ekstrem";

    // Format Lokasi: Klakah (Jawa Timur)
    const regionName = place.admin1 ? ` (${place.admin1})` : "";
    const locationStr = `${place.name}${regionName}`;

    return {
      location: locationStr,
      condition: WEATHER_CODES[current.weather_code] || "Cerah",
      temperature: tempC,
      tempF: tempF,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windDir: getWindDirection(current.wind_direction_10m),
      pressure: current.surface_pressure ? `${Math.round(current.surface_pressure)} hPa` : "-",
      visibility: visMiles,
      uv: uv,
      uvCategory: uvCategory,
      dewPoint: dewPointF,
    };
  } catch {
    return null;
  }
}

module.exports = { getWeather };