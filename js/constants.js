export const TILE_EMPTY   = 0;
export const TILE_WALL    = 1;
export const TILE_PAINTED = 2;

export const DIRS = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

export function getDiffLabel(pct) {
  if (pct <= 33) return "Kolay";
  if (pct <= 66) return "Orta";
  return "Zor";
}
