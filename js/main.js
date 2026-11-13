import { Game, COLS, ROWS } from './game.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const undoBtn = document.getElementById('undo');
const newBtn = document.getElementById('new');

const game = new Game();
const NAMES = { 1: 'Yellow', 2: 'White' };

// ---------- board ----------
const columns = [];
for (let c = 0; c < COLS; c++) {
  const col = document.createElement('button');
  col.type = 'button';
  col.className = 'col';
  col.setAttribute('aria-label', `Column ${c + 1}`);
  const cells = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    col.append(cell);
    cells[r] = cell;
  }
  col.addEventListener('click', () => move(c));
  boardEl.append(col);
  columns.push({ el: col, cells });
}

function drawStone(c, r, player, animate) {
  const stone = document.createElement('div');
  stone.className = `stone ${player === 1 ? 'p-you' : 'p-ai'}`;
  if (animate) {
    const fall = ROWS - r; 
    stone.style.setProperty('--fall', fall);
    stone.style.setProperty('--t', `${140 + 40 * fall}ms`);
    stone.classList.add('drop');
  }
  columns[c].cells[r].append(stone);
}

function redraw() {
  for (const { cells } of columns) for (const cell of cells) cell.replaceChildren();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) if (game.grid[c][r]) drawStone(c, r, game.grid[c][r], false);
  }
  markWin();
  update();
}

function markWin() {
  if (!game.winLine) return;
  for (const [c, r] of game.winLine) columns[c].cells[r].querySelector('.stone')?.classList.add('win');
}

function update() {
  columns.forEach(({ el, cells }, c) => {
    el.disabled = !game.canPlay(c);
    const h = game.height(c);
    cells.forEach((cell, r) => cell.classList.toggle('next', r === h)); // hover preview
  });
  undoBtn.disabled = game.moves.length === 0;

  if (game.winner) statusEl.textContent = `${NAMES[game.winner]} wins.`;
  else if (game.isDraw) statusEl.textContent = 'Draw.';
  else statusEl.textContent = `${NAMES[game.turn]} to move`;
}

// ---------- moves ----------
function move(c) {
  if (!game.canPlay(c)) return;
  const player = game.turn;
  const r = game.play(c);
  drawStone(c, r, player, true);
  markWin();
  update();
}

undoBtn.addEventListener('click', () => { game.undo(); redraw(); });
newBtn.addEventListener('click', () => { game.reset(); redraw(); });

document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= COLS) move(n - 1);
});

redraw();
