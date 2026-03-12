const screens = {};
let currentScreen = null;

export function registerScreen(id, el) {
  screens[id] = el;
  el.classList.add("screen");
  el.classList.toggle("screen--active", false);
}

export function showScreen(id) {
  for (const key in screens) {
    const el = screens[key];
    if (key === id) {
      el.classList.remove("screen--active");
      void el.offsetWidth;
      el.classList.add("screen--active");
    } else {
      el.classList.remove("screen--active");
    }
  }
  currentScreen = id;
}

export function getCurrentScreen() {
  return currentScreen;
}

export function showOverlay(el) {
  el.classList.remove("overlay--active");
  void el.offsetWidth;
  el.classList.add("overlay--active");
}

export function hideOverlay(el) {
  el.classList.remove("overlay--active");
}
