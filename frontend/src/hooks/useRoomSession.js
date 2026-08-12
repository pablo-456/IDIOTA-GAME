import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { SERVER_EVENTS, CLIENT_EVENTS } from '../constants/socketEvents';
import {
  loadRoomSession,
  saveRoomSession,
  clearRoomSession,
} from '../utils/roomSession';

/**
 * Estado de sesión de sala y navegación:
 * HOME → PUBLIC_LOBBIES → LOBBY → GAME
 * Incluye auto-rejoin con token en localStorage.
 */
export function useRoomSession() {
  const { on, socket, emit, wakeServer } = useSocket();

  const [screen, setScreen] = useState('HOME');
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [firstPlayer, setFirstPlayer] = useState(null);
  const [pendingUsername, setPendingUsername] = useState('');
  const rejoinAttempted = useRef(false);

  // Wake-up del backend (Render free) al montar
  useEffect(() => {
    wakeServer();
  }, [wakeServer]);

  useEffect(() => {
    const handleConnect = () => {
      setMyId(socket.id);

      const saved = loadRoomSession();
      if (saved?.token && !rejoinAttempted.current) {
        rejoinAttempted.current = true;
        emit(CLIENT_EVENTS.REJOIN_SESSION, { sessionToken: saved.token });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      setMyId(socket.id);
      handleConnect();
    }
    return () => socket.off('connect', handleConnect);
  }, [socket, emit]);

  // Permitir reintentar rejoin en la siguiente reconexión si falla
  useEffect(() => {
    const onDisc = () => {
      rejoinAttempted.current = false;
    };
    socket.on('disconnect', onDisc);
    return () => socket.off('disconnect', onDisc);
  }, [socket]);

  useEffect(() => {
    const applySession = (id, state, sessionToken, username) => {
      setServerError(null);
      setRoomId(id);
      setGameState(state);
      setMyId(socket.id);

      if (sessionToken) {
        saveRoomSession({
          token: sessionToken,
          roomId: id,
          username: username || loadRoomSession()?.username || '',
        });
      }

      const status = state?.status;
      if (status === 'SETUP' || status === 'PLAYING' || status === 'FINISHED') {
        setScreen('GAME');
      } else {
        setScreen('LOBBY');
      }
    };

    const offCreated = on(SERVER_EVENTS.ROOM_CREATED, ({ roomId: id, state, sessionToken }) => {
      const name = state?.players?.find((p) => p.id === socket.id)?.username
        || loadRoomSession()?.username
        || '';
      applySession(id, state, sessionToken, name);
    });

    const offJoined = on(SERVER_EVENTS.ROOM_JOINED, ({ roomId: id, state, sessionToken }) => {
      const name = state?.players?.find((p) => p.id === socket.id)?.username
        || loadRoomSession()?.username
        || '';
      applySession(id, state, sessionToken, name);
    });

    const offRestored = on(SERVER_EVENTS.SESSION_RESTORED, ({ roomId: id, state, sessionToken }) => {
      const name = state?.players?.find((p) => p.id === socket.id)?.username
        || loadRoomSession()?.username
        || '';
      applySession(id, state, sessionToken, name);
    });

    const offUpdated = on(SERVER_EVENTS.ROOM_UPDATED, (state) => {
      setGameState((prev) => ({ ...prev, ...state }));
    });

    const offPending = on(SERVER_EVENTS.PLAYER_PENDING_DISCONNECT, ({ state }) => {
      if (state) setGameState((prev) => ({ ...prev, ...state }));
    });

    const offSetup = on(SERVER_EVENTS.SETUP_STARTED, ({ state }) => {
      setGameState(state);
      setScreen('GAME');
    });

    const offStarted = on(SERVER_EVENTS.GAME_STARTED, ({ state, firstPlayerId, firstPlayerName }) => {
      setGameState(state);
      setScreen('GAME');
      if (firstPlayerId) {
        setFirstPlayer({ id: firstPlayerId, name: firstPlayerName ?? 'Alguien' });
      }
    });

    const offDisconnect = on(SERVER_EVENTS.PLAYER_DISCONNECTED, ({ state }) => {
      setGameState((prev) => ({ ...prev, ...state }));
    });

    const offGameOver = on(SERVER_EVENTS.GAME_OVER, ({ winnerId, winnerName, loserId, loserName }) => {
      setGameState((prev) => ({
        ...prev,
        status: 'FINISHED',
        winnerId,
        winnerName,
        loserId,
        loserName,
      }));
      clearRoomSession();
    });

    const offError = on(SERVER_EVENTS.ERROR, ({ message }) => {
      setServerError(message);
      console.error('[Server error]', message);
      // Sesión inválida → limpiar para no spamear rejoin
      if (message && /sesión|token|sala ya no|no estás en la partida/i.test(message)) {
        clearRoomSession();
        rejoinAttempted.current = true;
      }
    });

    return () => {
      offCreated();
      offJoined();
      offRestored();
      offUpdated();
      offPending();
      offSetup();
      offStarted();
      offDisconnect();
      offGameOver();
      offError();
    };
  }, [on, socket]);

  const goHome = useCallback(() => {
    const saved = loadRoomSession();
    if (saved?.roomId || roomId) {
      emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId: roomId || saved?.roomId });
    }
    clearRoomSession();
    rejoinAttempted.current = true;
    setScreen('HOME');
    setRoomId(null);
    setGameState(null);
  }, [emit, roomId]);

  const goToPublicLobbies = useCallback((username) => {
    if (username?.trim()) setPendingUsername(username.trim());
    setScreen('PUBLIC_LOBBIES');
  }, []);

  return {
    screen,
    roomId,
    myId,
    gameState,
    serverError,
    firstPlayer,
    pendingUsername,
    goHome,
    goToPublicLobbies,
    clearFirstPlayer: () => setFirstPlayer(null),
    clearServerError: () => setServerError(null),
  };
}
