const config = require("../config");

const MAIN_MENU = [
  ["bot", ""],
  ["daftar", "[Text]"],
  ["database", ""],
  ["deleteuser", "[Text]"],
  ["hapusakun", "[Text?]"],
  ["help", ""],
  ["list", ""],
  ["menu", ""],
  ["owner", ""],
  ["ping", ""],
  ["profile", ""],
  ["resource", ""],
  ["runtime", "[Text]"],
  ["speedtest", ""],
  ["status", "[Text]"],
  ["support", ""],
];

const DOWNLOADER_MENU = [
  ["capcutdl", "[Link]"],
  ["fbdl", "[Link]"],
  ["igdl", "[Link]"],
  ["igslide", "[Link]"],
  ["pinterestdl", "[Link]"],
  ["play", "[Text]"],
  ["telesticker", "[Link]"],
  ["threads", "[Link]"],
  ["ttmp3", "[Link]"],
  ["ttmp4", "[Link]"],
  ["ttslide", "[Link]"],
  ["xdl", "[Link]"],
  ["ytmp3", "[Link]"],
  ["ytmp4", "[Link]"],
];

const TOOLS_MENU = [
  ["cekbillpln", "[Text]"],
  ["cekdevice", "[Text]"],
  ["cutmp3", "[Audio, Text]"],
  ["drivelink", "[Text]"],
  ["hdr", "[Image]"],
  ["iqc", "[Text]"],
  ["infodevice", ""],
  ["kalkukator", "[Text]"],
  ["kodepos", "[Text]"],
  ["ocr", "[Image]"],
  ["readmore", "[Text]"],
  ["recolor", "[Image]"],
  ["removebg", "[Image]"],
  ["ytfull", "[Text]"],
  ["yttranscript", "[Link]"],
];

const CONVERTER_MENU = [
  ["compresspdf", "[Doc]"],
  ["mergepdf", "[Doc, Text]"],
  ["splitpdf", "[Doc, Text]"],
  ["topdf", "[Doc]"],
  ["todocx", "[Doc]"],
  ["toexcel", "[Doc]"],
  ["topptx", "[Doc]"],
  ["togif", "[Video/Sticker]"],
  ["tomp3", "[Video]"],
  ["tomp4", "[Sticker]"],
  ["toimg", "[Sticker]"],
  ["topng", "[Image]"],
  ["tojpg", "[Image]"],
  ["towebp", "[Image]"],
  ["tourl", "[Media]"],
  ["tovcf", "[Text]"],
  ["tovn", "[Audio]"],
];

const STICKER_MENU = [
  ["brat", "[Text]"],
  ["bratvid", "[Text]"],
  ["qc", "[Text]"],
  ["smeme", "[Image, Text]"],
  ["squote", "[Image, Text]"],
  ["sticker", "[Image]"],
  ["swm", "[Image, Text]"],
  ["take", "[Sticker, Text]"],
];

const FUN_MENU = [
  ["caripacar", "[Text?]"],
  ["cekjodoh", "[Text]"],
  ["cekkodam", "[Text]"],
  ["darkjokes", ""],
  ["dreamworld", "[Text]"],
  ["fufufafa", "[Text?]"],
  ["jadian", ""],
  ["menfess", "[Text]"],
  ["quotes", "[Text]"],
  ["rate", "[Text]"],
  ["soulmatch", "[Text]"],
  ["taugasih", ""],
  ["top", "[Text]"],
];

const GAME_MENU = [
  ["asahotak", "[Text]"],
  ["kuisislami", "[Text?]"],
  ["kuismtk", "[Text?]"],
  ["minesweeper", "[Text]"],
  ["susunkata", "[Text?]"],
  ["tebakbendera", "[Text?]"],
  ["tebakkata", "[Text?]"],
  ["tebakpokemon", "[Text]"],
  ["tebakpresiden", "[Text?]"],
  ["tebaktebakan", "[Text?]"],
  ["terasaurus", "[Text?]"],
  ["ulartangga", "[Text]"],
];

const INTERNET_MENU = [
  ["ai", "[Text]"],
  ["resetai", "[Text]"],
  ["solve", "[Image, Text?]"],
  ["jadwalsalat", "[Text]"],
  ["alkitab", "[Text]"],
  ["alquran", "[Text]"],
  ["cuaca", "[Text]"],
  ["kbbi", "[Text]"],
  ["lirik", "[Text]"],
  ["openverse", "[Text]"],
  ["wikipedia", "[Text]"],
];

const GROUP_MENU = [
  ["clearchat", "[Owner]"],
  ["kick", "[Text/Reply/Mention]"],
  ["promote", "[Text/Reply/Mention]"],
  ["demote", "[Text/Reply/Mention]"],
  ["mute", ""],
  ["unmute", ""],
  ["tagall", "[Text]"],
  ["hidetag", "[Text]"],
  ["linkgrup", ""],
];

function pad(name) {
  return name.padEnd(14, " ");
}

