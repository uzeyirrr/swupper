import { solve } from "./solver.js";

let solveQueue  = [];
let autoSolving = false;
let onMove      = null;

export function initHints(moveFn) {
  onMove = moveFn;
}

export function resetHints() {
  solveQueue  = [];
  autoSolving = false;
}

export function isAutoSolving() {
  return autoSolving;
}

export function cancelAuto() {
  autoSolving = false;
  solveQueue  = [];
}

function computeQueue(state) {
  return solve(
    state.grid, state.ball.x, state.ball.y,
    state.gridWidth, state.gridHeight
  ) || [];
}

export function hintNextMove(state) {
  if (state.moving || state.emptyCount <= 0) return;
  if (solveQueue.length === 0) solveQueue = computeQueue(state);
  if (solveQueue.length === 0) return;
  onMove(solveQueue.shift());
}

export function startAutoSolve(state) {
  if (state.moving || state.emptyCount <= 0) return;
  if (solveQueue.length === 0) solveQueue = computeQueue(state);
  if (solveQueue.length === 0) return;
  autoSolving = true;
  doNextStep(state);
}

export function doNextStep(state) {
  if (!autoSolving || solveQueue.length === 0 || state.emptyCount <= 0) {
    autoSolving = false;
    return;
  }
  if (state.moving) return;
  onMove(solveQueue.shift());
}
