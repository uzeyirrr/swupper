import { TILE_WALL, TILE_EMPTY, TILE_PAINTED, DIRS } from "./constants.js";

export function computePath(grid, gridWidth, gridHeight, ball, dir) {
  const d = DIRS[dir];
  if (!d) return [];

  let cx = ball.x;
  let cy = ball.y;
  const path = [];

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
    path.push({ x: cx, y: cy });
  }

  return path;
}

// Hücreyi boya; boş hücreyse onEmpty callback'ini çağır
export function paintCell(grid, x, y, onEmpty) {
  if (grid[y][x] === TILE_EMPTY) {
    grid[y][x] = TILE_PAINTED;
    onEmpty();
  }
}
