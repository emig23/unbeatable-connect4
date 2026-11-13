export const COLS = 7;
export const ROWS = 6;

export class Game {
  constructor() { this.reset(); }

  // resets board and game state
  reset() {
    this.grid = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
    this.moves = ''; 
    this.winner = 0;
    this.winLine = null;
  }

  get turn() { return (this.moves.length % 2) + 1; }
  get isOver() { return this.winner !== 0 || this.moves.length === COLS * ROWS; }
  get isDraw() { return this.winner === 0 && this.moves.length === COLS * ROWS; }

  height(c) { return this.grid[c].indexOf(0) === -1 ? ROWS : this.grid[c].indexOf(0); }
  canPlay(c) { return !this.isOver && c >= 0 && c < COLS && this.height(c) < ROWS; }

  play(c) {
    if (!this.canPlay(c)) throw new Error(`illegal move: column ${c + 1}`);
    const r = this.height(c), player = this.turn;
    this.grid[c][r] = player;
    this.moves += String(c + 1);
    const line = this.lineThrough(c, r, player);
    if (line) { this.winner = player; this.winLine = line; }
    return r;
  }

  undo() {
    if (!this.moves.length) return;
    const c = Number(this.moves.at(-1)) - 1;
    this.grid[c][this.height(c) - 1] = 0;
    this.moves = this.moves.slice(0, -1);
    this.winner = 0; this.winLine = null;
  }

  // four or more in a row/column/diagnoal 
  lineThrough(c, r, player) {
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [[c, r]];
      for (const s of [1, -1]) {
        let x = c + s * dc, y = r + s * dr;
        while (x >= 0 && x < COLS && y >= 0 && y < ROWS && this.grid[x][y] === player) {
          cells.push([x, y]); x += s * dc; y += s * dr;
        }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }
}
