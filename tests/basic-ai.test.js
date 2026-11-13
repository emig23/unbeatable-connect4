import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BasicAI } from '../js/basic-ai.js';
import { Game } from '../js/game.js';

const ai = new BasicAI();

test('takes an immediate win', () => {
  assert.equal(ai.chooseMove('121212').col, 0); 
});

test('blocks the opponent\'s immediate win', () => {
  assert.equal(ai.chooseMove('12131').col, 0); 
});

test('beats a random player', () => {
  let seed = 7;
  const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0; i < 10; i++) {
    const g = new Game();
    while (!g.isOver) {
      if (g.turn === 1) g.play(ai.chooseMove(g.moves, { budgetMs: 200 }).col);
      else {
        const legal = [0, 1, 2, 3, 4, 5, 6].filter(c => g.canPlay(c));
        g.play(legal[rand(legal.length)]);
      }
    }
    assert.equal(g.winner, 1, g.moves);
  }
});
