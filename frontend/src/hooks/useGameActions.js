import { useCallback } from 'react';
import { useSocket } from './useSocket';
import { CLIENT_EVENTS } from '../constants/socketEvents';

/**
 * Emisiones de acciones del cliente hacia el servidor.
 * Las páginas/fases usan estos callbacks en lugar de tocar el socket.
 */
export function useGameActions() {
  const { emit } = useSocket();

  const createRoom = useCallback((username) => {
    emit(CLIENT_EVENTS.CREATE_ROOM, { username });
  }, [emit]);

  const joinRoom = useCallback((username, roomId) => {
    emit(CLIENT_EVENTS.JOIN_ROOM, { username, roomId });
  }, [emit]);

  const startSetup = useCallback((roomId) => {
    emit(CLIENT_EVENTS.START_SETUP, { roomId });
  }, [emit]);

  const confirmSetup = useCallback((roomId, idsVisibles) => {
    emit(CLIENT_EVENTS.CONFIRM_SETUP, { roomId, idsVisibles });
  }, [emit]);

  const playTurn = useCallback((roomId, cardIds) => {
    emit(CLIENT_EVENTS.PLAY_TURN, { roomId, cardIds });
  }, [emit]);

  const pickUpPile = useCallback((roomId, voluntary = true) => {
    emit(CLIENT_EVENTS.PICK_UP_PILE, { roomId, voluntary });
  }, [emit]);

  return {
    createRoom,
    joinRoom,
    startSetup,
    confirmSetup,
    playTurn,
    pickUpPile,
  };
}
