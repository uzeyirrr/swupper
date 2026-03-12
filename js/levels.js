const STORAGE_KEY = "swupper_progress";
const SETTINGS_KEY = "swupper_settings";

export function getLevelConfig(levelNum) {
  return {
    seed: levelNum,
    difficulty: Math.floor((levelNum - 1) / 10),
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { maxUnlocked: 1, completed: {} };
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* ignore */ }
}

export function getMaxUnlocked() {
  return loadProgress().maxUnlocked;
}

export function getCompleted() {
  return loadProgress().completed;
}

export function isLevelCompleted(levelNum) {
  return !!loadProgress().completed[levelNum];
}

export function getBestMoves(levelNum) {
  const c = loadProgress().completed[levelNum];
  return c ? c.moves : null;
}

export function completeLevel(levelNum, moves) {
  const data = loadProgress();
  const prev = data.completed[levelNum];
  if (!prev || moves < prev.moves) {
    data.completed[levelNum] = { moves };
  }
  if (levelNum >= data.maxUnlocked) {
    data.maxUnlocked = levelNum + 1;
  }
  saveProgress(data);
}

export function getStats() {
  const data = loadProgress();
  const completed = Object.keys(data.completed).length;
  let totalMoves = 0;
  for (const key in data.completed) {
    totalMoves += data.completed[key].moves;
  }
  return { completed, totalMoves, maxUnlocked: data.maxUnlocked };
}

export function jumpToLevel(levelNum) {
  const data = loadProgress();
  if (levelNum > data.maxUnlocked) {
    data.maxUnlocked = levelNum;
    saveProgress(data);
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { soundEnabled: true };
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* ignore */ }
}
