import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AI, Book, Position } from '../js/ai.js';
import { Solver } from '../js/solver.js';
import { Game } from '../js/game.js';

const file = new URL('../js/book.json', import.meta.url);
const haveBook = fs.existsSync(file);
const book = new Book(haveBook ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
const skip = haveBook ? false : 'js/book.json not generated yet';

function seeded(seed) {
  return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}

test('book opens in the center', { skip }, () => {
  assert.equal(book.get(new Position()), 3);
});

test('mirror-image positions get mirror-image moves', { skip }, () => {
  const left = book.get(Position.fromMoves('41'));
  const right = book.get(Position.fromMoves('47'));
  assert.notEqual(left, undefined);
  assert.equal(left, 6 - right);
});

// The main claim: moving first, the AI never loses
test('AI moving first wins every game', { skip, timeout: 900_000 }, () => {
  const ai = new AI({ book, ttSize: 4194301 });
  const checker = new Solver(1048573);
  const rand = seeded(2026);
  for (let n = 0; n < 30; n++) {
    const g = new Game();
    while (!g.isOver) {
      const p = Position.fromMoves(g.moves);
      if (g.turn === 1) {
        const r = ai.chooseMove(p, { budgetMs: 20_000 });
        if (r.method === 'book' && p.moves >= 8 && !p.isWinningMove(r.col)) {
          const q = p.clone(); q.play(r.col);
          assert.equal(checker.solve(q, true), -1, `book move ${r.col + 1} after ${g.moves} doesn't win`);
        }
        g.play(r.col);
        continue;
      }
      const legal = [0, 1, 2, 3, 4, 5, 6].filter(c => g.canPlay(c));
      let choices = legal;
      if (n % 2 === 1) {
        const win = legal.filter(c => p.isWinningMove(c));
        const safe = legal.filter(c => { const q = p.clone(); q.play(c); return !q.canWinNext(); });
        choices = win.length ? win : safe.length ? safe : legal;
      }
      g.play(choices[Math.floor(rand() * choices.length)]);
    }
    assert.equal(g.winner, 1, `game ${n}: ${g.moves}`);
  }
});