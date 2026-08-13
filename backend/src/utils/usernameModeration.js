/**
 * Moderación básica de nombres de jugador (lista negra local).
 * Espejo de frontend/src/utils/usernameModeration.js — mantener alineados.
 */

const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '$': 's',
};

/** Insultos claros (ES + EN). Sin palabras de 3 letras ni “idiota” (nombre del juego). */
const BLOCKED_RAW = [
  'puta',
  'puto',
  'putas',
  'putos',
  'mierda',
  'pendejo',
  'pendeja',
  'cabron',
  'cabrona',
  'gilipollas',
  'maricon',
  'hijodeputa',
  'hijaputa',
  'coño',
  'joder',
  'jodete',
  'chinga',
  'chingar',
  'chingada',
  'verga',
  'pinche',
  'culero',
  'culera',
  'imbecil',
  'estupido',
  'estupida',
  'malparido',
  'malparida',
  'gonorrea',
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'nigger',
  'nigga',
  'faggot',
  'cunt',
  'whore',
  'slut',
];

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeUsername(name) {
  if (!name || typeof name !== 'string') return '';
  let s = name.trim().toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/[0134@$]/g, (ch) => LEET_MAP[ch] ?? ch);
  s = s.replace(/[^a-z0-9]/g, '');
  return s;
}

const BLOCKED = [
  ...new Set(
    BLOCKED_RAW
      .map((t) => normalizeUsername(t))
      .filter((t) => t.length >= 4)
  ),
];

/**
 * @param {string} name
 * @returns {boolean}
 */
function isOffensiveUsername(name) {
  const normalized = normalizeUsername(name);
  if (!normalized) return false;
  return BLOCKED.some((term) => normalized.includes(term));
}

module.exports = {
  normalizeUsername,
  isOffensiveUsername,
};
