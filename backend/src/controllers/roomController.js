/**
 * roomController.js — Controlador de Salas para el juego IDIOTA
 *
 * Gestiona el ciclo de vida de todas las partidas activas en memoria RAM.
 * No hay base de datos: el objeto `games` es la única fuente de verdad.
 *
 * Incluye tokens de sesión y periodo de gracia al desconectar (rejoin).
 */

const Game = require('../models/Game');

/** Gracia antes de expulsar a un jugador desconectado (ms). */
const DISCONNECT_GRACE_MS = 45_000;

// ---------------------------------------------------------------------------
// Estado global en memoria
// ---------------------------------------------------------------------------

/** @type {{ [roomId: string]: Game }} */
const games = {};

/** @type {{ [socketId: string]: string }} socket.id → roomId */
const playerRoomMap = {};

/**
 * token → { roomId, playerId, username }
 * @type {{ [token: string]: { roomId: string, playerId: string, username: string } }}
 */
const sessionByToken = {};

/**
 * playerId → { timer, roomId, oldSocketId, username }
 * @type {{ [playerId: string]: { timer: NodeJS.Timeout, roomId: string, oldSocketId: string, username: string } }}
 */
const pendingDisconnects = {};

/** Callback opcional cuando expira la gracia (lo registra server.js). */
let onGraceExpired = null;

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

function _uniqueRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (games[code]);
  return code;
}

function _registerSession(player) {
  if (!player?.sessionToken) return;
  sessionByToken[player.sessionToken] = {
    roomId:   player._roomId || null,
    playerId: player.id,
    username: player.username,
  };
}

function _setSession(token, roomId, playerId, username) {
  sessionByToken[token] = { roomId, playerId, username };
}

function _clearSessionsForGame(game) {
  for (const player of game.players) {
    if (player.sessionToken) delete sessionByToken[player.sessionToken];
    _clearPending(player.id);
  }
}

function _clearPending(playerId) {
  const pending = pendingDisconnects[playerId];
  if (!pending) return;
  clearTimeout(pending.timer);
  delete pendingDisconnects[playerId];
}

