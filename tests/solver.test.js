import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Position, Solver } from '../js/solver.js';
import { AI } from '../js/ai.js';

const solver = new Solver(1048573);

// Positions (columns played, 1-based) and their exact scores
// Positive: the player to move wins; the bigger, the sooner.
// Zero: draw. Negative: the player to move loses.
const KNOWN = [
  ['4455', 18],
  ['64365566766442314', 13],
  ['466252652452777175273', 11],
  ['75752435335465151672632', 10],
  ['4322344551551454527664126161', 7],
  ['316166165266533337544523174272', 6],
  ['463735345353636156155664171', 0],
];

test('exact scores match the reference solver', () => {
  for (const [seq, score] of KNOWN) {
    solver.reset();
    assert.equal(solver.solve(Position.fromMoves(seq)), score, seq);
  }
});

test('weak solve returns the sign of the exact score', () => {
  for (const [seq, score] of KNOWN) {
    solver.reset();
    assert.equal(solver.solve(Position.fromMoves(seq), true), Math.sign(score), seq);
  }
});

test('fromMoves rejects illegal sequences and finished games', () => {
  assert.equal(Position.fromMoves('4444444'), null); // column overflow
  assert.equal(Position.fromMoves('1212121'), null); // already won
  assert.equal(Position.fromMoves('8'), null);
});

test('AI takes a win and blocks a loss', () => {
  const ai = new AI({ ttSize: 1048573 });
  assert.equal(ai.chooseMove(Position.fromMoves('121212')).col, 0);
  assert.equal(ai.chooseMove(Position.fromMoves('12131')).col, 0);
});

test('AI uses the fallback search in the first moves', () => {
  const ai = new AI({ ttSize: 1048573 });
  assert.equal(ai.chooseMove(new Position(), { fallbackMs: 100 }).method, 'heuristic');
});

test('AI falls back to heuristic search when out of time', () => {
  const ai = new AI({ ttSize: 1048573 });
  const r = ai.chooseMove(Position.fromMoves('4433'), { budgetMs: 50, fallbackMs: 100, solverFrom: 0 });
  assert.equal(r.method, 'heuristic');
  assert.ok(r.col >= 0 && r.col < 7);
});