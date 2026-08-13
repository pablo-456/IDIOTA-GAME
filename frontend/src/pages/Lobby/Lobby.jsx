import { useEffect, useState } from 'react';
import { useGameActions } from '../../hooks/useGameActions';
import { useAudio } from '../../hooks/useAudio';
import MuteButton from '../../components/ui/MuteButton/MuteButton';
import './Lobby.css';

/**
 * Lobby — Sala de espera.
 *
 * Props:
 *   roomId    {string}      — Código de la sala
 *   gameState {object}      — Estado público más reciente recibido por socket
 *   myId      {string}      — socket.id del jugador local
 *   isPublic  {boolean}     — sala visible en listado público
 */
export default function Lobby({ roomId, gameState, myId, isPublic = false, onLeave }) {
  const { startSetup } = useGameActions();
  const { unlock, startMusic } = useAudio();
  const [copied, setCopied]   = useState(false);
  const [starting, setStarting] = useState(false);

  const players    = gameState?.players ?? [];
  const isHost     = players[0]?.id === myId;
  const canStart   = players.length >= 3 && players.length <= 7;

  // Indicador de "suficientes jugadores" para el host
  const missingPlayers = Math.max(0, 3 - players.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await unlock();
      if (!cancelled) await startMusic();
    })();
    return () => { cancelled = true; };
  }, [unlock, startMusic]);

  function handleCopy() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStart() {
    if (!canStart) return;
    setStarting(true);
    startSetup(roomId);
  }

  // Si el servidor rechaza (error), reactivar el botón
  useEffect(() => {
    setStarting(false);
  }, [gameState]);

  return (
    <div className="lobby">
      <MuteButton floating />
      <div className="lobby__bg-pattern" aria-hidden="true" />

      <div className="lobby__wrapper">
        {/* ── Panel de código / tipo de sala ── */}
        <div className="lobby__code-panel">
          {isPublic ? (
            <>
              <p className="lobby__code-label">Tipo de sala</p>
              <div className="lobby__public-badge" role="status">
                Este lobby es público
              </div>
              <p className="lobby__code-hint">
                Visible en el listado de salas públicas
              </p>
              <p className="lobby__code-secondary">Código · {roomId}</p>
            </>
          ) : (
            <>
              <p className="lobby__code-label">Código de sala</p>
              <div className="lobby__code-display">
                <span className="lobby__code-text">{roomId}</span>
                <button className="lobby__copy-btn" onClick={handleCopy} title="Copiar código">
                  {copied ? '✓' : '⧉'}
                </button>
              </div>
              <p className="lobby__code-hint">
                {copied ? '¡Copiado!' : 'Comparte este código con tus amigos'}
              </p>
            </>
          )}
        </div>

        {/* ── Panel de jugadores ── */}
        <div className="lobby__players-panel">
          <div className="lobby__players-header">
            <h2 className="lobby__players-title">Jugadores</h2>
            <span className="lobby__players-count">
              {players.length} <span className="lobby__count-sep">/</span> 7
            </span>
          </div>

          {/* Barra de progreso de jugadores */}
          <div className="lobby__progress-bar" role="progressbar" aria-valuenow={players.length} aria-valuemax={7}>
            <div
              className="lobby__progress-fill"
              style={{ width: `${(players.length / 7) * 100}%` }}
            />
            {/* Marcador de mínimo (3 jugadores) */}
            <div className="lobby__progress-min" style={{ left: `${(3/7)*100}%` }} />
          </div>

          {/* Lista de jugadores */}
          <ul className="lobby__players-list">
            {players.map((player, idx) => (
              <li
                key={player.id}
                className={`lobby__player ${player.id === myId ? 'lobby__player--me' : ''}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="lobby__player-avatar">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div className="lobby__player-info">
                  <span className="lobby__player-name">
                    {player.username}
                    {player.id === myId && <span className="lobby__player-you"> (tú)</span>}
                  </span>
                  {idx === 0 && (
                    <span className="lobby__player-role">Anfitrión</span>
                  )}
                  {player.isConnected === false && (
                    <span className="lobby__player-reconnect">Reconectando…</span>
                  )}
                </div>
                <div className="lobby__player-status">
                  <span className="lobby__status-dot lobby__status-dot--ready" />
                </div>
              </li>
            ))}

            {/* Slots vacíos */}
            {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
              <li key={`empty-${i}`} className="lobby__player lobby__player--empty">
                <div className="lobby__player-avatar lobby__player-avatar--empty">?</div>
                <span className="lobby__player-waiting">Esperando jugador…</span>
              </li>
            ))}
          </ul>

          {/* Botón volver al inicio */}
          <button
            className="lobby__home-btn"
            onClick={() => {
              if (typeof onLeave === 'function') onLeave();
              else window.location.reload();
            }}
          >
            ↩ Volver al inicio
          </button>

          {/* Mensaje de espera / acción */}
          <div className="lobby__footer-zone">
            {isHost ? (
              <>
                {missingPlayers > 0 && (
                  <p className="lobby__hint">
                    Necesitas <strong>{missingPlayers}</strong> jugador{missingPlayers !== 1 ? 'es' : ''} más para comenzar
                  </p>
                )}
                <button
                  className={`lobby__start-btn ${canStart && !starting ? 'lobby__start-btn--ready' : ''}`}
                  onClick={handleStart}
                  disabled={!canStart || starting}
                >
                  {starting ? (
                    <><span className="lobby__spinner" /> Iniciando…</>
                  ) : canStart ? (
                    <>✦ Iniciar Partida</>
                  ) : (
                    <>Esperando jugadores…</>
                  )}
                </button>
              </>
            ) : (
              <div className="lobby__waiting">
                <div className="lobby__waiting-dots">
                  <span /><span /><span />
                </div>
                <p>Esperando que el anfitrión inicie la partida</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}