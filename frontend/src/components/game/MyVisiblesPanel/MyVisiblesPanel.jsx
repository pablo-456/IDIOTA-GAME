import Card from '../../cards/Card';
import './MyVisiblesPanel.css';

/**
 * Panel lateral con las cartas visibles públicas (las elegidas en SETUP).
 * No usa myHand.cartasVisibles, que puede incluir cartas recogidas.
 */
export default function MyVisiblesPanel({ visibles = [] }) {
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
