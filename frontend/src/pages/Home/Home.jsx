import { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useGameActions } from '../../hooks/useGameActions';
import './Home.css';

/* ── Enlace de donación ── */
const DONATION_URL = 'https://ko-fi.com/idiotagame';

/* ── Notas de la versión ── */
const PATCH_NOTES = [
  'Beta 1.0 disponible — puede haber bichos sueltos 🐛',
  '¡Ya puedes jugar con tus amigos usando salas en tiempo real!',
  'Como jugar: El objetivo del juego es no ser el último en quedarse sin cartas. En cada turno, los jugadores deben jugar una carta que supere a la anterior (o usar los comodines). Si no pueden, deben tomar todas las cartas del centro. El ultimo jugador en seguir con cartas es coronado como el "IDIOTA".',
];

export default function Home() {
  const { connected } = useSocket();
  const { createRoom, joinRoom } = useGameActions();
  const [username, setUsername]   = useState('');
  const [roomCode, setRoomCode]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(null); // 'create' | 'join' | null

  function validate(requireRoom = false) {
    if (!username.trim()) {
      setError('Debes ingresar un nombre de usuario.');
      return false;
    }
    if (requireRoom && !roomCode.trim()) {
      setError('Ingresa el código de la sala para unirte.');
      return false;
    }
    setError('');
    return true;
  }

  function handleCreate() {
    if (!validate()) return;
    setLoading('create');
    createRoom(username.trim());
  }

  function handleJoin() {
    if (!validate(true)) return;
    setLoading('join');
    joinRoom(username.trim(), roomCode.trim().toUpperCase());
  }

  return (
    <div className="home">
      {/* Patrón de fondo decorativo */}
      <div className="home__bg-pattern" aria-hidden="true">
        {['♠','♥','♦','♣'].map((s, i) => (
          <span key={i} className="home__suit" style={{ '--i': i }}>{s}</span>
        ))}
      </div>

      {/* ── Panel lateral izquierdo ── */}
      <aside className="home__sidebar">

        {/* Bloque de Apoyo */}
        <div className="home__side-block home__side-block--support">
          <div className="home__side-block-deco" aria-hidden="true">♛</div>
          <p className="home__side-label">Apoya el proyecto</p>
          <p className="home__side-desc">
            Este juego es gratuito y asi seguira.<br />
            Si te divierte, considera invitarme un café ☕
          </p>
          <a
            className="home__support-btn"
            href={DONATION_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { if (!DONATION_URL) e.preventDefault(); }}
          >
            <span className="home__support-icon">☕</span>
            <span>¡Apoya el desarrollo de IDIOTA!</span>
          </a>
        </div>

        {/* Bloque de Novedades */}
        <div className="home__side-block home__side-block--notes">
          <div className="home__side-divider" aria-hidden="true">
            <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
          </div>
          <p className="home__side-label">Novedades · Beta 1.0</p>
          <ul className="home__patch-notes">
            {PATCH_NOTES.map((note, i) => (
              <li key={i} className="home__patch-note">
                <span className="home__patch-bullet">✦</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

      </aside>

      {/* ── Card principal ── */}
      <div className="home__card">
        {/* Cabecera */}
        <header className="home__header">
          <div className="home__crown" aria-hidden="true">♛</div>
          <h1 className="home__title">IDIOTA</h1>
          <p className="home__subtitle">Este juego es muy facil, o eres un idiota 🤨</p>
          <p className="home__subtitle">IDIOTA BY PABLO-456 ¬_¬</p>
          <div className="home__divider">
            <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
          </div>
        </header>

        {/* Indicador de conexión */}
        <div className={`home__conn-badge ${connected ? 'home__conn-badge--ok' : 'home__conn-badge--off'}`}>
          <span className="home__conn-dot" />
          {connected ? 'Conectado al servidor' : 'Conectando…'}
        </div>

        {/* Formulario */}
        <div className="home__form">
          <div className="home__field">
            <label className="home__label" htmlFor="username">Nombre de jugador</label>
            <input
              id="username"
              className="home__input"
              type="text"
              placeholder="¿Cómo te llamas?"
              maxLength={20}
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoComplete="off"
            />
          </div>

          <div className="home__field">
            <label className="home__label" htmlFor="roomcode">
              Código de sala <span className="home__label-opt">(Solo si eres invitado ingresa el código)</span>
            </label>
            <input
              id="roomcode"
              className="home__input home__input--code"
              type="text"
              placeholder="ABC123"
              maxLength={6}
              value={roomCode}
              onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
              autoComplete="off"
            />
          </div>

          {error && <p className="home__error" role="alert">⚠ {error}</p>}

          <div className="home__actions">
            <button
              className="home__btn home__btn--primary"
              onClick={handleCreate}
              disabled={!connected || loading !== null}
            >
              {loading === 'create' ? <span className="home__spinner" /> : '✦'}
              <span>Crear Partida</span>
            </button>

            <div className="home__separator">
              <span>o</span>
            </div>

            <button
              className="home__btn home__btn--secondary"
              onClick={handleJoin}
              disabled={!connected || loading !== null}
            >
              {loading === 'join' ? <span className="home__spinner" /> : '→'}
              <span>Unirse a Partida</span>
            </button>
          </div>
        </div>

        <footer className="home__footer">
          3 – 7 jugadores · Cartas francesas · Multijugador en tiempo real
        </footer>
      </div>
    </div>
  );
}