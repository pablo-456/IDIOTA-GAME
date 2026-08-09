import { useState, useCallback, useEffect } from 'react';
import {
  unlock as engineUnlock,
  isMuted,
  setMuted,
  toggleMute as engineToggleMute,
} from '../audio/audioEngine';
import { SFX } from '../audio/sfx';
import { startMusic, stopMusic } from '../audio/music';

/**
 * Hook de audio: mute, unlock (autoplay) y wrappers SFX/música.
 */
export function useAudio() {
  const [muted, setMutedState] = useState(() => isMuted());

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const unlock = useCallback(async () => {
    await engineUnlock();
  }, []);

  const toggleMute = useCallback(() => {
    const next = engineToggleMute();
    setMutedState(next);
    return next;
  }, []);

  const setMute = useCallback((value) => {
    setMuted(value);
    setMutedState(!!value);
  }, []);

  const play = useCallback((name) => {
    const fn = SFX[name];
    if (typeof fn === 'function') fn();
  }, []);

  return {
    muted,
    unlock,
    toggleMute,
    setMute,
    play,
    startMusic,
    stopMusic,
    sfx: SFX,
  };
}
