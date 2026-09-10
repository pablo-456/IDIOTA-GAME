## 1. Project Overview

---
description: Contexto general del proyecto IDIOTA y sus capas de arquitectura.
globs:
  - "**/*"
---

# Proyecto: IDIOTA (Juego de Cartas Multijugador)

## Descripción
IDIOTA es un juego de cartas multijugador en tiempo real con backend en Node.js y frontend en React. El estado del juego no se persiste en base de datos: todo se mantiene en memoria RAM del servidor y se sincroniza mediante WebSockets.

## Estructura del repositorio
- `/backend`: servidor Node.js con Socket.io y lógica del juego.
- `/frontend`: aplicación React con Vite y componentes visuales.
- `/docs`: documentación técnica y artefactos del proyecto.

## Principio general del proyecto
La prioridad del desarrollo debe ser la coherencia del gameplay, la sincronización real en tiempo real y la separación de responsabilidades entre backend, frontend y reglas del juego.

## 2. Backend Socket.io

---
description: Reglas obligatorias para backend, Node.js, Socket.io y gestión del estado del juego.
globs:
  - "backend/**/*.js"
---

# Reglas del backend y WebSockets

## Arquitectura y responsabilidad
- El estado del juego debe mantenerse exclusivamente en memoria RAM del servidor: salas, jugadores, manos, visibles, pozo, pila, turnos y descartes.
- La lógica del juego debe vivir en modelos o clases del backend, no mezclada con la capa de transporte.
- El servidor debe actuar como autoridad final de validación: cualquier acción del jugador debe comprobarse antes de aceptar el cambio.
- La lógica de sockets debe limitarse a escuchar eventos, validar entrada básica y emitir el estado actualizado a la sala.

## Reglas de Socket.io
- Las acciones como confirmar setup, jugar una carta, recoger el pozo o robar deben validarse en el servidor antes de propagar el nuevo estado.
- La sincronización debe hacerse por sala usando `io.to(roomId).emit(...)` para asegurar que todos los clientes reciban el mismo estado.
- Las desconexiones deben limpiar recursos, eliminar jugadores o cerrar salas cuando corresponda para evitar fugas de memoria.
- El estado enviado al cliente debe ser consistente, determinista y compatible con la lógica del backend.

## Entorno y buenas prácticas
- Usar Node.js v18+.
- Mantener el código modular y reutilizable, con separación clara entre modelos, controladores y listeners.
- Evitar lógica de negocio duplicada entre frontend y backend.

## 3. Frontend React

---
description: Estándares para React, Vite, UI y sincronización del cliente con el estado del servidor.
alwaysApply: false
---

# Reglas del frontend (React & Vite)

## Estructura de componentes
- Los componentes deben ser modulares, reutilizables y con una sola responsabilidad principal.
- La lógica compleja del juego no debe mezclarse con el renderizado visual.
- Las vistas principales deben separarse por fases y roles del juego, por ejemplo lobby, setup, mesa y espectadores.

## Estado, renderizado y eventos
- Usar `useState`, `useEffect` y `useCallback` con criterio para evitar renderizados innecesarios.
- Los cambios de estado deben reflejar la respuesta del servidor lo antes posible.
- Las selecciones de cartas y acciones del usuario deben ser consistentes con el estado global del juego.

## Estilo visual y UX
- Mantener la identidad visual del proyecto: fondo oscuro, tonos verdes y dorados, bordes elegantes y efecto de elevación en cartas seleccionadas.
- La experiencia debe ser clara y rápida, especialmente durante jugadas y cambios de turno.
- Mantener contadores y indicadores actualizados en tiempo real, como mazo restante, mano del jugador y estado de oponentes.

## Stack
- React 18+ con Vite.
- Usar JSX moderno sin requerir `import React from 'react'`.

## 4. Game Rules

---
description: Reglas de negocio y del juego de cartas IDIOTA que deben respetarse en el backend.
globs:
  - "backend/src/models/**/*.js"
---

# Reglas de negocio de IDIOTA

1. El mazo debe tener 104 cartas y debe mezclarse usando el algoritmo Fisher-Yates.
2. En la fase de setup, cada jugador recibe 12 cartas en total. Debe haber 4 visibles para la mesa, 4 en mano privada y 4 en la reserva o según la lógica de distribución inicial del juego.
3. La validación del turno debe respetar que la carta jugada debe ser mayor o igual que la última carta de la pila central (`pile`).
4. Las cartas especiales deben respetar estas reglas:
   - El `2` reinicia el valor de la mesa.
   - El `8` y el Joker queman la mesa y conceden un turno extra.
5. Regla crucial de recogida del pozo:
   - Si un jugador no puede responder, recoge todo el pozo a su mano y reinicia la ronda abriendo la mesa vacía.
   - Si un jugador decide recoger el pozo voluntariamente, su turno termina con esa acción y debe abrir la nueva ronda.
6. Una vez se produce una recogida, esa regla debe reflejarse inmediatamente en el estado del servidor y de la sala.

## 5. Clean Code Practices

---
description: Principios de arquitectura limpia, SRP y SOLID para el proyecto IDIOTA.
globs:
  - "**/*.js"
  - "**/*.jsx"
---

# Principios de código limpio y responsabilidad

## Responsabilidad única (SRP)
- Cada módulo, clase, archivo o función debe tener una sola razón para cambiar.
- La lógica del juego debe vivir exclusivamente en backend/modelos.
- La manipulación de eventos de red debe vivir en el servidor de sockets.
- El frontend debe encargarse de renderizado, interacción y presentación, no de reglas de negocio complejas.

## Principios SOLID generales
- Abierto/Cerrado (OCP): el diseño debe permitir extender reglas del juego sin romper el núcleo.
- Funciones pequeñas: evitar funciones largas que mezclen turnos, validación, reglas y emisión de eventos. Dividir en funciones de apoyo.
- No duplicar reglas de negocio entre frontend y backend.
- Mantener el código legible, explícito y comprobable.

## 6. GitHub and repository safety

---
description: Restricciones estrictas de seguridad y control de versiones para Git y GitHub.
globs:
  - "**/*"
---

# Política de seguridad y control de versiones

## Restricción estricta de GitHub
- La IA no debe ejecutar comandos que interactúen con repositorios remotos, como `git push`, creación de pull requests, sincronización remota, o cambios automáticos en GitHub, salvo que el usuario lo solicite explícitamente en el chat.
- Se pueden sugerir comandos locales como `git status` o `git add` si el usuario lo pide.
- La decisión final de hacer commit, push o abrir PR corresponde totalmente al desarrollador.
- No asumir ni realizar cambios remotos sin autorización directa.

## Reglas de trabajo local
- Priorizar cambios locales, seguros y reversibles.
- Mantener el repositorio limpio y documentar cambios relevantes en código o reglas del juego.
- Si un cambio afecta lógica de juego o sincronización, validar la coherencia del flujo antes de finalizar.