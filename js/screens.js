const screens = {};
let currentScreen = null;

export function registerScreen(id, el) {
  screens[id] = el;
  el.classList.add("screen");
  el.classList.toggle("screen--active", false);
}

export function showScreen(id) {
  for (const key in screens) {
    screens[key].classList.toggle("screen--active", key === id);
  }
  currentScreen = id;
}

export function getCurrentScreen() {
  return currentScreen;
}

export function showOverlay(el) {
  el.classList.add("overlay--active");
}

export function hideOverlay(el) {
  el.classList.remove("overlay--active");
}
