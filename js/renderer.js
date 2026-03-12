import { TILE_WALL, TILE_EMPTY } from "./constants.js";
import { easeOutBack } from "./utils.js";

const CELL_ANIM_DUR = 300;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
  }

  resize(gridW, gridH) {
    const screen = this.canvas.closest(".screen");
    if (!screen) return;

    const screenRect = screen.getBoundingClientRect();
    const siblings = screen.querySelectorAll("#hud, #controls");
    let usedH = 0;
    for (const s of siblings) usedH += s.getBoundingClientRect().height;

    const gap = 30;
    const maxW = screenRect.width * 0.92;
    const maxH = screenRect.height - usedH - gap * 3;
    if (maxW <= 0 || maxH <= 0) return;

    const aspect = (gridW > 0 && gridH > 0) ? gridW / gridH : 9 / 16;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }

    this.canvas.width  = Math.floor(w);
    this.canvas.height = Math.floor(h);
  }

  render(state, now) {
    const { ctx, canvas } = this;
    const { grid, gridWidth, gridHeight, ball, moving,
            particles, cellAnimations } = state;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (!grid || grid.length === 0 || W === 0 || H === 0) return;

    // Board arka plan: koyu mavi
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2860b8");
    bg.addColorStop(1, "#1a4890");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 14);
    ctx.fill();

    const tileSize  = Math.min(W / gridWidth, H / gridHeight);
    const offsetX   = (W - tileSize * gridWidth)  / 2;
    const offsetY   = (H - tileSize * gridHeight) / 2;
    const gap       = Math.max(1.5, tileSize * 0.065);
    const innerSize = tileSize - gap * 2;
    const rad       = Math.max(3, tileSize * 0.2);

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const tile = grid[y][x];
        const px   = offsetX + x * tileSize + gap;
        const py   = offsetY + y * tileSize + gap;

        if (tile === TILE_WALL) {
          this._drawWall(ctx, px, py, innerSize, rad);
          continue;
        }

        if (tile === TILE_EMPTY) {
          this._drawEmpty(ctx, px, py, innerSize, rad);
          continue;
        }

        // TILE_PAINTED
        const cellKey  = y * gridWidth + x;
        const animTime = cellAnimations?.get(cellKey);
        const elapsed  = animTime !== undefined ? now - animTime : CELL_ANIM_DUR;
        const t        = Math.min(1, elapsed / CELL_ANIM_DUR);

        if (t < 1) {
          this._drawPaintedAnim(ctx, px, py, innerSize, rad, tileSize, t);
        } else {
          this._drawPainted(ctx, px, py, innerSize, rad);
        }
      }
    }

    // Partikuller
    this._drawParticles(ctx, particles, offsetX, offsetY, tileSize);

    // Top
    this._drawBall(ctx, ball, moving, offsetX, offsetY, tileSize);
  }

  _drawWall(ctx, px, py, size, rad) {
    // Koyu mavi blok, boardla neredeyse ayni; hafif cikar
    ctx.fillStyle = "#1e4080";
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, rad);
    ctx.fill();

    // Ince highlight ust kenar
    ctx.fillStyle = "rgba(80,130,200,0.25)";
    ctx.beginPath();
    ctx.roundRect(px + 2, py + 1, size - 4, size * 0.32, rad);
    ctx.fill();
  }

  _drawEmpty(ctx, px, py, size, rad) {
    // Acik mavi kare
    const g = ctx.createLinearGradient(px, py, px, py + size);
    g.addColorStop(0, "#dce8f8");
    g.addColorStop(1, "#b8ccde");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, rad);
    ctx.fill();

    // Ust parlaklik
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.roundRect(px + size * 0.1, py + 1, size * 0.8, size * 0.35, rad * 0.6);
    ctx.fill();

    // Alt golge
    ctx.fillStyle = "rgba(40,70,120,0.12)";
    ctx.beginPath();
    ctx.roundRect(px, py + size * 0.68, size, size * 0.32, rad);
    ctx.fill();
  }

  _drawPainted(ctx, px, py, size, rad) {
    // Turuncu gradient
    const g = ctx.createLinearGradient(px, py, px, py + size);
    g.addColorStop(0, "#ffcc44");
    g.addColorStop(0.5, "#ff9e30");
    g.addColorStop(1, "#e87818");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, rad);
    ctx.fill();

    // Cam parlaklik
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.roundRect(px + size * 0.12, py + 1.5, size * 0.76, size * 0.32, rad * 0.6);
    ctx.fill();

    // Alt derinlik
    ctx.fillStyle = "rgba(140,60,0,0.15)";
    ctx.beginPath();
    ctx.roundRect(px, py + size * 0.72, size, size * 0.28, rad);
    ctx.fill();
  }

  _drawPaintedAnim(ctx, px, py, size, rad, tileSize, t) {
    const scale      = easeOutBack(t);
    const glowR      = (1 - t) * tileSize * 0.5;
    const cx         = px + size / 2;
    const cy         = py + size / 2;
    const half       = (size / 2) * scale;
    const r          = rad * Math.max(0.3, scale);

    ctx.save();
    if (glowR > 2) {
      ctx.shadowColor = "#ffaa20";
      ctx.shadowBlur  = glowR;
    }

    const g = ctx.createLinearGradient(cx - half, cy - half, cx - half, cy + half);
    g.addColorStop(0, t < 0.35 ? "#ffe080" : "#ffcc44");
    g.addColorStop(1, t < 0.35 ? "#ffb840" : "#e87818");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx - half, cy - half, half * 2, half * 2, r);
    ctx.fill();

    // Cam parlaklik (animasyonlu)
    if (scale > 0.4) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.roundRect(
        cx - half + half * 0.24,
        cy - half + 1.5,
        half * 1.52,
        half * 0.64,
        r * 0.5
      );
      ctx.fill();
    }
    ctx.restore();
  }

  _drawParticles(ctx, particles, offsetX, offsetY, tileSize) {
    if (!particles || particles.length === 0) return;
    ctx.save();
    for (const p of particles) {
      const ppx   = offsetX + p.gx * tileSize;
      const ppy   = offsetY + p.gy * tileSize;
      const r     = p.size * tileSize;
      const alpha = Math.max(0, p.life * p.life);

      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = r * 3;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(ppx, ppy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  _drawBall(ctx, ball, moving, offsetX, offsetY, tileSize) {
    const linearT = Math.max(0, Math.min(1, ball.t));
    const easedT  = easeOutBack(linearT);
    const bx = moving ? ball.px + (ball.tx - ball.px) * easedT : ball.x;
    const by = moving ? ball.py + (ball.ty - ball.py) * easedT : ball.y;
    const cx = offsetX + (bx + 0.5) * tileSize;
    const cy = offsetY + (by + 0.5) * tileSize;
    const r  = tileSize * 0.28;

    ctx.save();

    // Yere golge
    ctx.fillStyle = "rgba(10,30,60,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx + 1.5, cy + r * 0.9, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dis glow
    ctx.shadowColor = "#ff3838";
    ctx.shadowBlur  = tileSize * 0.4;

    // Ana top
    const grad = ctx.createRadialGradient(
      cx - r * 0.28, cy - r * 0.32, r * 0.08,
      cx, cy, r
    );
    grad.addColorStop(0,    "#ffffff");
    grad.addColorStop(0.35, "#ff8080");
    grad.addColorStop(0.7,  "#e63946");
    grad.addColorStop(1,    "#c02030");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Specular
    ctx.fillStyle = "rgba(255,255,255,0.60)";
    ctx.beginPath();
    ctx.ellipse(
      cx - r * 0.18, cy - r * 0.22,
      r * 0.36, r * 0.20,
      -0.3, 0, Math.PI * 2
    );
    ctx.fill();

    // Kucuk ikincil highlight
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy + r * 0.30, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
