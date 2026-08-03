import { useState } from 'react';
import Card from './Card';
import './PileDisplay.css';

/**
 * Pila central con vista expandible de todas las cartas.
 */
export default function PileDisplay({ pile }) {
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
          onClick={() => setExpanded((e) => !e)}
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
