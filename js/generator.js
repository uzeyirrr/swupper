import { TILE_WALL, TILE_EMPTY } from "./constants.js";
import { createRng } from "./rng.js";

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

// difficulty: 0-100 arası yüzde
// 0 → küçük grid + çok döngü (kolay), 100 → büyük grid + saf labirent (zor)
function buildConfig(pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const gridWidth  = 7  + Math.round(t * 2) * 2; // 7 → 9 → 11
  const gridHeight = 11 + Math.round(t * 4) * 2; // 11 → 15 → 19
  const loopChance = 0.4 * (1 - t);              // 0.4 → 0
  return { gridWidth, gridHeight, loopChance };
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

export function generateLevel(seed, difficulty) {
  const { gridWidth, gridHeight, loopChance } = buildConfig(difficulty);
  const rng = createRng(seed);

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

  // Iteratif DFS (recursive backtracking)
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
      grid[1 + my * 2 + d.dy][1 + mx * 2 + d.dx] = TILE_EMPTY; // geçit duvarını aç
      grid[1 + ny * 2][1 + nx * 2] = TILE_EMPTY;                 // hedef hücreyi aç
      stack.push({ mx: nx, my: ny });
      carved = true;
      break;
    }
    if (!carved) stack.pop();
  }

  // Kolay zorlukta ekstra geçitler: maze'e döngüler katarak daha açık alan oluştur
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

  const ballX = 1 + startMX * 2;
  const ballY = 1 + startMY * 2;

  // Sliding BFS ile garanti: sadece gerçekten kayan top ile boyanabilecek
  // hücreler hayatta kalır; geri kalanlar WALL'a çevrilir.
  const emptyCount = enforceSlideReachability(grid, gridWidth, gridHeight, ballX, ballY);

  return { grid, gridWidth, gridHeight, ballX, ballY, emptyCount };
}
