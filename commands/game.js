const { startSession } = require("../lib/gameSession");
const {
  ASAHOTAK,
  TEBAKTEBAKAN,
  TEBAKBENDERA,
  TEBAKKATA,
  SUSUNKATA_WORDS,
  TEBAKPRESIDEN,
  TEBAKPOKEMON,
  KUISISLAMI,
  KUISMTK,
  TERASAURUS,
} = require("../lib/gameData");
const { boards, generateBoard, reveal, checkWin, renderBoard, parseCoord } = require("../lib/minesweeper");

const TIMEOUT_MS = 45000;

/** Command generik: tanya soal dari bank -> nunggu jawaban di chat (tanpa prefix) */
function tebakCommand(name, bank, { title, formatQuestion } = {}) {
  return {
    name,
    run: async ({ jid, sock, reply }) => {
      const item = bank[Math.floor(Math.random() * bank.length)];
      startSession(jid, {
        answer: item.a,
        timeoutMs: TIMEOUT_MS,
        onTimeout: () => reply({ text: `⏰ Waktu habis! Jawabannya: *${item.a}*` }),
      });
      const question = formatQuestion ? formatQuestion(item) : item.q;
      await reply(
        `${title ? `*${title}*\n\n` : ""}${question}\n\n_Jawab langsung di chat ini (${TIMEOUT_MS / 1000} detik). Ketik *nyerah* buat nyerah._`
      );
    },
  };
}

