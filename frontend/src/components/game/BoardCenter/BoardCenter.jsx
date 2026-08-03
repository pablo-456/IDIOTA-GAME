import PileDisplay from '../../cards/PileDisplay';
import './BoardCenter.css';

/**
 * Mesa central: mazo + pila (+ acciones opcionales).
 */
export default function BoardCenter({
  deckRemaining,
  pile,
  turnBanner,
  turnBannerMine = false,
  onPickUp,
  showPickUp = false,
}) {
  return (
    <section className="playing__board">
      <div className="playing__board-inner">
        <div className="playing__deck">
          <div className="playing__deck-stack">
            <div className="card card--facedown">
              <span className="card__back-pattern">♠</span>
            </div>
          </div>
          <span className="playing__deck-count">{deckRemaining ?? 0} cartas</span>
        </div>

        <div className="playing__board-sep">↔</div>

        <div className="playing__pile-wrap">
          <PileDisplay pile={pile} />
          {showPickUp && (
            <button className="playing__pickup-btn" onClick={onPickUp} title="Recoger la mesa">
              ↩ Recoger Mesa
            </button>
          )}
        </div>
      </div>

      <div className={`playing__turn-banner${turnBannerMine ? ' playing__turn-banner--mine' : ''}`}>
        {turnBanner}
      </div>
    </section>
  );
}
