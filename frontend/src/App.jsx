/**
 * App.jsx — Controlador de navegación principal
 *
 * Gestiona el estado global de la aplicación y la navegación entre pantallas:
 *   HOME  →  LOBBY  →  GAME
 *
 * Todo el flujo se basa en eventos Socket.io; no hay react-router.
 *
 * Estado global:
 *   screen     : 'HOME' | 'LOBBY' | 'GAME'
 *   roomId     : código de la sala actual
 *   myId       : socket.id del jugador local
 *   gameState  : último estado público/privado recibido del servidor
 *   serverError: último mensaje de error del servidor
 */

import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Home  from './pages/Home/Home';
import Lobby from './pages/Lobby/Lobby';
import Game  from './pages/Game/Game';
import './App.css';

export default function App() {
  const { on, socket }  = useSocket();

  const [screen,      setScreen]      = useState('HOME');
  const [roomId,      setRoomId]      = useState(null);
  const [myId,        setMyId]        = useState(null);
  const [gameState,   setGameState]   = useState(null);
  const [serverError, setServerError] = useState(null);

  // Capturar el socket.id en cuanto se conecta
  useEffect(() => {
    const handleConnect = () => setMyId(socket.id);
    socket.on('connect', handleConnect);
    if (socket.connected) setMyId(socket.id);
    return () => socket.off('connect', handleConnect);
  }, [socket]);

  // ── Listeners de Socket.io ──────────────────────────────────────────────

  useEffect(() => {
    /**
     * room_created — el servidor confirma que la sala fue creada.
     * Payload: { roomId, state }
     */
    const offCreated = on('room_created', ({ roomId: id, state }) => {
      setServerError(null);
      setRoomId(id);
      setGameState(state);
      setScreen('LOBBY');
    });

    /**
     * room_joined — el servidor confirma que el jugador se unió.
     * Payload: { roomId, state }
     */
    const offJoined = on('room_joined', ({ roomId: id, state }) => {
      setServerError(null);
      setRoomId(id);
      setGameState(state);
      setScreen('LOBBY');
    });

    /**
     * room_updated — estado público actualizado (nuevos jugadores, etc.).
     * Payload: estado público del juego
     */
    const offUpdated = on('room_updated', (state) => {
      setGameState(prev => ({ ...prev, ...state }));
    });

    /**
     * setup_started — el host inició la fase de configuración.
     * Payload: { state } (estado privado del jugador local)
     */
    const offSetup = on('setup_started', ({ state }) => {
      setGameState(state);
      setScreen('GAME');
    });

    /**
     * game_started — todos los jugadores están listos; comienza PLAYING.
     * Payload: { state, firstPlayerId, firstPlayerName, message }
     */
    const offStarted = on('game_started', ({ state }) => {
      setGameState(state);
      setScreen('GAME');
    });

    /**
     * player_disconnected — un rival se desconectó.
     * Payload: { socketId, advanceTurn, state, message }
     */
    const offDisconnect = on('player_disconnected', ({ state }) => {
      setGameState(prev => ({ ...prev, ...state }));
    });

    /**
     * game_over — la partida terminó.
     * Payload: { winnerId, winnerName, reason }
     */
    const offGameOver = on('game_over', ({ winnerId, winnerName }) => {
      setGameState(prev => ({ ...prev, status: 'FINISHED', winnerId, winnerName }));
    });

    /**
     * error — mensaje de error del servidor.
     * Payload: { message }
     */
    const offError = on('error', ({ message }) => {
      setServerError(message);
      console.error('[Server error]', message);
    });

    // Limpieza al desmontar
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

  // ── Render por pantalla ─────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Banner de error del servidor */}
      {serverError && (
        <div className="app__error-banner" role="alert">
          <span>⚠ {serverError}</span>
          <button onClick={() => setServerError(null)} aria-label="Cerrar">✕</button>
        </div>
      )}

      {/* Transición de pantallas */}
      <div className="app__screen" key={screen}>
        {screen === 'HOME'  && <Home />}
        {screen === 'LOBBY' && (
          <Lobby
            roomId={roomId}
            gameState={gameState}
            myId={myId}
          />
        )}
        {screen === 'GAME'  && (
          <Game
            gameState={gameState}
            myId={myId}
            roomId={roomId}
            socket={socket}
          />
        )}
      </div>
    </div>
  );
}
