import { TILE_WALL, TILE_EMPTY } from "./constants.js";
import { createRng } from "./rng.js";
import { solve } from "./solver.js";

const MAZE_DIRS = [
  { dx:  0, dy: -1 },
  { dx:  1, dy:  0 },
  { dx:  0, dy:  1 },
  { dx: -1, dy:  0 },
];

const SLIDE_DIRS = [
  { x:  0, y: -1 },
  { x:  0, y:  1 },
  { x: -1, y:  0 },
  { x:  1, y:  0 },
];

// difficulty: 0-100 arasi yuzde
//
// 5 parametre surekli interpolasyon ile degisir:
//   gridWidth:    5 → 13     (maze genisligi)
//   gridHeight:   9 → 21     (maze yuksekligi)
//   loopChance:   0.50 → 0   (ekstra gecit orani; acik alan vs saf labirent)
//   wallRemove:   0.12 → 0   (rastgele duvar kaldirma; kolay = daha acik)
//   deadEndFill:  0 → 0.30   (cikmazlari kapatma; zor = daha fazla strateji)
//
// Grid boyutlari her zaman tek sayi olmali (maze algoritmasi gerekliligi)
function buildConfig(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;

  const rawW = 7 + t * 6;
  const rawH = 11 + t * 10;
  const gridWidth  = Math.floor(rawW / 2) * 2 + 1;
  const gridHeight = Math.floor(rawH / 2) * 2 + 1;

  const loopChance   = 0.45 * (1 - t);
  const wallRemove   = 0.10 * (1 - t);
  const deadEndFill  = 0.30 * t;

  return { gridWidth, gridHeight, loopChance, wallRemove, deadEndFill };
}

// Sliding BFS: topun kayan mekaniğiyle boyanabilecek tüm hücreleri bulur.
// Ulaşılamayan EMPTY hücreler WALL'a çevrilir; düzeltilmiş emptyCount döner.
//
// Neden gerekli: recursive backtracking maze bile sliding mekaniğiyle
// çözümsüz olabilir. Örneğin, uzun bir yatay koridor boyunca top hiç
// duraksızca kayarsa, koridorun ortasındaki dikey dallara asla giremez.
// Klasik flood-fill bu durumu yakalamazken sliding BFS yakalar.
function enforceSlideReachability(grid, gridWidth, gridHeight, startX, startY) {
  const key = (x, y) => y * gridWidth + x;

  // painted: topun geçerek boyayabileceği tüm hücreler
  // stops:   topun durduğu (bir sonraki hamlede başlangıç olabilecek) konumlar
  const painted = new Set();
  const stops   = new Set();
  const queue   = [];

  painted.add(key(startX, startY));
  stops.add(key(startX, startY));
  queue.push({ x: startX, y: startY });

  while (queue.length > 0) {
    const pos = queue.shift();

    for (const d of SLIDE_DIRS) {
      let cx = pos.x;
      let cy = pos.y;

      // Duvara ya da sınıra çarpana kadar kay, geçilen hücreleri işaretle
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
        painted.add(key(cx, cy));
      }

      const sk = key(cx, cy);
      if (!stops.has(sk)) {
        stops.add(sk);
        queue.push({ x: cx, y: cy });
      }
    }
  }

  // Boyanamayanları WALL yap; bu güvenlidir çünkü:
  // painted dışındaki bir hücreden hiçbir sliding yolu geçmiyor,
  // dolayısıyla o hücreyi WALL yapmak diğer hücrelerin erişimini değiştirmez.
  let emptyCount = 0;
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (grid[y][x] !== TILE_WALL) {
        if (!painted.has(key(x, y))) {
          grid[y][x] = TILE_WALL;
        } else {
          emptyCount++;
        }
      }
    }
  }
  return emptyCount;
}

const MAX_SOLVABLE_TRIES = 80;

