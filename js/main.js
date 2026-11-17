import { Game, COLS, ROWS } from './game.js';
import { winLabel } from './labels.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const turnEl = document.getElementById('turn');
const undoBtn = document.getElementById('undo');
const newBtn = document.getElementById('new');
const countEl = document.getElementById('ai-count');
const startBtn = document.getElementById('start');
const resultEl = document.getElementById('result');
const resultTitle = document.getElementById('result-title');
const rainEl = document.getElementById('rain');
const againBtn = document.getElementById('again');

const game = new Game();
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

let humanPlayer = 2;   // 1 = moves first
let thinking = false;
let requestId = 0;
let level = 'medium'; // 'easy' | 'medium' | 'unbeatable'
let askedAt = 0;
let started = false; // false until the play button is pressed

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
  col.addEventListener('click', () => humanMove(c));
  boardEl.append(col);
  columns.push({ el: col, cells });
}

function drawStone(c, r, player, animate) {
  const stone = document.createElement('div');
  stone.className = `stone ${player === humanPlayer ? 'p-you' : 'p-ai'}`;
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

// Mark the cell where the next stone would land (for the hover preview).
function markNext() {
  for (let c = 0; c < COLS; c++) {
    const h = game.height(c);
    columns[c].cells.forEach((cell, r) => cell.classList.toggle('next', r === h));
  }
}

function update() {
  const humanTurn = started && !game.isOver && game.turn === humanPlayer && !thinking;
  columns.forEach(({ el }, c) => { el.disabled = !humanTurn || !game.canPlay(c); });
  undoBtn.disabled = thinking || !game.moves.split('').some((_, i) => i % 2 === humanPlayer - 1);
  markNext();

  statusEl.classList.toggle('thinking', thinking);
  if (!started) statusEl.textContent = 'Press play to start';
  else if (game.winner) statusEl.textContent = game.winner === humanPlayer ? 'You win. Well played.' : 'AI wins.';
  else if (game.isDraw) statusEl.textContent = 'Draw.';
  else if (thinking) statusEl.textContent = "AI's turn";
  else statusEl.textContent = 'Your turn';
  // Stone in the turn indicator: whoever moves next (none before play or after the game).
  const playing = started && !game.isOver;
  turnEl.dataset.who = !playing ? 'none' : game.turn === humanPlayer && !thinking ? 'you' : 'ai';
  turnEl.classList.toggle('thinking', thinking);
}

// ---------- moves ----------
function play(c) {
  const player = game.turn;
  const r = game.play(c);
  drawStone(c, r, player, true);
  markWin();
  if (game.isOver) {
    // Let the last stone land before the result pops up.
    const id = requestId;
    setTimeout(() => { if (id === requestId) showResult(); }, 700);
  }
}

function humanMove(c) {
  if (!started || thinking || game.isOver || game.turn !== humanPlayer || !game.canPlay(c)) return;
  play(c);
  if (!game.isOver) askAI();
  update();
}

function askAI() {
  thinking = true;
  update();
  askedAt = performance.now();
  worker.postMessage({ type: 'move', id: ++requestId, moves: game.moves, level });
}

worker.onmessage = ({ data }) => {
  if (data.id !== requestId) return; // stale answer after undo / new game
  // Easy answers almost instantly; wait a moment so the move doesn't feel abrupt.
  const wait = Math.max(0, 500 - (performance.now() - askedAt));
  setTimeout(() => {
    if (data.id !== requestId) return;
    thinking = false;
    countEl.textContent = winLabel(data, game.moves.length);
    play(data.col);
    update();
  }, wait);
};

worker.onerror = () => {
  thinking = false;
  statusEl.textContent = 'The AI failed to load. Reload the page to try again.';
};

// ---------- result popup ----------
function showResult() {
  const outcome = game.isDraw ? 'draw' : game.winner === humanPlayer ? 'win' : 'lose';
  resultTitle.textContent = outcome === 'win' ? 'You win!' : outcome === 'lose' ? 'AI wins' : 'Draw';
  resultEl.className = `result ${outcome}`;
  document.body.classList.toggle('lost', outcome === 'lose');

  // Stones of the winner's color fall through the screen, over and over.
  const colors = outcome === 'win' ? ['you'] : outcome === 'lose' ? ['ai'] : ['you', 'ai'];
  rainEl.replaceChildren();
  for (let i = 0; i < 28; i++) {
    const drop = document.createElement('span');
    drop.className = colors[i % colors.length];
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.setProperty('--s', `${1.5 + Math.random() * 2}rem`);
    drop.style.setProperty('--d', `${2.5 + Math.random() * 2.5}s`);
    drop.style.setProperty('--delay', `${Math.random() * 3}s`);
    rainEl.append(drop);
  }

  resultEl.hidden = false;
  againBtn.focus({ preventScroll: true });
}

function hideResult() {
  resultEl.hidden = true;
  rainEl.replaceChildren();
  document.body.classList.remove('lost');
}

// Play again: same settings, new game right away.
againBtn.addEventListener('click', () => {
  newGame();
  startGame();
});

// ---------- controls ----------
// New game, or a changed setting: clear the board and wait for the play button.
function newGame() {
  requestId++;
  thinking = false;
  started = false;
  startBtn.hidden = false;
  hideResult();
  game.reset();
  countEl.textContent = '';
  redraw();
}

function startGame() {
  humanPlayer = document.querySelector('input[name="first"]:checked').value === 'human' ? 1 : 2;
  level = document.querySelector('input[name="level"]:checked').value;
  started = true;
  startBtn.hidden = true;
  update();
  if (humanPlayer === 2) askAI();
}

undoBtn.addEventListener('click', () => {
  if (thinking) return;
  if (game.moves.length && (game.moves.length % 2 === 0 ? 2 : 1) !== humanPlayer) game.undo();
  game.undo();
  countEl.textContent = '';
  redraw();
});

newBtn.addEventListener('click', newGame);
startBtn.addEventListener('click', startGame);
document.querySelectorAll('input[name="first"], input[name="level"]').forEach(i => i.addEventListener('change', newGame));

document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= COLS) humanMove(n - 1);
});

newGame();