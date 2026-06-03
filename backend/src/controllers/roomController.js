/**
 * roomController.js — Controlador de Salas para el juego IDIOTA
 *
 * Gestiona el ciclo de vida de todas las partidas activas en memoria RAM.
 * No hay base de datos: el objeto `games` es la única fuente de verdad.
 *
 * ─── RESPONSABILIDADES ───────────────────────────────────────────────────────
 *   • Crear salas con código único aleatorio
 *   • Permitir que jugadores se unan validando límites (3–7)
 *   • Manejar desconexiones limpias (eliminar jugador, ajustar turno)
 *   • Limpiar partidas finalizadas o vacías para liberar memoria
 *
 * ─── ESTRUCTURA DE `games` ───────────────────────────────────────────────────
 *
 *   games = {
 *     'ABC123': Game,   // instancia de Game por roomId
 *     'XYZ789': Game,
 *     ...
 *   }
 *
 * ─── ÍNDICE INVERSO `playerRoomMap` ──────────────────────────────────────────
 *
 *   playerRoomMap = {
 *     'socket.id_A': 'ABC123',  // permite ubicar la sala de un jugador en O(1)
 *     'socket.id_B': 'XYZ789',
 *   }
 *
 *   Esto es crítico para el evento 'disconnect' de Socket.io, ya que en ese
 *   punto solo conocemos el socket.id del jugador que se fue.
 */

const Game = require('../models/Game');

// ---------------------------------------------------------------------------
// Estado global en memoria
// ---------------------------------------------------------------------------

/** @type {{ [roomId: string]: Game }} Todas las partidas activas */
const games = {};

/**
 * Índice inverso: socket.id → roomId.
 * Permite encontrar la sala de un jugador desconectado en O(1).
 * @type {{ [socketId: string]: string }}
 */
const playerRoomMap = {};

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

/**
 * Genera un código de sala único de 6 caracteres que no colisione con los
 * existentes.
 * @returns {string}
 */
function _uniqueRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (games[code]); // garantizar unicidad
  return code;
}

/**
 * Elimina una partida del estado global y limpia el mapa de jugadores.
 * @param {string} roomId
 */
function _destroyGame(roomId) {
  const game = games[roomId];
  if (!game) return;

  // Limpiar el índice inverso para todos los jugadores de esta sala
  for (const player of game.players) {
    delete playerRoomMap[player.id];
  }
  delete games[roomId];
}

// ---------------------------------------------------------------------------
// API pública del controlador
// ---------------------------------------------------------------------------

/**
 * Crea una nueva sala de juego y registra al jugador anfitrión.
 *
 * @param {string} hostId   - socket.id del creador
 * @param {string} hostName - Nombre visible del creador
 * @returns {{ success: boolean, roomId: string, game: Game }}
 */
function createRoom(hostId, hostName) {
  const roomId = _uniqueRoomCode();
  const game   = new Game(roomId, hostId, hostName);

  games[roomId]          = game;
  playerRoomMap[hostId]  = roomId;

  console.log(`[RoomController] Sala creada: ${roomId} por ${hostName} (${hostId})`);
  return { success: true, roomId, game };
}

/**
 * Une a un jugador a una sala existente.
 *
 * Valida:
 *   • Que la sala exista
 *   • Que la partida esté en estado LOBBY (no empezada)
 *   • Que no supere el máximo de 7 jugadores
 *
 * @param {string} roomId     - Código de la sala
 * @param {string} playerId   - socket.id del nuevo jugador
 * @param {string} playerName - Nombre visible del nuevo jugador
 * @returns {{ success: boolean, error?: string, game?: Game }}
 */
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

  console.log(`[RoomController] ${playerName} (${playerId}) se unió a la sala ${roomId}`);
  return { success: true, game };
}

/**
 * Maneja la desconexión limpia de un jugador.
 *
 * Comportamiento según el estado de la partida:
 *   • LOBBY    : El jugador simplemente sale. Si era el único, se destruye la sala.
 *   • SETUP    : Ídem; se notifica al resto.
 *   • PLAYING  : Sus cartas se eliminan; si era su turno, se avanza automáticamente.
 *                Si quedan < 2 jugadores, la partida termina.
 *   • FINISHED : Solo limpieza del mapa.
 *
 * @param {string} socketId - socket.id del jugador desconectado
 * @returns {{
 *   success:      boolean,
 *   roomId:       string|null,
 *   game:         Game|null,
 *   advanceTurn:  boolean,
 *   gameDestroyed: boolean,
 * }}
 */
function disconnectPlayer(socketId) {
  const roomId = playerRoomMap[socketId];

  // El jugador no estaba en ninguna sala registrada
  if (!roomId) {
    return { success: false, roomId: null, game: null, advanceTurn: false, gameDestroyed: false };
  }

  const game = games[roomId];
  if (!game) {
    delete playerRoomMap[socketId];
    return { success: false, roomId, game: null, advanceTurn: false, gameDestroyed: false };
  }

  console.log(`[RoomController] Jugador ${socketId} desconectado de sala ${roomId}`);

  // Eliminar al jugador de la partida
  const { advanceTurn } = game.removePlayer(socketId);
  delete playerRoomMap[socketId];

  // Si la sala quedó vacía o la partida terminó sin jugadores suficientes,
  // destruimos la sala para liberar memoria
  if (game.players.length === 0 || game.status === 'FINISHED') {
    _destroyGame(roomId);
    return { success: true, roomId, game: null, advanceTurn: false, gameDestroyed: true };
  }

  return { success: true, roomId, game, advanceTurn, gameDestroyed: false };
}

/**
 * Recupera una instancia de Game por su código de sala.
 *
 * @param {string} roomId
 * @returns {Game|null}
 */
function getGame(roomId) {
  return games[roomId] ?? null;
}

/**
 * Recupera el código de sala asociado a un socket.id.
 *
 * @param {string} socketId
 * @returns {string|null}
 */
function getRoomIdBySocket(socketId) {
  return playerRoomMap[socketId] ?? null;
}

/**
 * Devuelve un resumen de todas las salas activas (útil para debugging/admin).
 * @returns {object[]}
 */
function listRooms() {
  return Object.values(games).map((g) => ({
    id:          g.id,
    status:      g.status,
    playerCount: g.players.length,
    players:     g.players.map((p) => p.username),
  }));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createRoom,
  joinRoom,
  disconnectPlayer,
  getGame,
  getRoomIdBySocket,
  listRooms,
  // Exportamos el objeto `games` para que el servidor pueda inspeccionar estado
  // directamente si es necesario (solo lectura recomendada desde fuera)
  games,
};
