import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { SERVER_EVENTS } from '../constants/socketEvents';

/**
 * Estado de sesión de sala y navegación HOME → LOBBY → GAME.
 * Centraliza listeners de ciclo de vida de la sala.
 */
export function useRoomSession() {
  const { on, socket } = useSocket();

  const [screen, setScreen] = useState('HOME');
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [firstPlayer, setFirstPlayer] = useState(null);

  useEffect(() => {
    const handleConnect = () => setMyId(socket.id);
    socket.on('connect', handleConnect);
    if (socket.connected) setMyId(socket.id);
    return () => socket.off('connect', handleConnect);
  }, [socket]);

  useEffect(() => {
    const offCreated = on(SERVER_EVENTS.ROOM_CREATED, ({ roomId: id, state }) => {
      setServerError(null);
      setRoomId(id);
      setGameState(state);
      setScreen('LOBBY');
    });

    const offJoined = on(SERVER_EVENTS.ROOM_JOINED, ({ roomId: id, state }) => {
      setServerError(null);
      setRoomId(id);
      setGameState(state);
      setScreen('LOBBY');
    });

    const offUpdated = on(SERVER_EVENTS.ROOM_UPDATED, (state) => {
      setGameState((prev) => ({ ...prev, ...state }));
    });

    const offSetup = on(SERVER_EVENTS.SETUP_STARTED, ({ state }) => {
      setGameState(state);
      setScreen('GAME');
    });

    const offStarted = on(SERVER_EVENTS.GAME_STARTED, ({ state, firstPlayerId, firstPlayerName }) => {
      setGameState(state);
      setScreen('GAME');
      // Solo al inicio real de PLAYING (no sync mid-game)
      if (firstPlayerId) {
        setFirstPlayer({ id: firstPlayerId, name: firstPlayerName ?? 'Alguien' });
      }
    });

    const offDisconnect = on(SERVER_EVENTS.PLAYER_DISCONNECTED, ({ state }) => {
      setGameState((prev) => ({ ...prev, ...state }));
    });

    const offGameOver = on(SERVER_EVENTS.GAME_OVER, ({ winnerId, winnerName }) => {
      setGameState((prev) => ({ ...prev, status: 'FINISHED', winnerId, winnerName }));
    });

    const offError = on(SERVER_EVENTS.ERROR, ({ message }) => {
      setServerError(message);
      console.error('[Server error]', message);
    });

    return () => {
      offCreated();
      offJoined();
      offUpdated();
      offSetup();
      offStarted();
      offDisconnect();
      offGameOver();
      offError();
    };
  }, [on]);

  return {
    screen,
    roomId,
    myId,
    gameState,
    serverError,
    firstPlayer,
    clearFirstPlayer: () => setFirstPlayer(null),
    clearServerError: () => setServerError(null),
  };
}
