import { useState } from 'react';
import Card from '../../cards/Card';
import OpponentsRow from '../OpponentsRow/OpponentsRow';
import BoardCenter from '../BoardCenter/BoardCenter';
import { getPileTopPower, canPlayAgainstPile } from '../../../constants/cardRules';
import './PlayingPhase.css';

/**
 * Fase PLAYING activa.
 * Acciones vía onPlayCards / onPickUp — sin socket directo.
 */
export default function PlayingPhase({ gameState, myId, onPlayCards, onPickUp }) {
  const [selectedCards, setSelectedCards] = useState(new Set());

  const myHand = gameState.myHand;
  const isMyTurn = gameState.currentPlayerId === myId;
  const pile = gameState.pile ?? [];
  const opponents = (gameState.players ?? []).filter((p) => p.id !== myId);

  const activeZone = (() => {
    if (!myHand) return null;
    if (myHand.manoPrivada?.length > 0) return 'manoPrivada';
    if (myHand.cartasVisibles?.length > 0) return 'cartasVisibles';
    if (myHand.cartasOcultas?.length > 0) return 'cartasOcultas';
    return null;
  })();

  const activeCards = myHand?.[activeZone] ?? [];
  const pileTopPower = getPileTopPower(pile);

  const canPlayCard = (card) => canPlayAgainstPile(card, pileTopPower, isMyTurn);

  const toggleCard = (id, value) => {
    if (!isMyTurn) return;
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
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
    }
  };

  const handlePlayCards = () => {
    if (selectedCards.size === 0 || !isMyTurn) return;
    onPlayCards([...selectedCards]);
    setSelectedCards(new Set());
  };

  const handlePickUp = () => {
    onPickUp();
    setSelectedCards(new Set());
  };

  const canPlay = selectedCards.size > 0 && isMyTurn;
  const currentName =
    gameState.players?.find((p) => p.id === gameState.currentPlayerId)?.username ?? '…';
  const myPublicVisibles =
    gameState.players?.find((p) => p.id === myId)?.cartasVisibles ?? [];

  return (
    <div className="playing">
      <OpponentsRow opponents={opponents} currentPlayerId={gameState.currentPlayerId} />

      <BoardCenter
        deckRemaining={gameState.deckRemaining}
        pile={pile}
        turnBanner={
          isMyTurn
            ? '✦ Es tu turno — elige carta(s) para jugar'
            : `Turno de ${currentName}`
        }
        turnBannerMine={isMyTurn}
        showPickUp={pile.length > 0 && isMyTurn}
        onPickUp={handlePickUp}
      />

      <section className={`playing__hand${isMyTurn ? ' playing__hand--active' : ''}`}>
        <div className="playing__hand-header">
          <span className="playing__hand-zone-label">
            {activeZone === 'manoPrivada' && '🔒 Tu mano privada'}
            {activeZone === 'cartasVisibles' && `👁 Tus cartas visibles (${activeCards.length})`}
            {activeZone === 'cartasOcultas' && '❓ Cartas ocultas (azar)'}
            {!activeZone && '— Sin cartas —'}
          </span>
        </div>

        {myPublicVisibles.length > 0 && (
          <div className="playing__hand-mobile-visibles">
            <span className="playing__hand-mobile-visibles-label">👁 Visibles</span>
            <div className="playing__hand-mobile-visibles-cards">
              {myPublicVisibles.map((card) => (
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
