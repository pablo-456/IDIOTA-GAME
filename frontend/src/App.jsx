/**
 * App.jsx — Shell de navegación HOME → LOBBY → GAME.
 * El estado de sesión vive en useRoomSession.
 */

import { useRoomSession } from './hooks/useRoomSession';
import Home from './pages/Home/Home';
import Lobby from './pages/Lobby/Lobby';
import Game from './pages/Game/Game';
import './App.css';

export default function App() {
  const {
    screen,
    roomId,
    myId,
    gameState,
    serverError,
    clearServerError,
    firstPlayer,
    clearFirstPlayer,
  } = useRoomSession();

  return (
    <div className="app">
      {serverError && (
        <div className="app__error-banner" role="alert">
          <span>⚠ {serverError}</span>
          <button onClick={clearServerError} aria-label="Cerrar">✕</button>
        </div>
      )}

      <div className="app__screen" key={screen}>
        {screen === 'HOME' && <Home />}
        {screen === 'LOBBY' && (
          <Lobby
            roomId={roomId}
            gameState={gameState}
            myId={myId}
          />
        )}
        {screen === 'GAME' && (
          <Game
            gameState={gameState}
            myId={myId}
            roomId={roomId}
            firstPlayer={firstPlayer}
            onFirstPlayerDone={clearFirstPlayer}
          />
        )}
      </div>
    </div>
  );
}
