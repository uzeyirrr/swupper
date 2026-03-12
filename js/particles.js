const COLORS = [
  "#ffb84d", "#ff9736", "#ff6b6b", "#ffe066", "#ffffff", "#ff4757",
];

export function spawnParticles(particles, gx, gy) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.6;
    const speed = 2 + Math.random() * 3.5;
    particles.push({
      gx:    gx + 0.5,
      gy:    gy + 0.5,
      vgx:   Math.cos(angle) * speed,
      vgy:   Math.sin(angle) * speed,
      life:  1,
      decay: 1.8 + Math.random() * 1.2,
      size:  0.07 + Math.random() * 0.06,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.gx   += p.vgx * dt;
    p.gy   += p.vgy * dt;
    p.vgx  *= 0.88;
    p.vgy  *= 0.88;
    p.life -= p.decay * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
