/**
 * Game.js — Modelo de Partida para el juego IDIOTA
 *
 * Gestiona el estado completo de una partida: jugadores, mazo, mesa y turnos.
 *
 * ─── FLUJO DE ESTADOS ────────────────────────────────────────────────────────
 *
 *   LOBBY → SETUP → PLAYING → FINISHED
 *
 *   • LOBBY    : Sala abierta esperando jugadores (3–7).
 *   • SETUP    : Fase de elección inicial. Cada jugador recibe 8 cartas y elige
 *                4 visibles (boca arriba) y 4 para su mano privada.
 *   • PLAYING  : Partida en curso.
 *   • FINISHED : Hay un ganador; la partida terminó.
 *
 * ─── ESTRUCTURA DEL JUGADOR ──────────────────────────────────────────────────
 *
 *   {
 *     id            : string,   // socket.id del jugador
 *     username      : string,
 *     manoPrivada   : Card[],   // cartas en la mano (invisibles para rivales)
 *     cartasVisibles: Card[],   // cartas sobre la mesa, visibles para todos
 *     cartasOcultas : Card[],   // cartas boca abajo; se usan al quedarse sin mano
 *     isReady       : boolean,  // confirmó su elección en la fase SETUP
 *   }
 *
 * ─── LÓGICA DE TURNOS ────────────────────────────────────────────────────────
 *
 *   El jugador activo debe jugar UNA O MÁS cartas del MISMO valor cuyo power
 *   sea ≥ al de la carta más alta visible en la pila (pile).
 *
 *   Casos especiales al jugar:
 *   • Comodín '2' (reset)  : Se puede jugar sobre cualquier carta. Resetea la
 *                             pila (el siguiente jugador puede jugar cualquier carta).
 *   • Comodín '8' / JOKER (burn): Quema la pila completa (se descarta).
 *                             El jugador que lo juega obtiene un turno extra.
 *   • Cuatro iguales (mismo valor en la pila) : Queman la pila automáticamente
 *                             y otorgan turno extra (regla de las "cuatro iguales").
 *
 *   Fin del turno:
 *   • Si el mazo tiene cartas, el jugador roba hasta tener 4 en mano (si puede).
 *   • El turno pasa al siguiente jugador activo (saltando a desconectados).
 *   • Un jugador GANA cuando se queda sin cartas en mano, visibles y ocultas.
 *
 * ─── REPARTO INICIAL (SETUP) ─────────────────────────────────────────────────
 *
 *   • 4 cartas ocultas  (cartasOcultas)  — el jugador nunca las ve hasta usarlas
 *   • 8 cartas para elegir              — de ellas escoge:
 *       → 4 como cartasVisibles (todos las ven)
 *       → 4 como manoPrivada    (solo él las ve)
 */

const Deck = require('./Deck');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Genera un código de sala aleatorio de 6 caracteres alfanuméricos en mayúsculas.
 * @returns {string}
 */
function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Clase Game
// ---------------------------------------------------------------------------

class Game {
  /**
   * @param {string} roomId   - Código único de la sala
   * @param {string} hostId   - socket.id del jugador que creó la sala
   * @param {string} hostName - Nombre del anfitrión
   */
  constructor(roomId, hostId, hostName) {
    /** @type {string} Código único de la sala */
    this.id = roomId;

    /**
     * @type {PlayerState[]}
     * Lista ordenada de jugadores; el orden define la secuencia de turnos.
     */
    this.players = [];

    /** @type {Deck} Instancia del mazo de cartas */
    this.deck = new Deck();

    /**
     * @type {Card[]}
     * Pila de cartas jugadas en la mesa (visible para todos).
     * La carta en pile[pile.length - 1] es la más reciente.
     */
    this.pile = [];

    /**
     * @type {number}
     * Índice (dentro de this.players) del jugador cuyo turno es activo.
     * -1 indica que aún no hay turno en curso (estado LOBBY / SETUP).
     */
    this.currentTurnIndex = -1;

    /**
     * @type {'LOBBY'|'SETUP'|'PLAYING'|'FINISHED'}
     * Estado actual de la partida.
     */
    this.status = 'LOBBY';

    /**
     * @type {string|null}
     * socket.id del jugador ganador (solo relevante en estado FINISHED).
     */
    this.winnerId = null;

    // El host es el primer jugador en unirse
    this._addPlayerObject(hostId, hostName);
  }

  // ─── Getters de conveniencia ──────────────────────────────────────────────

  /** Devuelve el jugador activo según currentTurnIndex, o null si no aplica. */
  get currentPlayer() {
    if (this.currentTurnIndex === -1) return null;
    return this.players[this.currentTurnIndex] ?? null;
  }

