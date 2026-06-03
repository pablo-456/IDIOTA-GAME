import { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import './Home.css';

export default function Home() {
  const { emit, connected } = useSocket();
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
    emit('create_room', { username: username.trim() });
  }

  function handleJoin() {
    if (!validate(true)) return;
    setLoading('join');
    emit('join_room', {
      username: username.trim(),
      roomId:   roomCode.trim().toUpperCase(),
    });
  }

  return (
    <div className="home">
      {/* Patrón de fondo decorativo */}
      <div className="home__bg-pattern" aria-hidden="true">
        {['♠','♥','♦','♣'].map((s, i) => (
          <span key={i} className="home__suit" style={{ '--i': i }}>{s}</span>
        ))}
      </div>

      <div className="home__card">
        {/* Cabecera */}
        <header className="home__header">
          <div className="home__crown" aria-hidden="true">♛</div>
          <h1 className="home__title">IDIOTA</h1>
          <p className="home__subtitle">El juego de cartas que te pondrá a prueba</p>
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
              Código de sala <span className="home__label-opt">(opcional)</span>
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
