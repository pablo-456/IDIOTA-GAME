# 🃏 IDIOTA - Juego de Cartas Multijugador Online

¡Bienvenido a **IDIOTA**! Un juego de cartas multijugador online en tiempo real diseñado con una estética premium de casino oscuro y dorado. El proyecto está construido con una arquitectura moderna utilizando comunicación bidireccional por WebSockets para una sincronización instantánea entre jugadores.

Actualmente, el juego se encuentra en una versión **Beta Funcional**, con el motor lógico, el sistema de salas dinámicas y la interfaz interactiva completamente operativos.

---

## 🚀 Características Principales

*   **Multijugador en Tiempo Real:** Conexión fluida e instantánea mediante WebSockets (Socket.io).
*   **Sistema de Salas Dinámico:** Creación de partidas con códigos aleatorios únicos y unión de jugadores en tiempo real.
*   **Lobby Interactivo:** Gestión de jugadores antes de iniciar, con barras de progreso que validan el mínimo de participantes requeridos.
*   **Fase de Selección Estratégica (Setup):** Al arrancar, cada jugador recibe 8 cartas y debe elegir estratégicamente 4 para dejarlas visibles en la mesa y 4 para su mano oculta.
*   **Estética Visual Premium:** Interfaz responsiva inspirada en tapetes de casino de alta gama, con efectos visuales dinámicos al seleccionar y lanzar cartas.

---

## 📜 Reglas del Juego e Implementación Lógica

El motor del backend gestiona un mazo de 104 cartas (mezcladas mediante el algoritmo Fisher-Yates) y aplica las siguientes reglas de juego:

*   **Validación de Turnos:** Un jugador solo puede lanzar cartas que sean mayores o iguales a la última carta presente en la pila central de la mesa.
*   **Cartas Especiales:**
    *   **El '2':** Reinicia el valor de la mesa.
    *   **El '8' / Joker:** Queman la mesa por completo y otorgan un turno extra al jugador.
*   **Mecánicas Avanzadas de Recogida (Reglas de la Casa):**
    *   **Penalización por Bloqueo:** Si un jugador no puede responder a la mesa, debe recoger todo el pozo acumulado a su mano privada. Al hacerlo, **este mismo jugador reinicia la ronda** abriendo la mesa vacía.
    *   **Recogida Voluntaria:** Durante su turno, un jugador puede elegir por pura estrategia llevarse todas las cartas de la mesa a su mano (incluso si tiene cartas válidas para jugar). Al igual que la penalización, su turno termina y él mismo abre la nueva ronda con la combinación de cartas que desee.

---

## 🛠️ Arquitectura Tecnológica

El proyecto se divide en una estructura limpia de dos carpetas principales (Mono-repo):

### 🖥️ Backend (`/backend`)
*   **Node.js & Express:** Servidor base para el entorno de ejecución.
*   **Socket.io:** Gestión de eventos globales, estado de las salas y sincronización del estado del juego en la memoria RAM del servidor.
*   **Lógica en Memoria:** Estructura eficiente basada en modelos de JavaScript (`Game.js`) sin dependencias de bases de datos pesadas para esta fase.

### 🎨 Frontend (`/frontend`)
*   **React (Vite):** Interfaz de usuario rápida, reactiva y modular.
*   **Hooks Personalizados:** Implementación de `useSocket` para desacoplar la conexión de la lógica visual.
*   **CSS3 Moderno:** Estilos estilizados con variables globales y efectos de transformación (`translateY`) para la interacción de las cartas.

---

## 📦 Instalación y Configuración Local

Para levantar el proyecto en tu máquina local, sigue estos pasos:

1. Clonar el repositorio e instalar dependencias

cd idiota-game

2. Configurar y encender el Backend

cd backend
npm install
node src/server.js

Deberías ver el mensaje de confirmación: "Servidor IDIOTA en puerto 3000"

3. Configurar y encender el Frontend
Abre una nueva pestaña en tu terminal y ejecuta:

Bash
cd frontend
npm install
npm run dev
