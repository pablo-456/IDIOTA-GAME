import { useEffect, useMemo, useRef, useState } from 'react';
import './StartRouletteOverlay.css';

const SEGMENT_COLORS = [
  '#c9a84c',
  '#8b1e1e',
  '#1a3820',
  '#b8922a',
  '#c0392b',
  '#0d1f0f',
  '#d4af37',
];

const SPIN_MS = 3500;
const REVEAL_MS = 1800;

/**
 * Ruleta visual: revela quien inicia la partida (ganador ya decidido por el servidor).
 */
export default function StartRouletteOverlay({
  visible,
  players = [],
  winnerId,
  myId,
  onDone,
}) {
  const [phase, setPhase] = useState('idle'); // idle | spinning | reveal
  const [rotation, setRotation] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const list = useMemo(
    () => players.filter((p) => p?.id && p?.username),
    [players]
  );

  const winnerIndex = useMemo(() => {
    const i = list.findIndex((p) => p.id === winnerId);
    return i >= 0 ? i : 0;
  }, [list, winnerId]);

  const winner = list[winnerIndex];
  const amIWinner = winnerId === myId;

  const conic = useMemo(() => {
    const n = Math.max(list.length, 1);
    const parts = list.map((_, i) => {
      const start = (i / n) * 360;
      const end = ((i + 1) / n) * 360;
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${parts.join(', ')})`;
  }, [list]);

  useEffect(() => {
    if (!visible || list.length === 0) {
      setPhase('idle');
      setRotation(0);
      doneRef.current = false;
      return undefined;
    }

    doneRef.current = false;
    setPhase('spinning');

    const n = list.length;
    const slice = 360 / n;
    // Centro del segmento bajo la flecha (arriba): -(i*slice + slice/2)
    const land = -(winnerIndex * slice + slice / 2);
    const spins = 5;
    const target = spins * 360 + land;

    // Force reflow then apply transition target
    setRotation(0);
    const startId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRotation(target));
    });

    const spinTimer = setTimeout(() => {
      setPhase('reveal');
    }, SPIN_MS);

    const doneTimer = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current?.();
    }, SPIN_MS + REVEAL_MS);

    return () => {
      cancelAnimationFrame(startId);
      clearTimeout(spinTimer);
      clearTimeout(doneTimer);
    };
  }, [visible, list, winnerIndex]);

  if (!visible || list.length === 0) return null;

  const slice = 360 / list.length;

  return (
    <div className="roulette-overlay" role="dialog" aria-label="Quien inicia la partida">
      <div className="roulette-overlay__backdrop" />

      <div className="roulette-overlay__stage">
        <p className="roulette-overlay__title">¿Quién abre la mesa?</p>

        <div className="roulette-overlay__wheel-wrap">
          <div className="roulette-overlay__pointer" aria-hidden="true" />

          <div
            className={`roulette-overlay__wheel${phase === 'spinning' ? ' roulette-overlay__wheel--spinning' : ''}`}
            style={{
              background: conic,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {list.map((p, i) => {
              const mid = -90 + i * slice + slice / 2;
              const label = p.username.length > 8
                ? p.username.slice(0, 7) + '…'
                : p.username;
              return (
                <span
                  key={p.id}
                  className={`roulette-overlay__seg-label${p.id === winnerId ? ' roulette-overlay__seg-label--winner' : ''}`}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${mid + 90}deg) translateY(calc(min(78vw, 320px) * -0.33)) rotate(${-(mid + 90)}deg)`,
                  }}
                >
                  {label}
                </span>
              );
            })}
            <div className="roulette-overlay__hub">♣</div>
          </div>
        </div>

        <div className={`roulette-overlay__result${phase === 'reveal' ? ' roulette-overlay__result--show' : ''}`}>
          {phase === 'reveal' && (
            <>
              <p className="roulette-overlay__result-main">
                {amIWinner ? '✦ Empiezas TÚ' : `✦ Empieza ${winner?.username ?? '…'}`}
              </p>
              <p className="roulette-overlay__result-sub">¡Que empiece la partida!</p>
            </>
          )}
        </div>

        {phase === 'reveal' && (
          <div className="roulette-overlay__timer">
            <div className="roulette-overlay__timer-bar" />
          </div>
        )}
      </div>
    </div>
  );
}
