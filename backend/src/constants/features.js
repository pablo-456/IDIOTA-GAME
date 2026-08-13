/**
 * SALAS PÚBLICAS — cómo habilitar / deshabilitar
 *
 * 1) Backend:  poner PUBLIC_ROOMS_ENABLED = true|false aquí.
 * 2) Frontend: poner el MISMO valor en frontend/src/constants/features.js
 * 3) Reiniciar backend (npm start) y refrescar / redeploy frontend.
 *
 * Mientras esté false, el servidor ignora salas públicas
 * (create_room siempre crea privada; no hay list_public_rooms).
 */
const PUBLIC_ROOMS_ENABLED = false;

module.exports = {
  PUBLIC_ROOMS_ENABLED,
};
