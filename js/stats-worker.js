// Works out the win chance in the background, separately from the AI's own
// worker, so it never slows down the AI's moves.

import { Position, Solver } from './solver.js';
import { estimate, solvedResult } from './stats.js';

// A smaller cache than the AI's (~5 MB): this worker only solves one
// position at a time.
const solver = new Solver(1048573);

self.onmessage = ({ data }) => {
  const { id, moves, level, humanPlayer } = data;
  const p = Position.fromMoves(moves);
  if (!p) return;

  // When the unbeatable AI moves first it can't lose: no need to simulate.
  const certain = level === 'unbeatable' && humanPlayer === 2;

  const solved = solvedResult(p, solver, humanPlayer, p.moves >= 10 ? 1500 : 300);
  if (solved) { self.postMessage({ id, ...solved }); return; }

  if (certain) { self.postMessage({ id, ai: 100, draw: 0, you: 0, solved: false }); return; }
  self.postMessage({ id, ...estimate(moves, { level, humanPlayer, budgetMs: 1000 }) });
};