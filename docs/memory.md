# Memoria del proyecto IDIOTA-GAME

Documento de referencia para desarrollo y mantenimiento. Resume la arquitectura,
el comportamiento vigente y las instrucciones operativas del repositorio. Se
contrasta con el código actual; si una descripción histórica difiere del código,
prevalece la implementación.

## 1. Resumen

IDIOTA es un juego de cartas multijugador en tiempo real para navegador. El
repositorio es un monorepo con un cliente React/Vite y un servidor Node.js,
Express y Socket.IO. El servidor es autoritativo para el estado y las reglas de
cada partida; las salas y sesiones viven en memoria RAM, sin base de datos.

- Estado del producto descrito en la documentación técnica: beta funcional.
- Jugadores por partida: de 3 a 7.
- Estados de juego: `LOBBY`, `SETUP`, `PLAYING` y `FINISHED`.
- Interfaz en español con estética de casino oscuro y dorado.
- Salas privadas disponibles; la infraestructura de salas públicas existe, pero
  está desactivada por defecto.

## 2. Arquitectura y estructura

```text
backend/
  src/
    server.js                      Express, Socket.IO, eventos y validaciones de transporte
    constants/features.js          Feature flags del servidor
    controllers/roomController.js  Salas, sesiones y desconexiones
    models/Game.js                 Estado y reglas de una partida
    models/Deck.js                 Construcción, mezcla y robo de cartas
    utils/usernameModeration.js    Moderación básica de nombres
frontend/
  src/
    App.jsx                        Navegación y composición de páginas
    pages/                         Home, Lobby, Game, PublicLobbies y Blog
    components/                    Cartas, mesa, fases, overlays y controles
    hooks/                         Conexión, sesión, acciones, eventos y audio
    constants/                     Eventos de Socket.IO, reglas de presentación y flags
    utils/                         Sesión local y moderación de nombres
    styles/                        Tema visual
docs/
  memory.md                        Esta referencia consolidada
  IDIOTA-Documentacion-Tecnica-IEEE*.docx
README.md                           Introducción y guía rápida del repositorio
necesidades.txt                     Lista de mejoras e ideas pendientes
comandos.txt                        Comandos rápidos heredados
```

### Responsabilidades principales

- `backend/src/server.js`: configura HTTP/CORS/Socket.IO, valida entradas y
  permisos de eventos, ejecuta acciones de sala y transmite actualizaciones.
- `backend/src/controllers/roomController.js`: mantiene los juegos, la relación
  socket-sala, los tokens de sesión y los temporizadores de desconexión.
- `backend/src/models/Game.js`: estado de la partida, jugadores, fases, turnos,
  zonas de cartas, reglas y serialización pública/privada.
- `backend/src/models/Deck.js`: crea y mezcla las cartas y expone operaciones de
  robo.
- `frontend/src/hooks/useSocket.js`: instancia compartida de Socket.IO,
  reconexión y despertar del servidor.
- `frontend/src/hooks/useRoomSession.js`: estado de la sala y persistencia local
  de la sesión.
- `frontend/src/hooks/useGameActions.js` y `useGameEvents.js`: emisión de
  acciones y recepción de eventos del juego.
- `frontend/src/constants/socketEvents.js`: nombres compartidos de eventos del
  cliente.
- `frontend/src/constants/cardRules.js`: ayudas de presentación; la validación
  real de jugadas corresponde al backend.

Mantener separadas las reglas de negocio, el transporte y la interfaz. Validar
siempre las acciones en el servidor antes de difundir cambios.

## 3. Tecnologías y comandos

### Backend

- Node.js 18 o posterior.
- Express 4 y Socket.IO 4.
- Módulos CommonJS.
- Directorio: `backend/`.

```powershell
cd backend
npm install
npm start
```

El script `npm run dev` inicia `nodemon src/server.js`.

### Frontend

- React 18, React DOM 18, Socket.IO Client 4 y Vite 5.
- JSX y módulos ES.
- Directorio: `frontend/`.

```powershell
cd frontend
npm install
npm run dev
```

El servidor Vite local usa normalmente `http://localhost:5173`. Para comprobar
la compilación de producción:

```powershell
npm run build
```

No hay scripts de pruebas automatizadas definidos en los manifiestos actuales.

### Desarrollo local

Ejecutar el backend y el frontend en terminales separadas. El backend escucha
por defecto en el puerto `3000`; la ruta `GET /health` devuelve el estado del
servidor, las salas activas y el uptime.

## 4. Configuración y despliegue

### Variables y direcciones

- Backend: `PORT` (por defecto `3000`) y `FRONTEND_URL` (origen adicional
  permitido por CORS).
