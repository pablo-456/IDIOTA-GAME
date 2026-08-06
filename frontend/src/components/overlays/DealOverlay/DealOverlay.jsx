import { useEffect, useRef } from 'react';
import Card from '../../cards/Card/Card';
import './DealOverlay.css';

/** Timing total de la secuencia (ms) — debe coincidir con delays CSS */
const DEAL_TOTAL_MS = 4200;

/**
 * Overlay teatral: la casa reparte 4 ocultas + 8 de elección y las revela.
 * pointer-events: none — no se puede interactuar hasta onDone.
 */
export default function DealOverlay({ choiceCards = [], onDone }) {
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    doneRef.current = false;
    const t = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current?.();
    }, DEAL_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  const cards = choiceCards.slice(0, 8);

  return (
    <div className="deal-overlay" aria-hidden="true">
      <div className="deal-overlay__backdrop" />

      <div className="deal-overlay__stage">
        <div className="deal-overlay__dealer">
          <span className="deal-overlay__hand" aria-hidden="true">🤝</span>
          <p className="deal-overlay__label">La casa reparte…</p>
        </div>

        {/* 4 ocultas — siempre boca abajo */}
        <div className="deal-overlay__row deal-overlay__row--hidden">
          <span className="deal-overlay__row-label">🔒 Ocultas</span>
          <div className="deal-overlay__cards">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`h-${i}`}
                className="deal-overlay__fly deal-overlay__fly--hidden"
                style={{ '--i': i }}
              >
                <div className="card card--facedown deal-overlay__card-shell">
                  <span className="card__back-pattern">🃏</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 8 de elección — vuelan boca abajo y luego flip */}
        <div className="deal-overlay__row deal-overlay__row--choice">
          <span className="deal-overlay__row-label">✦ Tu mano</span>
          <div className="deal-overlay__cards">
            {Array.from({ length: 8 }).map((_, i) => {
              const card = cards[i];
              return (
                <div
                  key={card?.id ?? `c-${i}`}
                  className="deal-overlay__fly deal-overlay__fly--choice"
                  style={{ '--i': i }}
                >
                  <div className="deal-overlay__flip" style={{ '--i': i }}>
                    <div className="deal-overlay__flip-inner">
                      <div className="deal-overlay__face deal-overlay__face--back">
                        <div className="card card--facedown deal-overlay__card-shell">
                          <span className="card__back-pattern">🃏</span>
                        </div>
                      </div>
                      <div className="deal-overlay__face deal-overlay__face--front">
                        {card ? (
                          <Card card={card} disabled />
                        ) : (
                          <div className="card card--facedown deal-overlay__card-shell">
                            <span className="card__back-pattern">🃏</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
