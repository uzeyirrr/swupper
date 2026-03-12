let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(freq, duration, type, volume, detune) {
  const ac   = getCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();

  osc.type      = type || "sine";
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;

  gain.gain.setValueAtTime(volume ?? 0.15, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

function playNoise(duration, volume) {
  const ac     = getCtx();
  const len    = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const src  = ac.createBufferSource();
  const gain = ac.createGain();
  const filt = ac.createBiquadFilter();

  src.buffer          = buffer;
  filt.type           = "bandpass";
  filt.frequency.value = 800;
  filt.Q.value         = 1.2;

  gain.gain.setValueAtTime(volume ?? 0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  src.connect(filt);
  filt.connect(gain);
  gain.connect(ac.destination);
  src.start(ac.currentTime);
}

// Top kayarken: kisa yumusak viyuuu
export function playSlide() {
  const ac   = getCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(320, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.15);

  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

// Duvara carpma: yumusak tok ses
export function playHit() {
  const ac   = getCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.08);

  gain.gain.setValueAtTime(0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.10);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.10);
}

// Kare boyanirken: kisa tik
export function playPaint() {
  playTone(600 + Math.random() * 300, 0.06, "sine", 0.05);
}

// Oyun baslarken: yukari arpej
export function playStart() {
  const notes = [440, 554, 659, 880];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.18, "triangle", 0.12), i * 80);
  });
}

// Bolum tamamlaninca: zafer fanfari
export function playWin() {
  const notes = [523, 659, 784, 1047, 1047, 784, 1047];
  const times = [0, 100, 200, 300, 420, 480, 560];
  const durs  = [0.15, 0.15, 0.15, 0.22, 0.08, 0.08, 0.35];

  times.forEach((t, i) => {
    setTimeout(() => {
      playTone(notes[i], durs[i], "triangle", 0.14);
      if (i === times.length - 1) {
        playTone(notes[i] * 0.5, 0.4, "sine", 0.08);
      }
    }, t);
  });
}