function _destroyGame(roomId) {
  const game = games[roomId];
  if (!game) return;

  _clearSessionsForGame(game);

  for (const player of game.players) {
    delete playerRoomMap[player.id];
  }
  delete games[roomId];
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Registra el callback invocado cuando expira la gracia de desconexión.
 * @param {(payload: object) => void} fn
 */
function setGraceExpiredHandler(fn) {
  onGraceExpired = fn;
}

function createRoom(hostId, hostName, { isPublic = false } = {}) {
  const roomId = _uniqueRoomCode();
  const game   = new Game(roomId, hostId, hostName, { isPublic });

  games[roomId]         = game;
  playerRoomMap[hostId] = roomId;

  const host = game.players[0];
  if (host?.sessionToken) {
    _setSession(host.sessionToken, roomId, hostId, hostName);
  }

  console.log(`[RoomController] Sala creada: ${roomId} por ${hostName} (${hostId}) isPublic=${game.isPublic}`);
  return { success: true, roomId, game, sessionToken: host?.sessionToken ?? null };
}

function joinRoom(roomId, playerId, playerName) {
  const game = games[roomId];

  if (!game) {
    return { success: false, error: `La sala '${roomId}' no existe.` };
  }
  if (game.status !== 'LOBBY') {
    return { success: false, error: 'La partida ya ha comenzado; no puedes unirte.' };
  }

  const result = game.addPlayer(playerId, playerName);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  playerRoomMap[playerId] = roomId;

  const player = game.players.find((p) => p.id === playerId);
  if (player?.sessionToken) {
    _setSession(player.sessionToken, roomId, playerId, playerName);
  }

  console.log(`[RoomController] ${playerName} (${playerId}) se unió a sala ${roomId}`);
  return { success: true, game, sessionToken: player?.sessionToken ?? result.sessionToken };
}

/**
 * Inicia el periodo de gracia (no expulsa todavía).
 * @param {string} socketId
 */
function beginPendingDisconnect(socketId) {
  const roomId = playerRoomMap[socketId];
  if (!roomId) {
    return { success: false, roomId: null, game: null };
  }

  const game = games[roomId];
  if (!game) {
    delete playerRoomMap[socketId];
    return { success: false, roomId, game: null };
  }

  const player = game.players.find((p) => p.id === socketId);
  if (!player) {
    delete playerRoomMap[socketId];
    return { success: false, roomId, game: null };
  }

  // Ya estaba en gracia (doble disconnect)
  if (pendingDisconnects[socketId]) {
    return {
      success: true,
      roomId,
      game,
      alreadyPending: true,
      username: player.username,
      playerId: socketId,
    };
  }

  const { advanceTurn } = game.markDisconnected(socketId);

  const timer = setTimeout(() => {
    const result = finalizeDisconnect(socketId);
    if (typeof onGraceExpired === 'function') {
      onGraceExpired(result);
    }
  }, DISCONNECT_GRACE_MS);

  pendingDisconnects[socketId] = {
    timer,
    roomId,
    oldSocketId: socketId,
    username: player.username,
  };

  console.log(`[RoomController] Gracia 45s para ${player.username} (${socketId}) en ${roomId}`);

  return {
    success: true,
    roomId,
    game,
    alreadyPending: false,
    advanceTurn,
    username: player.username,
    playerId: socketId,
  };
}

/**
 * Expulsa definitivamente tras la gracia.
 * @param {string} playerId - socket.id (aún el antiguo si no hubo rejoin)
 */
function finalizeDisconnect(playerId) {
  const pending = pendingDisconnects[playerId];
  const roomId = pending?.roomId ?? playerRoomMap[playerId];

  _clearPending(playerId);

  if (!roomId) {
    return { success: false, roomId: null, game: null, advanceTurn: false, gameDestroyed: false };
  }

  const game = games[roomId];
  if (!game) {
    delete playerRoomMap[playerId];
    return { success: false, roomId, game: null, advanceTurn: false, gameDestroyed: false };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (player?.sessionToken) {
    delete sessionByToken[player.sessionToken];
  }

  console.log(`[RoomController] Expulsión definitiva: ${playerId} de ${roomId}`);

  const { advanceTurn } = game.removePlayer(playerId);
  delete playerRoomMap[playerId];

  if (game.players.length === 0 || game.status === 'FINISHED') {
    _destroyGame(roomId);
    return {
      success: true,
      roomId,
      game: null,
      advanceTurn: false,
      gameDestroyed: true,
      playerId,
    };
  }

  return {
    success: true,
    roomId,
    game,
    advanceTurn,
    gameDestroyed: false,
    playerId,
  };
}

/**
 * Reengancha con token de sesión a un nuevo socket.
 * @param {string} sessionToken
 * @param {string} newSocketId
 */
function rejoinSession(sessionToken, newSocketId) {
  if (!sessionToken) {
    return { success: false, error: 'Token de sesión requerido.' };
  }

  const session = sessionByToken[sessionToken];
  if (!session) {
    return { success: false, error: 'Sesión inválida o expirada.' };
  }

  const { roomId, playerId: oldPlayerId, username } = session;
  const game = games[roomId];
  if (!game) {
    delete sessionByToken[sessionToken];
    return { success: false, error: 'La sala ya no existe.' };
  }

  const player = game.players.find(
    (p) => p.sessionToken === sessionToken || p.id === oldPlayerId
  );
  if (!player) {
    delete sessionByToken[sessionToken];
    return { success: false, error: 'Ya no estás en la partida.' };
  }

  // Cancelar gracia si estaba pendiente (clave = id actual del jugador)
  _clearPending(player.id);

  const oldId = player.id;
  const result = game.reattachPlayer(oldId, newSocketId);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  delete playerRoomMap[oldId];
  playerRoomMap[newSocketId] = roomId;
  _setSession(sessionToken, roomId, newSocketId, username);

  console.log(`[RoomController] Rejoin: ${username} ${oldId} → ${newSocketId} en ${roomId}`);

  return {
    success: true,
    roomId,
    game,
    sessionToken,
    username,
  };
}

/** Expulsión inmediata (compat / casos especiales). */
function disconnectPlayer(socketId) {
  _clearPending(socketId);
  const roomId = playerRoomMap[socketId];

  if (!roomId) {
    return { success: false, roomId: null, game: null, advanceTurn: false, gameDestroyed: false };
  }

  const game = games[roomId];
  if (!game) {
    delete playerRoomMap[socketId];
    return { success: false, roomId, game: null, advanceTurn: false, gameDestroyed: false };
  }

  const player = game.players.find((p) => p.id === socketId);
  if (player?.sessionToken) delete sessionByToken[player.sessionToken];

  const { advanceTurn } = game.removePlayer(socketId);
  delete playerRoomMap[socketId];

  if (game.players.length === 0 || game.status === 'FINISHED') {
    _destroyGame(roomId);
    return { success: true, roomId, game: null, advanceTurn: false, gameDestroyed: true };
  }

  return { success: true, roomId, game, advanceTurn, gameDestroyed: false };
}

function getGame(roomId) {
  return games[roomId] ?? null;
}

function getRoomIdBySocket(socketId) {
  return playerRoomMap[socketId] ?? null;
}

function listRooms() {
  return Object.values(games).map((g) => ({
    id:          g.id,
    status:      g.status,
    isPublic:    g.isPublic,
    playerCount: g.players.length,
    players:     g.players.map((p) => p.username),
  }));
}

function listPublicLobbies() {
  return Object.values(games)
    .filter((g) => g.isPublic && g.status === 'LOBBY')
    .map((g) => ({
      id:          g.id,
      playerCount: g.players.length,
      maxPlayers:  7,
      players:     g.players.map((p) => p.username),
    }));
}

function clearSessionsForRoom(roomId) {
  const game = games[roomId];
  if (game) _clearSessionsForGame(game);
}

module.exports = {
  createRoom,
  joinRoom,
  beginPendingDisconnect,
  finalizeDisconnect,
  rejoinSession,
  disconnectPlayer,
  setGraceExpiredHandler,
  getGame,
  getRoomIdBySocket,
  listRooms,
  listPublicLobbies,
  clearSessionsForRoom,
  DISCONNECT_GRACE_MS,
  games,
};
