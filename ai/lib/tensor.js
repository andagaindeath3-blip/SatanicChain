const DOMAINS = ['rpc', 'blocks', 'validators', 'tokens', 'swap', 'bridge', 'relayer', 'security'];
const ACTIONS = ['observe', 'score', 'alert', 'suggest', 'automate'];
function emptyGrid() {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => Array.from({ length: 5 }, () => 0))
  );
}
function clamp01(x) {
  if (Number.isNaN(x) || x == null) return 0;
  return Math.max(0, Math.min(1, Number(x)));
}
function domainScore(grid, di) {
  let s = 0, n = 0;
  for (let m = 0; m < 8; m++) { s += grid[di][m][1]; n++; }
  return n ? s / n : 0;
}
function globalScore(grid) {
  let s = 0;
  for (let d = 0; d < 8; d++) s += domainScore(grid, d);
  return s / 8;
}
module.exports = { DOMAINS, ACTIONS, emptyGrid, clamp01, domainScore, globalScore };
