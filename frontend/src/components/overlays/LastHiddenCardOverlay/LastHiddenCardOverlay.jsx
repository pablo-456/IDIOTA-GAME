import './LastHiddenCardOverlay.css';

/**
 * Overlay dramático para la revelación de la ÚLTIMA de las 4 cartas ocultas.
 * El payaso "recoge" la carta, la espía con suspenso y la voltea de golpe.
 *
 * Sugerencia de integración: este overlay tiene una coreografía de ~2.6s
 * (recoger → espiar → suspenso → volteo) + ~0.5s de veredicto + 3s de barra
 * de tiempo. Se recomienda desmontarlo (o disparar el siguiente evento)
 * a los ~5.5s de haberlo montado.
 */
export default function LastHiddenCardOverlay({ event, myId }) {
  if (!event) return null;

  const { playerId, playerName, card, mustPickUp } = event;
  const isMe = playerId === myId;
  const joker = card.value === '🃏' || card.value === 'JOKER';
  const red = card.suit === '♥' || card.suit === '♦';
  const special = card.value === '2' || card.value === '8' || joker;
  const reaction = mustPickUp ? 'bad' : 'good';

  return (
    <div className="last-card-overlay">
      <div className="last-card-overlay__backdrop" />

      <div className="last-card-overlay__stage">
        <div className="last-card-overlay__title">✦ ÚLTIMA CARTA OCULTA ✦</div>
        <div className="last-card-overlay__who">
          {isMe ? 'Vas a destapar tu última carta oculta…' : playerName + ' destapa su última carta oculta…'}
        </div>

        <div className="last-card-overlay__scene">
          <div className="last-card-overlay__spotlight" />

          <div className={'last-card-overlay__clown last-card-overlay__clown--' + reaction}>
            🤡
          </div>

          <div className="last-card-overlay__suspense">
            <span style={{ '--d': 0 }}>·</span>
            <span style={{ '--d': 1 }}>·</span>
            <span style={{ '--d': 2 }}>·</span>
          </div>

          <div className="last-card-overlay__card-wrap">
            <div className="last-card-overlay__card-flip">
              <div className="card card--facedown last-card-overlay__card-face last-card-overlay__card-face--back">
                <span className="card__back-pattern">🂠</span>
              </div>

              <div
                className={[
                  'card', 'last-card-overlay__card-face', 'last-card-overlay__card-face--front',
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
          </div>

          <div className="last-card-overlay__particles">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="last-card-overlay__particle" style={{ '--i': i }} />
            ))}
          </div>
        </div>

        <div className={'last-card-overlay__verdict last-card-overlay__verdict--' + reaction}>
          {mustPickUp
            ? (isMe ? '😬 ¡Mala suerte! Recoges toda la pila' : '😂 ' + playerName + ' se lleva la pila')
            : (isMe ? '😎 ¡Zafaste limpio!' : '😎 ¡' + playerName + ' zafó limpio!')}
        </div>

        <div className="last-card-overlay__timer">
          <div className="last-card-overlay__timer-bar" />
        </div>
      </div>
    </div>
  );
}
