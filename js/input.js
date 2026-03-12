const MIN_SWIPE_DIST = 12;

export class InputHandler {
  constructor(canvas, onDirection) {
    this._onDirection = onDirection;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchActive = false;

    window.addEventListener("keydown", this._onKey.bind(this));
    canvas.addEventListener("touchstart", this._onTouchStart.bind(this), { passive: true });
    canvas.addEventListener("touchend",   this._onTouchEnd.bind(this),   { passive: true });
  }

  _onKey(e) {
    const map = {
      ArrowUp:    "up",
      ArrowDown:  "down",
      ArrowLeft:  "left",
      ArrowRight: "right",
    };
    if (map[e.key]) this._onDirection(map[e.key]);
  }

  _onTouchStart(e) {
    const t = e.changedTouches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
    this._touchActive = true;
  }

  _onTouchEnd(e) {
    if (!this._touchActive) return;
    this._touchActive = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < MIN_SWIPE_DIST && ady < MIN_SWIPE_DIST) return;

    if (adx > ady) {
      this._onDirection(dx > 0 ? "right" : "left");
    } else {
      this._onDirection(dy > 0 ? "down" : "up");
    }
  }
}
