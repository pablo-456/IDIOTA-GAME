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
 *
 * ─── REGLA DE RECOGIDA ───────────────────────────────────────────────────────
 *
 *   • Cuando un jugador recoge la mesa (voluntaria o forzosamente), las cartas
 *     de la pila pasan a su manoPrivada y la mesa queda vacía.
 *   • El turno NO avanza: el jugador que recogió abre la nueva ronda y puede
 *     jugar cualquier carta (pila vacía).
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
     * socket.id del jugador perdedor — el último en quedarse con cartas (el "idiota").
     */
    this.loserId = null;

    /**
     * @type {{ id: string, username: string, savedAt: number }[]}
     * Jugadores que ya se quedaron sin cartas (salvados), en orden de salida.
     */
    this.savedPlayers = [];

    /**
     * Carta oculta mala revelada pendiente de pickup (esperando el delay de 3s del servidor).
     * @type {{ playerId: string, card: object } | null}
     */
    this.pendingForcedPickUp = null;

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
   * Si la última carta jugada es un '2' (reset), devuelve 0 también.
   */
  get pileTopPower() {
    if (this.pile.length === 0) return 0;
    
    const top = this.pile[this.pile.length - 1];
    if (top.value === '2') return 0; // El 2 resetea el poder requerido a 0
    
    // Retorna únicamente el poder de la carta que quedó arriba del todo
    return top.power ?? 0; 
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
      manoPrivada:           [],
      cartasVisibles:        [],
      cartasVisiblesPublicas: [], // las 4 elegidas en SETUP — lo único que ven los rivales
      cartasOcultas:         [],
      isReady:               false,
      isSaved:               false,
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
   * • Si quedan < 2 jugadores activos durante PLAYING, finaliza la partida.
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
      if (wasCurrentTurn) {
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
        }
        advanceTurn = true;
      } else if (idx < this.currentTurnIndex) {
        this.currentTurnIndex = Math.max(0, this.currentTurnIndex - 1);
      }

      if (this.players.filter(p => !p.isSaved).length < 2) {
        this.status  = 'FINISHED';
        const lastActive = this.players.find(p => !p.isSaved);
        this.loserId = lastActive?.id ?? null;
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
   * @returns {{ success: boolean, error?: string, players?: PlayerState[] }}
   */
  iniciarConfiguracion() {
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'La sala no está en estado LOBBY.' };
    }
    if (this.players.length < 3) {
      return { success: false, error: `Se necesitan al menos 3 jugadores. Hay ${this.players.length}.` };
    }

    const cartasNecesarias = this.players.length * 12;
    if (this.deck.remaining < cartasNecesarias) {
      return { success: false, error: 'No hay suficientes cartas en el mazo.' };
    }

    for (const player of this.players) {
      player.cartasOcultas  = this.deck.draw(4);
      player.manoPrivada    = this.deck.draw(8); // pool temporal de elección
      player.cartasVisibles = [];
      player.isReady        = false;
    }

    this.status = 'SETUP';
    return { success: true, players: this.players };
  }

  /**
   * Confirma la elección de cartas de un jugador durante la fase SETUP.
   * El jugador envía los IDs de las 4 cartas que quiere como visibles;
   * las otras 4 del pool quedan automáticamente como manoPrivada.
   *
   * Cuando el 100 % de los jugadores estén listos, el estado pasa a 'PLAYING'.
   *
   * @param {string}   playerId    - socket.id del jugador
   * @param {string[]} idsVisibles - IDs de las 4 cartas elegidas como visibles
   * @returns {{ success: boolean, error?: string, allReady?: boolean }}
   */
  confirmarEleccion(playerId, idsVisibles) {
    if (this.status !== 'SETUP') {
      return { success: false, error: 'No estamos en fase de configuración.' };
    }

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Jugador no encontrado.' };
    if (player.isReady) return { success: false, error: 'Ya confirmaste tu elección.' };

    if (!Array.isArray(idsVisibles) || idsVisibles.length !== 4) {
      return { success: false, error: 'Debes elegir exactamente 4 cartas visibles.' };
    }

    const pool = player.manoPrivada; // las 8 cartas de elección
    const uniqueIds = new Set(idsVisibles);

    if (uniqueIds.size !== 4) {
      return { success: false, error: 'Los IDs de cartas visibles no son únicos.' };
    }
    for (const id of uniqueIds) {
      if (!pool.some((c) => c.id === id)) {
        return { success: false, error: `La carta ${id} no pertenece a tu pool de elección.` };
      }
    }

    // Asignar: las 4 elegidas son visibles, las otras 4 quedan en mano privada
    player.cartasVisibles         = pool.filter((c) =>  uniqueIds.has(c.id));
    player.cartasVisiblesPublicas  = [...player.cartasVisibles]; // snapshot público — solo estas ven los rivales
    player.manoPrivada            = pool.filter((c) => !uniqueIds.has(c.id));
    player.isReady        = true;

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
    this.status           = 'PLAYING';
    this.currentTurnIndex = Math.floor(Math.random() * this.players.length);
  }

  // ─── Lógica de Juego ─────────────────────────────────────────────────────

  /**
   * Determina la zona activa desde la que el jugador puede jugar cartas.
   * Prioridad: manoPrivada → cartasVisibles → cartasOcultas
   *
   * @param {object} player
   * @returns {'manoPrivada'|'cartasVisibles'|'cartasOcultas'|null}
   */
  _getActiveZone(player) {
    if (player.manoPrivada.length    > 0) return 'manoPrivada';
    if (player.cartasVisibles.length > 0) return 'cartasVisibles';
    if (player.cartasOcultas.length  > 0) return 'cartasOcultas';
    return null; // sin cartas → ganó
  }

  /**
   * Procesa la jugada del turno activo.
   *
   * El jugador puede jugar una o más cartas DEL MISMO valor.
   * Reglas:
   *   • Valor '2'   → reset: se puede jugar sobre cualquier carta; la pila
   *                   sigue pero el poder efectivo baja a 0.
   *   • Valor '8'   → burn: quema la pila y da turno extra.
   *   • Valor 'J'   → Joker: quema la pila y da turno extra.
   *   • En todos los demás casos, las cartas deben tener power ≥ pileTopPower.
   *
   * Después de jugar:
   *   1. El jugador roba del mazo hasta tener 4 cartas en mano (si el mazo tiene).
   *   2. Se comprueba si ganó.
   *   3. Si no ganó y no hubo turno extra, el turno pasa al siguiente.
   *
   * @param {string}   playerId - socket.id del jugador activo
   * @param {string[]} cardIds  - IDs de las cartas a jugar (mismo valor)
   * @returns {{
   *   success    : boolean,
   *   error?     : string,
   *   burned?    : boolean,   // la pila fue quemada
   *   extraTurn? : boolean,   // el mismo jugador vuelve a jugar
   *   won?       : boolean,   // el jugador ganó la partida
   * }}
   */
  playTurn(playerId, cardIds) {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'La partida no está en curso.' };
    }

    const player = this.currentPlayer;
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno.' };
    }
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return { success: false, error: 'Debes jugar al menos una carta.' };
    }

    const zone = this._getActiveZone(player);
    if (!zone) return { success: false, error: 'No tienes cartas para jugar.' };

    const sourceCards = player[zone];
    const uniqueCardIds = [...new Set(cardIds)];

    // Localizar las cartas en la zona activa
    const cardsToPlay = uniqueCardIds.map((id) => sourceCards.find((c) => c.id === id));
    if (cardsToPlay.some((c) => !c)) {
      return { success: false, error: 'Una o más cartas no están disponibles en tu zona activa.' };
    }

    // Validar que todas sean del mismo valor
    const playValue = cardsToPlay[0].value;
    if (cardsToPlay.some((c) => c.value !== playValue)) {
      return { success: false, error: 'Todas las cartas jugadas deben tener el mismo valor.' };
    }

    //  CORREGIDO: Validando tanto el string 'JOKER' como el emoji por si acaso
    const isBurn  = playValue === '8' || playValue === 'JOKER' || playValue === '🃏';
    const isReset = playValue === '2';

    // Validar poder (excepto para burns y resets, que siempre se pueden jugar)
    if (!isBurn && !isReset) {
      const cardPower = cardsToPlay[0].power;
      if (cardPower < this.pileTopPower) {
        
        // INTERCEPCIÓN DEL AZAR: Si la carta viene de la zona oculta, el fallo es un evento legal del juego
        if (zone === 'cartasOcultas') {
          // 1. Removemos la carta de sus cartas ocultas
          player[zone] = sourceCards.filter((c) => !uniqueCardIds.includes(c.id));

          // 2. Añadimos la carta a la pila (para que se sume al castigo)
          this.pile.push(...cardsToPlay);

          // 3. NO ejecutamos el pickup aquí — guardamos el estado pendiente para
          //    que el servidor pueda primero revelar la carta a todos (drama), y
          //    luego confirmar el pickup con confirmForcedPickUp().
          this.pendingForcedPickUp = {
            playerId: player.id,
            card:     cardsToPlay[0],
          };

          // Retornamos la carta revelada para que el servidor la emita a la sala
          return {
            success:      true,
            burned:       false,
            extraTurn:    false,
            won:          false,
            forcedPickUp: true,
            revealedCard: cardsToPlay[0],
          };
        }

        // Para 'manoPrivada' o 'cartasVisibles', sigue siendo un movimiento inválido (error)
        return {
          success: false,
          error: `No puedes jugar ${playValue} sobre una pila con poder ${this.pileTopPower}.`,
        };
      }
    }

    // Remover cartas de la zona activa del jugador
    player[zone] = sourceCards.filter((c) => !uniqueCardIds.includes(c.id));

    // Si jugó desde cartasVisibles, sincronizar el snapshot público:
    // solo quedan públicas las que siguen existiendo en cartasVisibles reales.
    if (zone === 'cartasVisibles') {
      const visiblesIds = new Set(player.cartasVisibles.map((c) => c.id));
      player.cartasVisiblesPublicas = player.cartasVisiblesPublicas.filter((c) => visiblesIds.has(c.id));
    }

    // Añadir cartas a la pila
    this.pile.push(...cardsToPlay);

    let burned    = false;
    let extraTurn = false;

    if (isBurn) {
      // Quemar la pila
      this.pile  = [];
      burned     = true;
      extraTurn  = true;
    }

    // El jugador roba del mazo hasta completar 4 en manoPrivada
    if (this.deck.remaining > 0 && player.manoPrivada.length < 4) {
      const needed = 4 - player.manoPrivada.length;
      const drawn  = this.deck.draw(Math.min(needed, this.deck.remaining));
      player.manoPrivada.push(...drawn);
    }

    // Comprobar si el jugador se salvó (se quedó sin cartas)
    const { saved, gameOver } = this.checkSaved(playerId);
    if (saved) return { success: true, burned, extraTurn: false, saved: true, gameOver };

    // Avanzar turno si no hay turno extra
    if (!extraTurn) {
      this.nextTurn();
    }

    // Carta oculta buena → revelar a todos
    const revealedCard = (zone === 'cartasOcultas') ? cardsToPlay[0] : null;

    // isBurn ya indica si es 8 o Joker; reutilizamos esa variable (playValue ya está declarada arriba)
    const isSpecialPlay = isBurn && zone !== 'cartasOcultas';

    return { success: true, burned, extraTurn, saved: false, gameOver: false, revealedCard, isSpecialPlay, specialCard: isSpecialPlay ? cardsToPlay[0] : null };
  }

  /**
   * El jugador recoge toda la pila de la mesa hacia su manoPrivada.
   *
   * REGLA CLAVE: El turno NO pasa al siguiente jugador. El jugador que recogió
   * la mesa es quien abre la nueva ronda con la pila vacía, pudiendo jugar
   * cualquier carta libremente.
   *
   * Puede ser voluntaria (el jugador elige recoger) o forzada (intentó jugar
   * una carta que no puede, o en cartas ocultas sacó una mala carta).
   *
   * @param {string}  playerId  - socket.id del jugador activo
   * @param {boolean} [voluntary=false] - true si el jugador eligió recoger
   * @returns {{ success: boolean, error?: string, cardsPickedUp: number }}
   */
  pickUpPile(playerId, voluntary = false) {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'La partida no está en curso.' };
    }

    const player = this.currentPlayer;
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno.' };
    }

    const count = this.pile.length;

    // Si el jugador ya está en fase de cartas visibles, las recogidas se suman
    // a cartasVisibles (jugables junto a las demás) pero NO a cartasVisiblesPublicas,
    // así los rivales nunca las ven. En cualquier otra fase van a manoPrivada.
    const zone = this._getActiveZone(player);
    if (zone === 'cartasVisibles') {
      player.cartasVisibles.push(...this.pile);
    } else {
      player.manoPrivada.push(...this.pile);
    }
    this.pile = [];

    // El turno NO avanza: el mismo jugador inicia la nueva ronda con mesa vacía.
    // No llamamos a this.nextTurn()

    return { success: true, cardsPickedUp: count, voluntary };
  }

  /**
   * Ejecuta la recogida forzada que quedó pendiente tras revelar una carta oculta mala.
   * Debe llamarse desde el servidor después del delay de revelación.
   *
   * @returns {{ success: boolean, cardsPickedUp: number }}
   */
  confirmForcedPickUp() {
    const pending = this.pendingForcedPickUp;
    if (!pending) return { success: false, error: 'No hay recogida forzada pendiente.' };

    const player = this.players.find((p) => p.id === pending.playerId);
    if (!player) return { success: false, error: 'Jugador no encontrado.' };

    const count = this.pile.length;

    // Mismo criterio que pickUpPile: si está en fase visible, las recogidas
    // van a cartasVisibles (no públicas); si no, a manoPrivada.
    const zone = this._getActiveZone(player);
    if (zone === 'cartasVisibles') {
      player.cartasVisibles.push(...this.pile);
    } else {
      player.manoPrivada.push(...this.pile);
    }
    this.pile = [];

    // Limpiar el estado pendiente
    this.pendingForcedPickUp = null;

    // El turno NO avanza: el jugador que recogió abre la nueva ronda con mesa vacía
    return { success: true, cardsPickedUp: count };
  }

  // ─── Utilidades de turno ─────────────────────────────────────────────────

  /**
   * Avanza el turno al siguiente jugador activo (isSaved=false).
   */
  nextTurn() {
    if (this.players.length === 0) return;
    const total = this.players.length;
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % total;
      attempts++;
    } while (attempts < total && this.players[this.currentTurnIndex]?.isSaved);
  }

  /**
   * Verifica si un jugador se ha salvado (sin cartas en ninguna zona).
   * Si queda 1 solo jugador con cartas → ese es el idiota, partida FINISHED.
   */
  checkSaved(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { saved: false, gameOver: false };

    const hasNoCards =
      player.manoPrivada.length    === 0 &&
      player.cartasVisibles.length === 0 &&
      player.cartasOcultas.length  === 0;

    if (!hasNoCards) return { saved: false, gameOver: false };

    // Ya estaba marcado como salvado (doble check)
    if (player.isSaved) return { saved: false, gameOver: false };

    player.isSaved = true;
    this.savedPlayers.push({ id: player.id, username: player.username, savedAt: this.savedPlayers.length + 1 });

    const activePlayers = this.players.filter((p) => !p.isSaved);

    if (activePlayers.length <= 1) {
      this.status  = 'FINISHED';
      // El último activo es el idiota — NO se agrega a savedPlayers
      this.loserId = activePlayers[0]?.id ?? null;
      return { saved: true, gameOver: true };
    }

    // Avanzar el turno al siguiente jugador activo
    this.nextTurn();

    return { saved: true, gameOver: false };
  }


  // ─── Serialización segura ────────────────────────────────────────────────

  /**
   * Genera una representación del estado del juego apta para enviar a TODOS
   * los clientes.
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
      loserId:      this.loserId,
      savedPlayers: this.savedPlayers,
      players: this.players.map((p) => ({
        id:                   p.id,
        username:             p.username,
        isReady:              p.isReady,
        isSaved:              p.isSaved,
        cartasVisibles:       p.cartasVisiblesPublicas, // rivales solo ven las 4 originales
        // Incluye cartas recogidas en fase visibles (están en cartasVisibles pero no en públicas)
        manoPrivadaCount:     p.manoPrivada.length
          + Math.max(0, p.cartasVisibles.length - p.cartasVisiblesPublicas.length),
        cartasOcultasCount:   p.cartasOcultas.length,
      })),
    };
  }

  /**
   * Genera la perspectiva privada de un jugador específico.
   *
   * @param {string} playerId
   * @returns {object}
   */
  toPrivateState(playerId) {
    const pub    = this.toPublicState();
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return pub;

    return {
      ...pub,
      myHand: {
        manoPrivada:    player.manoPrivada,
        cartasVisibles: player.cartasVisibles,
        cartasOcultas:  player.cartasOcultas,
      },
    };
  }
}

module.exports = Game;