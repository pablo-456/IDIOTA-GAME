/**
 * SFX procedurales — estética mesa de cartas / casino suave.
 */

import { getContext, getSfxDestination } from './audioEngine';

function noiseBuffer(ctx, duration = 0.15) {
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  return buf;
}

function playNoiseBurst(ctx, dest, {
  duration = 0.08,
  filterFreq = 1800,
  gain = 0.4,
  type = 'bandpass',
  startAt = 0,
} = {}) {
  const t0 = ctx.currentTime + startAt;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  filter.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

function playTone(ctx, dest, {
  freq = 440,
  duration = 0.2,
  type = 'sine',
  gain = 0.2,
  startAt = 0,
  slideTo = null,
} = {}) {
  const t0 = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  }
  g.gain.setValueAtTime(0.001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(dest);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function withAudio(fn) {
  const ctx = getContext();
  const dest = getSfxDestination();
  if (!ctx || !dest || ctx.state !== 'running') return;
  try {
    fn(ctx, dest);
  } catch {
    /* fail silent */
  }
}

/** Golpe suave de carta sobre el feltro */
export function playCard() {
  withAudio((ctx, dest) => {
    playNoiseBurst(ctx, dest, {
      duration: 0.07,
      filterFreq: 2200,
      gain: 0.45,
      type: 'bandpass',
    });
    playTone(ctx, dest, {
      freq: 180,
      duration: 0.06,
      type: 'triangle',
      gain: 0.12,
    });
  });
}

/** Recoger / barajar la pila */
export function pickup() {
  withAudio((ctx, dest) => {
    for (let i = 0; i < 5; i++) {
      playNoiseBurst(ctx, dest, {
        duration: 0.05,
        filterFreq: 1600 + i * 200,
        gain: 0.28,
        type: 'bandpass',
        startAt: i * 0.045,
      });
    }
  });
}

/** Campanilla — tu turno */
export function myTurn() {
  withAudio((ctx, dest) => {
    playTone(ctx, dest, { freq: 660, duration: 0.18, type: 'sine', gain: 0.22 });
    playTone(ctx, dest, { freq: 880, duration: 0.22, type: 'sine', gain: 0.18, startAt: 0.1 });
  });
}

/** Ascenso — jugador salvado */
export function playerSaved() {
  withAudio((ctx, dest) => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      playTone(ctx, dest, {
        freq,
        duration: 0.28,
        type: 'sine',
        gain: 0.16,
        startAt: i * 0.1,
      });
    });
  });
}

/** Quemar / 8 / Joker — brillo + whoosh */
export function specialBurn() {
  withAudio((ctx, dest) => {
    playNoiseBurst(ctx, dest, {
      duration: 0.2,
      filterFreq: 900,
      gain: 0.35,
      type: 'lowpass',
    });
    playTone(ctx, dest, {
      freq: 420,
      slideTo: 120,
      duration: 0.35,
      type: 'sawtooth',
      gain: 0.1,
    });
    playTone(ctx, dest, {
      freq: 840,
      duration: 0.15,
      type: 'sine',
      gain: 0.14,
      startAt: 0.05,
    });
  });
}

/** Revelar carta oculta */
export function reveal() {
  withAudio((ctx, dest) => {
    playNoiseBurst(ctx, dest, {
      duration: 0.1,
      filterFreq: 2800,
      gain: 0.3,
      type: 'highpass',
    });
    playTone(ctx, dest, {
      freq: 320,
      slideTo: 480,
      duration: 0.18,
      type: 'triangle',
      gain: 0.15,
    });
  });
}

/** Carta del reparto */
export function deal() {
  withAudio((ctx, dest) => {
    playNoiseBurst(ctx, dest, {
      duration: 0.045,
      filterFreq: 2500,
      gain: 0.32,
      type: 'bandpass',
    });
  });
}

/** Fin de partida — acorde descendente */
export function gameOver() {
  withAudio((ctx, dest) => {
    const notes = [392, 349.23, 293.66, 246.94];
    notes.forEach((freq, i) => {
      playTone(ctx, dest, {
        freq,
        duration: 0.45,
        type: 'triangle',
        gain: 0.18,
        startAt: i * 0.14,
      });
    });
  });
}

export const SFX = {
  playCard,
  pickup,
  myTurn,
  playerSaved,
  specialBurn,
  reveal,
  deal,
  gameOver,
};
