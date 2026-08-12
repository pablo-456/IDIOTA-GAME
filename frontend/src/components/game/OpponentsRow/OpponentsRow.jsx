import Card from '../../cards/Card/Card';
import './OpponentsRow.css';

/**
 * Fila de oponentes (compartida entre PlayingPhase y SpectatorView).
 */
export default function OpponentsRow({ opponents, currentPlayerId }) {
  return (
    <section className="playing__opponents">
      {opponents.map((opp) => {
        const totalCards =
          opp.manoPrivadaCount +
          opp.cartasOcultasCount +
          (opp.cartasVisibles?.length ?? 0);
        const isActive = currentPlayerId === opp.id;

        return (
          <div key={opp.id} className={`opponent${isActive ? ' opponent--active' : ''}`}>
            <div className="opponent__header">
              <div className="opponent__avatar">{opp.username.charAt(0).toUpperCase()}</div>
              <div className="opponent__info">
                <span className="opponent__name">{opp.username}</span>
                {isActive && <span className="opponent__turn-badge">► Turno</span>}
                {opp.isConnected === false && (
                  <span className="opponent__reconnect">Reconectando…</span>
                )}
              </div>
              <span className="opponent__card-count">{totalCards} 🃏</span>
            </div>
            {opp.cartasVisibles?.length > 0 && (
              <div className="opponent__visibles">
                {opp.cartasVisibles.map((c) => (
                  <Card key={c.id} card={c} small disabled />
                ))}
              </div>
            )}
            {opp.cartasOcultasCount > 0 && (
              <div className="opponent__hidden">
                {Array.from({ length: opp.cartasOcultasCount }).map((_, i) => (
                  <Card key={i} card={{}} faceDown small disabled />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