- Frontend: `VITE_SERVER_URL` (sobrescribe la dirección del backend).
- Si no se define `VITE_SERVER_URL`, el cliente usa `http://localhost:3000` en
  desarrollo, detecta el host equivalente en Dev Tunnels y en producción usa
  `https://idiota-backend.onrender.com`.
- El backend permite, además, el origen publicado
  `https://idiota-game.vercel.app`, `http://localhost:5173`,
  `http://localhost:3000` y subdominios `.devtunnels.ms`.

Los endpoints de despliegue son valores configurados en el código y en la
documentación existente; confirmar su vigencia en las plataformas antes de
operaciones de publicación.

### Infraestructura documentada

- Frontend: Vercel.
- Backend: Render. El servicio gratuito puede entrar en reposo; el cliente
  intenta despertarlo mediante `GET /health` y Socket.IO vuelve a conectar
  automáticamente.
- El hook de Socket.IO usa reintentos ilimitados, demora máxima de 10 segundos
  y timeout de conexión de 20 segundos.
- Un monitor externo que consulte `/health` puede reducir los cold starts, pero
  no es parte del repositorio.

### Salas públicas

`PUBLIC_ROOMS_ENABLED` se declara por separado en
`backend/src/constants/features.js` y `frontend/src/constants/features.js`.
Ambos valores deben coincidir. Actualmente los dos son `false`.

Para habilitar salas públicas intencionalmente:

1. Cambiar el flag en ambos archivos.
2. Reiniciar el backend.
3. Actualizar/recompilar y volver a desplegar el frontend según el entorno.

Con el flag desactivado, el cliente muestra la opción como no disponible y el
servidor no publica el listado ni acepta la función pública.

## 5. Reglas y ciclo de juego

### Mazo y jerarquía

El mazo actual contiene **108 cartas**: dos barajas de 54 cartas, cada una con
44 cartas ordinarias (3, 4, 5, 6, 7, 9, 10, J, Q, K, A en cuatro palos), cuatro
2, cuatro 8 y dos jokers. Se mezcla con Fisher–Yates.

- Jerarquía ordinaria: `3 < 4 < 5 < 6 < 7 < 9 < 10 < J < Q < K < A`.
- Se permite jugar una o varias cartas del mismo valor.
- Una carta ordinaria debe tener poder igual o mayor al de la carta superior de
  la pila.
- El `2` reinicia el poder requerido a cero; no quema la pila.
- El `8` y el `JOKER` queman la pila y otorgan otro turno.

### Reparto y turnos

1. La sala espera de 3 a 7 jugadores en `LOBBY`.
2. El anfitrión inicia la configuración. Cada jugador recibe 4 cartas ocultas
   y 8 cartas para elegir.
3. Cada persona elige exactamente 4 de las 8 para dejarlas visibles; las otras
   4 pasan a su mano privada. La partida comienza cuando todos confirman.
4. El primer turno se escoge al azar.
5. Al jugar, el servidor roba del mazo para completar hasta 4 cartas en la mano
   privada, cuando queden cartas disponibles.
6. Se juega primero desde la mano privada; al agotarla, desde las visibles y
   finalmente desde las ocultas.
7. Un jugador que se queda sin cartas queda salvado/espectador. El último
   jugador con cartas es el perdedor (el “idiota”) y termina la partida.

### Recogidas y cartas ocultas

- La recogida voluntaria o forzada mueve la pila a la zona activa del jugador.
- Quien recoge conserva el turno y abre la siguiente ronda con la pila vacía.
- Una carta oculta que no puede responder se revela; el servidor completa la
  recogida forzada después del breve intervalo de revelación.
- Una carta oculta válida se revela al jugarse.

## 6. Salas, estados y sesiones

El orden de jugadores determina el orden de turnos. El anfitrión es quien crea
la sala. Los códigos de sala son de seis caracteres. Solo se admiten nuevos
jugadores mientras la sala está en `LOBBY`; el máximo es 7.

```text
LOBBY → SETUP → PLAYING → FINISHED
```

El estado y las sesiones son efímeros: un reinicio o redeploy del proceso borra
las salas, los tokens y los temporizadores.

### Reconexión

- Al crear o unirse a una sala, el servidor emite un `sessionToken`.
- El cliente lo guarda en `localStorage` bajo la clave
  `idiota_room_session`, junto con el código de sala y el nombre.
- Una desconexión inicia una gracia de 45 segundos; el jugador aparece
  desconectado y se omite en los turnos.
- Al reconectar, el cliente envía `rejoin_session`; el servidor reasocia la
  sesión al nuevo `socket.id` y devuelve el estado privado correspondiente.
