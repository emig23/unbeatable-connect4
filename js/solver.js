// Perfect Connect 4 solver.

export const WIDTH = 7;
export const HEIGHT = 6;
const H1 = HEIGHT + 1;
const CELLS = WIDTH * HEIGHT;
export const MIN_SCORE = -(CELLS / 2) + 3; // -18
export const MAX_SCORE = ((CELLS + 1) >> 1) - 3; // 18

const LO_MASK = 0x0fffffff; // 28 bits
const HI_MASK = 0x1fffff; // 21 bits
const BOTTOM_LO = 1 | (1 << 7) | (1 << 14) | (1 << 21);
const BOTTOM_HI = 1 | (1 << 7) | (1 << 14);
const BOARD_LO = BOTTOM_LO * 63;
const BOARD_HI = BOTTOM_HI * 63;

// Per-column masks, as [lo, hi] pairs.
const COL_LO = new Int32Array(WIDTH);
const COL_HI = new Int32Array(WIDTH);
const TOP_LO = new Int32Array(WIDTH);
const TOP_HI = new Int32Array(WIDTH);
const BOT_LO = new Int32Array(WIDTH);
const BOT_HI = new Int32Array(WIDTH);
for (let c = 0; c < WIDTH; c++) {
  const s = 7 * (c < 4 ? c : c - 4);
  const col = 63 << s, top = 1 << (s + HEIGHT - 1), bot = 1 << s;
  if (c < 4) { COL_LO[c] = col; TOP_LO[c] = top; BOT_LO[c] = bot; }
  else { COL_HI[c] = col; TOP_HI[c] = top; BOT_HI[c] = bot; }
}

// Center columns first: they take part in the most possible lines.
export const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

// ---- small 49-bit helpers (results returned through SL/SH) ----
let SL = 0, SH = 0;
function shl(lo, hi, s) {
  SH = ((hi << s) | (lo >>> (28 - s))) & HI_MASK;
  SL = (lo << s) & LO_MASK;
}
function shr(lo, hi, s) {
  SL = ((lo >>> s) | (hi << (28 - s))) & LO_MASK;
  SH = hi >>> s;
}

