/**
 * SALAS PÚBLICAS — cómo habilitar / deshabilitar
 *
 * 1) Frontend: poner PUBLIC_ROOMS_ENABLED = true|false aquí.
 * 2) Backend:  poner el MISMO valor en backend/src/constants/features.js
 * 3) Reiniciar backend (npm start) y refrescar / redeploy frontend.
 *
 * Mientras esté false, Home muestra el botón deshabilitado con
 * "Salas públicas próximamente".
 */
export const PUBLIC_ROOMS_ENABLED = false;