function shuffleWord(word) {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const shuffled = arr.join("");
  return shuffled === word && word.length > 1 ? shuffleWord(word) : shuffled;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==== Ular Tangga (single-player sederhana) ====
const ULARTANGGA_LADDERS = { 3: 16, 7: 20, 13: 25 };
const ULARTANGGA_SNAKES = { 24: 5, 27: 10, 21: 9 };
const ulartanggaPlayers = new Map();

module.exports = [
  // --- 9 game jalan penuh ---
  tebakCommand("asahotak", ASAHOTAK, { title: "🧠 Asah Otak" }),
  tebakCommand("tebaktebakan", TEBAKTEBAKAN, { title: "😂 Tebak-tebakan" }),
  tebakCommand("tebakbendera", TEBAKBENDERA, { title: "🚩 Tebak Bendera", formatQuestion: (item) => `Bendera negara apa ini?\n\n${item.q}` }),
  tebakCommand("tebakkata", TEBAKKATA, { title: "🔤 Tebak Kata", formatQuestion: (item) => `Clue: ${item.q}` }),
  tebakCommand("tebakpresiden", TEBAKPRESIDEN, { title: "🇮🇩 Tebak Presiden", formatQuestion: (item) => `Clue: ${item.q}` }),
  tebakCommand("tebakpokemon", TEBAKPOKEMON, { title: "⚡ Tebak Pokemon", formatQuestion: (item) => `Clue: ${item.q}` }),

  // susunkata - scramble kata
  {
    name: "susunkata",
    run: async ({ jid, sock, reply }) => {
      const word = SUSUNKATA_WORDS[Math.floor(Math.random() * SUSUNKATA_WORDS.length)];
      const scrambled = shuffleWord(word);
      startSession(jid, {
        answer: word,
        timeoutMs: TIMEOUT_MS,
        onTimeout: () => reply({ text: `⏰ Waktu habis! Jawabannya: *${word}*` }),
      });
      await reply(
        `🔤 *Susun Kata*\n\nSusun huruf ini jadi kata yang benar:\n*${scrambled.toUpperCase()}*\n\n_Jawab langsung di chat ini (${TIMEOUT_MS / 1000} detik). Ketik *nyerah* buat nyerah._`
      );
    },
  },

  // terasaurus [Text?] - kelompokkan kata: sinonim, antonim, atau relasi semantik lain (odd one out)
  {
    name: "terasaurus",
    run: async ({ jid, reply }) => {
      const entry = TERASAURUS[Math.floor(Math.random() * TERASAURUS.length)];
      const type = ["sinonim", "antonim", "lain"][Math.floor(Math.random() * 3)];

      let correct;
      let prompt;
      let options;

      if (type === "sinonim") {
        correct = entry.sinonim;
        prompt = `Kata mana yang merupakan *SINONIM* (persamaan makna) dari kata *${entry.word}*?`;
        options = [entry.sinonim, entry.antonim, ...shuffleArray(entry.lain).slice(0, 2)];
      } else if (type === "antonim") {
        correct = entry.antonim;
        prompt = `Kata mana yang merupakan *ANTONIM* (lawan kata) dari kata *${entry.word}*?`;
        options = [entry.antonim, entry.sinonim, ...shuffleArray(entry.lain).slice(0, 2)];
      } else {
        const lainShuffled = shuffleArray(entry.lain);
        correct = lainShuffled[0];
        prompt = `Kata mana yang *TIDAK berhubungan* (bukan sinonim maupun antonim) dengan kata *${entry.word}*?`;
        options = [correct, entry.sinonim, entry.antonim, lainShuffled[1]];
      }

      const shuffledOptions = shuffleArray(options);
      const labels = ["A", "B", "C", "D"];
      const optionText = shuffledOptions.map((opt, i) => `${labels[i]}. ${opt}`).join("\n");

      startSession(jid, {
        answer: correct,
        timeoutMs: TIMEOUT_MS,
        onTimeout: () => reply({ text: `⏰ Waktu habis! Jawabannya: *${correct}*` }),
      });
      await reply(
        `🧩 *Terasaurus*\n\n${prompt}\n\n${optionText}\n\n_Jawab dengan mengetik salah satu KATA pilihan di atas (bukan huruf A/B/C/D). Waktu ${TIMEOUT_MS / 1000} detik. Ketik *nyerah* buat nyerah._`
      );
    },
  },

  // minesweeper [Text] - ".minesweeper" mulai, ".minesweeper B3" buka petak
  {
    name: "minesweeper",
    aliases: ["ms"],
    run: async ({ jid, text, reply }) => {
      if (!text || /^(mulai|start|new|reset)$/i.test(text)) {
        const board = generateBoard(5, 4);
        boards.set(jid, board);
        return reply(`💣 *Minesweeper* dimulai! Grid 5x5, 4 ranjau tersembunyi.\n\nKetik *minesweeper A1* (kolom+baris) buat buka petak.\n\n${renderBoard(board)}`);
      }
      const board = boards.get(jid);
      if (!board) return reply("Belum ada game aktif. Ketik *minesweeper* buat mulai.");
      const coord = parseCoord(text);
      if (!coord || coord.row < 0 || coord.row >= board.size || coord.col < 0 || coord.col >= board.size) {
        return reply("Format koordinat salah. Contoh: *minesweeper B3*");
      }
      reveal(board, coord.row, coord.col);
      if (board.gameOver) {
        boards.delete(jid);
        return reply(`💥 BOOM! Kena ranjau, game over.\n\n${renderBoard(board, true)}`);
      }
      if (checkWin(board)) {
        boards.delete(jid);
        return reply(`🎉 Menang! Semua petak aman berhasil dibuka.\n\n${renderBoard(board, true)}`);
      }
      reply(renderBoard(board));
    },
  },

  // ulartangga [Text] - ".ulartangga" mulai, ".ulartangga roll" lempar dadu
  {
    name: "ulartangga",
    run: async ({ jid, text, reply }) => {
      const cmd = (text || "").trim().toLowerCase();
      if (!ulartanggaPlayers.has(jid) || ["mulai", "start", "reset"].includes(cmd)) {
        ulartanggaPlayers.set(jid, { pos: 0 });
        return reply("🎲 *Ular Tangga* dimulai! Posisi awal: 0/30.\nKetik *ulartangga roll* buat lempar dadu.");
      }
      if (!["roll", "lempar", "main"].includes(cmd)) {
        return reply("Ketik *ulartangga roll* buat lempar dadu, atau *ulartangga mulai* buat reset.");
      }
      const player = ulartanggaPlayers.get(jid);
      const dice = Math.floor(Math.random() * 6) + 1;
      let pos = player.pos + dice;
      let note = "";
      if (ULARTANGGA_LADDERS[pos]) {
        note = ` 🪜 Kena tangga! Naik ke petak ${ULARTANGGA_LADDERS[pos]}.`;
        pos = ULARTANGGA_LADDERS[pos];
      } else if (ULARTANGGA_SNAKES[pos]) {
        note = ` 🐍 Kena ular! Turun ke petak ${ULARTANGGA_SNAKES[pos]}.`;
        pos = ULARTANGGA_SNAKES[pos];
      }
      if (pos >= 30) {
        ulartanggaPlayers.delete(jid);
        return reply(`🎲 Dadu: ${dice}. Posisi: 30/30.${note}\n\n🏆 SELAMAT! Kamu menang!`);
      }
      player.pos = pos;
      reply(`🎲 Dadu: ${dice}. Posisi sekarang: ${pos}/30.${note}`);
    },
  },

  // --- Kuis edukasi (SMA kelas 12) ---
  tebakCommand("kuisislami", KUISISLAMI, { title: "🕌 Kuis Islami (SMA 12)", formatQuestion: (item) => item.q }),
  tebakCommand("kuismtk", KUISMTK, { title: "📐 Kuis Matematika (SMA 12)", formatQuestion: (item) => item.q }),
];
