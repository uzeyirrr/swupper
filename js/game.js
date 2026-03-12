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
import { registerScreen, showScreen, showOverlay, hideOverlay } from "./screens.js";
import {
  getLevelConfig, getMaxUnlocked, getCompleted, getStats,
  completeLevel, isLevelCompleted, getBestMoves,
  loadSettings, saveSettings, jumpToLevel,
  getBestStreak, getNextLevel, saveLevelSeed,
  getDailyConfig, isDailyCompleted, completeDaily,
} from "./levels.js";

// DOM
const screenHome = document.getElementById("screen-home");
const screenGame = document.getElementById("screen-game");

const homeLogo       = document.getElementById("home-logo");
const btnContinue    = document.getElementById("btn-continue");
const levelGrid      = document.getElementById("level-grid");
const statCompleted  = document.getElementById("stat-completed");
const statMoves      = document.getElementById("stat-moves");
const statStreak     = document.getElementById("stat-streak");
const btnDaily       = document.getElementById("btn-daily");
const dailyLabel     = document.getElementById("daily-label");
const btnPagePrev    = document.getElementById("btn-page-prev");
const btnPageNext    = document.getElementById("btn-page-next");
const pageIndicator  = document.getElementById("page-indicator");
const btnSettings    = document.getElementById("btn-settings");
const settingsOvl    = document.getElementById("settings-overlay");
const chkSound       = document.getElementById("chk-sound");
const btnSettClose   = document.getElementById("btn-settings-close");

const canvas         = document.getElementById("game-canvas");
const levelLabel     = document.getElementById("level-label");
const movesLabel     = document.getElementById("moves-label");
const btnBack        = document.getElementById("btn-back");
const btnRestart     = document.getElementById("btn-restart");
const btnAutoSolve   = document.getElementById("btn-auto-solve");

const winOverlay     = document.getElementById("win-overlay");
const winMovesVal    = document.getElementById("win-moves-val");
const btnNextLevel   = document.getElementById("btn-next-level");
const btnWinHome     = document.getElementById("btn-win-home");

const devOverlay     = document.getElementById("dev-overlay");
const devSeed        = document.getElementById("dev-seed");
const devDifficulty  = document.getElementById("dev-difficulty");
const devDiffVal     = document.getElementById("dev-diff-val");
const devJump        = document.getElementById("dev-jump");
const btnDevJump     = document.getElementById("btn-dev-jump");
const btnDevPlay     = document.getElementById("btn-dev-play");
const btnDevHint     = document.getElementById("btn-dev-hint");
const btnDevSolve    = document.getElementById("btn-dev-solve");
const btnDevClose    = document.getElementById("btn-dev-close");

const renderer = new Renderer(canvas);

let soundEnabled = true;

function wrapAudio(fn) {
  return function (...args) {
    if (soundEnabled) fn(...args);
  };
}

const sfxSlide = wrapAudio(playSlide);
const sfxHit   = wrapAudio(playHit);
const sfxPaint = wrapAudio(playPaint);
const sfxStart = wrapAudio(playStart);
const sfxWin   = wrapAudio(playWin);

// --- Screens ---
registerScreen("screen-home", screenHome);
registerScreen("screen-game", screenGame);

function goHome() {
  cancelAuto();
  hideOverlay(winOverlay);
  refreshHome();
  showScreen("screen-home");
}

const PAGE_SIZE = 10;
let currentPage = 0;
let isPlayingDaily = false;

function refreshHome() {
  const stats = getStats();
  statCompleted.textContent = stats.completed;
  statMoves.textContent     = stats.totalMoves;
  statStreak.textContent    = getBestStreak();

  const next = getNextLevel();
  btnContinue.textContent = "Devam Et - Level " + next;

  if (isDailyCompleted()) {
    btnDaily.textContent = "Tamamlandi!";
    btnDaily.classList.remove("btn-blue");
    btnDaily.classList.add("btn-green");
  } else {
    btnDaily.textContent = "Bugunku Bulmacayi Coz";
    btnDaily.classList.remove("btn-green");
    btnDaily.classList.add("btn-blue");
  }

  currentPage = Math.floor((next - 1) / PAGE_SIZE);
  renderLevelGrid();
}

function renderLevelGrid() {
  levelGrid.innerHTML = "";
  const maxUnlocked = getMaxUnlocked();
  const completed   = getCompleted();
  const start       = currentPage * PAGE_SIZE + 1;
  const end         = start + PAGE_SIZE - 1;
  const maxPage     = Math.floor((maxUnlocked + PAGE_SIZE - 1) / PAGE_SIZE) - 1;

  pageIndicator.textContent = start + "-" + end;
  btnPagePrev.disabled = currentPage <= 0;
  btnPageNext.disabled = currentPage >= maxPage;

  for (let i = start; i <= end; i++) {
    const btn = document.createElement("button");
    btn.className = "lvl-cell";

    if (completed[i]) {
      btn.classList.add("lvl-cell--completed");
      btn.innerHTML = i + '<span class="lvl-moves">' + completed[i].moves + " h</span>";
      btn.addEventListener("click", () => startLevel(i));
    } else if (i <= maxUnlocked) {
      btn.classList.add("lvl-cell--open");
      btn.textContent = i;
      btn.addEventListener("click", () => startLevel(i));
    } else {
      btn.classList.add("lvl-cell--locked");
      btn.innerHTML = '<span class="lvl-lock">&#128274;</span>';
    }

    levelGrid.appendChild(btn);
  }
}

// --- Settings ---
function initSettings() {
  const s = loadSettings();
  soundEnabled = s.soundEnabled;
  chkSound.checked = soundEnabled;
}

