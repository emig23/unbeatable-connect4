// Runs the AI off the main thread so the page never freezes while it thinks.

import { BasicAI, LEVELS } from './basic-ai.js';
import { AI, Book, Position } from './ai.js';

const basic = new BasicAI();
let solverAI = null; // created on first use: its cache takes ~20 MB

// The opening book loads in the background as soon as the page opens.
const book = fetch(new URL('./book.json', import.meta.url))
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null)
  .then(json => new Book(json));

self.onmessage = async ({ data }) => {
  if (data.type !== 'move') return;
  const t = performance.now();
  let result;
  if (data.level === 'unbeatable') {
    // ~4M-entry transposition table (~20 MB).
    solverAI ??= new AI({ ttSize: 4194301, book: await book });
    result = solverAI.chooseMove(Position.fromMoves(data.moves));
  } else {
    result = basic.chooseMove(data.moves, LEVELS[data.level] ?? LEVELS.medium);
  }
  self.postMessage({ id: data.id, ...result, ms: Math.round(performance.now() - t) });
};