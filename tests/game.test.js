import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';

function playAll(seq) {
  const g = new Game();
  for (const ch of seq) g.play(Number(ch) - 1);
  return g;
}

test('detects wins in all four directions', () => {
  const cases = {
    horizontal: '1122334',
    vertical: '1212121',
    diagonal: '12234334744',
    antiDiagonal: '76654554144',
  };
  for (const [name, seq] of Object.entries(cases)) {
    const g = playAll(seq);
    assert.equal(g.winner, 1, name);
    assert.equal(g.winLine.length, 4, name);
  }
});

test('no winner for three in a row', () => {
  const g = playAll('112233');
  assert.equal(g.winner, 0);
  assert.equal(g.isOver, false);
});

test('rejects moves in a full column and after the game ends', () => {
  const g = playAll('444444');
  assert.equal(g.canPlay(3), false);
  assert.throws(() => g.play(3));
  const won = playAll('1212121');
  assert.equal(won.canPlay(4), false);
});

test('a full board with no four in a row is a draw', () => {
  const g = playAll('121212' + '212121' + '343434' + '434343' + '565656' + '656565' + '777777');
  assert.equal(g.winner, 0);
  assert.equal(g.isDraw, true);
});

test('undo restores the previous state', () => {
  const g = playAll('1212121');
  g.undo();
  assert.equal(g.winner, 0);
  assert.equal(g.moves, '121212');
  assert.equal(g.canPlay(0), true);
});
