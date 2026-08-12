/**
 * Persistencia local de sesión de sala (reconexión sin BD).
 * Clave en localStorage — no confundir con window.sessionStorage.
 */

const STORAGE_KEY = 'idiota_room_session';

/**
 * @typedef {{ token: string, roomId: string, username: string }} RoomSession
 */

/** @returns {RoomSession|null} */
export function loadRoomSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.roomId) return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {RoomSession} session */
export function saveRoomSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function clearRoomSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
