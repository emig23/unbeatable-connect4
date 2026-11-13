// Runs the AI off the main thread so the page never freezes while it thinks
import { BasicAI } from './basic-ai.js';

const ai = new BasicAI();

self.onmessage = ({ data }) => {
  if (data.type !== 'move') return;
  const t = performance.now();
  const result = ai.chooseMove(data.moves, data.options);
  self.postMessage({ id: data.id, ...result, ms: Math.round(performance.now() - t) });
};
