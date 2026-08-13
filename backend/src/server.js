/**
 * server.js — Servidor Principal del juego IDIOTA
 *
 * Stack: Express (HTTP) + Socket.io (WebSocket)
 *
 * ─── EVENTOS SOCKET.IO IMPLEMENTADOS ─────────────────────────────────────────
 *
 *   Entrantes (cliente → servidor):
 *   ┌─────────────────────────┬────────────────────────────────────────────────┐
 *   │ Evento                  │ Descripción                                    │
 *   ├─────────────────────────┼────────────────────────────────────────────────┤
 *   │ create_room             │ Crea sala y une al creador                     │
 *   │ join_room               │ Une a un jugador a sala existente              │
 *   │ player_ready_setup      │ Jugador confirma elección de cartas en SETUP   │
 *   │ disconnect              │ Maneja salida limpia (automático por Socket.io)│
 *   └─────────────────────────┴────────────────────────────────────────────────┘
 *
 *   Salientes (servidor → cliente):
 *   ┌──────────────────────────┬───────────────────────────────────────────────┐
 *   │ Evento                   │ Descripción                                   │
 *   ├──────────────────────────┼───────────────────────────────────────────────┤
 *   │ room_created             │ Confirmación al creador con código de sala    │
 *   │ room_joined              │ Confirmación al jugador que se unió           │
 *   │ room_updated             │ Estado público actualizado a toda la sala     │
 *   │ setup_started            │ Inicia fase SETUP; cada jugador recibe su     │
 *   │                          │   estado privado (cartas de elección)         │
 *   │ game_started             │ Todos listos; comienza PLAYING                │
 *   │ player_disconnected      │ Notifica salida de un jugador a la sala       │
 *   │ game_over                │ Notifica fin de partida con ganador           │
 *   │ error                    │ Mensaje de error al cliente que lo generó     │
 *   └──────────────────────────┴───────────────────────────────────────────────┘
 *
 * ─── PATRÓN DE SALAS SOCKET.IO ───────────────────────────────────────────────
 *
 *   Cada sala de juego usa el roomId como nombre del "room" de Socket.io.
 *   Esto permite hacer io.to(roomId).emit(...) para notificar a todos los
 *   jugadores de esa sala sin mantener listas manuales de sockets.
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');

const roomController = require('./controllers/roomController');
const { PUBLIC_ROOMS_ENABLED } = require('./constants/features');
const { isOffensiveUsername } = require('./utils/usernameModeration');

// ---------------------------------------------------------------------------
// Configuración del servidor
// ---------------------------------------------------------------------------

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // 1. Si no hay origen (como en llamadas servidor a servidor o Postman), lo permitimos
      if (!origin) return callback(null, true);

      // 2. Lista de orígenes o patrones permitidos
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://idiota-game.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
      ];

      // 3. Verificamos si coincide exactamente o si es cualquier túnel de devtunnels
      const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.devtunnels.ms');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado por CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware Express básico
app.use(express.json());

// ─── Ruta de salud (health check) ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    rooms:   roomController.listRooms(),
    uptime:  process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Helper: emitir error solo al socket que lo causó
// ---------------------------------------------------------------------------
/**
 * @param {import('socket.io').Socket} socket
 * @param {string} message
 */
function emitError(socket, message) {
  socket.emit('error', { message });
}

/**
 * Emite el listado actual de lobbies públicos a todos los sockets conectados.
 * Solo tiene efecto si PUBLIC_ROOMS_ENABLED está activo.
 */
function broadcastPublicRooms() {
  if (!PUBLIC_ROOMS_ENABLED) return;
  io.emit('public_rooms_updated', {
    rooms: roomController.listPublicLobbies(),
  });
}

/**
 * Cuando expira la gracia de desconexión: expulsar y notificar a la sala.
 */
function handleGraceExpired(result) {
  if (!result?.success) return;

  const { roomId, game, advanceTurn, gameDestroyed, playerId } = result;

  if (gameDestroyed) {
    console.log(`[grace] Sala ${roomId} destruida tras expulsión definitiva.`);
    broadcastPublicRooms();
    return;
  }

  if (!game || !roomId) return;

  io.to(roomId).emit('player_disconnected', {
    socketId:    playerId,
    advanceTurn,
    state:       game.toPublicState(),
    message:     'Un jugador no se reconectó a tiempo.',
  });

  if (game.isPublic && game.status === 'LOBBY') broadcastPublicRooms();

  if (game.status === 'FINISHED') {
    const loser = game.players.find((p) => p.id === game.loserId);
    io.to(roomId).emit('game_over', {
      loserId:      game.loserId,
      loserName:    loser?.username ?? 'Desconocido',
      savedPlayers: game.savedPlayers ?? [],
      reason:       'Jugadores insuficientes para continuar.',
    });
    roomController.clearSessionsForRoom(roomId);
  }
}

