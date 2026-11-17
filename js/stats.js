// Win chance for the bar beside the board.

import { Game } from './game.js';
import { BasicAI } from './basic-ai.js';
import { TIMEOUT } from './solver.js';

// How each side plays in the simulations
const SIM_AI = {
  easy: { maxDepth: 2, slack: 6 },
  medium: { maxDepth: 3, slack: 1 },
  unbeatable: { maxDepth: 3, slack: 0 },
};
const SIM_HUMAN = { maxDepth: 2, slack: 4 };

// Turns counts into whole percents that add up to exactly 100
export function toPercents(ai, draw, you) {
  const total = ai + draw + you;
  if (!total) return { ai: 50, draw: 0, you: 50 };
  const raw = [ai, draw, you].map(n => (n * 100) / total);
  const out = raw.map(Math.floor);
  // Hand the leftover points to the largest remainders.
  const order = [0, 1, 2].sort((a, b) => (raw[b] - out[b]) - (raw[a] - out[a]));
  for (let i = 0; i < 100 - out.reduce((a, b) => a + b, 0); i++) out[order[i]]++;
  return { ai: out[0], draw: out[1], you: out[2] };
}

// The true result of the position, or null if the solver runs out of time
export function solvedResult(p, solver, humanPlayer, budgetMs) {
  solver.deadline = performance.now() + budgetMs;
  let score;
  try {
    score = solver.solve(p);
  } catch (e) {
    if (e !== TIMEOUT) throw e;
    return null;
  } finally {
    solver.deadline = 0;
  }
  const m = p.moves;
  const mover = (m % 2) + 1; 
  if (score === 0) return { ai: 0, draw: 100, you: 0, solved: true, winner: 'draw', moves: null };
  const winnerPlayer = score > 0 ? mover : 3 - mover;
  const moves = score > 0 ? 22 - score - Math.floor(m / 2) : 22 + score - Math.ceil(m / 2);
  const winner = winnerPlayer === humanPlayer ? 'you' : 'ai';
  return winner === 'ai'
    ? { ai: 100, draw: 0, you: 0, solved: true, winner, moves }
    : { ai: 0, draw: 0, you: 100, solved: true, winner, moves };
}

export function estimate(moves, { level = 'medium', humanPlayer = 1, budgetMs = 1000, random = Math.random, maxGames = 400 } = {}) {
  const bot = new BasicAI({ random });
  const aiPlayer = 3 - humanPlayer;
  const aiOpts = { ...(SIM_AI[level] ?? SIM_AI.medium), budgetMs: 1e9 };
  const humanOpts = { ...SIM_HUMAN, budgetMs: 1e9 };
  // A finished game has nothing left to simulate
  const start = new Game();
  for (const ch of moves) { if (start.isOver) break; start.play(Number(ch) - 1); }
  if (start.isOver) {
    const w = start.winner;
    return { ...toPercents(w === aiPlayer ? 1 : 0, w ? 0 : 1, w === humanPlayer ? 1 : 0), solved: false, games: 0 };
  }

  const end = performance.now() + budgetMs;
  let ai = 0, draw = 0, you = 0, games = 0;
  while (games < maxGames && (games < 20 || performance.now() < end)) {
    const g = new Game();
    for (const ch of start.moves) g.play(Number(ch) - 1);
    while (!g.isOver) {
      const opts = g.turn === aiPlayer ? aiOpts : humanOpts;
      g.play(bot.chooseMove(g.moves, opts).col);
    }
    if (g.winner === aiPlayer) ai++;
    else if (g.winner === humanPlayer) you++;
    else draw++;
    games++;
  }
  return { ...toPercents(ai, draw, you), solved: false, games };
}