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
];

const DOWNLOADER_MENU = [
  ["capcutdl", "[Link]"],
  ["fbdl", "[Link]"],
  ["igdl", "[Link]"],
  ["pinterestdl", "[Link]"],
  ["play", "[Text]"],
  ["play2", "[Text]"],
  ["scribddl", "[Link]"],
  ["slidesharedl", "[Link]"],
  ["telesticker", "[Link]"],
  ["threads", "[Link]"],
  ["ttmp3", "[Link]"],
  ["ttmp4", "[Link]"],
  ["ttslide", "[Link]"],
  ["twitter", "[Link]"],
  ["ytmp3", "[Link]"],
  ["ytmp4", "[Link]"],
];

const TOOLS_MENU = [
  ["cekbillpln", "[Text]"],
  ["cutmp3", "[Audio, Text]"],
  ["drivelink", "[Text]"],
  ["hdr", "[Image]"],
  ["hdrv2", "[Image, Text]"],
  ["hdrv3", "[Image, Text]"],
  ["infodevice", ""],
  ["iqc", "[Text]"],
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
  ["todocx", "[Doc]"],
  ["toexcel", "[Doc]"],
  ["togif", "[Video]"],
  ["toimg", "[Sticker]"],
  ["tojpg", "[Image]"],
  ["tomp3", "[Video]"],
  ["topdf", "[Doc]"],
  ["topng", "[Image]"],
  ["topptx", "[Doc]"],
  ["tourl", "[Media]"],
  ["tovcf", "[Text]"],
  ["tovn", "[Audio]"],
  ["towebp", "[Image]"],
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
  ["alkitab", "[Text]"],
  ["cuaca", "[Text]"],
  ["ai", "[Text]"],
  ["resetai", "[Text]"],
  ["kbbi", "[Text]"],
  ["lirik", "[Text]"],
  ["pinterest", "[Text]"],
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
  return name.padEnd(13, " ");
}

function buildSection(title, items) {
  let text = `╭╸ ꗃ ˖ 𖦆 « *${title}* » ⌕\n`;
  for (const [name, type] of items) {
    text += ` | » \`\`\`${pad(name)}\`\`\` ${type}\n`;
  }
  text += `╰┄ ────────────`;
  return text;
}

function totalFitur() {
  return (
    MAIN_MENU.length +
    DOWNLOADER_MENU.length +
    TOOLS_MENU.length +
    CONVERTER_MENU.length +
    STICKER_MENU.length +
    FUN_MENU.length +
    GAME_MENU.length +
    INTERNET_MENU.length +
    GROUP_MENU.length
  );
}

function buildMenu() {
  const info =
    `━━[ *${config.botName}* ✓ ]━━\n` +
    `『 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧 』\n` +
    `\`\`\`• Nama Bot   :\`\`\` ${config.botName}\n` +
    `\`\`\`• Kode Bot   :\`\`\` ${config.botCode}\n` +
    `\`\`\`• Nama Owner :\`\`\` ${config.ownerName}\n` +
    `\`\`\`• Nomor Owner:\`\`\` ${config.ownerNumber}\n` +
    `\`\`\`• Instagram  :\`\`\` ${config.instagram}\n` +
    `\`\`\`• Total Fitur:\`\`\` ${totalFitur()}\n`;

  return (
    info +
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

module.exports = {
  buildMenu,
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