function popcount(x) {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

// Cells (empty, on the board) that would complete four-in-a-row for the
// stones in (pl, ph). Result in WL/WH
let WL = 0, WH = 0;
function winning(pl, ph, ml, mh) {
  // Vertical: never crosses the lo/hi split (the sentinel row is in the way).
  let rl = (pl << 1) & (pl << 2) & (pl << 3);
  let rh = (ph << 1) & (ph << 2) & (ph << 3);
  for (let i = 0; i < 3; i++) {
    const d = i === 0 ? H1 : i === 1 ? HEIGHT : H1 + 1; // horizontal, two diagonals
    shl(pl, ph, d); const a1l = SL, a1h = SH;
    shl(pl, ph, 2 * d); const a2l = SL, a2h = SH;
    shl(pl, ph, 3 * d); const a3l = SL, a3h = SH;
    shr(pl, ph, d); const b1l = SL, b1h = SH;
    shr(pl, ph, 2 * d); const b2l = SL, b2h = SH;
    shr(pl, ph, 3 * d); const b3l = SL, b3h = SH;
    let ql = a1l & a2l, qh = a1h & a2h;
    rl |= (ql & a3l) | (ql & b1l); rh |= (qh & a3h) | (qh & b1h);
    ql = b1l & b2l; qh = b1h & b2h;
    rl |= (ql & a1l) | (ql & b3l); rh |= (qh & a1h) | (qh & b3h);
  }
  WL = rl & (BOARD_LO ^ ml);
  WH = rh & (BOARD_HI ^ mh);
}

// ---- Position ----
// cl/ch = stones of the player to move, ml/mh = all stones.
export class Position {
  constructor() { this.cl = 0; this.ch = 0; this.ml = 0; this.mh = 0; this.moves = 0; this.history = ''; }

  static fromMoves(seq) {
    const p = new Position();
    for (const ch of String(seq)) {
      const c = Number(ch) - 1;
      if (!(c >= 0 && c < WIDTH) || !p.canPlay(c) || p.isWinningMove(c)) return null;
      p.play(c);
    }
    return p;
  }

  clone() {
    const p = new Position();
    p.cl = this.cl; p.ch = this.ch; p.ml = this.ml; p.mh = this.mh; p.moves = this.moves; p.history = this.history;
    return p;
  }

  canPlay(c) { return ((this.ml & TOP_LO[c]) | (this.mh & TOP_HI[c])) === 0; }

  play(c) {
    this.cl ^= this.ml; this.ch ^= this.mh;
    this.ml |= (this.ml + BOT_LO[c]) & COL_LO[c] | 0;
    this.mh |= (this.mh + BOT_HI[c]) & COL_HI[c] | 0;
    this.moves++;
    this.history += c + 1; 
  }

  isWinningMove(c) {
    winning(this.cl, this.ch, this.ml, this.mh);
    const pl = (this.ml + BOTTOM_LO) & BOARD_LO, ph = (this.mh + BOTTOM_HI) & BOARD_HI;
    return ((WL & pl & COL_LO[c]) | (WH & ph & COL_HI[c])) !== 0;
  }

  canWinNext() {
    winning(this.cl, this.ch, this.ml, this.mh);
    const pl = (this.ml + BOTTOM_LO) & BOARD_LO, ph = (this.mh + BOTTOM_HI) & BOARD_HI;
    return ((WL & pl) | (WH & ph)) !== 0;
  }

  // Unique 49-bit key. kl < 2^28, kh < 2^21.
  keyLo() { return this.cl + this.ml; }
  keyHi() { return this.ch + this.mh; }
  
  mirrorKey() {
    let k = 0;
    for (let c = 0; c < WIDTH; c++) {
      const src = WIDTH - 1 - c;
      const s = 7 * (src < 4 ? src : src - 4);
      const bits = src < 4 ? ((this.cl + this.ml) >>> s) & 127 : ((this.ch + this.mh) >>> s) & 127;
      k += bits * 2 ** (7 * c);
    }
    return k;
  }
  key() { return this.keyHi() * 2 ** 28 + this.keyLo(); }
  // Key that is the same for a position and its mirror image.
  symKey() { return Math.min(this.key(), this.mirrorKey()); }
}

// ---- Transposition table ----
class TransTable {
  constructor(size) {
    this.size = size;
    this.keys = new Uint32Array(size);
    this.vals = new Int8Array(size);
  }
  reset() { this.keys.fill(0); this.vals.fill(0); }
  put(kl, kh, v) {
    const i = (kh * 268435456 + kl) % this.size;
    this.keys[i] = (kl | (kh << 28)) >>> 0;
    this.vals[i] = v;
  }
  get(kl, kh) {
    const i = (kh * 268435456 + kl) % this.size;
    return this.keys[i] === ((kl | (kh << 28)) >>> 0) ? this.vals[i] : 0;
  }
}

const DEFAULT_TT_SIZE = 8388593;


export const TIMEOUT = new Error('search timed out');

export class Solver {
  constructor(ttSize = DEFAULT_TT_SIZE) {
    this.tt = new TransTable(ttSize);
    this.nodes = 0;
    this.deadline = 0;
    // Scratch arrays for move sorting, one slot of 7 per search depth.
    this.mvL = new Int32Array(CELLS * WIDTH);
    this.mvH = new Int32Array(CELLS * WIDTH);
    this.mvS = new Int32Array(CELLS * WIDTH);
  }

  reset() { this.tt.reset(); this.nodes = 0; }

  negamax(cl, ch, ml, mh, moves, alpha, beta) {
    if ((++this.nodes & 0x3fff) === 0 && this.deadline && performance.now() > this.deadline) {
      throw TIMEOUT;
    }

    // Moves that don't hand the opponent an immediate win.
    const pl = (ml + BOTTOM_LO) & BOARD_LO, ph = (mh + BOTTOM_HI) & BOARD_HI;
    winning(cl ^ ml, ch ^ mh, ml, mh);
    const oppL = WL, oppH = WH;
    let nl = pl, nh = ph;
    const fl = pl & oppL, fh = ph & oppH; // forced: must block these
    if (fl | fh) {
      if ((fl & (fl - 1)) | (fh & (fh - 1)) | (fl && fh ? 1 : 0)) {
        return -((CELLS - moves) >> 1); // two threats: we lose next move
      }
      nl = fl; nh = fh;
    }
    nl &= ~(oppL >>> 1); nh &= ~(oppH >>> 1); // don't play under an enemy threat
    if ((nl | nh) === 0) return -((CELLS - moves) >> 1);
    if (moves >= CELLS - 2) return 0; // draw

    const min = -((CELLS - 2 - moves) >> 1);
    if (alpha < min) { alpha = min; if (alpha >= beta) return alpha; }
    let max = (CELLS - 1 - moves) >> 1;
    const kl = cl + ml, kh = ch + mh;
    const val = this.tt.get(kl, kh);
    if (val) max = val + MIN_SCORE - 1;
    if (beta > max) { beta = max; if (alpha >= beta) return beta; }

    // Order moves: most new threats first, ties broken center-first.
    const base = moves * WIDTH;
    let n = 0;
    for (let i = 0; i < WIDTH; i++) {
      const c = COLUMN_ORDER[i];
      const mvl = nl & COL_LO[c], mvh = nh & COL_HI[c];
      if ((mvl | mvh) === 0) continue;
      winning(cl | mvl, ch | mvh, ml, mh);
      const sc = popcount(WL) + popcount(WH);
      let j = n++;
      while (j > 0 && this.mvS[base + j - 1] < sc) {
        this.mvS[base + j] = this.mvS[base + j - 1];
        this.mvL[base + j] = this.mvL[base + j - 1];
        this.mvH[base + j] = this.mvH[base + j - 1];
        j--;
      }
      this.mvS[base + j] = sc; this.mvL[base + j] = mvl; this.mvH[base + j] = mvh;
    }

    for (let i = 0; i < n; i++) {
      const mvl = this.mvL[base + i], mvh = this.mvH[base + i];
      const score = -this.negamax(cl ^ ml, ch ^ mh, ml | mvl, mh | mvh, moves + 1, -beta, -alpha);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    this.tt.put(kl, kh, alpha - MIN_SCORE + 1);
    return alpha;
  }

  // Exact score of a position for the player to move:
  //   > 0: wins; the larger, the sooner (score = (43 - moves at win) / 2 style)
  //   = 0: draw
  //   < 0: loses
  // With weak = true, only the sign (-1, 0, 1) is computed, which is faster.
  solve(p, weak = false) {
    if (p.canWinNext()) return weak ? 1 : (CELLS + 1 - p.moves) >> 1;
    let min = -((CELLS - p.moves) >> 1);
    let max = (CELLS + 1 - p.moves) >> 1;
    if (weak) { min = -1; max = 1; }
    while (min < max) {
      let med = min + ((max - min) >> 1);
      const halfMin = Math.trunc(min / 2), halfMax = Math.trunc(max / 2);
      if (med <= 0 && halfMin < med) med = halfMin;
      else if (med >= 0 && halfMax > med) med = halfMax;
      const r = this.negamax(p.cl, p.ch, p.ml, p.mh, p.moves, med, med + 1);
      if (r <= med) max = r; else min = r;
    }
    return weak ? Math.sign(min) : min;
  }

  // Score of every column from the mover's point of view 
  analyze(p, weak = false) {
    const scores = new Array(WIDTH).fill(null);
    for (let c = 0; c < WIDTH; c++) {
      if (!p.canPlay(c)) continue;
      if (p.isWinningMove(c)) { scores[c] = (CELLS + 1 - p.moves) >> 1; continue; }
      const q = p.clone(); q.play(c);
      scores[c] = -this.solve(q, weak);
    }
    return scores;
  }
}