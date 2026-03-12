import { getDiffLabel } from "./constants.js";
import { easeOutBack } from "./utils.js";
import { generateLevel } from "./generator.js";
import { computePath, paintCell } from "./movement.js";
import { InputHandler } from "./input.js";
import { Renderer } from "./renderer.js";
import { playSlide, playHit, playPaint, playStart, playWin } from "./audio.js";

const canvas     = document.getElementById("game-canvas");
const seedLabel  = document.getElementById("seed-label");
const movesLabel = document.getElementById("moves-label");
const diffBadge  = document.getElementById("diff-badge");
const diffSlider = document.getElementById("difficulty");
const btnRestart = document.getElementById("btn-restart");
const btnNewSeed = document.getElementById("btn-new-seed");

const renderer = new Renderer(canvas);

const PARTICLE_COLORS = [
  "#ffb84d", "#ff9736", "#ff6b6b", "#ffe066", "#ffffff", "#ff4757",
];

const state = {
  grid:           [],
  gridWidth:      9,
  gridHeight:     15,
  ball: {
    x: 0, y: 0,
    px: 0, py: 0,
    tx: 0, ty: 0,
    t: 1,
    speed: 11,
    path: [],
    paintedSteps: 0,
  },
  moves:          0,
  emptyCount:     0,
  moving:         false,
  difficulty:     50,
  seed:           1,
  particles:      [],
  cellAnimations: new Map(), // Map<cellKey, startTimeMs>
};

function loadLevel(seed, difficulty) {
  const result = generateLevel(seed, difficulty);

  state.grid           = result.grid;
  state.gridWidth      = result.gridWidth;
  state.gridHeight     = result.gridHeight;
  state.emptyCount     = result.emptyCount;
  state.seed           = seed;
  state.difficulty     = difficulty;
  state.moves          = 0;
  state.moving         = false;
  state.particles      = [];
  state.cellAnimations = new Map();

  const b = state.ball;
  b.x = b.tx = b.px = result.ballX;
  b.y = b.ty = b.py = result.ballY;
  b.t            = 1;
  b.path         = [];
  b.paintedSteps = 0;

  seedLabel.textContent  = result.seed ?? seed;
  movesLabel.textContent = "0";
  diffBadge.innerHTML    = getDiffLabel(difficulty) + " &nbsp;" + difficulty + "%";
  diffSlider.value       = difficulty;

  doPaintCell(result.ballX, result.ballY);
  playStart();
}

function doPaintCell(x, y) {
  paintCell(state.grid, x, y, () => {
    state.cellAnimations.set(y * state.gridWidth + x, performance.now());
    playPaint();
    state.emptyCount--;
    if (state.emptyCount <= 0) {
      playWin();
      setTimeout(() => {
        newSeed();
      }, 1200);
    }
  });
}

function spawnParticles(gx, gy) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.6;
    const speed = 2 + Math.random() * 3.5;
    state.particles.push({
      gx:    gx + 0.5,
      gy:    gy + 0.5,
      vgx:   Math.cos(angle) * speed,
      vgy:   Math.sin(angle) * speed,
      life:  1,
      decay: 1.8 + Math.random() * 1.2,
      size:  0.07 + Math.random() * 0.06,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    });
  }
}

function tryMove(dir) {
  if (state.moving) return;

  const { ball, grid, gridWidth, gridHeight } = state;
  const path = computePath(grid, gridWidth, gridHeight, ball, dir);
  if (path.length === 0) return;

  playSlide();

  ball.px = ball.x;
  ball.py = ball.y;
  ball.tx = path[path.length - 1].x;
  ball.ty = path[path.length - 1].y;
  ball.t            = 0;
  ball.path         = path;
  ball.paintedSteps = 0;

  state.moving = true;
  state.moves++;
  movesLabel.textContent = state.moves;
}

function resetLevel() { loadLevel(state.seed, state.difficulty); }
function newSeed()     { loadLevel(Date.now() & 0xffff, state.difficulty); }

new InputHandler(canvas, tryMove);
btnRestart.addEventListener("click", resetLevel);
btnNewSeed.addEventListener("click", newSeed);
diffSlider.addEventListener("input", () => {
  loadLevel(state.seed, parseInt(diffSlider.value, 10));
});

window.addEventListener("resize", () => renderer.resize());
renderer.resize();

let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (state.moving) {
    const { ball } = state;
    const dist      = Math.hypot(ball.tx - ball.px, ball.ty - ball.py);
    const dynSpeed  = ball.speed + dist * 1.8;
    const totalTime = dist / dynSpeed;

    if (totalTime > 0) {
      ball.t += dt / totalTime;

      const linearT      = Math.max(0, Math.min(1, ball.t));
      const easedT       = easeOutBack(linearT);
      const stepsToPaint = Math.floor(easedT * ball.path.length);

      while (ball.paintedSteps < stepsToPaint) {
        const cell = ball.path[ball.paintedSteps];
        doPaintCell(cell.x, cell.y);
        ball.paintedSteps++;
      }

      if (ball.t >= 1) {
        ball.t = 1;
        ball.x = ball.tx;
        ball.y = ball.ty;
        while (ball.paintedSteps < ball.path.length) {
          const cell = ball.path[ball.paintedSteps];
          doPaintCell(cell.x, cell.y);
          ball.paintedSteps++;
        }
        state.moving = false;
        spawnParticles(ball.x, ball.y);
        playHit();
      }
    } else {
      state.moving = false;
      spawnParticles(state.ball.x, state.ball.y);
      playHit();
    }
  }

  // Partikülleri güncelle
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.gx   += p.vgx * dt;
    p.gy   += p.vgy * dt;
    p.vgx  *= 0.88;
    p.vgy  *= 0.88;
    p.life -= p.decay * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Süresi dolmuş kare animasyonlarını temizle
  const CELL_ANIM_DUR = 280;
  for (const [key, startTime] of state.cellAnimations) {
    if (now - startTime > CELL_ANIM_DUR) state.cellAnimations.delete(key);
  }

  renderer.render(state, now);
  requestAnimationFrame(loop);
}

loadLevel(1, 50);
requestAnimationFrame(loop);
