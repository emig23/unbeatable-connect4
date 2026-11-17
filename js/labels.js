// How many more AI moves until it wins, counting the move it is about to
// play, or null when that isn't known.

export function movesUntilWin({ col, method, exact }, m) {
  if (method === 'win') return 1;
  if (exact?.[col] > 0) return 22 - exact[col] - Math.floor(m / 2);
  return null;
}

export function winLabel(result, m) {
  const n = movesUntilWin(result, m);
  if (n === null || n <= 1) return '';
  const left = n - 1;
  return `${left} ${left === 1 ? 'move' : 'moves'} until AI wins`;
}