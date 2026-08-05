/**
 * useSocket.js — Custom hook para la conexión Socket.io
 *
 * Gestiona el ciclo de vida de la conexión: conecta al montar,
 * desconecta al desmontar, y expone utilidades para emitir/escuchar eventos.
 *
 * Uso:
 *   const { socket, emit, on, off, connected } = useSocket();
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Detecta automáticamente la URL del backend según donde se ejecute la app
const getSocketUrl = () => {
  // 1. Si definiste una variable de entorno en .env o en Vercel, usa esa primero
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  // 2. Si estás en modo desarrollo en tu máquina local
  if (import.meta.env.DEV) {
    // Si estás usando DevTunnels en el navegador, intenta conectar al subdominio del puerto 3000
    if (typeof window !== 'undefined' && window.location.hostname.includes('devtunnels.ms')) {
      const currentHost = window.location.hostname; // ej: 7tjttmzb-5173.use2.devtunnels.ms
      return `https://${currentHost.replace('-5173', '-3000')}`;
    }
    
    // Si estás en localhost normal
    return 'http://localhost:3000';
  }

  // 3. Si estás en Producción (Render)
  return 'https://idiota-backend.onrender.com';
};

const SERVER_URL = getSocketUrl();

/**
 * Singleton de socket: una sola instancia compartida en toda la app.
 * Se crea la primera vez que el hook se usa y se reutiliza en renders sucesivos.
 */
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socket = useRef(getSocket());
  const [connected, setConnected] = useState(socket.current.connected);

  useEffect(() => {
    const s = socket.current;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    // Sincronizar estado inicial en caso de que ya estuviera conectado
    setConnected(s.connected);

    return () => {
      s.off('connect',    onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  /**
   * Emite un evento al servidor.
   * @param {string} event
   * @param {*}      payload
   */
  const emit = useCallback((event, payload) => {
    socket.current.emit(event, payload);
  }, []);

  /**
   * Registra un listener para un evento del servidor.
   * Devuelve una función de limpieza para usarla en useEffect.
   * @param {string}   event
   * @param {Function} handler
   * @returns {Function} cleanup
   */
  const on = useCallback((event, handler) => {
    socket.current.on(event, handler);
    return () => socket.current.off(event, handler);
  }, []);

  /**
   * Elimina un listener específico de un evento.
   * @param {string}   event
   * @param {Function} handler
   */
  const off = useCallback((event, handler) => {
    socket.current.off(event, handler);
  }, []);

  return {
    socket: socket.current,
    connected,
    emit,
    on,
    off,
  };
}