  /**
   * Power máximo visible en la pila (para validar jugadas).
   * Si la pila está vacía devuelve 0 → cualquier carta puede jugarse.
   */
  get pileTopPower() {
    if (this.pile.length === 0) return 0;
    return Math.max(...this.pile.map((c) => c.power));
  }

  // ─── Gestión de jugadores ────────────────────────────────────────────────

  /**
   * Construye y agrega el objeto de estado de un jugador.
   * @param {string} id       - socket.id
   * @param {string} username - Nombre visible
   * @private
   */
  _addPlayerObject(id, username) {
    this.players.push({
      id,
      username,
      manoPrivada:    [],
      cartasVisibles: [],
      cartasOcultas:  [],
      isReady:        false,   // true cuando confirma su elección en SETUP
    });
  }

  /**
   * Añade un jugador a la sala (solo en estado LOBBY).
   *
   * @param {string} playerId   - socket.id del nuevo jugador
   * @param {string} playerName - Nombre del nuevo jugador
   * @returns {{ success: boolean, error?: string }}
   */
  addPlayer(playerId, playerName) {
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'La partida ya ha comenzado.' };
    }
    if (this.players.length >= 7) {
      return { success: false, error: 'La sala está llena (máximo 7 jugadores).' };
    }
    if (this.players.some((p) => p.id === playerId)) {
      return { success: false, error: 'El jugador ya está en la sala.' };
    }

    this._addPlayerObject(playerId, playerName);
    return { success: true };
  }

  /**
   * Elimina a un jugador de la partida (desconexión).
   * • Si la partida está en PLAYING y era su turno, avanza al siguiente jugador.
   * • Si quedan < 3 jugadores activos durante PLAYING, finaliza la partida.
   *
   * @param {string} playerId - socket.id del jugador que se va
   * @returns {{ success: boolean, advanceTurn: boolean }}
   */
  removePlayer(playerId) {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return { success: false, advanceTurn: false };

    const wasCurrentTurn = this.currentTurnIndex === idx;
    this.players.splice(idx, 1);

    let advanceTurn = false;

    if (this.status === 'PLAYING') {
      // Ajustar el índice del turno actual tras eliminar al jugador
      if (wasCurrentTurn) {
        // El índice ya apunta al siguiente jugador (o se envuelve al inicio)
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
        }
        advanceTurn = true;
      } else if (idx < this.currentTurnIndex) {
        // El jugador eliminado estaba antes en la lista; ajustamos índice
        this.currentTurnIndex = Math.max(0, this.currentTurnIndex - 1);
      }

      // Si quedan menos de 3 jugadores activos, no tiene sentido continuar
      if (this.players.length < 2) {
        this.status = 'FINISHED';
        this.winnerId = this.players[0]?.id ?? null;
      }
    }

    return { success: true, advanceTurn };
  }

  // ─── Fase SETUP ──────────────────────────────────────────────────────────

  /**
   * Inicia la fase de configuración (LOBBY → SETUP).
   * Valida que haya entre 3 y 7 jugadores.
   * Reparte a cada jugador:
   *   • 4 cartas ocultas   (cartasOcultas)
   *   • 8 cartas de elección → el jugador elegirá 4 visibles y 4 para mano
   *
   * Las 8 cartas de elección se devuelven en manoPrivada temporalmente;
   * el cliente mostrará estas cartas para que el jugador divida su elección.
   *
   * @returns {{ success: boolean, error?: string, players?: PlayerState[] }}
   */
  iniciarConfiguracion() {
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'La sala no está en estado LOBBY.' };
    }
    if (this.players.length < 3) {
      return { success: false, error: `Se necesitan al menos 3 jugadores. Hay ${this.players.length}.` };
    }

    // Cartas necesarias: (4 ocultas + 8 de elección) × n jugadores
    const cartasNecesarias = this.players.length * 12;
    if (this.deck.remaining < cartasNecesarias) {
      return { success: false, error: 'No hay suficientes cartas en el mazo.' };
    }

    for (const player of this.players) {
      // 4 cartas ocultas — el jugador NO las ve hasta que agota mano y visibles
      player.cartasOcultas  = this.deck.draw(4);

      // 8 cartas para la fase de elección — se almacenan en manoPrivada temporalmente.
      // El cliente presentará estas 8 cartas y el jugador escogerá:
      //   → 4 a cartasVisibles (todos las verán durante la partida)
      //   → 4 se quedan en manoPrivada (su mano real de inicio)
      player.manoPrivada    = this.deck.draw(8);
      player.cartasVisibles = [];
      player.isReady        = false;
    }

    this.status = 'SETUP';
    return { success: true, players: this.players };
  }

  /**
   * Confirma la elección de cartas de un jugador durante la fase SETUP.
   * Cuando el 100 % de los jugadores estén listos, el estado pasa a 'PLAYING'
   * y se elige un primer jugador al azar.
   *
   * @param {string}   playerId      - socket.id del jugador
   * @param {string[]} idsVisibles   - IDs de las 4 cartas elegidas como visibles
   * @param {string[]} idsMano       - IDs de las 4 cartas que forman la mano privada
   * @returns {{ success: boolean, error?: string, allReady?: boolean }}
   */
  confirmarEleccion(playerId, idsVisibles, idsMano) {
    if (this.status !== 'SETUP') {
      return { success: false, error: 'No estamos en fase de configuración.' };
    }

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Jugador no encontrado.' };
    if (player.isReady) return { success: false, error: 'Ya confirmaste tu elección.' };

    if (idsVisibles.length !== 4 || idsMano.length !== 4) {
      return { success: false, error: 'Debes elegir exactamente 4 cartas visibles y 4 para la mano.' };
    }

    // Las 8 cartas de elección están en manoPrivada durante el SETUP
    const pool = player.manoPrivada;
    const allIds = new Set([...idsVisibles, ...idsMano]);

    // Validar que los 8 IDs sean únicos y pertenezcan al pool de elección
    if (allIds.size !== 8) {
      return { success: false, error: 'Los IDs de cartas no son únicos.' };
    }
    for (const id of allIds) {
      if (!pool.some((c) => c.id === id)) {
        return { success: false, error: `La carta ${id} no pertenece a tu pool de elección.` };
      }
    }

    // Asignar cartas a su lugar definitivo
    player.cartasVisibles = pool.filter((c) => idsVisibles.includes(c.id));
    player.manoPrivada    = pool.filter((c) => idsMano.includes(c.id));
    player.isReady        = true;

    // Verificar si todos los jugadores están listos
    const allReady = this.players.every((p) => p.isReady);
    if (allReady) {
      this._iniciarPartida();
    }

    return { success: true, allReady };
  }

  /**
   * Transición SETUP → PLAYING.
   * Elige un primer jugador al azar.
   * @private
   */
  _iniciarPartida() {
    this.status = 'PLAYING';
    this.currentTurnIndex = Math.floor(Math.random() * this.players.length);
  }

  // ─── Utilidades de turno ─────────────────────────────────────────────────

  /**
   * Avanza el turno al siguiente jugador en la lista (circular).
   * Se usa externamente desde el servidor después de procesar una jugada.
   */
  nextTurn() {
    if (this.players.length === 0) return;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
  }

  /**
   * Verifica si un jugador ha ganado (sin cartas en ninguna zona).
   * Si gana, cambia el estado a FINISHED.
   *
   * @param {string} playerId
   * @returns {boolean} true si ganó
   */
  checkWinner(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    const hasNoCards =
      player.manoPrivada.length    === 0 &&
      player.cartasVisibles.length === 0 &&
      player.cartasOcultas.length  === 0;

    if (hasNoCards) {
      this.status   = 'FINISHED';
      this.winnerId = playerId;
      return true;
    }
    return false;
  }

  // ─── Serialización segura ────────────────────────────────────────────────

  /**
   * Genera una representación del estado del juego apta para enviar a TODOS
   * los clientes (las manos privadas y ocultas se ocultan o se muestra solo
   * el conteo).
   *
   * @returns {object} Estado público de la partida
   */
  toPublicState() {
    return {
      id:               this.id,
      status:           this.status,
      currentPlayerId:  this.currentPlayer?.id ?? null,
      pile:             this.pile,
      deckRemaining:    this.deck.remaining,
      winnerId:         this.winnerId,
      players: this.players.map((p) => ({
        id:                   p.id,
        username:             p.username,
        isReady:              p.isReady,
        cartasVisibles:       p.cartasVisibles,           // visible para todos
        manoPrivadaCount:     p.manoPrivada.length,       // solo el conteo
        cartasOcultasCount:   p.cartasOcultas.length,     // solo el conteo
      })),
    };
  }

  /**
   * Genera la perspectiva privada de un jugador específico
   * (incluye sus cartas privadas).
   *
   * @param {string} playerId
   * @returns {object}
   */
  toPrivateState(playerId) {
    const pub = this.toPublicState();
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return pub;

    return {
      ...pub,
      myHand: {
        manoPrivada:    player.manoPrivada,
        cartasVisibles: player.cartasVisibles,
        cartasOcultas:  player.cartasOcultas, // solo se revelan al jugarlas
      },
    };
  }
}

module.exports = Game;
