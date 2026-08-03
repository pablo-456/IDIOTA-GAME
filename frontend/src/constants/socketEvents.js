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
};

// Servidor → cliente
export const SERVER_EVENTS = {
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  ROOM_UPDATED: 'room_updated',
  SETUP_STARTED: 'setup_started',
  GAME_STARTED: 'game_started',
  PLAYER_DISCONNECTED: 'player_disconnected',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  PLAYER_SAVED: 'player_saved',
  CARD_REVEALED: 'card_revealed',
  SPECIAL_PLAY: 'special_play',
};
