// AI: negamax with alpha-beta pruning on the plain board.

import { Game, COLS, ROWS } from './game.js';

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN = 100000;

const WINDOWS = [];
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < ROWS; r++) {
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [0, 1, 2, 3].map(i => [c + i * dc, r + i * dr]);
      if (cells.every(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS)) WINDOWS.push(cells);
    }
  }
}

// Score from the point of view of `player 
export function evaluate(game, player) {
  const opp = 3 - player;
  let score = 0;
  for (const cells of WINDOWS) {
    let mine = 0, theirs = 0;
    for (const [x, y] of cells) {
      const v = game.grid[x][y];
      if (v === player) mine++; else if (v === opp) theirs++;
    }
    if (mine && theirs) continue; 
    if (mine === 3) score += 5; else if (mine === 2) score += 2;
    if (theirs === 3) score -= 5; else if (theirs === 2) score -= 2;
  }
  for (let r = 0; r < ROWS; r++) {
    if (game.grid[3][r] === player) score += 3; else if (game.grid[3][r] === opp) score -= 3;
  }
  return score;
}

export class BasicAI {
  constructor() { this.nodes = 0; }

  negamax(game, depth, alpha, beta) {
    this.nodes++;
    if (game.winner) return -(WIN - game.moves.length);
    if (game.isDraw) return 0;
    if (depth === 0) return evaluate(game, game.turn);
    if (performance.now() > this.deadline) throw TIMEOUT;

    let best = -Infinity;
    for (const c of ORDER) {
      if (!game.canPlay(c)) continue;
      game.play(c);
      const score = -this.negamax(game, depth - 1, -beta, -alpha);
      game.undo();
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break; 
    }
    return best;
  }

  chooseMove(moves, { budgetMs = 1000, maxDepth = 42 } = {}) {
    const game = new Game();
    for (const ch of moves) game.play(Number(ch) - 1);
    this.nodes = 0;
    this.deadline = performance.now() + budgetMs;

    let bestCol = ORDER.find(c => game.canPlay(c)), depthReached = 0;
    for (let depth = 1; depth <= Math.min(maxDepth, 42 - game.moves.length); depth++) {
      try {
        let best = -Infinity, col = bestCol, alpha = -Infinity;
        for (const c of ORDER) {
          if (!game.canPlay(c)) continue;
          game.play(c);
          const score = -this.negamax(game, depth - 1, -Infinity, -alpha);
          game.undo();
          if (score > best) { best = score; col = c; }
          if (score > alpha) alpha = score;
        }
        bestCol = col; depthReached = depth;
        if (best >= WIN - 42) break; 
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        while (game.moves.length > moves.length) game.undo();
        break;
      }
    }
    return { col: bestCol, depth: depthReached, nodes: this.nodes };
  }
}

const TIMEOUT = new Error('timeout');
