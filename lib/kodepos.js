/**
 * Cari kode pos Indonesia -- 100% LOKAL/OFFLINE pakai dataset statis dari
 * @damarkuncoro/posindonesia (~80.000+ data kelurahan/desa), gak butuh API luar sama sekali.
 * Support pencarian by nama tempat (kelurahan/kota/dst) ATAU langsung by kode pos 5 digit.
 */
async function searchKodepos(query) {
  const { search, searchByCode } = await import("@damarkuncoro/posindonesia");

  const trimmed = query.trim();
  const isCodeOnly = /^\d{5}$/.test(trimmed);

  const results = isCodeOnly ? await searchByCode(trimmed) : await search(trimmed);
  return (results || []).slice(0, 10);
}

/** Format hasil pencarian jadi teks siap kirim ke WhatsApp */
function formatKodeposResults(results, query) {
  if (!results.length) return `Gak ketemu hasil buat "${query}". Coba nama kelurahan/kecamatan/kota lain, atau kode pos 5 digit.`;

  const lines = results.map(
    (r) =>
      `📮 *${r.postalCode}*\n` +
      `${r.village ? `Kel/Desa: ${r.village}\n` : ""}` +
      `Kec: ${r.district}\n` +
      `Kota/Kab: ${r.city}\n` +
      `Provinsi: ${r.province}`
  );

  return `『 𝗛𝗔𝗦𝗜𝗟 𝗞𝗢𝗗𝗘 𝗣𝗢𝗦 』\n\n${lines.join("\n\n")}`;
}

module.exports = { searchKodepos, formatKodeposResults };
