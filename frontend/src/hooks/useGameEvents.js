import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { SERVER_EVENTS } from '../constants/socketEvents';
import { isBurnCard } from '../constants/cardRules';
import { SFX } from '../audio/sfx';

/**
 * Listeners in-game (FX y game_over local).
 * Usa useEffect con cleanup correcto.
 */
export function useGameEvents() {
  const { on } = useSocket();

  const [savedNotif, setSavedNotif] = useState(false);
  const [revealEvent, setRevealEvent] = useState(null);
  const [lastHiddenCardEvent, setLastHiddenCardEvent] = useState(null);
  const [specialEvent, setSpecialEvent] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);

  useEffect(() => {
    const timeouts = [];

    const offSaved = on(SERVER_EVENTS.PLAYER_SAVED, () => {
      SFX.playerSaved();
      setSavedNotif(true);
      const t = setTimeout(() => setSavedNotif(false), 6000);
      timeouts.push(t);
    });

    const offReveal = on(SERVER_EVENTS.CARD_REVEALED, (data) => {
      const { card, mustPickUp, isLastHiddenCard } = data;
      if (isLastHiddenCard) {
        SFX.reveal();
        setLastHiddenCardEvent(data);
        const t = setTimeout(() => setLastHiddenCardEvent(null), 5500);
        timeouts.push(t);
        return;
      }

      const isSpecial = isBurnCard(card.value);
      if (!mustPickUp && isSpecial) return;
      SFX.reveal();
      setRevealEvent(data);
      const t = setTimeout(() => setRevealEvent(null), 3200);
      timeouts.push(t);
    });

    const offSpecial = on(SERVER_EVENTS.SPECIAL_PLAY, (data) => {
      SFX.specialBurn();
      setSpecialEvent(data);
      const t = setTimeout(() => setSpecialEvent(null), 2200);
      timeouts.push(t);
    });

    const offGameOver = on(SERVER_EVENTS.GAME_OVER, (data) => {
      SFX.gameOver();
      setGameOverData(data);
    });

    return () => {
      offSaved();
      offReveal();
      offSpecial();
      offGameOver();
      timeouts.forEach(clearTimeout);
    };
  }, [on]);

  return {
    savedNotif,
    revealEvent,
    lastHiddenCardEvent,
    specialEvent,
    gameOverData,
  };
}