function generateLevelWithSeed(trySeed, difficulty) {
  const { gridWidth, gridHeight, loopChance, wallRemove, deadEndFill } =
    buildConfig(difficulty);
  const rng = createRng(trySeed);

  const grid = [];
  for (let y = 0; y < gridHeight; y++) {
    grid.push(new Array(gridWidth).fill(TILE_WALL));
  }

  const mazeW = Math.floor((gridWidth  - 1) / 2);
  const mazeH = Math.floor((gridHeight - 1) / 2);

  const visited = Array.from({ length: mazeH }, () =>
    new Array(mazeW).fill(false)
  );

  const startMX = Math.floor(rng.next() * mazeW);
  const startMY = Math.floor(rng.next() * mazeH);

  visited[startMY][startMX] = true;
  grid[1 + startMY * 2][1 + startMX * 2] = TILE_EMPTY;

  const stack = [{ mx: startMX, my: startMY }];

  while (stack.length > 0) {
    const { mx, my } = stack[stack.length - 1];

    const dirs = MAZE_DIRS.slice();
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
    }

    let carved = false;
    for (const d of dirs) {
      const nx = mx + d.dx;
      const ny = my + d.dy;
      if (nx < 0 || nx >= mazeW || ny < 0 || ny >= mazeH || visited[ny][nx]) continue;
      visited[ny][nx] = true;
      grid[1 + my * 2 + d.dy][1 + mx * 2 + d.dx] = TILE_EMPTY;
      grid[1 + ny * 2][1 + nx * 2] = TILE_EMPTY;
      stack.push({ mx: nx, my: ny });
      carved = true;
      break;
    }
    if (!carved) stack.pop();
  }

  // --- Kolay: ekstra gecitler (donguler) ---
  if (loopChance > 0) {
    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        if (grid[y][x] !== TILE_WALL) continue;
        const horizOk =
          x > 1 && x < gridWidth  - 2 &&
          grid[y][x - 1] === TILE_EMPTY &&
          grid[y][x + 1] === TILE_EMPTY;
        const vertOk =
          y > 1 && y < gridHeight - 2 &&
          grid[y - 1][x] === TILE_EMPTY &&
          grid[y + 1][x] === TILE_EMPTY;
        if ((horizOk || vertOk) && rng.next() < loopChance) {
          grid[y][x] = TILE_EMPTY;
        }
      }
    }
  }

  // --- Kolay: rastgele duvar kaldirma (daha acik alan) ---
  if (wallRemove > 0) {
    for (let y = 2; y < gridHeight - 2; y++) {
      for (let x = 2; x < gridWidth - 2; x++) {
        if (grid[y][x] !== TILE_WALL) continue;
        let adjEmpty = 0;
        if (grid[y - 1][x] === TILE_EMPTY) adjEmpty++;
        if (grid[y + 1][x] === TILE_EMPTY) adjEmpty++;
        if (grid[y][x - 1] === TILE_EMPTY) adjEmpty++;
        if (grid[y][x + 1] === TILE_EMPTY) adjEmpty++;
        if (adjEmpty >= 2 && rng.next() < wallRemove) {
          grid[y][x] = TILE_EMPTY;
        }
      }
    }
  }

  // --- Zor: cikmazlari kapatma (strateji zorlugu) ---
  if (deadEndFill > 0) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 1; y < gridHeight - 1; y++) {
        for (let x = 1; x < gridWidth - 1; x++) {
          if (grid[y][x] !== TILE_EMPTY) continue;
          const gx = 1 + startMX * 2;
          const gy = 1 + startMY * 2;
          if (x === gx && y === gy) continue;

          let wallNeighbors = 0;
          if (grid[y - 1][x] === TILE_WALL) wallNeighbors++;
          if (grid[y + 1][x] === TILE_WALL) wallNeighbors++;
          if (grid[y][x - 1] === TILE_WALL) wallNeighbors++;
          if (grid[y][x + 1] === TILE_WALL) wallNeighbors++;

          if (wallNeighbors >= 3 && rng.next() < deadEndFill) {
            grid[y][x] = TILE_WALL;
            changed = true;
          }
        }
      }
    }
  }

  const ballX = 1 + startMX * 2;
  const ballY = 1 + startMY * 2;

  const emptyCount = enforceSlideReachability(grid, gridWidth, gridHeight, ballX, ballY);

  return { grid, gridWidth, gridHeight, ballX, ballY, emptyCount };
}

export function generateLevel(seed, difficulty) {
  let lastResult = null;
  for (let i = 0; i < MAX_SOLVABLE_TRIES; i++) {
    const trySeed = seed + i;
    const result = generateLevelWithSeed(trySeed, difficulty);
    lastResult = result;
    const gridCopy = result.grid.map(row => [...row]);
    const solution = solve(gridCopy, result.ballX, result.ballY, result.gridWidth, result.gridHeight);
    if (solution.length > 0) {
      return { ...result, seedUsed: trySeed };
    }
  }
  return { ...lastResult, seedUsed: seed + MAX_SOLVABLE_TRIES - 1 };
}
