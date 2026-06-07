import { useState, useCallback } from 'react';
import './Game.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CARD_POWER_MAP = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  '2': 99, '8': 100, '🃏': 101,
};

function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

function cardLabel(c) {
  if (c.value === '🃏') return '🃏';
  return `${c.value}${c.suit}`;
}

function isSpecialCard(value) {
  return value === '2' || value === '8' || value === '🃏';
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/**
 * Renders a single card.
 * Props: card, selected, onClick, disabled, faceDown, dimmed
 */
function Card({ card, selected, onClick, disabled, faceDown, dimmed, small }) {
  if (faceDown) {
    return (
      <button
        className={`card card--facedown${small ? ' card--small' : ''}`}
        onClick={onClick}
        disabled={disabled}
        title="Carta oculta"
      >
        <span className="card__back-pattern">♠</span>
      </button>
    );
  }

  const joker  = card.value === '🃏';
  const red    = isRedSuit(card.suit);
  const special = isSpecialCard(card.value);

  return (
    <button
      className={[
        'card',
        selected  ? 'card--selected' : '',
        disabled  ? 'card--disabled' : '',
        dimmed    ? 'card--dimmed'   : '',
        joker     ? 'card--joker'    : '',
        special   ? 'card--special'  : '',
        red       ? 'card--red'      : '',
        small     ? 'card--small'    : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={cardLabel(card)}
    >
      {joker ? (
        <span className="card__joker-icon">🃏</span>
      ) : (
        <>
          <span className="card__value-tl">{card.value}</span>
          <span className="card__suit-center">{card.suit}</span>
          <span className="card__value-br">{card.value}</span>
        </>
      )}
    </button>
  );
}

/**
 * Renders the pile with an expandable view of all cards.
 */
function PileDisplay({ pile }) {
  const [expanded, setExpanded] = useState(false);

  if (!pile || pile.length === 0) {
    return (
      <div className="pile pile--empty">
        <span className="pile__empty-icon">♠</span>
        <span className="pile__empty-label">Pila vacía</span>
      </div>
    );
  }

  const top = pile[pile.length - 1];

  return (
    <div className="pile-wrap">
      <div className="pile">
        <div className="pile__count-badge">{pile.length}</div>
        <Card card={top} disabled />
        {pile.length > 1 && <div className="pile__shadow pile__shadow--1" />}
        {pile.length > 2 && <div className="pile__shadow pile__shadow--2" />}
      </div>

      {pile.length > 1 && (
        <button
          className={`pile__view-btn${expanded ? ' pile__view-btn--open' : ''}`}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? '▲ Cerrar' : '👁 Ver cartas'}
        </button>
      )}

      {expanded && (
        <div className="pile__expanded">
          <div className="pile__expanded-header">
            <span>Cartas en mesa ({pile.length})</span>
            <button className="pile__expanded-close" onClick={() => setExpanded(false)}>✕</button>
          </div>
          <div className="pile__expanded-cards">
            {[...pile].reverse().map((card, i) => (
              <div key={card.id} className="pile__expanded-entry">
                <span className="pile__expanded-pos">#{pile.length - i}</span>
                <Card card={card} small disabled />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de cartas visibles propias (durante la partida) ───────────────────

/**
 * Muestra al jugador sus propias cartas visibles (cartasVisibles) en un panel lateral.
 * Se muestra durante la fase PLAYING mientras el jugador aún tiene cartas.
 */
function MyVisiblesPanel({ myHand }) {
  const visibles = myHand?.cartasVisibles ?? [];

  if (visibles.length === 0) return null;

  return (
    <aside className="game__my-visibles-panel">
      <div className="game__my-visibles-title">
        <span className="game__my-visibles-icon">👁</span>
        <span>Mis Visibles</span>
      </div>
      <div className="game__my-visibles-cards">
        {visibles.map((card) => (
          <Card key={card.id} card={card} small disabled />
        ))}
      </div>
    </aside>
  );
}

// ─── Fase SETUP ──────────────────────────────────────────────────────────────

function SetupPhase({ myHand, socket, roomId, isMeReady }) {
  // 1. TODOS LOS HOOKS ARRIBA DEL TODO (Siempre se deben ejecutar)
  const [selected, setSelected] = useState(new Set()); // IDs de cartas elegidas como visibles

  const toggleCard = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 2. AHORA SÍ, LOS RETORNOS CONDICIONALES VAN DESPUÉS DE LOS HOOKS
  if (isMeReady) {
    return (
      <div className="setup-phase__waiting" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⌛</div>
        <h2>¡Elección Confirmada!</h2>
        <p style={{ color: '#aaa' }}>Tu estrategia ha sido enviada al servidor.</p>
        <p>Esperando a que los demás jugadores terminen de elegir sus cartas...</p>
      </div>
    );
  }
  
  // 3. LÓGICA Y VARIABLES PARA CUANDO EL JUGADOR AÚN NO ESTÁ LISTO
  const pool = myHand?.manoPrivada ?? [];

  const handleConfirm = () => {
    if (selected.size !== 4) return;
    console.log("🚀 Enviando setup al servidor...", { roomId, idsVisibles: [...selected] });
    socket.emit('confirm_setup', { roomId, idsVisibles: [...selected] });
  };

  const readyToConfirm = selected.size === 4;

  return (
    <div className="setup">
      <div className="setup__header">
        <h2 className="setup__title">Elige tus <span className="setup__title-accent">4 cartas visibles</span></h2>
        <p className="setup__subtitle">
          Las cartas elegidas las verán todos tus rivales durante la partida.<br />
          Las otras 4 formarán tu mano privada inicial.
        </p>
        <div className="setup__counter">
          <div className={`setup__counter-dots`}>
            {[0,1,2,3].map((i) => (
              <span key={i} className={`setup__dot${i < selected.size ? ' setup__dot--filled' : ''}`} />
            ))}
          </div>
          <span className="setup__counter-label">{selected.size} / 4 seleccionadas</span>
        </div>
      </div>

      <div className="setup__pool">
        {pool.length > 0 ? pool.map((card) => (
          <div key={card.id} className="setup__card-wrap">
            <Card
              card={card}
              selected={selected.has(card.id)}
              onClick={() => toggleCard(card.id)}
              disabled={!selected.has(card.id) && selected.size >= 4}
            />
            <span className="setup__card-role">
              {selected.has(card.id) ? '👁 Visible' : '🔒 Privada'}
            </span>
          </div>
        )) : (
          // Slots vacíos mientras se reparten las cartas
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="setup__card-wrap">
              <div className="card card--loading">
                <span className="card__loading-spinner" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="setup__actions">
        <button
          className={`setup__confirm-btn${readyToConfirm ? ' setup__confirm-btn--ready' : ''}`}
          onClick={handleConfirm}
          disabled={!readyToConfirm}
        >
          {readyToConfirm ? '✦ Confirmar Estrategia' : `Selecciona ${4 - selected.size} más`}
        </button>
      </div>

      {/* Vista previa de cómo quedarán las cartas */}
      {selected.size > 0 && (
        <div className="setup__preview">
          <div className="setup__preview-col">
            <span className="setup__preview-label">👁 Visibles para todos</span>
            <div className="setup__preview-cards">
              {pool.filter((c) => selected.has(c.id)).map((c) => (
                <Card key={c.id} card={c} small disabled />
              ))}
              {Array.from({ length: 4 - selected.size }).map((_, i) => (
                <div key={i} className="card card--slot card--small">?</div>
              ))}
            </div>
          </div>
          <div className="setup__preview-col">
            <span className="setup__preview-label">🔒 Tu mano privada</span>
            <div className="setup__preview-cards">
              {pool.filter((c) => !selected.has(c.id)).map((c) => (
                <Card key={c.id} card={c} small disabled />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fase PLAYING ─────────────────────────────────────────────────────────────

function PlayingPhase({ gameState, myId, socket, roomId }) {
  const [selectedCards, setSelectedCards] = useState(new Set());

  const myPlayer    = gameState.players.find((p) => p.id === myId);
  const myHand      = gameState.myHand;
  const isMyTurn    = gameState.currentPlayerId === myId;
  const pile        = gameState.pile ?? [];
  const opponents   = (gameState.players ?? []).filter((p) => p.id !== myId);

  // Determinar zona activa del jugador local
  const activeZone = (() => {
    if (!myHand) return null;
    if (myHand.manoPrivada?.length    > 0) return 'manoPrivada';
    if (myHand.cartasVisibles?.length > 0) return 'cartasVisibles';
    if (myHand.cartasOcultas?.length  > 0) return 'cartasOcultas';
    return null;
  })();

  const activeCards = myHand?.[activeZone] ?? [];

  // Power actual de la pila para validación visual
  const pileTopPower = (() => {
    if (pile.length === 0) return 0;
    const top = pile[pile.length - 1];
    if (top.value === '2') return 0; 
    //  CORREGIDO: Ahora acepta tanto el string 'JOKER' como el emoji '🃏'
    if (top.value === '8' || top.value === 'JOKER' || top.value === '🃏') return 0; 
    return CARD_POWER_MAP[top.value] ?? top.power ?? 0;
  })();

  const canPlayCard = (card) => {
    if (!isMyTurn) return false;
    const power = CARD_POWER_MAP[card.value] ?? card.power ?? 0;
    //  CORREGIDO: Agregada la validación de 'JOKER' para activar el comodín de quema
    const burn  = card.value === '8' || card.value === 'JOKER' || card.value === '🃏';
    const reset = card.value === '2';
    return burn || reset || power >= pileTopPower;
  };

  const toggleCard = (id, value) => {
    if (!isMyTurn) return;
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // Solo permitir seleccionar cartas del mismo valor
      const currentValues = [...next].map((sid) =>
        activeCards.find((c) => c.id === sid)?.value
      );
      const allSameValue = currentValues.every((v) => v === value);
      if (next.size === 0 || allSameValue) {
        next.add(id);
      }
      return next;
    });
    if (activeZone === 'cartasOcultas') {
      setSelectedCards(new Set([id]));
      return;
    }
  };

  const handlePlayCards = () => {
    if (selectedCards.size === 0 || !isMyTurn) return;
    socket.emit('play_turn', { roomId, cardIds: [...selectedCards] });
    setSelectedCards(new Set());
  };

  const handlePickUp = () => {
    socket.emit('pick_up_pile', { roomId, voluntary: true });
    setSelectedCards(new Set());
  };

  const canPlay = selectedCards.size > 0 && isMyTurn;

  return (
    <div className="playing">
      {/* ── Rivales ── */}
      <section className="playing__opponents">
        {opponents.map((opp) => {
          const totalCards =
            opp.manoPrivadaCount +
            opp.cartasOcultasCount +
            (opp.cartasVisibles?.length ?? 0);
          const isActive = gameState.currentPlayerId === opp.id;

          return (
            <div key={opp.id} className={`opponent${isActive ? ' opponent--active' : ''}`}>
              <div className="opponent__header">
                <div className="opponent__avatar">{opp.username.charAt(0).toUpperCase()}</div>
                <div className="opponent__info">
                  <span className="opponent__name">{opp.username}</span>
                  {isActive && <span className="opponent__turn-badge">► Turno</span>}
                </div>
                <span className="opponent__card-count">{totalCards} 🃏</span>
              </div>
              {/* Cartas visibles del rival */}
              {opp.cartasVisibles?.length > 0 && (
                <div className="opponent__visibles">
                  {opp.cartasVisibles.map((c) => (
                    <Card key={c.id} card={c} small disabled />
                  ))}
                </div>
              )}
              {/* Cartas ocultas del rival */}
              {opp.cartasOcultasCount > 0 && (
                <div className="opponent__hidden">
                  {Array.from({ length: opp.cartasOcultasCount }).map((_, i) => (
                    <Card key={i} card={{}} faceDown small disabled />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ── Mesa central (pila + mazo) ── */}
      <section className="playing__board">
        <div className="playing__board-inner">
          {/* Mazo */}
          <div className="playing__deck">
            <div className="playing__deck-stack">
              <div className="card card--facedown">
                <span className="card__back-pattern">♠</span>
              </div>
            </div>
            <span className="playing__deck-count">{gameState.deckRemaining ?? 0} cartas</span>
          </div>

          {/* Separador */}
          <div className="playing__board-sep">↔</div>

          {/* Pila */}
          <div className="playing__pile-wrap">
            <PileDisplay pile={pile} />
            {pile.length > 0 && isMyTurn && (
              <button className="playing__pickup-btn" onClick={handlePickUp} title="Recoger la mesa">
                ↩ Recoger Mesa
              </button>
            )}
          </div>
        </div>

        {/* Info de turno */}
        <div className={`playing__turn-banner${isMyTurn ? ' playing__turn-banner--mine' : ''}`}>
          {isMyTurn
            ? '✦ Es tu turno — elige carta(s) para jugar'
            : `Turno de ${gameState.players?.find(p => p.id === gameState.currentPlayerId)?.username ?? '…'}`
          }
        </div>
      </section>

      {/* ── Mano del jugador local ── */}
      <section className={`playing__hand${isMyTurn ? ' playing__hand--active' : ''}`}>
        <div className="playing__hand-header">
          <span className="playing__hand-zone-label">
            {activeZone === 'manoPrivada'    && '🔒 Tu mano privada'}
            {activeZone === 'cartasVisibles' && `👁 Tus cartas visibles (${activeCards.length})`}
            {activeZone === 'cartasOcultas'  && '❓ Cartas ocultas (azar)'}
            {!activeZone && '— Sin cartas —'}
          </span>
        </div>

        {/* ── Strip de cartas visibles propias — solo visible en móvil ── */}
        {myHand?.cartasVisibles?.length > 0 && (
          <div className="playing__hand-mobile-visibles">
            <span className="playing__hand-mobile-visibles-label">👁 Visibles</span>
            <div className="playing__hand-mobile-visibles-cards">
              {myHand.cartasVisibles.map((card) => (
                <Card key={card.id} card={card} small disabled />
              ))}
            </div>
          </div>
        )}


        <div className="playing__hand-cards">
          {activeCards.map((card) => {
            const playable = canPlayCard(card);
            return (
              <Card
                key={card.id}
                card={card}
                selected={selectedCards.has(card.id)}
                onClick={() => toggleCard(card.id, card.value)}
                disabled={!isMyTurn || (activeZone !== 'cartasOcultas' && !playable)}
                dimmed={isMyTurn && !playable && !selectedCards.has(card.id)}
                faceDown={activeZone === 'cartasOcultas'}
              />
            );
          })}
        </div>

        {isMyTurn && (
          <div className="playing__hand-actions">
            <button
              className={`playing__play-btn${canPlay ? ' playing__play-btn--ready' : ''}`}
              onClick={handlePlayCards}
              disabled={!canPlay}
            >
              {canPlay
                ? `▶ Jugar ${selectedCards.size} carta${selectedCards.size !== 1 ? 's' : ''}`
                : 'Selecciona carta(s) para jugar'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Overlay de jugada especial (8 / Joker) ────────────────────────────────

function SpecialPlayOverlay({ event, myId }) {
  if (!event) return null;
  const { playerId, playerName, card, burned } = event;
  const isMe   = playerId === myId;
  const isJoker = card.value === '🃏' || card.value === 'JOKER';

  return (
    <div className="special-overlay">
      <div className="special-overlay__backdrop" />
      <div className="special-overlay__stage">
        <div className="special-overlay__particles">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="special-overlay__particle" style={{ '--i': i }} />
          ))}
        </div>

        <div className="special-overlay__card-wrap">
          <div className={'card special-overlay__card' + (isJoker ? ' card--joker' : ' card--special')}>
            {isJoker ? (
              <span className="card__joker-icon">🃏</span>
            ) : (
              <>
                <span className="card__value-tl">{card.value}</span>
                <span className="card__suit-center">{card.suit}</span>
                <span className="card__value-br">{card.value}</span>
              </>
            )}
          </div>
        </div>

        <div className="special-overlay__label">
          {isJoker ? '✦ COMODÍN ✦' : '✦ RESET ✦'}
        </div>
        <div className="special-overlay__who">
          {isMe ? '¡Tú jugaste la carta!' : playerName + ' jugó la carta'}
        </div>
        {burned && (
          <div className="special-overlay__burned">🔥 ¡La pila se quema!</div>
        )}
      </div>
    </div>
  );
}

// ─── Overlay de coronación del idiota ────────────────────────────────────────

function CrownOverlay({ visible, loserName, amILoser, onDone }) {
  if (!visible) return null;

  return (
    <div className="crown-overlay">
      <div className="crown-overlay__backdrop" />
      <div className="crown-overlay__stage">
        <div className="crown-overlay__crown">👑</div>
        <div className="crown-overlay__sparks">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="crown-overlay__spark" style={{ '--i': i }} />
          ))}
        </div>
        <div className="crown-overlay__text">
          {amILoser ? 'La corona del idiota es tuya…' : (loserName || 'Alguien') + ' es coronado…'}
        </div>
        <div className="crown-overlay__subtext">
          {amILoser ? '🤡 TÚ ERES EL IDIOTA' : '🤡 EL IDIOTA HA SIDO REVELADO'}
        </div>
        <div className="crown-overlay__timer">
          <div
            className="crown-overlay__timer-bar"
            onAnimationEnd={(e) => { if (e.target === e.currentTarget) onDone(); }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Overlay de carta revelada (fase de azar) ───────────────────────────────

/**
 * Overlay dramático mostrado a TODOS cuando alguien voltea una carta oculta mala.
 * Se muestra 3 segundos antes de que la pila se tome automáticamente.
 */
function CardRevealOverlay({ event, myId }) {
  if (!event) return null;

  const { playerId, playerName, card, mustPickUp } = event;
  const isMe    = playerId === myId;
  const joker   = card.value === '🃏';
  const red     = card.suit === '♥' || card.suit === '♦';
  const special = card.value === '2' || card.value === '8' || joker;

  return (
    <div className="reveal-overlay">
      <div className="reveal-overlay__backdrop" />
      <div className="reveal-overlay__card-stage">

        <div className="reveal-overlay__who">
          {isMe ? '¡Volteaste una carta!' : playerName + ' volteó una carta oculta'}
        </div>

        <div className="reveal-overlay__card-wrap">
          <div
            className={[
              'card', 'reveal-overlay__card',
              joker   ? 'card--joker'   : '',
              special ? 'card--special' : '',
              red     ? 'card--red'     : '',
            ].filter(Boolean).join(' ')}
          >
            {joker ? (
              <span className="card__joker-icon">🃏</span>
            ) : (
              <>
                <span className="card__value-tl">{card.value}</span>
                <span className="card__suit-center">{card.suit}</span>
                <span className="card__value-br">{card.value}</span>
              </>
            )}
          </div>
        </div>

        {mustPickUp ? (
          <div className="reveal-overlay__verdict reveal-overlay__verdict--bad">
            {isMe
              ? '😬 Carta baja… ¡recoge la pila!'
              : '😂 Carta baja — ' + playerName + ' se lleva la pila'}
          </div>
        ) : (
          <div className="reveal-overlay__verdict reveal-overlay__verdict--good">
            {isMe ? '😎 ¡Buena carta!' : '😎 ¡Buena carta para ' + playerName + '!'}
          </div>
        )}

        <div className="reveal-overlay__timer">
          <div className="reveal-overlay__timer-bar" />
        </div>
      </div>
    </div>
  );
}

// ─── Vista Espectador (jugador salvado mirando la partida) ───────────────────

function SpectatorView({ gameState, myId }) {
  const pile      = gameState.pile ?? [];
  const opponents = (gameState.players ?? []).filter((p) => p.id !== myId && !p.isSaved);
  const saved     = (gameState.players ?? []).filter((p) => p.id !== myId && p.isSaved);

  return (
    <div className="spectator">
      <div className="spectator__banner">
        👁 Estás mirando la partida — ya te salvaste
      </div>

      {/* Jugadores activos que quedan */}
      <section className="playing__opponents">
        {opponents.map((opp) => {
          const totalCards =
            opp.manoPrivadaCount +
            opp.cartasOcultasCount +
            (opp.cartasVisibles?.length ?? 0);
          const isActive = gameState.currentPlayerId === opp.id;

          return (
            <div key={opp.id} className={`opponent${isActive ? ' opponent--active' : ''}`}>
              <div className="opponent__header">
                <div className="opponent__avatar">{opp.username.charAt(0).toUpperCase()}</div>
                <div className="opponent__info">
                  <span className="opponent__name">{opp.username}</span>
                  {isActive && <span className="opponent__turn-badge">► Turno</span>}
                </div>
                <span className="opponent__card-count">{totalCards} 🃏</span>
              </div>
              {opp.cartasVisibles?.length > 0 && (
                <div className="opponent__visibles">
                  {opp.cartasVisibles.map((c) => (
                    <Card key={c.id} card={c} small disabled />
                  ))}
                </div>
              )}
              {opp.cartasOcultasCount > 0 && (
                <div className="opponent__hidden">
                  {Array.from({ length: opp.cartasOcultasCount }).map((_, i) => (
                    <Card key={i} card={{}} faceDown small disabled />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Mesa central */}
      <section className="playing__board">
        <div className="playing__board-inner">
          <div className="playing__deck">
            <div className="playing__deck-stack">
              <div className="card card--facedown">
                <span className="card__back-pattern">♠</span>
              </div>
            </div>
            <span className="playing__deck-count">{gameState.deckRemaining ?? 0} cartas</span>
          </div>
          <div className="playing__board-sep">↔</div>
          <div className="playing__pile-wrap">
            <PileDisplay pile={pile} />
          </div>
        </div>
        <div className="playing__turn-banner">
          {`Turno de ${gameState.players?.find(p => p.id === gameState.currentPlayerId)?.username ?? '…'}`}
        </div>
      </section>

      <div className="spectator__hand-placeholder">
        ✅ No tienes cartas — ¡a descansar!
      </div>
    </div>
  );
}

// ─── Componente principal Game ────────────────────────────────────────────────

/**
 * Game — Pantalla de la partida.
 *
 * Props:
 *   gameState {object} — Estado público/privado más reciente
 *   myId      {string} — socket.id del jugador local
 *   roomId    {string} — Código de sala
 *   socket    {object} — Instancia del socket
 */
export default function Game({ gameState, myId, roomId, socket }) {
  const status    = gameState?.status ?? 'SETUP';
  const isMyTurn  = gameState?.currentPlayerId === myId;
  const currentId = gameState?.currentPlayerId;

  // ── Estado local para notificación de salvado y tracking de juego en curso ──
  const [iSaved, setISaved]           = useState(false);
  const [savedNotif, setSavedNotif]   = useState(false);
  const savedPlayers                  = gameState?.savedPlayers ?? [];
  const amISaved                      = gameState?.players?.find(p => p.id === myId)?.isSaved ?? false;

  // ── Reveal de carta oculta (azar) ───────────────────────────────────────────
  const [revealEvent, setRevealEvent]     = useState(null);
  // ── Jugada especial (8 o Joker) ─────────────────────────────────────────────
  const [specialEvent, setSpecialEvent]   = useState(null);
  // ── Animación de coronación del idiota antes de mostrar FINISHED ─────────────
  const [showCrown, setShowCrown]         = useState(false);
  const [crownDone, setCrownDone]         = useState(false);
  // ── Datos del game_over recibidos por evento (fuente de verdad para loserId) ──
  const [gameOverData, setGameOverData]   = useState(null);

  // Escuchar evento personal player_saved del servidor
  useState(() => {
    if (!socket) return;
    const handler = ({ message, savedPlayers: sp }) => {
      setISaved(true);
      setSavedNotif(true);
      setTimeout(() => setSavedNotif(false), 6000);
    };
    socket.on('player_saved', handler);
    return () => socket.off('player_saved', handler);
  });

  // Escuchar card_revealed
  useState(() => {
    if (!socket) return;
    const handler = (data) => {
      const { card, mustPickUp } = data;
      const isSpecial = card.value === '8' || card.value === '🃏' || card.value === 'JOKER';
      // Si es 8/Joker bueno, el SpecialPlayOverlay ya cubre la animación — no duplicar
      if (!mustPickUp && isSpecial) return;
      setRevealEvent(data);
      setTimeout(() => setRevealEvent(null), 3200);
    };
    socket.on('card_revealed', handler);
    return () => socket.off('card_revealed', handler);
  });

  // Escuchar special_play (8 o Joker)
  useState(() => {
    if (!socket) return;
    const handler = (data) => {
      setSpecialEvent(data);
      setTimeout(() => setSpecialEvent(null), 2200);
    };
    socket.on('special_play', handler);
    return () => socket.off('special_play', handler);
  });

  // Escuchar game_over — fuente de verdad para saber quién es el idiota
  useState(() => {
    if (!socket) return;
    const handler = (data) => {
      setGameOverData(data);
    };
    socket.on('game_over', handler);
    return () => socket.off('game_over', handler);
  });

  // ── Pantalla FINISHED ──────────────────────────────────────────────────────
  // Usar gameOverData como fuente de verdad (llega por evento game_over)
  // y gameState como fallback (lo tiene tras el game_started que precede al game_over)
  const loserId   = gameOverData?.loserId ?? gameState?.loserId ?? null;
  const loserName = gameOverData?.loserName
                    ?? gameState?.players?.find(p => p.id === loserId)?.username
                    ?? null;
  const amILoser  = !!loserId && loserId === myId;
  const amISavedFinished = !!loserId && loserId !== myId;

  return (
    <div className="game">
      {/* ── Overlay de carta revelada (azar) ── */}
      <CardRevealOverlay event={revealEvent} myId={myId} />

      {/* ── Overlay de jugada especial (8 / Joker) ── */}
      <SpecialPlayOverlay event={specialEvent} myId={myId} />

      {/* ── Animación de coronación del idiota ── */}
      <CrownOverlay
        visible={gameState?.status === 'FINISHED' && !crownDone}
        loserName={loserName}
        amILoser={amILoser}
        onDone={() => setCrownDone(true)}
      />

      {/* ── Topbar ── */}
      <header className="game__topbar">
        <div className="game__topbar-left">
          <span className="game__logo">♣ IDIOTA</span>
          <span className="game__room-code">{roomId}</span>
        </div>

        <div className={`game__phase-badge${isMyTurn && status === 'PLAYING' ? ' game__phase-badge--myturn' : ''}`}>
          {status === 'SETUP'    && '⚙ Fase de Configuración'}
          {status === 'PLAYING'  && (
            amISaved
              ? '✅ Estás a salvo — mirando la partida'
              : isMyTurn
                ? '✦ Tu turno'
                : `Turno de ${gameState?.players?.find(p => p.id === currentId)?.username ?? '…'}`
          )}
          {status === 'FINISHED' && '🃏 Fin de partida'}
        </div>

        <div className="game__topbar-right">
          <span className="game__deck-info">🃏 {gameState?.deckRemaining ?? '—'}</span>
        </div>
      </header>

      {/* ── Notificación flotante de salvado ── */}
      {savedNotif && (
        <div className="game__saved-toast">
          🎉 ¡Te salvaste! Ya no tienes cartas.<br />
          <small>Sigue viendo la batalla de los demás…</small>
        </div>
      )}

      {/* ── Contenido principal según fase ── */}
      <main className="game__main">
        {status === 'SETUP' && (
          <SetupPhase
            myHand={gameState?.myHand}
            socket={socket}
            roomId={roomId}
            isMeReady={gameState?.players?.find(p => p.id === myId)?.isReady}
          />
        )}

        {status === 'PLAYING' && (
          <div className="game__playing-layout">
            {/* ── Panel izquierdo: salvados ── */}
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
                /* ── Vista espectador: jugador local ya se salvó ── */
                <SpectatorView gameState={gameState} myId={myId} />
              ) : (
                <PlayingPhase
                  gameState={gameState}
                  myId={myId}
                  socket={socket}
                  roomId={roomId}
                />
              )}
            </div>

            {/* ── Panel derecho: cartas visibles propias ── */}
            {!amISaved && (
              <MyVisiblesPanel myHand={gameState?.myHand} />
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

            {/* Ranking de salvados — incluye al último salvado */}
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
          </div>
        )}
      </main>
    </div>
  );
}