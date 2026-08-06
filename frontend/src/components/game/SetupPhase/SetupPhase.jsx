import { useState, useCallback } from 'react';
import Card from '../../cards/Card/Card';
import DealOverlay from '../../overlays/DealOverlay/DealOverlay';
import './SetupPhase.css';

/**
 * Fase SETUP: animación de reparto y luego elegir 4 cartas visibles.
 * Emite vía onConfirmSetup — sin acceso directo al socket.
 */
export default function SetupPhase({ myHand, isMeReady, onConfirmSetup }) {
  const [selected, setSelected] = useState(new Set());
  const [dealDone, setDealDone] = useState(false);

  const toggleCard = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const pool = myHand?.manoPrivada ?? [];

  if (isMeReady) {
    return (
      <div className="setup-phase__waiting" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⌛</div>
        <h2>¡Elección Confirmada!</h2>
        <p style={{ color: '#aaa' }}>Tu estrategia ha sido enviada al servidor.</p>
        <p>Esperando a que los demás jugadores terminen de elegir sus cartas...</p>
      </div>
    );
  }

  // Overlay de reparto antes de poder seleccionar
  if (!dealDone && pool.length === 8) {
    return (
      <DealOverlay
        choiceCards={pool}
        onDone={() => setDealDone(true)}
      />
    );
  }

  const handleConfirm = () => {
    if (selected.size !== 4) return;
    onConfirmSetup([...selected]);
  };

  const readyToConfirm = selected.size === 4;

  return (
    <div className="setup">
      <div className="setup__header">
        <h2 className="setup__title">Elige tus <span className="setup__title-accent">4 cartas visibles</span></h2>
        <p className="setup__subtitle">
          Las cartas elegidas las verán todos tus rivales durante la partida.<br />
          Las otras 4 formarán tu mano privada inicial.
        </p>
        <div className="setup__counter">
          <div className="setup__counter-dots">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`setup__dot${i < selected.size ? ' setup__dot--filled' : ''}`} />
            ))}
          </div>
          <span className="setup__counter-label">{selected.size} / 4 seleccionadas</span>
        </div>
      </div>

      <div className="setup__pool">
        {pool.length > 0 ? pool.map((card) => (
          <div key={card.id} className="setup__card-wrap">
            <Card
              card={card}
              selected={selected.has(card.id)}
              onClick={() => toggleCard(card.id)}
              disabled={!selected.has(card.id) && selected.size >= 4}
            />
            <span className="setup__card-role">
              {selected.has(card.id) ? '👁 Visible' : '🔒 Privada'}
            </span>
          </div>
        )) : (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="setup__card-wrap">
              <div className="card card--loading">
                <span className="card__loading-spinner" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="setup__actions">
        <button
          className={`setup__confirm-btn${readyToConfirm ? ' setup__confirm-btn--ready' : ''}`}
          onClick={handleConfirm}
          disabled={!readyToConfirm}
        >
          {readyToConfirm ? '✦ Confirmar Estrategia' : `Selecciona ${4 - selected.size} más`}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="setup__preview">
          <div className="setup__preview-col">
            <span className="setup__preview-label">👁 Visibles para todos</span>
            <div className="setup__preview-cards">
              {pool.filter((c) => selected.has(c.id)).map((c) => (
                <Card key={c.id} card={c} small disabled />
              ))}
              {Array.from({ length: 4 - selected.size }).map((_, i) => (
                <div key={i} className="card card--slot card--small">?</div>
              ))}
            </div>
          </div>
          <div className="setup__preview-col">
            <span className="setup__preview-label">🔒 Tu mano privada</span>
            <div className="setup__preview-cards">
              {pool.filter((c) => !selected.has(c.id)).map((c) => (
                <Card key={c.id} card={c} small disabled />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
