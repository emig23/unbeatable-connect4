// Builds the opening book: the AI's move for every early position it can face.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Position, Solver, COLUMN_ORDER, WIDTH } from '../js/solver.js';

const AI_FIRST_DEPTH = 10;
const HUMAN_FIRST_DEPTH = 1;

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];

if (mode === 'merge') {
  const a = JSON.parse(fs.readFileSync(path.join(here, 'book-ai-first.json'), 'utf8'));
  const h = JSON.parse(fs.readFileSync(path.join(here, 'book-human-first.json'), 'utf8'));
  // Compact format: comma-separated entries, each a base-36 position key
  // followed by one digit, the column to play (0-6).
  const entries = Object.entries({ ...a, ...h }).sort();
  const out = { depth: { aiFirst: AI_FIRST_DEPTH, humanFirst: HUMAN_FIRST_DEPTH }, size: entries.length,
    data: entries.map(([k, c]) => `${k}${c}`).join(',') };
  fs.writeFileSync(path.join(here, '..', 'js', 'book.json'), JSON.stringify(out));
  console.log(`merged ${entries.length} positions into js/book.json`);
  process.exit(0);
}

if (mode !== 'ai-first' && mode !== 'human-first') {
  console.error('usage: node tools/generate-book.mjs ai-first|human-first|merge');
  process.exit(1);
}

const file = path.join(here, `book-${mode}.json`);
const book = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const solver = new Solver();
const started = Date.now();
let lastSave = Date.now(), solved = 0;

function save() {
  fs.writeFileSync(file, JSON.stringify(book));
  lastSave = Date.now();
}

function lookup(p) {
  const k = p.key(), m = p.mirrorKey();
  const v = book[(k <= m ? k : m).toString(36)];
  return v === undefined ? undefined : k <= m ? v : WIDTH - 1 - v;
}
function store(p, c) {
  const k = p.key(), m = p.mirrorKey();
  book[(k <= m ? k : m).toString(36)] = k <= m ? c : WIDTH - 1 - c;
  solved++;
  if (Date.now() - lastSave > 60_000) {
    save();
    console.log(`${((Date.now() - started) / 60000).toFixed(1)} min: ${Object.keys(book).length} positions (ply ${p.moves})`);
  }
}

// Weak result of playing column c, from the mover's view: 1 win, 0 draw, -1 loss.
function result(p, c) {
  if (p.isWinningMove(c)) return 1;
  const q = p.clone(); q.play(c);
  return -solver.solve(q, true);
}

function winningMove(p) {
  for (const c of COLUMN_ORDER) if (p.canPlay(c) && p.isWinningMove(c)) return c;
  for (const c of COLUMN_ORDER) if (p.canPlay(c) && result(p, c) === 1) return c;
  throw new Error('expected a winning position: ' + p.moves);
}

function bestMove(p) {
  let draw = -1, any = -1;
  for (const c of COLUMN_ORDER) {
    if (!p.canPlay(c)) continue;
    if (any < 0) any = c;
    const r = result(p, c);
    if (r === 1) return c;
    if (r === 0 && draw < 0) draw = c;
  }
  return draw >= 0 ? draw : any;
}

const visited = new Set();

function walk(p, pick, maxPly) {
  if (p.moves > maxPly) return;
  const id = Math.min(p.key(), p.mirrorKey());
  if (visited.has(id)) return;
  visited.add(id);

  let c = lookup(p);
  if (c === undefined) { c = pick(p); store(p, c); }
  if (p.isWinningMove(c)) return;
  const q = p.clone(); q.play(c);
  if (q.moves === WIDTH * 6) return;
  for (let h = 0; h < WIDTH; h++) {
    if (!q.canPlay(h) || q.isWinningMove(h)) continue;
    const r = q.clone(); r.play(h);
    walk(r, pick, maxPly);
  }
}

if (mode === 'ai-first') {
  const root = new Position();
  if (lookup(root) === undefined) store(root, 3);
  walk(root, winningMove, AI_FIRST_DEPTH);
} else {
  for (let h = 0; h < WIDTH; h++) {
    const p = new Position(); p.play(h);
    walk(p, bestMove, HUMAN_FIRST_DEPTH);
  }
}

save();
console.log(`done: ${Object.keys(book).length} positions in ${((Date.now() - started) / 60000).toFixed(1)} min`);
