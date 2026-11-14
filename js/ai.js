// Chooses the AI's move.

import { Position, Solver, TIMEOUT, COLUMN_ORDER, WIDTH } from './solver.js';
import { BasicAI } from './basic-ai.js';

export class Book {
  constructor(json) {
    this.map = new Map();
    for (const item of json?.data ? json.data.split(',') : []) {
      this.map.set(item.slice(0, -1), Number(item.slice(-1)));
    }
  }
  get size() { return this.map.size; }
  get(p) {
    const k = p.key(), m = p.mirrorKey();
    const col = this.map.get((k <= m ? k : m).toString(36));
    if (col === undefined) return undefined;
    return k <= m ? col : WIDTH - 1 - col; // mirror the answer back
  }
}

export class AI {
  constructor({ ttSize, book = new Book() } = {}) {
    this.book = book;
    this.solver = new Solver(ttSize);
    this.fallback = new BasicAI();
  }

  chooseMove(p, { budgetMs = 2500, fallbackMs = 1000, solverFrom = 6 } = {}) {
    const playable = COLUMN_ORDER.filter(c => p.canPlay(c));

    for (const c of playable) {
      if (p.isWinningMove(c)) return { col: c, method: 'win' };
    }

    const fromBook = this.book.get(p);
    if (fromBook !== undefined && p.canPlay(fromBook)) {
      return { col: fromBook, method: 'book', weak: null, exact: null };
    }

    if (p.moves < solverFrom) {
      const { col } = this.fallback.chooseMove(p.history, { budgetMs: fallbackMs });
      return { col, method: 'heuristic', weak: null, exact: null };
    }

    const s = this.solver;
    s.deadline = performance.now() + budgetMs;
    const weak = new Array(WIDTH).fill(null);
    let complete = true;
    try {
      for (const c of playable) {
        const q = p.clone(); q.play(c);
        weak[c] = -s.solve(q, true);
        // When winning early on, the first winning move found is enough:
        // any move that keeps a forced win will eventually win.
        if (weak[c] === 1 && p.moves < 12) break;
      }
    } catch (e) {
      if (e !== TIMEOUT) { s.deadline = 0; throw e; }
      complete = false;
    }

    const known = playable.filter(c => weak[c] !== null);
    const bestClass = known.length ? Math.max(...known.map(c => weak[c])) : null;

    if (bestClass === 1 || complete) {
      // Refine with exact scores: fastest win / slowest loss.
      const cands = known.filter(c => weak[c] === bestClass);
      let pick = cands[0], exact = null;
      try {
        const scores = new Array(WIDTH).fill(null);
        for (const c of cands) {
          const q = p.clone(); q.play(c);
          scores[c] = -s.solve(q, false);
        }
        exact = scores;
        for (const c of cands) if (scores[c] > scores[pick]) pick = c;
      } catch (e) {
        if (e !== TIMEOUT) { s.deadline = 0; throw e; }
      }
      s.deadline = 0;
      return { col: pick, method: 'solver', weak, exact };
    }

    s.deadline = 0;
    if (bestClass === 0) {
      return { col: known.find(c => weak[c] === 0), method: 'solver', weak, exact: null };
    }
    const unknown = playable.filter(c => weak[c] === null);
    const { col } = this.fallback.chooseMove(movesOf(p), {
      budgetMs: fallbackMs, allowed: unknown.length ? unknown : playable,
    });
    return { col, method: 'heuristic', weak, exact: null };
  }
}

// The basic AI works from the move list; keep it alongside the position.
function movesOf(p) { return p.history; }

export { Position };