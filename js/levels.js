const STORAGE_KEY = "swupper_progress";
const SETTINGS_KEY = "swupper_settings";

export function getLevelConfig(levelNum) {
  const data = loadProgress();
  const levelSeeds = data.levelSeeds || {};
  return {
    seed: levelSeeds[levelNum] ?? levelNum,
    difficulty: Math.floor((levelNum - 1) / 10),
  };
}

export function saveLevelSeed(levelNum, seed) {
  const data = loadProgress();
  if (!data.levelSeeds) data.levelSeeds = {};
  data.levelSeeds[levelNum] = seed;
  saveProgress(data);
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : { maxUnlocked: 1, completed: {} };
    if (!data.levelSeeds) data.levelSeeds = {};
    return data;
  } catch (_) { /* ignore */ }
  return { maxUnlocked: 1, completed: {}, levelSeeds: {} };
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

export function getBestStreak() {
  const data = loadProgress();
  let best = 0;
  let current = 0;
  for (let i = 1; i <= data.maxUnlocked; i++) {
    if (data.completed[i]) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function getNextLevel() {
  const data = loadProgress();
  for (let i = 1; i <= data.maxUnlocked; i++) {
    if (!data.completed[i]) return i;
  }
  return data.maxUnlocked;
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

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function getDailyConfig() {
  const dateStr = todayStr();
  return { seed: parseInt(dateStr, 10), difficulty: 40, dateStr };
}

export function isDailyCompleted() {
  const s = loadSettings();
  return s.dailyCompleted === todayStr();
}

export function completeDaily(moves) {
  const s = loadSettings();
  s.dailyCompleted = todayStr();
  s.dailyMoves = moves;
  saveSettings(s);
}
