import './SpecialPlayOverlay.css';

/**
 * Overlay de jugada especial (8 / Joker).
 */
export default function SpecialPlayOverlay({ event, myId }) {
  if (!event) return null;
  const { playerId, playerName, card, burned } = event;
  const isMe = playerId === myId;
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
