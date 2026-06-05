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

// ---------------------------------------------------------------------------
// Configuración del servidor
// ---------------------------------------------------------------------------

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // En producción, reemplaza '*' por el dominio real del frontend
    origin: process.env.FRONTEND_URL || 'https://wt61pzl2-5173.use2.devtunnels.ms',
    methods: ['GET', 'POST'],
  },
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
  socket.on('create_room', ({ username } = {}) => {
    if (!username?.trim()) {
      return emitError(socket, 'Se requiere un nombre de usuario.');
    }

    const { roomId, game } = roomController.createRoom(socket.id, username.trim());

    // Unir el socket a la "room" de Socket.io para broadcast futuro
    socket.join(roomId);

    // Confirmar al creador
    socket.emit('room_created', {
      roomId,
      state: game.toPrivateState(socket.id),
    });

    // Notificar estado a toda la sala (solo el creador por ahora)
    io.to(roomId).emit('room_updated', game.toPublicState());

    console.log(`[create_room] Sala ${roomId} creada por ${username}`);
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

    const result = roomController.joinRoom(
      roomId.trim().toUpperCase(),
      socket.id,
      username.trim()
    );

    if (!result.success) {
      return emitError(socket, result.error);
    }

    const { game } = result;

    // Unir el socket a la "room" de Socket.io
    socket.join(roomId);

    // Confirmar al jugador que se acaba de unir
    socket.emit('room_joined', {
      roomId,
      state: game.toPrivateState(socket.id),
    });

    // Notificar a TODA la sala (incluyendo al nuevo jugador) del estado actual
    io.to(roomId).emit('room_updated', game.toPublicState());

    console.log(`[join_room] ${username} se unió a sala ${roomId} (${game.players.length} jugadores)`);
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
        io.to(roomId).emit('game_over', {
          loserId:      game.loserId,
          loserName:    loser?.username ?? 'Desconocido',
          savedPlayers: game.savedPlayers,
          reason:       'El último jugador con cartas es el idiota.',
        });
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
    // Si fue carta oculta buena, revelarla a todos antes de sincronizar
    if (result.revealedCard) {
      const revealer = game.players.find((p) => p.id === socket.id);
      io.to(roomId).emit('card_revealed', {
        playerId:    socket.id,
        playerName:  revealer?.username ?? 'Alguien',
        card:        result.revealedCard,
        mustPickUp:  false,
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
  // EVENTO: disconnect (automático de Socket.io)
  //
  // Se dispara cuando un socket pierde la conexión (cierre de pestaña,
  // error de red, etc.). Manejamos la salida limpia del jugador:
  //
  //   1. Localizamos su sala usando el índice inverso playerRoomMap
  //   2. Eliminamos al jugador de la partida (Game.removePlayer)
  //   3. Si era su turno, avanzamos el turno al siguiente jugador
  //   4. Notificamos al resto de la sala
  //   5. Si la sala queda vacía o la partida termina, se destruye la sala
  // ─────────────────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Desconexión: ${socket.id} — motivo: ${reason}`);

    const result = roomController.disconnectPlayer(socket.id);

    if (!result.success) return; // El jugador no estaba en ninguna sala

    const { roomId, game, advanceTurn, gameDestroyed } = result;

    // Si la sala fue destruida (quedó vacía o ganó alguien al irse todos), nada más que hacer
    if (gameDestroyed) {
      console.log(`[disconnect] Sala ${roomId} destruida por falta de jugadores.`);
      return;
    }

    // Notificar a los jugadores restantes
    io.to(roomId).emit('player_disconnected', {
      socketId:    socket.id,
      advanceTurn,
      state:       game.toPublicState(),
      message:     'Un jugador se ha desconectado.',
    });

    // Si la partida terminó por la desconexión (ej. quedaron < 2 jugadores)
    if (game.status === 'FINISHED') {
      const loser = game.players.find((p) => p.id === game.loserId);
      io.to(roomId).emit('game_over', {
        loserId:      game.loserId,
        loserName:    loser?.username ?? 'Desconocido',
        savedPlayers: game.savedPlayers ?? [],
        reason:       'Jugadores insuficientes para continuar.',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Arranque del servidor
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  🃏 Servidor IDIOTA en puerto ${PORT}   ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

module.exports = { app, server, io }; 