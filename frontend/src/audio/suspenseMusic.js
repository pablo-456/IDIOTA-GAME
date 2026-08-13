/**
 * Música de suspenso procedural — tensión e incertidumbre (fase cartas ocultas).
 * Pads graves disonantes + pulso irregular lento. Sin archivos externos.
 */

import { getContext, getMusicDestination } from './audioEngine';

/** Pad: raíz + tritono + segundo menor (Hz) */
const PAD_FREQS = [55, 77.78, 110.0];
/** Pulsos graves esporádicos */
const PULSE_FREQS = [55, 58.27, 73.42, 82.41];

let running = false;
let timers = [];
let padNodes = [];
let suspenseFilter = null;

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function getFilteredDest(ctx, dest) {
  if (suspenseFilter) return suspenseFilter;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 680;
  filter.Q.value = 0.7;
  filter.connect(dest);
  suspenseFilter = filter;
  return filter;
}

function stopPads() {
  const ctx = getContext();
  const now = ctx?.currentTime ?? 0;
  padNodes.forEach(({ osc, gain, lfo }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.001, now, 0.12);
      osc.stop(now + 0.4);
      lfo?.stop(now + 0.4);
    } catch {
      /* already stopped */
    }
  });
  padNodes = [];
}

function startPads(ctx, dest) {
  PAD_FREQS.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;

    // Vibrato muy lento → sensación de inestabilidad
    lfo.type = 'sine';
    lfo.frequency.value = 0.08 + i * 0.025;
    lfoGain.gain.value = 0.35 + i * 0.15; // Hz de desviación

    gain.gain.value = 0.001;
    const t0 = ctx.currentTime;
    const peak = (0.022 / (i + 1)) * (i === 0 ? 1.25 : 0.85);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 1.8);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(dest);

    osc.start(t0);
    lfo.start(t0);
    padNodes.push({ osc, gain, lfo });
  });
}

/** Pulso irregular: a veces silencio largo, a veces golpe bajo tenso */
function schedulePulse(ctx, dest, step = 0) {
  if (!running) return;

  const freq = PULSE_FREQS[step % PULSE_FREQS.length];
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Ligero detune hacia arriba al final → incertidumbre
  osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t0 + 0.9);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.055, t0 + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t0);
  osc.stop(t0 + 1.15);

  // Ritmo irregular: 1.1s – 2.4s
  const delay = 1100 + (step % 5) * 220 + (step % 2) * 180;
  const id = setTimeout(() => schedulePulse(ctx, dest, step + 1), delay);
  timers.push(id);

  // Cada varios pasos: chispa aguda muy suave (tensión)
  if (step % 4 === 3) {
    const sparkId = setTimeout(() => {
      if (!running) return;
      const c = getContext();
      const d = getMusicDestination();
      if (!c || !d) return;
      const filt = getFilteredDest(c, d);
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = 466.16; // Bb4 — disonante sobre el pad
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.018, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g);
      g.connect(filt);
      o.start(t);
      o.stop(t + 0.5);
    }, 400);
    timers.push(sparkId);
  }
}

export async function startSuspenseMusic() {
  const ctx = getContext();
  const rawDest = getMusicDestination();
  if (!ctx || !rawDest || running) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  if (ctx.state !== 'running') return;

  running = true;
  try {
    const dest = getFilteredDest(ctx, rawDest);
    startPads(ctx, dest);
    schedulePulse(ctx, dest, 0);
  } catch {
    running = false;
  }
}

export function stopSuspenseMusic() {
  running = false;
  clearTimers();
  stopPads();
}

export function isSuspensePlaying() {
  return running;
}
