import './CardRevealOverlay.css';

/**
 * Overlay dramático cuando alguien voltea una carta oculta.
 */
export default function CardRevealOverlay({ event, myId }) {
  if (!event) return null;

  const { playerId, playerName, card, mustPickUp } = event;
  const isMe = playerId === myId;
  const joker = card.value === '🃏';
  const red = card.suit === '♥' || card.suit === '♦';
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
              joker ? 'card--joker' : '',
              special ? 'card--special' : '',
              red ? 'card--red' : '',
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
