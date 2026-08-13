/**
 * Nombres de eventos Socket.io compartidos entre cliente y contrato del servidor.
 */

// Cliente → servidor
export const CLIENT_EVENTS = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  START_SETUP: 'start_setup',
  CONFIRM_SETUP: 'confirm_setup',
  PLAY_TURN: 'play_turn',
  PICK_UP_PILE: 'pick_up_pile',
  /** Solo activo si PUBLIC_ROOMS_ENABLED en backend */
  LIST_PUBLIC_ROOMS: 'list_public_rooms',
  /** Reenganche tras desconexión (token en localStorage) */
  REJOIN_SESSION: 'rejoin_session',
  /** Salida voluntaria (sin periodo de gracia) */
  LEAVE_ROOM: 'leave_room',
};

// Servidor → cliente
export const SERVER_EVENTS = {
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_UPDATED: 'room_updated',
  SETUP_STARTED: 'setup_started',
  GAME_STARTED: 'game_started',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_PENDING_DISCONNECT: 'player_pending_disconnect',
  SESSION_RESTORED: 'session_restored',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  PLAYER_SAVED: 'player_saved',
  CARD_REVEALED: 'card_revealed',
  SPECIAL_PLAY: 'special_play',
  /** Listado de lobbies públicos (respuesta a list_public_rooms / broadcast) */
  PUBLIC_ROOMS_UPDATED: 'public_rooms_updated',
};
