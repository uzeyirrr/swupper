import { getDiffLabel } from "./constants.js";
import { easeOutBack } from "./utils.js";
import { generateLevel } from "./generator.js";
import { computePath, paintCell } from "./movement.js";
import { InputHandler } from "./input.js";
import { Renderer } from "./renderer.js";
import { playSlide, playHit, playPaint, playStart, playWin } from "./audio.js";
import { state } from "./state.js";
import { spawnParticles, updateParticles } from "./particles.js";
import {
  initHints, resetHints, isAutoSolving, cancelAuto,
  hintNextMove, startAutoSolve, doNextStep,
} from "./hints.js";

const canvas     = document.getElementById("game-canvas");
const seedLabel  = document.getElementById("seed-label");
const movesLabel = document.getElementById("moves-label");
const diffBadge  = document.getElementById("diff-badge");
const diffSlider = document.getElementById("difficulty");
const btnRestart = document.getElementById("btn-restart");
const btnNewSeed = document.getElementById("btn-new-seed");
const btnHint    = document.getElementById("btn-hint");
const btnSolve   = document.getElementById("btn-solve");

const renderer = new Renderer(canvas);

function tryMove(dir) {
  if (state.moving) return;

  if (!isAutoSolving()) resetHints();

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

initHints(tryMove);

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
  resetHints();

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
      cancelAuto();
      playWin();
      setTimeout(() => { newSeed(); }, 1200);
    }
  });
}

function resetLevel() { loadLevel(state.seed, state.difficulty); }
function newSeed()     { loadLevel(Date.now() & 0xffff, state.difficulty); }

new InputHandler(canvas, (dir) => {
  cancelAuto();
  tryMove(dir);
});

btnRestart.addEventListener("click", resetLevel);
btnNewSeed.addEventListener("click", newSeed);
btnHint.addEventListener("click", () => hintNextMove(state));
btnSolve.addEventListener("click", () => startAutoSolve(state));
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
        spawnParticles(state.particles, ball.x, ball.y);
        playHit();

        if (isAutoSolving()) doNextStep(state);
      }
    } else {
      state.moving = false;
      spawnParticles(state.particles, state.ball.x, state.ball.y);
      playHit();

      if (isAutoSolving()) doNextStep(state);
    }
  }

  updateParticles(state.particles, dt);

  const CELL_ANIM_DUR = 280;
  for (const [key, startTime] of state.cellAnimations) {
    if (now - startTime > CELL_ANIM_DUR) state.cellAnimations.delete(key);
  }

  renderer.render(state, now);
  requestAnimationFrame(loop);
}

loadLevel(1, 50);
requestAnimationFrame(loop);
