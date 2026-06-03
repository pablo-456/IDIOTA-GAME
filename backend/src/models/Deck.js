/**
 * Deck.js — Modelo del Mazo para el juego IDIOTA
 *
 * Gestiona dos barajas de póker completas mezcladas (104 cartas + 4 Jokers = 108 cartas).
 *
 * JERARQUÍA DE PODER (cartas ordinarias):
 *   3 < 4 < 5 < 6 < 7 < 9 < 10 < J(11) < Q(12) < K(13) < A(14)
 *
 * COMODINES:
 *   - '2'     → type: 'reset' | Reinicia el contador de la mesa (cualquier carta puede jugarse sobre él)
 *   - '8'     → type: 'burn'  | Quema la pila y otorga turno extra al jugador que lo juega
 *   - 'JOKER' → type: 'burn'  | Igual que el 8; hay 4 en total (2 por baraja)
 *
 * El 2 y el 8 no participan en la jerarquía ordinaria; tienen su propio poder especial.
 */

// ---------------------------------------------------------------------------
// Constantes de configuración
// ---------------------------------------------------------------------------

/** Palos estándar de una baraja de póker */
const SUITS = ['♠', '♥', '♦', '♣'];

/**
 * Mapa de cartas ordinarias: valor → power
 * El 2 y el 8 se definen por separado como comodines.
 */
const ORDINARY_CARDS = {
  '3':  3,
  '4':  4,
  '5':  5,
  '6':  6,
  '7':  7,
  '9':  9,
  '10': 10,
  'J':  11,
  'Q':  12,
  'K':  13,
  'A':  14,
};

// ---------------------------------------------------------------------------
// Clase Deck
// ---------------------------------------------------------------------------

class Deck {
  constructor() {
    /** @type {Card[]} Pila de cartas disponibles para robar */
    this.cards = [];
    this._initialize();
    this._shuffle();
  }

  // ─── Construcción del mazo ────────────────────────────────────────────────

  /**
   * Crea y almacena las 108 cartas que componen dos barajas de póker.
   * Se llama automáticamente en el constructor.
   * @private
   */
  _initialize() {
    this.cards = [];

    // Generamos DOS barajas idénticas y las concatenamos
    for (let deck = 0; deck < 2; deck++) {
      // — Cartas ordinarias (3, 4, 5, 6, 7, 9, 10, J, Q, K, A) × 4 palos
      for (const [value, power] of Object.entries(ORDINARY_CARDS)) {
        for (const suit of SUITS) {
          this.cards.push(this._createCard(value, suit, power, 'ordinary'));
        }
      }

      // — Comodín RESET: el '2' × 4 palos
      for (const suit of SUITS) {
        this.cards.push(this._createCard('2', suit, 2, 'reset', true));
      }

      // — Comodín BURN: el '8' × 4 palos
      for (const suit of SUITS) {
        this.cards.push(this._createCard('8', suit, 8, 'burn', true));
      }

      // — Comodín BURN: 2 Jokers por baraja (4 en total)
      for (let j = 0; j < 2; j++) {
        this.cards.push(this._createCard('JOKER', '🃏', 8, 'burn', true));
      }
    }
    // Total: 2 × (44 ordinarias + 4 doses + 4 ochos + 2 jokers) = 2 × 54 = 108 cartas
  }

  /**
   * Fábrica de objetos carta.
   * @param {string}  value  - Valor visible ('3', 'J', 'JOKER', etc.)
   * @param {string}  suit   - Palo ('♠', '♥', '♦', '♣', '🃏')
   * @param {number}  power  - Valor numérico para comparaciones
   * @param {string}  type   - 'ordinary' | 'reset' | 'burn'
   * @param {boolean} isWild - true si es comodín
   * @returns {Card}
   * @private
   */
  _createCard(value, suit, power, type, isWild = false) {
    return {
      id: `${value}${suit}_${Math.random().toString(36).slice(2, 7)}`, // ID único
      value,
      suit,
      power,
      type,   // 'ordinary' | 'reset' | 'burn'
      isWild,
    };
  }

  // ─── Mezcla ───────────────────────────────────────────────────────────────

  /**
   * Mezcla el mazo in-place usando el algoritmo Fisher-Yates (Knuth Shuffle).
   * Garantiza una distribución uniforme → O(n).
   * @private
   */
  _shuffle() {
    const arr = this.cards;
    for (let i = arr.length - 1; i > 0; i--) {
      // Escoge un índice aleatorio entre 0 e i (inclusive)
      const j = Math.floor(Math.random() * (i + 1));
      // Intercambia arr[i] ↔ arr[j]
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  /**
   * Saca `count` cartas de la cima del mazo.
   * Lanza un error si no hay suficientes cartas disponibles.
   *
   * @param {number} count - Cantidad de cartas a sacar (por defecto 1)
   * @returns {Card[]}     - Array de cartas sacadas
   */
  draw(count = 1) {
    if (count > this.cards.length) {
      throw new Error(
        `No hay suficientes cartas en el mazo. Disponibles: ${this.cards.length}, solicitadas: ${count}`
      );
    }
    // splice desde el final es O(count) y evita reindexar todo el array
    return this.cards.splice(this.cards.length - count, count);
  }

  /**
   * Número de cartas restantes en el mazo.
   * @returns {number}
   */
  get remaining() {
    return this.cards.length;
  }

  /**
   * Indica si el mazo está vacío.
   * @returns {boolean}
   */
  get isEmpty() {
    return this.cards.length === 0;
  }
}

module.exports = Deck;
