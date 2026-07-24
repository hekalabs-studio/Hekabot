// State minesweeper per-chat (in-memory)
const boards = new Map(); // jid -> board

function idx(size, row, col) {
  return row * size + col;
}

function generateBoard(size = 5, mineCount = 4) {
  const totalCells = size * size;
  const mines = new Set();
  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * totalCells));
  }
  return { size, mines, revealed: new Set(), gameOver: false };
}

function countAdjacent(board, row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < board.size && c >= 0 && c < board.size && board.mines.has(idx(board.size, r, c))) count++;
    }
  }
  return count;
}

function reveal(board, row, col) {
  const i = idx(board.size, row, col);
  if (board.revealed.has(i)) return;
  board.revealed.add(i);
  if (board.mines.has(i)) {
    board.gameOver = true;
    return;
  }
  if (countAdjacent(board, row, col) === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < board.size && c >= 0 && c < board.size) reveal(board, r, c);
      }
    }
  }
}

function checkWin(board) {
  const totalSafe = board.size * board.size - board.mines.size;
  return board.revealed.size === totalSafe;
}

function renderBoard(board, revealAll = false) {
  const numberEmoji = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
  const colLabels = "ABCDEFGHIJ".slice(0, board.size);
  let out = "    " + [...colLabels].join("  ") + "\n";
  for (let r = 0; r < board.size; r++) {
    let row = `${r + 1}  `;
    for (let c = 0; c < board.size; c++) {
      const i = idx(board.size, r, c);
      if (revealAll && board.mines.has(i)) row += "💣 ";
      else if (board.revealed.has(i)) row += numberEmoji[countAdjacent(board, r, c)] + " ";
      else row += "⬛";
    }
    out += row + "\n";
  }
  return out;
}

function parseCoord(text) {
  const m = String(text).trim().toUpperCase().match(/^([A-J])\s*-?\s*(\d{1,2})$/);
  if (!m) return null;
  return { col: m[1].charCodeAt(0) - 65, row: parseInt(m[2], 10) - 1 };
}

module.exports = { boards, generateBoard, reveal, checkWin, renderBoard, parseCoord };