function buildSection(title, items) {
  let text = `╭╸ ꗃ ˖ 𖦆 « *${title}* » ⌕\n`;
  for (const [name, type] of items) {
    text += ` | » \`\`\`${pad(config.prefix + name)}\`\`\` ${type}\n`;
  }
  text += `╰┄ ────────────`;
  return text;
}

function totalFitur() {
  return (
    MAIN_MENU.length +
    INTERNET_MENU.length +
    CONVERTER_MENU.length +
    DOWNLOADER_MENU.length +
    STICKER_MENU.length +
    TOOLS_MENU.length +
    FUN_MENU.length +
    GAME_MENU.length +
    GROUP_MENU.length
  );
}

function buildInfo() {
  return (
    `━━[ *${config.botName}* ✓ ]━━\n` +
    `『 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧 』\n` +
    `\`\`\`• Nama Bot   :\`\`\` ${config.botName}\n` +
    `\`\`\`• Kode Bot   :\`\`\` ${config.botCode}\n` +
    `\`\`\`• Nama Owner :\`\`\` ${config.ownerName}\n` +
    `\`\`\`• Nomor Owner:\`\`\` ${config.ownerNumber}\n` +
    `\`\`\`• Instagram  :\`\`\` ${config.instagram}\n` +
    `\`\`\`• Total Fitur:\`\`\` ${totalFitur()}\n`
  );
}

function buildMenu() {
  return (
    buildInfo() +
    "\n" +
    buildSection("MAIN MENU", MAIN_MENU) +
    "\n" +
    buildSection("DOWNLOADER MENU", DOWNLOADER_MENU) +
    "\n" +
    buildSection("TOOLS MENU", TOOLS_MENU) +
    "\n" +
    buildSection("CONVERTER MENU", CONVERTER_MENU) +
    "\n" +
    buildSection("STICKER MENU", STICKER_MENU) +
    "\n" +
    buildSection("FUN MENU", FUN_MENU) +
    "\n" +
    buildSection("GAME MENU", GAME_MENU) +
    "\n" +
    buildSection("INTERNET MENU", INTERNET_MENU) +
    "\n" +
    buildSection("GROUP MENU", GROUP_MENU)
  );
}

// Daftar kategori menu terpisah -- tiap kategori punya "key" dan beberapa alias
// singkatan biar gampang dipanggil (misal .menudl buat downloader).
const MENU_CATEGORIES = [
  { key: "main", title: "MAIN MENU", items: MAIN_MENU, aliases: ["menumain", "menumn"] },
  { key: "downloader", title: "DOWNLOADER MENU", items: DOWNLOADER_MENU, aliases: ["menudl", "menudownload", "menudownloader"] },
  { key: "tools", title: "TOOLS MENU", items: TOOLS_MENU, aliases: ["menutl", "menutool", "menutools"] },
  { key: "converter", title: "CONVERTER MENU", items: CONVERTER_MENU, aliases: ["menucv", "menuconv", "menuconverter"] },
  { key: "sticker", title: "STICKER MENU", items: STICKER_MENU, aliases: ["menust", "menusticker", "menusr"] },
  { key: "fun", title: "FUN MENU", items: FUN_MENU, aliases: ["menufun", "menufn"] },
  { key: "game", title: "GAME MENU", items: GAME_MENU, aliases: ["menugame", "menugm"] },
  { key: "internet", title: "INTERNET MENU", items: INTERNET_MENU, aliases: ["menunet", "menuinternet", "menuit"] },
  { key: "group", title: "GROUP MENU", items: GROUP_MENU, aliases: ["menugc", "menugroup", "menugrup"] },
];

// Map alias (huruf kecil, tanpa prefix) -> kategori, dibentuk otomatis dari MENU_CATEGORIES di atas.
const MENU_ALIAS_MAP = {};
for (const cat of MENU_CATEGORIES) {
  for (const alias of cat.aliases) {
    MENU_ALIAS_MAP[alias] = cat;
  }
}

/**
 * Bangun teks menu untuk satu kategori aja (dipanggil pakai alias, misal "menudl").
 * Tetap nampilin info bot di atas biar konsisten sama tampilan .menu biasa.
 */
function buildCategoryMenu(key) {
  const cat = MENU_CATEGORIES.find((c) => c.key === key);
  if (!cat) return null;
  return buildInfo() + "\n" + buildSection(cat.title, cat.items);
}

/**
 * Cari kategori menu berdasarkan alias (case-insensitive, tanpa prefix).
 * Return null kalau alias-nya bukan alias menu kategori manapun.
 */
function resolveMenuAlias(alias) {
  return MENU_ALIAS_MAP[alias.toLowerCase()] || null;
}

module.exports = {
  buildMenu,
  buildCategoryMenu,
  resolveMenuAlias,
  MENU_CATEGORIES,
  MAIN_MENU,
  DOWNLOADER_MENU,
  TOOLS_MENU,
  CONVERTER_MENU,
  STICKER_MENU,
  FUN_MENU,
  GAME_MENU,
  INTERNET_MENU,
  GROUP_MENU,
  totalFitur,
};
