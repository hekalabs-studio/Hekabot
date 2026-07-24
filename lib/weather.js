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

/** Cari lokasi + cuaca saat ini pakai Open-Meteo (gratis, tanpa API key) */
async function getWeather(cityName) {
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
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      timezone: "auto",
    },
    timeout: 20000,
  });
  const current = weatherRes.data?.current;
  if (!current) return null;

  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    condition: WEATHER_CODES[current.weather_code] || "Tidak diketahui",
  };
}

module.exports = { getWeather };