- Si vence la gracia, el servidor elimina al jugador y notifica a la sala.
- `leave_room` es una salida voluntaria inmediata, sin periodo de gracia.

No es autenticación de cuentas: el token solo identifica una sesión temporal en
memoria.

## 7. Contrato de eventos Socket.IO

Las acciones se validan en `server.js` y `Game.js`. Los errores se envían al
socket que originó la acción mediante `error` con `{ message }`. Los nombres
canónicos de cliente están en `frontend/src/constants/socketEvents.js`.

### Cliente → servidor

| Evento | Datos principales | Función |
| --- | --- | --- |
| `create_room` | `{ username, isPublic? }` | Crear sala y unir al anfitrión. |
| `join_room` | `{ roomId, username }` | Unirse a una sala en `LOBBY`. |
| `start_setup` | `{ roomId }` | El anfitrión inicia la configuración. |
| `confirm_setup` | `{ roomId, idsVisibles }` | Confirmar los 4 IDs elegidos. |
| `play_turn` | `{ roomId, cardIds }` | Jugar una o varias cartas. |
| `pick_up_pile` | `{ roomId, voluntary? }` | Recoger la pila. |
| `list_public_rooms` | sin datos | Solicitar lobbies públicos si el flag está activo. |
| `rejoin_session` | `{ sessionToken }` | Restaurar una sesión temporal. |
| `leave_room` | `{ roomId? }` | Abandonar la sala inmediatamente. |

### Servidor → cliente

Entre los eventos emitidos están:

- `room_created`, `room_joined`: incorporación inicial, estado y token de sesión.
- `room_updated`: estado público sincronizado.
- `setup_started`, `game_started`: inicio de fase o estado privado del jugador.
- `card_revealed`, `special_play`: revelación de carta y efectos especiales.
- `player_saved`, `game_over`: jugador salvado y resultado de la partida.
- `player_pending_disconnect`, `player_disconnected`: desconexión temporal y
  expulsión definitiva.
- `session_restored`: reconexión completada.
- `public_rooms_updated`: listado de salas públicas cuando está habilitado.
- `error`: fallo de validación u operación.

`toPublicState()` no incluye las cartas privadas. `toPrivateState(playerId)`
añade las zonas de cartas propias. Mantener esa separación al añadir o cambiar
eventos.

## 8. Seguridad, validación y experiencia

- El backend valida nombre, pertenencia a sala, estado de partida, turno, zona
  de cartas, IDs, valores y poderes antes de aplicar una jugada.
- La moderación de nombres está implementada en
  `backend/src/utils/usernameModeration.js` y duplicada para la experiencia de
  cliente en `frontend/src/utils/usernameModeration.js`; mantener ambas listas y
  normalizaciones alineadas.
- La conexión Socket.IO usa CORS con orígenes permitidos definidos en
  `server.js`.
- No hay persistencia, cuentas autenticadas ni estado compartido entre varios
  procesos. Una instancia del backend es un mundo de juego independiente.
- La interfaz muestra cantidades de cartas de oponentes, estados de conexión,
  overlays y controles de audio; la lógica visual no sustituye la validación del
  servidor.

## 9. Pendientes conocidos

Las ideas en `necesidades.txt` incluyen:

- Añadir chat y mejorar filtros, actualización y estados de las salas públicas.
- Mitigar spam de salas, salas abandonadas y listados demasiado grandes.
- Añadir timeouts de turno para jugadores AFK o que bloquean la partida.
- Crear pruebas automatizadas/simulaciones para proteger las reglas del juego.
- Evaluar persistencia o Redis si se requiere tolerancia a reinicios o varios
  procesos.

La lista también registra como solucionados la identidad básica y reconexión de
sesión y la moderación básica de nombres. No asumir persistencia duradera:
tokens y estado se pierden al reiniciar el backend.

## 10. Documentación relacionada

- `README.md`: introducción y configuración rápida.
- `docs/IDIOTA-Documentacion-Tecnica-IEEE.docx` y
  `docs/IDIOTA-Documentacion-Tecnica-IEEE-v1.1.docx`: documentos técnicos
  estáticos, útiles como referencia histórica; algunas cifras o descripciones
  pueden no coincidir con la implementación actual.
- `necesidades.txt`: mejoras y trabajo futuro.
- `.cursor/rules/`: directrices del proyecto, reglas de negocio y criterios de
  arquitectura.

Este `memory.md` reemplaza el generador `docs/generate-sdd.py` como documento
consolidado mantenido a mano. Los archivos `.docx` existentes no se regeneran
automáticamente desde aquí.
