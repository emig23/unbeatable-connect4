// Runs the AI off the main thread so the page never freezes while it thinks.
import { BasicAI, LEVELS } from './basic-ai.js';

const ai = new BasicAI();

self.onmessage = ({ data }) => {
  if (data.type !== 'move') return;
  const t = performance.now();
  const options = LEVELS[data.level] ?? LEVELS.medium;
  const result = ai.chooseMove(data.moves, options);
  self.postMessage({ id: data.id, ...result, ms: Math.round(performance.now() - t) });
};