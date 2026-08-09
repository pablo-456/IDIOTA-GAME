import { useAudio } from '../../../hooks/useAudio';
import './MuteButton.css';

/**
 * Botón mute global. Con floating=true se fija arriba a la derecha.
 */
export default function MuteButton({ floating = false, className = '' }) {
  const { muted, toggleMute, unlock } = useAudio();

  const handleClick = async () => {
    await unlock();
    toggleMute();
  };

  const classes = [
    'mute-btn',
    floating ? 'mute-btn--floating' : '',
    muted ? 'mute-btn--muted' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      title={muted ? 'Activar sonido' : 'Silenciar'}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
