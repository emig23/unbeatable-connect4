import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movesUntilWin, winLabel } from '../js/labels.js';
import { Position, Solver } from '../js/solver.js';

test('no count known: empty label', () => {
  for (const result of [
    { col: 3, method: 'book' },
    { col: 2, depth: 9 },
    { col: 1, method: 'heuristic' },
    { col: 4, method: 'solver', exact: [null, null, null, null, 0, null, null] },  // draw
    { col: 4, method: 'solver', exact: [null, null, null, null, -3, null, null] }, // losing
  ]) {
    assert.equal(winLabel(result, 10), '', JSON.stringify(result));
  }
});

test('immediate win says 1 move', () => {
  assert.equal(winLabel({ col: 0, method: 'win' }, 6), '1 move until AI wins');
});

// Check the count against real games
test('the count matches the number of AI moves to the win', () => {
  const solver = new Solver(1048573);
  for (const seq of ['4455', '64365566766442314', '466252652452777175273']) {
    const p = Position.fromMoves(seq);
    const exact = solver.analyze(p);
    const best = exact.indexOf(Math.max(...exact.filter(v => v !== null)));
    const n = movesUntilWin({ col: best, method: 'solver', exact }, p.moves);

    // Both sides play perfectly
    const q = p.clone();
    let aiMoves = 0;
    for (;;) {
      const scores = solver.analyze(q);
      const c = scores.indexOf(Math.max(...scores.filter(v => v !== null)));
      if ((q.moves - p.moves) % 2 === 0) aiMoves++;
      if (q.isWinningMove(c)) break;
      q.play(c);
    }
    assert.equal(aiMoves, n, seq);
  }
});