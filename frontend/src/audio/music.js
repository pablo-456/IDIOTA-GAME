/**
 * Música ambiental procedural — pad suave + arpegio lento de mesa de cartas.
 * Solo ondas sine + filtro lowpass para evitar zumbido/estática.
 */

import { getContext, getMusicDestination } from './audioEngine';

/** Notas del arpegio (Hz) — ambiente calmado tipo lounge */
const ARP = [196, 246.94, 293.66, 369.99, 293.66, 246.94];
const PAD_FREQS = [98, 146.83, 196];

let running = false;
let timers = [];
let padNodes = [];
let musicFilter = null;

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function getFilteredDest(ctx, dest) {
  if (musicFilter) return musicFilter;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.5;
  filter.connect(dest);
  musicFilter = filter;
  return filter;
}

function stopPads() {
  const ctx = getContext();
  const now = ctx?.currentTime ?? 0;
  padNodes.forEach(({ osc, gain }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.001, now, 0.08);
      osc.stop(now + 0.3);
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
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.001;
    const t0 = ctx.currentTime;
    // Pads muy suaves; el más grave un poco más presente
    const peak = (0.018 / (i + 1)) * (i === 0 ? 1.15 : 1);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 1.4);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    padNodes.push({ osc, gain });
  });
}

function scheduleArpeggio(ctx, dest, step = 0) {
  if (!running) return;
  const freq = ARP[step % ARP.length];
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.045, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t0);
  osc.stop(t0 + 0.7);

  const delay = 780 + (step % 3) * 90;
  const id = setTimeout(() => scheduleArpeggio(ctx, dest, step + 1), delay);
  timers.push(id);
}

export async function startMusic() {
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
    scheduleArpeggio(ctx, dest, 0);
  } catch {
    running = false;
  }
}

export function stopMusic() {
  running = false;
  clearTimers();
  stopPads();
}

export function isMusicPlaying() {
  return running;
}
