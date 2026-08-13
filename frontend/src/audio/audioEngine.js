/**
 * Singleton Web Audio — master / sfx / music gains + mute.
 * Sin archivos ni librerías externas.
 */

const MUTE_KEY = 'idiota-audio-muted';
const SFX_VOLUME = 0.35;
const MUSIC_VOLUME = 1.5;

let ctx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let muted = false;

function readStoredMute() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredMute(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function ensureGraph() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();

    muted = readStoredMute();
    masterGain.gain.value = muted ? 0 : 1;
    sfxGain.gain.value = SFX_VOLUME;
    musicGain.gain.value = MUSIC_VOLUME;

    sfxGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

export function getContext() {
  return ensureGraph();
}

export function getSfxDestination() {
  ensureGraph();
  return sfxGain;
}

export function getMusicDestination() {
  ensureGraph();
  return musicGain;
}

/** Resume AudioContext after a user gesture (autoplay policy). */
export async function unlock() {
  const c = ensureGraph();
  if (!c) return false;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === 'running';
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = !!value;
  writeStoredMute(muted);
  ensureGraph();
  if (masterGain && ctx) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.03);
  }
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}