roomController.setGraceExpiredHandler(handleGraceExpired);

// ---------------------------------------------------------------------------
// Socket.io — Manejo de eventos
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[Socket] Conexión: ${socket.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: create_room
  // Payload esperado: { username: string }
  //
  // Crea una nueva sala y une al creador. La sala arranca en estado LOBBY
  // esperando a que otros jugadores se unan antes de iniciar.
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('create_room', ({ username, isPublic } = {}) => {
    if (!username?.trim()) {
      return emitError(socket, 'Se requiere un nombre de usuario.');
    }
    if (isOffensiveUsername(username)) {
      return emitError(socket, 'Ese nombre no está permitido.');
    }

    // isPublic solo se respeta si el feature está habilitado en el servidor
    const makePublic = PUBLIC_ROOMS_ENABLED && Boolean(isPublic);

    const { roomId, game, sessionToken } = roomController.createRoom(
      socket.id,
      username.trim(),
      { isPublic: makePublic }
    );

    // Unir el socket a la "room" de Socket.io para broadcast futuro
    socket.join(roomId);

    // Confirmar al creador
    socket.emit('room_created', {
      roomId,
      sessionToken,
      state: game.toPrivateState(socket.id),
    });

    // Notificar estado a toda la sala (solo el creador por ahora)
    io.to(roomId).emit('room_updated', game.toPublicState());

    if (makePublic) broadcastPublicRooms();

    console.log(`[create_room] Sala ${roomId} creada por ${username} (isPublic=${makePublic})`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: join_room
  // Payload esperado: { roomId: string, username: string }
  //
  // Une a un jugador a una sala existente.
  // Valida: sala existe, partida en LOBBY, límite de 7 jugadores.
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('join_room', ({ roomId, username } = {}) => {
    if (!roomId?.trim() || !username?.trim()) {
      return emitError(socket, 'Se requieren roomId y username.');
    }
    if (isOffensiveUsername(username)) {
      return emitError(socket, 'Ese nombre no está permitido.');
    }

    const code = roomId.trim().toUpperCase();
    const result = roomController.joinRoom(
      code,
      socket.id,
      username.trim()
    );

    if (!result.success) {
      return emitError(socket, result.error);
    }

    const { game, sessionToken } = result;

    // Unir el socket a la "room" de Socket.io
    socket.join(code);

    // Confirmar al jugador que se acaba de unir
    socket.emit('room_joined', {
      roomId: code,
      sessionToken,
      state: game.toPrivateState(socket.id),
    });

    // Notificar a TODA la sala (incluyendo al nuevo jugador) del estado actual
    io.to(code).emit('room_updated', game.toPublicState());

    if (game.isPublic) broadcastPublicRooms();

    console.log(`[join_room] ${username} se unió a sala ${code} (${game.players.length} jugadores)`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: start_setup
  // Payload esperado: { roomId: string }
  //
  // El host solicita iniciar la fase de configuración.
  // Transición: LOBBY → SETUP
  // Reparte cartas ocultas y el pool de elección a cada jugador.
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('start_setup', ({ roomId } = {}) => {
    const game = roomController.getGame(roomId);
    if (!game) return emitError(socket, 'Sala no encontrada.');

    // Solo el primer jugador (host) puede iniciar el setup
    if (game.players[0]?.id !== socket.id) {
      return emitError(socket, 'Solo el anfitrión puede iniciar el juego.');
    }

    const result = game.iniciarConfiguracion();
    if (!result.success) {
      return emitError(socket, result.error);
    }

    // Notificar a cada jugador individualmente con SU estado privado
    // (cada uno ve solo sus propias cartas de elección)
    for (const player of game.players) {
      // Buscar el socket del jugador en la room para emitirle directamente
      io.to(player.id).emit('setup_started', {
        state: game.toPrivateState(player.id),
      });
    }

    // Actualizar estado público a toda la sala
    io.to(roomId).emit('room_updated', game.toPublicState());

    // Al salir de LOBBY, la sala deja de aparecer en el listado público
    if (game.isPublic) broadcastPublicRooms();

    console.log(`[start_setup] Fase SETUP iniciada en sala ${roomId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: player_ready_setup
  // Payload esperado: { roomId: string, idsVisibles: string[], idsMano: string[] }
  //
  // El jugador confirma qué 4 cartas quiere boca arriba (visibles) y qué 4
  // conserva en su mano privada.
  //
  // Cuando el 100 % de los jugadores confirme:
  //   • El estado cambia a 'PLAYING'
  //   • Se elige un jugador inicial al azar
  //   • Se emite 'game_started' a toda la sala
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: confirm_setup (Sincronizado perfectamente con tu Frontend)
  // Payload esperado: { roomId: string, idsVisibles: string[] }
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('confirm_setup', ({ roomId, idsVisibles } = {}) => {
    const game = roomController.getGame(roomId);
    if (!game) return emitError(socket, 'Sala no encontrada.');
    if (game.status !== 'SETUP') {
      return emitError(socket, 'El juego no está en fase de configuración.');
    }

    // Validación básica de lo que envía el cliente
    if (!Array.isArray(idsVisibles) || idsVisibles.length !== 4) {
      return emitError(socket, 'Debes elegir exactamente 4 cartas visibles.');
    }

    // El modelo lógico procesa la elección (y calcula la mano oculta internamente)
    const result = game.confirmarEleccion(socket.id, idsVisibles);
    if (!result.success) {
      return emitError(socket, result.error);
    }

    console.log(`[confirm_setup] Jugador ${socket.id} listo en sala ${roomId}`);

    // 1. Notificar a toda la sala para actualizar quién está "Listo"
    io.to(roomId).emit('room_updated', game.toPublicState());

    // 2. Si TODOS están listos, el modelo cambia a 'PLAYING' automáticamente
    if (result.allReady) {
      console.log(`[confirm_setup] ¡Todos listos! Sala ${roomId} → PLAYING`);

      // Enviamos a cada jugador su perspectiva privada e inicial de juego
      for (const player of game.players) {
        io.to(player.id).emit('game_started', {
          state:           game.toPrivateState(player.id),
          firstPlayerId:   game.currentPlayer.id,
          firstPlayerName: game.currentPlayer.username,
          message: `¡La partida comienza! Turno de ${game.currentPlayer.username}.`,
        });
      }
    }
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: play_turn
  // Payload esperado: { roomId: string, cardIds: string[] }
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('play_turn', ({ roomId, cardIds } = {}) => {
    const game = roomController.getGame(roomId);
    if (!game) return emitError(socket, 'Sala no encontrada.');

    // Ejecuta la jugada en el modelo lógico
    const result = game.playTurn(socket.id, cardIds);
    if (!result.success) {
      return emitError(socket, result.error);
    }

    // ── Carta oculta mala → revelar, esperar 3 s, luego pickup ──
    if (result.forcedPickUp) {
      const revealer = game.players.find((p) => p.id === socket.id);

      // Sincronizar estado intermedio (carta visible en pila, aún no recogida)
      for (const player of game.players) {
        io.to(player.id).emit('game_started', { state: game.toPrivateState(player.id) });
      }

      // Anunciar el reveal dramático a toda la sala
      io.to(roomId).emit('card_revealed', {
        playerId:     socket.id,
        playerName:   revealer?.username ?? 'Alguien',
        card:         result.revealedCard,
        pileTopPower: game.pileTopPower,
        mustPickUp:   true,
      });

      // Tras 3 s confirmar el pickup y re-sincronizar
      setTimeout(() => {
        const pickResult = game.confirmForcedPickUp();
        if (!pickResult.success) return;
        for (const player of game.players) {
          io.to(player.id).emit('game_started', { state: game.toPrivateState(player.id) });
        }
      }, 3000);

      return;
    }

    // ── El jugador se salvó (se quedó sin cartas) ──
    if (result.saved) {
      // Notificar solo al jugador salvado con su mensaje especial
      socket.emit('player_saved', {
        message:      '🎉 ¡Te salvaste! Ya no tienes cartas.',
        savedPlayers: game.savedPlayers,
      });

      // ¿La partida terminó? (queda 1 solo con cartas → el idiota)
      if (result.gameOver) {
        const loser = game.players.find((p) => p.id === game.loserId);

        // Primero sincronizar estado (con loserId y savedPlayers actualizados)
        // para que los clientes lo tengan ANTES de recibir game_over
        for (const player of game.players) {
          io.to(player.id).emit('game_started', { state: game.toPrivateState(player.id) });
        }

        io.to(roomId).emit('game_over', {
          loserId:      game.loserId,
          loserName:    loser?.username ?? 'Desconocido',
          savedPlayers: game.savedPlayers,
          reason:       'El último jugador con cartas es el idiota.',
        });
        roomController.clearSessionsForRoom(roomId);
        return;
      }

      // La partida continúa — enviar estado actualizado a todos
      // (el turno ya fue avanzado por checkSaved → nextTurn)
      for (const player of game.players) {
        io.to(player.id).emit('game_started', {
          state:        game.toPrivateState(player.id),
          savedPlayers: game.savedPlayers,
        });
      }
      return;
    }

    // ── Jugada normal ──
    const actor = game.players.find((p) => p.id === socket.id);

    // Carta oculta buena → reveal a todos
    if (result.revealedCard) {
      const rc = result.revealedCard;
      const isSpecialFromAzar = rc.value === '8' || rc.value === '🃏' || rc.value === 'JOKER';

      io.to(roomId).emit('card_revealed', {
        playerId:    socket.id,
        playerName:  actor?.username ?? 'Alguien',
        card:        rc,
        mustPickUp:  false,
      });

      // Si además era 8 o Joker, emitir también la animación dorada
      if (isSpecialFromAzar) {
        io.to(roomId).emit('special_play', {
          playerId:   socket.id,
          playerName: actor?.username ?? 'Alguien',
          card:       rc,
          burned:     result.burned,
        });
      }
    }

    // 8 o Joker jugado desde mano/visibles → anuncio especial dorado
    if (result.isSpecialPlay) {
      io.to(roomId).emit('special_play', {
        playerId:   socket.id,
        playerName: actor?.username ?? 'Alguien',
        card:       result.specialCard,
        burned:     result.burned,
      });
    }

    for (const player of game.players) {
      io.to(player.id).emit('game_started', { state: game.toPrivateState(player.id) });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: pick_up_pile
  // Payload esperado: { roomId: string, voluntary: boolean }
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('pick_up_pile', ({ roomId, voluntary } = {}) => {
    const game = roomController.getGame(roomId);
    if (!game) return emitError(socket, 'Sala no encontrada.');

    const result = game.pickUpPile(socket.id, voluntary);
    if (!result.success) {
      return emitError(socket, result.error);
    }

    // Sincronizar la mesa limpia y la nueva mano con todos los clientes
    for (const player of game.players) {
      io.to(player.id).emit('game_started', {
        state: game.toPrivateState(player.id),
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────
  // EVENTOS DE SALAS PÚBLICAS (solo si PUBLIC_ROOMS_ENABLED=true)
  // ─────────────────────────────────────────────────────────────────────────
  if (PUBLIC_ROOMS_ENABLED) {
    socket.on('list_public_rooms', () => {
      socket.emit('public_rooms_updated', {
        rooms: roomController.listPublicLobbies(),
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: rejoin_session
  // Payload: { sessionToken: string }
  // Reengancha tras caída de red (mismo token en localStorage).
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('rejoin_session', ({ sessionToken } = {}) => {
    const result = roomController.rejoinSession(sessionToken, socket.id);
    if (!result.success) {
      return emitError(socket, result.error);
    }

    const { roomId, game } = result;
    socket.join(roomId);

    socket.emit('session_restored', {
      roomId,
      sessionToken: result.sessionToken,
      state: game.toPrivateState(socket.id),
    });

    io.to(roomId).emit('room_updated', game.toPublicState());

    console.log(`[rejoin_session] ${result.username} restaurado en ${roomId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: leave_room — salida voluntaria (sin gracia)
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('leave_room', ({ roomId } = {}) => {
    const result = roomController.disconnectPlayer(socket.id);
    if (!result.success) return;

    socket.leave(roomId || result.roomId);

    if (result.gameDestroyed) {
      broadcastPublicRooms();
      return;
    }

    const { roomId: rid, game, advanceTurn } = result;
    io.to(rid).emit('player_disconnected', {
      socketId: socket.id,
      advanceTurn,
      state: game.toPublicState(),
      message: 'Un jugador ha salido de la sala.',
    });

    if (game.isPublic && game.status === 'LOBBY') broadcastPublicRooms();

    if (game.status === 'FINISHED') {
      const loser = game.players.find((p) => p.id === game.loserId);
      io.to(rid).emit('game_over', {
        loserId: game.loserId,
        loserName: loser?.username ?? 'Desconocido',
        savedPlayers: game.savedPlayers ?? [],
        reason: 'Jugadores insuficientes para continuar.',
      });
      roomController.clearSessionsForRoom(rid);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTO: disconnect — periodo de gracia 45s antes de expulsar
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Desconexión: ${socket.id} — motivo: ${reason}`);

    const result = roomController.beginPendingDisconnect(socket.id);
    if (!result.success) return;

    const { roomId, game, alreadyPending, username, playerId } = result;
    if (alreadyPending || !game) return;

    io.to(roomId).emit('player_pending_disconnect', {
      playerId,
      username,
      graceMs: roomController.DISCONNECT_GRACE_MS,
      state: game.toPublicState(),
      message: `${username} se desconectó. Tiene 45s para volver.`,
    });

    // También room_updated para refrescar badges isConnected
    io.to(roomId).emit('room_updated', game.toPublicState());
  });
});

// ---------------------------------------------------------------------------
// Arranque del servidor
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  🃏 Servidor IDIOTA en puerto ${PORT}   ║`);
  console.log(`║  Salas públicas: ${PUBLIC_ROOMS_ENABLED ? 'ON ' : 'OFF'}                ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

module.exports = { app, server, io };