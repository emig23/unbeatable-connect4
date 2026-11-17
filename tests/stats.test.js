import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPercents, solvedResult, estimate } from '../js/stats.js';
import { movesUntilWin } from '../js/labels.js';
import { Position, Solver } from '../js/solver.js';

function seeded(seed) {
  return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}

test('percents always add up to 100', () => {
  for (const [a, d, y] of [[1, 1, 1], [2, 0, 1], [7, 3, 0], [0, 0, 5], [33, 33, 34], [1, 2, 4]]) {
    const p = toPercents(a, d, y);
    assert.equal(p.ai + p.draw + p.you, 100, `${a} ${d} ${y}`);
  }
  assert.deepEqual(toPercents(0, 0, 0), { ai: 50, draw: 0, you: 50 });
});

test('solved result names the right winner and move count', () => {
  const solver = new Solver(1048573);
  const p = Position.fromMoves('4455');
  assert.deepEqual(solvedResult(p, solver, 1, 5000), { ai: 0, draw: 0, you: 100, solved: true, winner: 'you', moves: 2 });
  assert.deepEqual(solvedResult(p, solver, 2, 5000), { ai: 100, draw: 0, you: 0, solved: true, winner: 'ai', moves: 2 });
  assert.equal(solvedResult(Position.fromMoves('463735345353636156155664171'), solver, 1, 5000).winner, 'draw');
});

test('solved result gives up when out of time', () => {
  const solver = new Solver(1048573);
  assert.equal(solvedResult(new Position(), solver, 1, 20), null);
});

// After the AI moves, the bar (computed for the new position) and the
// "N moves until AI wins" label must show the same number.
test('bar and label agree on moves left', () => {
  const solver = new Solver(1048573);
  let checked = 0;

  for (const game of ['445335542266311', '3443552266117', '4433221155667']) {
    for (let k = 8; k <= game.length; k++) {
      const p = Position.fromMoves(game.slice(0, k));
      if (!p || p.canWinNext()) continue;
      const exact = solver.analyze(p);
      const best = Math.max(...exact.filter(v => v !== null));
      if (best <= 0) continue;
      const col = exact.indexOf(best);
      const n = movesUntilWin({ col, method: 'solver', exact }, p.moves);
      const q = p.clone(); q.play(col);
      const aiPlayer = (p.moves % 2) + 1;
      const bar = solvedResult(q, solver, 3 - aiPlayer, 5000);
      assert.equal(bar.winner, 'ai', game.slice(0, k));
      assert.equal(bar.moves, n - 1, game.slice(0, k));
      checked++;
    }
  }
  assert.ok(checked >= 3, `only ${checked} positions checked`);
});

test('estimate returns percents from simulated games', () => {
  const r = estimate('44', { level: 'easy', humanPlayer: 1, budgetMs: 200, random: seeded(3), maxGames: 30 });
  assert.equal(r.ai + r.draw + r.you, 100);
  assert.equal(r.solved, false);
  assert.ok(r.games >= 20, `only ${r.games} games`);
});

test('estimate sees a lost position as lost', () => {
  const r = estimate('121212', { level: 'medium', humanPlayer: 1, budgetMs: 200, random: seeded(5), maxGames: 30 });
  assert.equal(r.you, 100);
});