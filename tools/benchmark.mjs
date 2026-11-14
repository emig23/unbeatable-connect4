// Measures how fast the solver is at different stages of the game.

import { Position, Solver } from '../js/solver.js';

const perStage = Number(process.argv[2] ?? 50);
const stages = [
  { name: 'End game (moves 28-36)', from: 28, to: 36 },
  { name: 'Middle game (moves 18-27)', from: 18, to: 27 },
  { name: 'Late opening (moves 12-17)', from: 12, to: 17 },
];

let seed = 2026;
const rand = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };

function randomPosition(moves) {
  for (;;) {
    const p = new Position();
    while (p.moves < moves) {
      const ok = [0, 1, 2, 3, 4, 5, 6].filter(c => p.canPlay(c) && !p.isWinningMove(c));
      if (!ok.length) break;
      p.play(ok[rand(ok.length)]);
    }
    if (p.moves === moves) return p;
  }
}

const solver = new Solver();
console.log('| Stage | Positions | Mean time | Max time | Mean positions searched |');
console.log('| --- | --- | --- | --- | --- |');
for (const st of stages) {
  let total = 0, max = 0, nodes = 0;
  for (let i = 0; i < perStage; i++) {
    const p = randomPosition(st.from + rand(st.to - st.from + 1));
    solver.reset();
    const t = performance.now();
    solver.solve(p);
    const ms = performance.now() - t;
    total += ms; max = Math.max(max, ms); nodes += solver.nodes;
  }
  const fmt = ms => (ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`);
  console.log(`| ${st.name} | ${perStage} | ${fmt(total / perStage)} | ${fmt(max)} | ${Math.round(nodes / perStage).toLocaleString('en-US')} |`);
}
