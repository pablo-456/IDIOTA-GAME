/**
 * useSocket.js — Custom hook para la conexión Socket.io
 *
 * Gestiona el ciclo de vida de la conexión: conecta al montar,
 * reintenta con paciencia (Render free cold start) y expone utilidades.
 *
 * Tip: un cron externo (UptimeRobot) pegando a GET /health cada 5–10 min
 * reduce aún más los cold starts del plan free de Render.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Detecta automáticamente la URL del backend según donde se ejecute la app
export const getSocketUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location.hostname.includes('devtunnels.ms')) {
      const currentHost = window.location.hostname;
      return `https://${currentHost.replace('-5173', '-3000')}`;
    }
    return 'http://localhost:3000';
  }

  return 'https://idiota-backend.onrender.com';
};

const SERVER_URL = getSocketUrl();

/** Despierta el backend (Render free) con un ping HTTP largo. */
export async function wakeServer(timeoutMs = 60000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Singleton de socket: una sola instancia compartida en toda la app.
 */
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
  }
  return socketInstance;
}

/**
 * @typedef {'connecting' | 'connected' | 'reconnecting' | 'failed'} ConnectionPhase
 */

export function useSocket() {
  const socket = useRef(getSocket());
  const [connected, setConnected] = useState(socket.current.connected);
  const [connectionPhase, setConnectionPhase] = useState(
    /** @type {ConnectionPhase} */ (socket.current.connected ? 'connected' : 'connecting')
  );

  useEffect(() => {
    const s = socket.current;

    const onConnect = () => {
      setConnected(true);
      setConnectionPhase('connected');
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionPhase('reconnecting');
    };
    const onReconnectAttempt = () => {
      setConnected(false);
      setConnectionPhase('reconnecting');
    };
    const onReconnectFailed = () => {
      setConnected(false);
      setConnectionPhase('failed');
    };
    const onConnectError = () => {
      if (!s.connected) {
        setConnectionPhase((prev) => (prev === 'connected' ? 'reconnecting' : prev === 'failed' ? 'failed' : 'connecting'));
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('reconnect_attempt', onReconnectAttempt);
    s.on('reconnect_failed', onReconnectFailed);
    s.on('connect_error', onConnectError);

    setConnected(s.connected);
    setConnectionPhase(s.connected ? 'connected' : 'connecting');

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('reconnect_attempt', onReconnectAttempt);
      s.off('reconnect_failed', onReconnectFailed);
      s.off('connect_error', onConnectError);
    };
  }, []);

  const emit = useCallback((event, payload) => {
    socket.current.emit(event, payload);
  }, []);

  const on = useCallback((event, handler) => {
    socket.current.on(event, handler);
    return () => socket.current.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socket.current.off(event, handler);
  }, []);

  const reconnect = useCallback(() => {
    setConnectionPhase('connecting');
    wakeServer();
    if (socket.current.disconnected) {
      socket.current.connect();
    }
  }, []);

  return {
    socket: socket.current,
    connected,
    connectionPhase,
    serverUrl: SERVER_URL,
    emit,
    on,
    off,
    reconnect,
    wakeServer,
  };
}
