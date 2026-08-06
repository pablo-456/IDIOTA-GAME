import { isRedSuit, isSpecialCard, cardLabel } from '../../../constants/cardRules';
import './Card.css';

/**
 * Carta individual (presentacional).
 */
export default function Card({ card, selected, onClick, disabled, faceDown, dimmed, small }) {
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

  const joker = card.value === '🃏';
  const red = isRedSuit(card.suit);
  const special = isSpecialCard(card.value);

  return (
    <button
      className={[
        'card',
        selected ? 'card--selected' : '',
        disabled ? 'card--disabled' : '',
        dimmed ? 'card--dimmed' : '',
        joker ? 'card--joker' : '',
        special ? 'card--special' : '',
        red ? 'card--red' : '',
        small ? 'card--small' : '',
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
