import './CrownOverlay.css';

/**
 * Overlay de coronación del idiota al finalizar la partida.
 */
export default function CrownOverlay({ visible, loserName, amILoser, onDone }) {
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