btnSettings.addEventListener("click", () => showOverlay(settingsOvl));
btnSettClose.addEventListener("click", () => hideOverlay(settingsOvl));
chkSound.addEventListener("change", () => {
  soundEnabled = chkSound.checked;
  const s = loadSettings();
  s.soundEnabled = soundEnabled;
  saveSettings(s);
});

// --- Game ---
function tryMove(dir) {
  if (state.moving) return;
  if (!isAutoSolving()) resetHints();

  const { ball, grid, gridWidth, gridHeight } = state;
  const path = computePath(grid, gridWidth, gridHeight, ball, dir);
  if (path.length === 0) return;

  sfxSlide();

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
  state.seed           = result.seedUsed ?? seed;
  state.difficulty     = difficulty;
  state.moves          = 0;
  state.moving         = false;
  state.particles      = [];
  state.cellAnimations = new Map();
  resetHints();
  hideOverlay(winOverlay);

  const b = state.ball;
  b.x = b.tx = b.px = result.ballX;
  b.y = b.ty = b.py = result.ballY;
  b.t            = 1;
  b.path         = [];
  b.paintedSteps = 0;

  levelLabel.textContent = state.currentLevel;
  movesLabel.textContent = "0";

  doPaintCell(result.ballX, result.ballY);
  sfxStart();
  return result;
}

function startLevel(num) {
  isPlayingDaily = false;
  state.currentLevel = num;
  const cfg = getLevelConfig(num);
  showScreen("screen-game");
  requestAnimationFrame(() => {
    const result = loadLevel(cfg.seed, cfg.difficulty);
    if (result.seedUsed != null) saveLevelSeed(num, result.seedUsed);
    renderer.resize(state.gridWidth, state.gridHeight);
  });
}

function doPaintCell(x, y) {
  paintCell(state.grid, x, y, () => {
    state.cellAnimations.set(y * state.gridWidth + x, performance.now());
    sfxPaint();
    state.emptyCount--;
    if (state.emptyCount <= 0) {
      cancelAuto();
      sfxWin();
      if (isPlayingDaily) {
        completeDaily(state.moves);
      } else {
        completeLevel(state.currentLevel, state.moves);
      }
      winMovesVal.textContent = state.moves;
      setTimeout(() => { showOverlay(winOverlay); }, 400);
    }
  });
}

function resetLevel() {
  const cfg = getLevelConfig(state.currentLevel);
  loadLevel(cfg.seed, cfg.difficulty);
}

new InputHandler(canvas, (dir) => {
  cancelAuto();
  tryMove(dir);
});

btnBack.addEventListener("click", goHome);
btnRestart.addEventListener("click", resetLevel);
btnAutoSolve.addEventListener("click", () => startAutoSolve(state));

btnNextLevel.addEventListener("click", () => {
  hideOverlay(winOverlay);
  startLevel(state.currentLevel + 1);
});

btnWinHome.addEventListener("click", goHome);

btnContinue.addEventListener("click", () => {
  isPlayingDaily = false;
  startLevel(getNextLevel());
});

btnDaily.addEventListener("click", () => {
  if (isDailyCompleted()) return;
  const cfg = getDailyConfig();
  isPlayingDaily = true;
  state.currentLevel = 0;
  showScreen("screen-game");
  levelLabel.textContent = "Gunluk";
  requestAnimationFrame(() => {
    loadLevel(cfg.seed, cfg.difficulty);
    renderer.resize(state.gridWidth, state.gridHeight);
  });
});

btnPagePrev.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderLevelGrid();
  }
});

btnPageNext.addEventListener("click", () => {
  const maxUnlocked = getMaxUnlocked();
  const maxPage = Math.floor((maxUnlocked + PAGE_SIZE - 1) / PAGE_SIZE) - 1;
  if (currentPage < maxPage) {
    currentPage++;
    renderLevelGrid();
  }
});

// --- Dev Menu (logo 3x tap) ---
let logoTaps = 0;
let logoTimer = null;

homeLogo.addEventListener("click", () => {
  logoTaps++;
  clearTimeout(logoTimer);
  if (logoTaps >= 3) {
    logoTaps = 0;
    showOverlay(devOverlay);
  } else {
    logoTimer = setTimeout(() => { logoTaps = 0; }, 600);
  }
});

btnDevClose.addEventListener("click", () => hideOverlay(devOverlay));

devDifficulty.addEventListener("input", () => {
  devDiffVal.textContent = devDifficulty.value;
});

btnDevPlay.addEventListener("click", () => {
  hideOverlay(devOverlay);
  const seed = parseInt(devSeed.value, 10) || 1;
  const diff = parseInt(devDifficulty.value, 10);
  state.currentLevel = seed;
  showScreen("screen-game");
  requestAnimationFrame(() => {
    loadLevel(seed, diff);
    renderer.resize(state.gridWidth, state.gridHeight);
  });
});

btnDevJump.addEventListener("click", () => {
  const lvl = parseInt(devJump.value, 10) || 1;
  jumpToLevel(lvl);
  renderLevelGrid();
});

btnDevHint.addEventListener("click", () => hintNextMove(state));
btnDevSolve.addEventListener("click", () => startAutoSolve(state));

// --- Resize ---
window.addEventListener("resize", () => renderer.resize(state.gridWidth, state.gridHeight));

// --- Game Loop ---
let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (state.moving && state.grid.length > 0) {
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
        sfxHit();
        if (isAutoSolving()) doNextStep(state);
      }
    } else {
      state.moving = false;
      spawnParticles(state.particles, state.ball.x, state.ball.y);
      sfxHit();
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

// --- Init ---
initSettings();
refreshHome();
showScreen("screen-home");
requestAnimationFrame(loop);
