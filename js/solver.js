import { TILE_WALL, TILE_EMPTY, TILE_PAINTED, DIRS } from "./constants.js";

function simulateSlide(grid, fx, fy, dir, gridWidth, gridHeight) {
  const d = DIRS[dir];
  let cx = fx, cy = fy;
  const painted = [];

  while (true) {
    const nx = cx + d.x;
    const ny = cy + d.y;
    if (
      ny < 0 || ny >= gridHeight ||
      nx < 0 || nx >= gridWidth  ||
      grid[ny][nx] === TILE_WALL
    ) break;
    cx = nx;
    cy = ny;
    if (grid[cy][cx] === TILE_EMPTY) {
      painted.push({ x: cx, y: cy });
    }
  }

  return { endX: cx, endY: cy, painted };
}

// Greedy DFS: once en cok boyayan yonu dene, sikisirsa backtrack yap.
// Ayni (pozisyon, kalan bos) durumunu tekrar ziyaret etme.
export function solve(grid, ballX, ballY, gridWidth, gridHeight) {
  const g    = grid.map(row => [...row]);
  const dirs = ["up", "down", "left", "right"];

  let remaining = 0;
  for (let y = 0; y < gridHeight; y++)
    for (let x = 0; x < gridWidth; x++)
      if (g[y][x] === TILE_EMPTY) remaining++;

  if (remaining === 0) return [];

  const solution = [];
  const visited  = new Set();

  function dfs(x, y, rem) {
    if (rem === 0) return true;

    const key = x + y * gridWidth + rem * gridWidth * gridHeight;
    if (visited.has(key)) return false;
    visited.add(key);

    const candidates = [];
    for (const dir of dirs) {
      const r = simulateSlide(g, x, y, dir, gridWidth, gridHeight);
      if (r.endX === x && r.endY === y) continue;
      candidates.push({ dir, endX: r.endX, endY: r.endY, painted: r.painted });
    }

    candidates.sort((a, b) => b.painted.length - a.painted.length);

    for (const c of candidates) {
      for (const p of c.painted) g[p.y][p.x] = TILE_PAINTED;
      solution.push(c.dir);

      if (dfs(c.endX, c.endY, rem - c.painted.length)) return true;

      for (const p of c.painted) g[p.y][p.x] = TILE_EMPTY;
      solution.pop();
    }

    visited.delete(key);
    return false;
  }

  dfs(ballX, ballY, remaining);
  return solution;
}
