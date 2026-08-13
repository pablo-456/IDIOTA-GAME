import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useGameActions } from '../../hooks/useGameActions';
import { useAudio } from '../../hooks/useAudio';
import { SERVER_EVENTS } from '../../constants/socketEvents';
import MuteButton from '../../components/ui/MuteButton/MuteButton';
import './PublicLobbies.css';

/**
 * PublicLobbies — Listado de salas públicas en LOBBY + crear sala pública.
 *
 * Props:
 *   username {string}   — nombre del jugador (desde Home)
 *   onBack   {Function} — volver a HOME
 */
export default function PublicLobbies({ username, onBack }) {
  const { connected, on } = useSocket();
  const { createRoom, joinRoom, listPublicRooms } = useGameActions();
  const { unlock, startMusic } = useAudio();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(null); // 'create' | roomId | null

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await unlock();
      if (!cancelled) await startMusic();
    })();
    return () => { cancelled = true; };
  }, [unlock, startMusic]);

  useEffect(() => {
    if (!connected) return;
    listPublicRooms();
  }, [connected, listPublicRooms]);

  useEffect(() => {
    const offUpdated = on(SERVER_EVENTS.PUBLIC_ROOMS_UPDATED, ({ rooms: next } = {}) => {
      setRooms(Array.isArray(next) ? next : []);
      setLoading(null);
    });
    const offError = on(SERVER_EVENTS.ERROR, () => {
      setLoading(null);
    });
    return () => {
      offUpdated();
      offError();
    };
  }, [on]);

  async function handleCreate() {
    if (!username?.trim() || !connected) return;
    setLoading('create');
    await unlock();
    await startMusic();
    createRoom(username.trim(), { isPublic: true });
  }

  async function handleJoin(roomId) {
    if (!username?.trim() || !connected || !roomId) return;
    setLoading(roomId);
    await unlock();
    await startMusic();
    joinRoom(username.trim(), roomId);
  }

  return (
    <div className="public-lobbies">
      <MuteButton floating />
      <div className="public-lobbies__bg" aria-hidden="true" />

      <div className="public-lobbies__card">
        <header className="public-lobbies__header">
          <button
            type="button"
            className="public-lobbies__back"
            onClick={onBack}
          >
            ↩ Volver
          </button>
          <h1 className="public-lobbies__title">Salas públicas</h1>
          <p className="public-lobbies__subtitle">
            Jugando como <strong>{username}</strong>
          </p>
        </header>

        <div className="public-lobbies__toolbar">
          <button
            type="button"
            className="public-lobbies__btn public-lobbies__btn--primary"
            onClick={handleCreate}
            disabled={!connected || loading !== null}
          >
            {loading === 'create' ? <span className="public-lobbies__spinner" /> : '✦'}
            <span>Crear sala pública</span>
          </button>
          <button
            type="button"
            className="public-lobbies__btn public-lobbies__btn--ghost"
            onClick={() => listPublicRooms()}
            disabled={!connected || loading !== null}
            title="Actualizar listado"
          >
            ↻
          </button>
        </div>

        <div className="public-lobbies__list-wrap">
          <div className="public-lobbies__list-header">
            <h2>Lobbies abiertos</h2>
            <span>{rooms.length}</span>
          </div>

          {rooms.length === 0 ? (
            <p className="public-lobbies__empty">
              No hay salas públicas en espera. ¡Crea una!
            </p>
          ) : (
            <ul className="public-lobbies__list">
              {rooms.map((room) => {
                const full = room.playerCount >= (room.maxPlayers ?? 7);
                return (
                  <li key={room.id} className="public-lobbies__item">
                    <div className="public-lobbies__item-info">
                      <span className="public-lobbies__item-code">{room.id}</span>
                      <span className="public-lobbies__item-count">
                        {room.playerCount}/{room.maxPlayers ?? 7} jugadores
                      </span>
                      {room.players?.length > 0 && (
                        <span className="public-lobbies__item-names">
                          {room.players.join(', ')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="public-lobbies__btn public-lobbies__btn--join"
                      onClick={() => handleJoin(room.id)}
                      disabled={!connected || loading !== null || full}
                    >
                      {loading === room.id ? (
                        <span className="public-lobbies__spinner" />
                      ) : full ? (
                        'Llena'
                      ) : (
                        'Unirse'
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
