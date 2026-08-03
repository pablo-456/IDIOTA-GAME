/**
 * Helpers de presentación de cartas en el cliente.
 * La validación autoritativa vive en el backend; aquí solo se usan para UI.
 */

export const CARD_POWER_MAP = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  '2': 99, '8': 100, '🃏': 101,
};

export function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

export function cardLabel(c) {
  if (c.value === '🃏') return '🃏';
  return `${c.value}${c.suit}`;
}

export function isSpecialCard(value) {
  return value === '2' || value === '8' || value === '🃏';
}

export function isBurnCard(value) {
  return value === '8' || value === 'JOKER' || value === '🃏';
}

export function getPileTopPower(pile) {
  if (!pile || pile.length === 0) return 0;
  const top = pile[pile.length - 1];
  if (top.value === '2') return 0;
  if (isBurnCard(top.value)) return 0;
  return CARD_POWER_MAP[top.value] ?? top.power ?? 0;
}

export function canPlayAgainstPile(card, pileTopPower, isMyTurn) {
  if (!isMyTurn) return false;
  const power = CARD_POWER_MAP[card.value] ?? card.power ?? 0;
  const burn = isBurnCard(card.value);
  const reset = card.value === '2';
  return burn || reset || power >= pileTopPower;
}
