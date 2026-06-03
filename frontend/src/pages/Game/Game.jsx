import './Game.css';

/**
 * Game — Pantalla de la partida.
 *
 * Por ahora: cascarón con la fase de configuración.
 * Los contenedores GameBoard y PlayerHand se construirán en el siguiente paso.
 *
 * Props:
 *   gameState {object} — Estado público/privado más reciente
 *   myId      {string} — socket.id del jugador local
 *   roomId    {string} — Código de sala
 */
export default function Game({ gameState, myId, roomId }) {
  const status      = gameState?.status ?? 'SETUP';
  const myPlayer    = gameState?.players?.find(p => p.id === myId);
  const myHand      = gameState?.myHand;
  const currentId   = gameState?.currentPlayerId;
  const isMyTurn    = currentId === myId;

  return (
    <div className="game">
      {/* ── Cabecera de partida ── */}
      <header className="game__topbar">
        <div className="game__topbar-left">
          <span className="game__logo">♣ IDIOTA</span>
          <span className="game__room-code">{roomId}</span>
        </div>

        <div className="game__phase-badge">
          {status === 'SETUP'    && '⚙ Configuración'}
          {status === 'PLAYING'  && (isMyTurn ? '✦ Tu turno' : `Turno de ${gameState?.players?.find(p=>p.id===currentId)?.username ?? '…'}`)}
          {status === 'FINISHED' && '🏆 Fin de partida'}
        </div>

        <div className="game__topbar-right">
          <span className="game__deck-info">
            🃏 {gameState?.deckRemaining ?? '—'} cartas
          </span>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          ZONA DE JUEGO PRINCIPAL
          En el siguiente paso GameBoard y PlayerHand se
          insertarán dentro de estos contenedores.
      ══════════════════════════════════════════════════════ */}

      <main className="game__main">

        {/* ── Área de la Mesa (GameBoard) ── */}
        <section className="game__board-zone" aria-label="Mesa de juego">
          {/* TODO: <GameBoard pile={gameState?.pile} /> */}
          <div className="game__board-placeholder">
            <div className="game__board-felt">
              <div className="game__board-center">
                <span className="game__board-icon">♠</span>
                <p className="game__board-label">Mesa de Juego</p>
                <p className="game__board-sublabel">
                  {gameState?.pile?.length
                    ? `${gameState.pile.length} carta${gameState.pile.length !== 1 ? 's' : ''} en la pila`
                    : 'La pila está vacía'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Área de jugadores rivales (PlayerHand oponentes) ── */}
        <section className="game__opponents-zone" aria-label="Jugadores rivales">
          {/* TODO: <OpponentHands players={...} /> */}
          <div className="game__opponents-placeholder">
            {(gameState?.players ?? [])
              .filter(p => p.id !== myId)
              .map(p => (
                <div key={p.id} className="game__opponent-chip">
                  <div className="game__opp-avatar">{p.username.charAt(0).toUpperCase()}</div>
                  <span className="game__opp-name">{p.username}</span>
                  <span className="game__opp-cards">
                    {p.manoPrivadaCount + p.cartasOcultasCount + (p.cartasVisibles?.length ?? 0)} cartas
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* ── Área de mano del jugador local (PlayerHand) ── */}
        <section className="game__hand-zone" aria-label="Tu mano">
          {/* TODO: <PlayerHand hand={myHand} isMyTurn={isMyTurn} /> */}
          <div className={`game__hand-placeholder ${isMyTurn ? 'game__hand-placeholder--active' : ''}`}>
            <p className="game__hand-label">
              {status === 'SETUP'
                ? '¡Bienvenidos a la Fase de Configuración de IDIOTA!'
                : isMyTurn
                  ? '✦ Es tu turno — elige una carta para jugar'
                  : 'Tu mano · Espera tu turno'}
            </p>

            {status === 'SETUP' && (
              <div className="game__setup-hint">
                <div className="game__setup-cards">
                  {(myHand?.manoPrivada ?? []).map((c, i) => (
                    <div
                      key={c.id}
                      className="game__setup-card"
                      style={{ '--ci': i }}
                      title={`${c.value}${c.suit}`}
                    >
                      <span className={c.suit === '♥' || c.suit === '♦' ? 'red' : ''}>
                        {c.value}
                      </span>
                      <span className={`game__setup-suit ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''}`}>
                        {c.suit}
                      </span>
                    </div>
                  ))}

                  {/* Si aún no hay cartas asignadas, mostrar slots vacíos */}
                  {(!myHand?.manoPrivada?.length) && Array.from({ length: 4 }).map((_, i) => (
                    <div key={`slot-${i}`} className="game__setup-card game__setup-card--empty" style={{ '--ci': i }}>
                      <span>?</span>
                    </div>
                  ))}
                </div>
                <p className="game__setup-text">
                  Elige tus cartas visibles y tu mano inicial.<br />
                  <em>Este componente se completará en el siguiente paso.</em>
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
