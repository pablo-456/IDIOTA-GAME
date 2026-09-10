import { useState, useEffect, useRef } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents';
import { useGameActions } from '../../hooks/useGameActions';
import { useAudio } from '../../hooks/useAudio';
import SetupPhase from '../../components/game/SetupPhase/SetupPhase';
import PlayingPhase from '../../components/game/PlayingPhase/PlayingPhase';
import SpectatorView from '../../components/game/SpectatorView/SpectatorView';
import MyVisiblesPanel from '../../components/game/MyVisiblesPanel/MyVisiblesPanel';
import SpecialPlayOverlay from '../../components/overlays/SpecialPlayOverlay/SpecialPlayOverlay';
import CrownOverlay from '../../components/overlays/CrownOverlay/CrownOverlay';
import CardRevealOverlay from '../../components/overlays/CardRevealOverlay/CardRevealOverlay';
import LastHiddenCardOverlay from '../../components/overlays/LastHiddenCardOverlay/LastHiddenCardOverlay';
import StartRouletteOverlay from '../../components/overlays/StartRouletteOverlay/StartRouletteOverlay';
import './Game.css';

/**
 * Game — Shell de partida: topbar, overlays y composición por fase.
 */
export default function Game({ gameState, myId, roomId, firstPlayer = null, onFirstPlayerDone }) {
  const status = gameState?.status ?? 'SETUP';
  const isMyTurn = gameState?.currentPlayerId === myId;
  const currentId = gameState?.currentPlayerId;

  const savedPlayers = gameState?.savedPlayers ?? [];
  const amISaved = gameState?.players?.find((p) => p.id === myId)?.isSaved ?? false;

  const { savedNotif, revealEvent, lastHiddenCardEvent, specialEvent, gameOverData } = useGameEvents();
  const { confirmSetup, playTurn, pickUpPile } = useGameActions();
  const { muted, toggleMute, unlock, play, startMusic } = useAudio();

  const [crownDone, setCrownDone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rouletteDone, setRouletteDone] = useState(false);
  const wasMyTurn = useRef(false);

  const showRoulette = !!firstPlayer?.id && !rouletteDone && status === 'PLAYING';

  useEffect(() => {
    // Nueva partida / nuevo firstPlayer → permitir mostrar ruleta otra vez
    if (firstPlayer?.id) setRouletteDone(false);
  }, [firstPlayer?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await unlock();
      if (!cancelled) await startMusic();
    })();
    return () => { cancelled = true; };
  }, [unlock, startMusic]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    // No avisar turno mientras gira la ruleta de inicio
    if (showRoulette) return;
    if (isMyTurn && status === 'PLAYING' && !amISaved && !wasMyTurn.current) {
      play('myTurn');
    }
    wasMyTurn.current = isMyTurn && status === 'PLAYING' && !amISaved;
  }, [isMyTurn, status, amISaved, play, showRoulette]);

  const handlePlayCards = (cardIds) => {
    play('playCard');
    playTurn(roomId, cardIds);
  };

  const handlePickUp = () => {
    play('pickup');
    pickUpPile(roomId, true);
  };

  const handleRouletteDone = () => {
    setRouletteDone(true);
    onFirstPlayerDone?.();
  };

  const loserId = gameOverData?.loserId ?? gameState?.loserId ?? null;
  const loserName = gameOverData?.loserName
    ?? gameState?.players?.find((p) => p.id === loserId)?.username
    ?? null;
  const amILoser = !!loserId && loserId === myId;

  return (
    <div className="game">
      <StartRouletteOverlay
        visible={showRoulette}
        players={gameState?.players ?? []}
        winnerId={firstPlayer?.id}
        myId={myId}
        onDone={handleRouletteDone}
      />
      <LastHiddenCardOverlay event={lastHiddenCardEvent} myId={myId} />
      <CardRevealOverlay event={revealEvent} myId={myId} />
      <SpecialPlayOverlay event={specialEvent} myId={myId} />
      <CrownOverlay
        visible={gameState?.status === 'FINISHED' && !crownDone}
        loserName={loserName}
        amILoser={amILoser}
        onDone={() => setCrownDone(true)}
      />

      <header className="game__topbar">
        <div className="game__topbar-left">
          <span className="game__logo">♣ IDIOTA</span>
          <span className="game__room-code">{roomId}</span>
          <button
            type="button"
            className={`game__mute-btn${muted ? ' game__mute-btn--muted' : ''}`}
            onClick={() => { unlock(); toggleMute(); }}
            title={muted ? 'Activar sonido' : 'Silenciar'}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className={`game__phase-badge${isMyTurn && status === 'PLAYING' ? ' game__phase-badge--myturn' : ''}`}>
          {status === 'SETUP' && '⚙ Fase de Configuración'}
          {status === 'PLAYING' && (
            amISaved
              ? '✅ Estás a salvo — mirando la partida'
              : isMyTurn
                ? '✦ Tu turno'
                : `Turno de ${gameState?.players?.find((p) => p.id === currentId)?.username ?? '…'}`
          )}
          {status === 'FINISHED' && '🃏 Fin de partida'}
        </div>

        <div className="game__topbar-right">
          <button
            type="button"
            className="game__fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? '❐' : '⛶'}
          </button>
          <span className="game__deck-info">
            <span className="game__deck-info-label">Cartas restantes: </span>
            🃏 {gameState?.deckRemaining ?? '—'}
          </span>
        </div>
      </header>

      {savedNotif && (
        <div className="game__saved-toast">
          🎉 ¡Te salvaste! Ya no tienes cartas.<br />
          <small>Sigue viendo la batalla de los demás…</small>
        </div>
      )}

      <main className="game__main">
        {status === 'SETUP' && (
          <SetupPhase
            myHand={gameState?.myHand}
            isMeReady={gameState?.players?.find((p) => p.id === myId)?.isReady}
            onConfirmSetup={(idsVisibles) => confirmSetup(roomId, idsVisibles)}
          />
        )}

        {status === 'PLAYING' && (
          <div className="game__playing-layout">
            {savedPlayers.length > 0 && (
              <aside className="game__saved-panel game__saved-panel--left">
                <div className="game__saved-panel-title">✅ A Salvo</div>
                {savedPlayers.map((sp, i) => (
                  <div key={sp.id} className={`game__saved-entry${sp.id === myId ? ' game__saved-entry--me' : ''}`}>
                    <span className="game__saved-pos">#{i + 1}</span>
                    <span className="game__saved-avatar">{sp.username.charAt(0).toUpperCase()}</span>
                    <span className="game__saved-name">
                      {sp.id === myId ? 'Tú 🎉' : sp.username}
                    </span>
                  </div>
                ))}
              </aside>
            )}

            <div className="game__playing-center">
              {amISaved ? (
                <SpectatorView gameState={gameState} myId={myId} />
              ) : (
                <PlayingPhase
                  gameState={gameState}
                  myId={myId}
                  onPlayCards={handlePlayCards}
                  onPickUp={handlePickUp}
                />
              )}
            </div>

            {!amISaved && (
              <MyVisiblesPanel
                visibles={gameState?.players?.find((p) => p.id === myId)?.cartasVisibles ?? []}
              />
            )}
          </div>
        )}

        {status === 'FINISHED' && crownDone && (
          <div className="game__finished">
            {amILoser ? (
              <>
                <div className="game__finished-trophy game__finished-trophy--loser">🤡</div>
                <h2 className="game__finished-title game__finished-title--loser">
                  TÚ ERES EL IDIOTA
                </h2>
                <p className="game__finished-subtitle">
                  Fuiste el último en quedarte con cartas. Más suerte la próxima vez.
                </p>
              </>
            ) : (
              <>
                <div className="game__finished-trophy">🎉</div>
                <h2 className="game__finished-title">¡Te salvaste!</h2>
                <p className="game__finished-winner">
                  {loserName
                    ? <><strong>{loserName}</strong> es el idiota de esta ronda.</>
                    : 'La partida ha terminado.'}
                </p>
              </>
            )}

            {(savedPlayers.length > 0 || loserId) && (
              <div className="game__finished-ranking">
                <div className="game__finished-ranking-title">🏅 Orden de salvación</div>
                {savedPlayers.map((sp, i) => (
                  <div key={sp.id} className="game__finished-rank-entry">
                    <span className="game__finished-rank-pos">#{i + 1}</span>
                    <span className="game__finished-rank-name">
                      {sp.id === myId ? `${sp.username} (Tú)` : sp.username}
                    </span>
                  </div>
                ))}
                {loserId && (
                  <div className="game__finished-rank-entry game__finished-rank-entry--loser">
                    <span className="game__finished-rank-pos">🤡</span>
                    <span className="game__finished-rank-name">
                      {amILoser ? `${loserName ?? 'Tú'} (Tú) — EL IDIOTA` : `${loserName} — EL IDIOTA`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              className="game__finished-home-btn"
              onClick={() => window.location.reload()}
            >
              ↩ Volver al inicio
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
