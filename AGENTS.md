# AGENTS.md — IDIOTA Game

> Guía para agentes de IA que trabajan en este proyecto. Consolida las reglas de `.cursor/rules`.

---

## 1. Descripción del Proyecto

**IDIOTA** es un juego de cartas multijugador online en tiempo real. Es un mono-repo con:

- **Backend:** Node.js con Socket.io (sin base de datos — todo el estado vive en RAM).
- **Frontend:** React 18+ con Vite y CSS modular.

### Estructura

```
/backend/    → Servidor Node.js + Socket.io
/frontend/   → Aplicación React + Vite
```

---

## 2. Reglas del Backend y WebSockets

### Arquitectura y Principios

- **Sin Base de Datos:** Todo el estado (salas, jugadores, manos, cartas visibles, pila) se gestiona en **memoria RAM del servidor** usando estructuras JS (objetos, mapas, arrays).
- **Modularidad:** Separa la lógica del juego de la capa de transporte. Ejemplo: `Game.js` para reglas, `server.js` para listeners y emisión de eventos.

### Manejo de WebSockets (Socket.io)

- Valida las acciones de los jugadores en el servidor **antes** de propagar el nuevo estado.
- Usa sincronización por salas: `io.to(roomId).emit(...)` para que todos los participantes reciban el estado actualizado idéntico.
- Limpia salas y maneja desconexiones para evitar fugas de memoria.
- **Entorno:** Node.js v18+ (módulos ES6 o CommonJS según `package.json`).

---

## 3. Reglas del Frontend (React & Vite)

### Estructura de Componentes

- **Componentes Modulares:** Divide vistas complejas en componentes limpios y reutilizables (lobby, `SetupPhase`, mesa de juego activo).
- **Manejo de Estados:** Usa `useState`, `useEffect` y `useCallback` eficientemente para evitar renderizados innecesarios, especialmente con selecciones de cartas y eventos de red.

### Estilos y UI/UX

- **Diseño:** Casino oscuro y dorado — fondos verdes oscuros, tipografías elegantes, bordes dorados, sombras y efectos de elevación con `transform: translateY` para cartas seleccionadas.
- **Interactividad en Tiempo Real:** El cliente debe reflejar inmediatamente las respuestas del servidor y mantener actualizados contadores (mazo restante, cartas en mano de oponentes).
- **Stack:** React 18+ con Vite (JSX moderno, sin `import React from 'react'`).

---

## 4. Reglas de Negocio de IDIOTA

1. **Mazo:** 104 cartas mezcladas con algoritmo Fisher-Yates.
2. **Fase de Setup:** Cada jugador recibe 12 cartas — elige 4 visibles para la mesa y 4 se queda en su mano privada. Las otras 4 quedan en el mazo o según distribución inicial.
3. **Validación de Turnos:** Las cartas jugadas deben ser mayores o iguales a la última carta de la pila central (`pile`).
4. **Cartas Especiales:**
   - **'2':** Reinicia el valor de la mesa.
   - **'8' y Joker:** Queman la mesa y otorgan un turno extra.
5. **Reglas de Recogida:**
   - **Penalización:** Si un jugador no puede responder, recoge todo el pozo a su mano. Ese mismo jugador reinicia la ronda abriendo la mesa vacía.
   - **Recogida Voluntaria:** Un jugador puede decidir recoger el pozo en su turno por estrategia. Aplica la misma regla: su turno termina recogiéndose y él abre la nueva ronda.

---

## 5. Principios de Código y SOLID

### Responsabilidad Única (SRP)

- Cada módulo, clase, archivo o función debe tener **una y solo una responsabilidad** bien definida.
- **Separación de Capas:**
  - Lógica del juego (reglas, validaciones, turnos) → backend (`Game.js` o modelos de negocio).
  - Manipulación de red y eventos → listeners del servidor (`server.js`).
  - Interfaz y renderizado → frontend (`components/` y `pages/`). No mezcles lógica de red o negocio pesada en componentes visuales de React.

### SOLID Generales

- **Abierto/Cerrado (OCP):** Las entidades deben estar abiertas para extensión pero cerradas para modificación (facilita añadir nuevas reglas o cartas especiales sin romper el núcleo).
- **Funciones Pequeñas:** Evita funciones kilométricas. Si una función hace múltiples cosas, divídela en funciones de apoyo más pequeñas y limpias.

---

## 6. Política de Seguridad y Control de Versiones (Git / GitHub)

- **Cero cambios automáticos en GitHub:** La IA **NUNCA** debe ejecutar comandos que interactúen con repositorios remotos (`git push`, creación de PRs, sincronización con remotos, etc.) a menos que el usuario lo solicite de forma **explícita y directa**.
- **Control Local:** Puedes sugerir comandos de git locales (`git status`, `git add`, etc.) si se te pide, pero la decisión de subir código, hacer commits o interactuar con GitHub recae 100% en el desarrollador.
