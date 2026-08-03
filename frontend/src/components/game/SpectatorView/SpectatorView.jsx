import OpponentsRow from '../OpponentsRow/OpponentsRow';
import BoardCenter from '../BoardCenter/BoardCenter';
import './SpectatorView.css';

/**
 * Vista espectador para jugador ya salvado.
 */
export default function SpectatorView({ gameState, myId }) {
  const pile = gameState.pile ?? [];
  const opponents = (gameState.players ?? []).filter((p) => p.id !== myId && !p.isSaved);
  const currentName =
    gameState.players?.find((p) => p.id === gameState.currentPlayerId)?.username ?? '…';

  return (
    <div className="spectator">
      <div className="spectator__banner">
        👁 Estás mirando la partida — ya te salvaste
      </div>

      <OpponentsRow opponents={opponents} currentPlayerId={gameState.currentPlayerId} />

      <BoardCenter
        deckRemaining={gameState.deckRemaining}
        pile={pile}
        turnBanner={`Turno de ${currentName}`}
      />

      <div className="spectator__hand-placeholder">
        ✅ No tienes cartas — ¡a descansar!
      </div>
    </div>
  );
}
