/**
 * blogData.js — Contenido de la página Blog de IDIOTA.
 * Edita este archivo para actualizar la información del juego.
 */

export const blogSections = [
  {
    title: "¿Qué es IDIOTA?",
    paragraphs: [
      "IDIOTA es un juego de cartas multijugador en tiempo real que utiliza dos barajas de póker estándar. Un juego de estrategia, habilidad y algo de suerte. Originalmente se juega en una mesa con amigos o familiares. En este juego, los jugadores se enfrentan entre sí, intentando quedarse sin cartas en su mano.",
      "Este juego es una versión modificada del juego original \"Idiota\" valga la redundancia. El cual surgió entre amigos de universidad."
    ]
  },
  {
    title: "Reglas del juego",
    paragraphs: [
      "Jugadores: Mínimo 3 personas. Máximo 7.",
      "Baraja: Dos barajas de póker estándar mezcladas (104 cartas en total). Los palos (corazones, picas, diamantes, tréboles) y colores no tienen valor matemático; solo importa el rango numérico.",
      "Jerarquía de cartas ordinarias (Menor a Mayor): 3 - 4 - 5 - 6 - 7 - 9 - 10 - J - Q - K - A",
      "⚔️ Flujo del Juego (El \"Game Loop\")",
      "1. El Inicio — Empieza el jugador que tenga la carta ordinaria más baja en la mano (el 3). Si nadie tiene un 3, se busca el 4, y así sucesivamente. En el juego online se escoge aleatoriamente al que empieza.",
      "2. Mecánica de Turno Ordinaria — Para jugar, debes lanzar una o más cartas del mismo valor. El valor de la(s) carta(s) lanzada(s) debe ser igual o superior al valor de la última carta que esté en la cima de la mesa.",
      "Obligación de mantener la mano (Fase 1 del mazo): Inmediatamente después de lanzar cartas, si el mazo principal todavía tiene cartas, el jugador debe robar del mazo hasta volver a tener mínimo 4 cartas en su mano. (Si robó la mesa y tiene más cartas, no roba del mazo hasta que baje de 4).",
      "El Castigo: Si un jugador en su turno no tiene ninguna carta en la mano que supere o iguale a la de la mesa (y no tiene comodines), debe llevarse TODAS las cartas acumuladas en la mesa a su mano. El castigado vuelve a empezar y decide con qué carta iniciar."
    ]
  },
  {
    title: "Cartas especiales",
    paragraphs: [
      "Los Comodines (Las cartas especiales)",
      "El 2 (Reinicio de Contador): Se puede tirar sobre cualquier carta. Su efecto es \"resetear\" el valor de la mesa a cero. Es decir, el siguiente jugador puede tirar lo que quiera (desde un 3 en adelante). El 2 no quema la mesa, las cartas se quedan ahí acumuladas. Al tirarlo, termina tu turno (no puedes jugar otra carta encima).",
      "El 8 y el Joker (Quemar la Mesa): Son las cartas benditas. Al lanzarlas, se descartan (queman) todas las cartas acumuladas en la mesa y se sacan del juego. Además, este comodín te da un turno extra inmediato: puedes lanzar cualquier otra carta de tu mano para iniciar la nueva mesa."
    ]
  },
  {
    title: "Fase de configuración",
    paragraphs: [
      "Cada jugador tendrá tres \"capas\" de cartas frente a él:",
      "Capa Oculta: Se reparten 4 cartas boca abajo a cada jugador. Nadie (ni el dueño) puede verlas.",
      "Capa Pública: Se reparten 8 cartas privadas. El jugador mira estas cartas, selecciona las 4 mejores (usualmente las más altas o comodines) y las coloca boca arriba justo encima de sus 4 cartas ocultas. Todos en la mesa pueden ver estas cartas.",
      "La Mano Inicial: Las 4 cartas restantes de la selección anterior van directamente a la mano del jugador. Con estas inicia el juego de forma privada."
    ]
  },
  {
    title: "Fases de Eliminación de Cartas",
    paragraphs: [
      "El juego avanza en 3 fases estrictas para cada jugador de forma individual:",
      "Fase 1 (La Mano): Juegas con las cartas privadas de tu mano mientras robas del mazo. Cuando el mazo se acaba, juegas hasta que te quedes con 0 cartas en la mano.",
      "Fase 2 (Las Visibles): Una vez tu mano está vacía, en tu turno puedes empezar a jugar las 4 cartas boca arriba que están en la mesa.",
      "Fase 3 (¡Gambling!): Cuando te gastas tus 4 cartas visibles, entras al modo adrenalina pura. En tu turno, debes elegir una de tus 4 cartas ocultas completamente al azar y voltearla directamente a la mesa:",
      "Si la carta sirve (es mayor, igual o comodín): Te salvaste, continúa el juego. Nota: si sale 8 o joker se queman las cartas y vuelves a elegir una de las cartas ocultas restantes.",
      "Si la carta NO sirve: Te tienes que llevar toda la mesa a tu mano. Volverías automáticamente a la Fase 1 hasta que vuelvas a vaciar tu mano y puedas regresar a reclamar tus cartas ocultas.",
      "💀 Fin del Juego — No hay ganadores. Los jugadores que se quedan sin cartas en la mano, ni visibles, ni ocultas, se van \"salvando\" y salen de la partida. El último jugador que se quede con cartas en la mesa o en la mano pierde y es coronado oficialmente como el \"Idiota\"."
    ]
  },
  {
    title: "Notas de Lógica y Casos Borde (Reglas Oficiales)",
    paragraphs: [
      "Control de Reinicio tras Penalización: Cuando un jugador no puede responder a la mesa (o decide no hacerlo) y se ve obligado a recoger todo el pozo acumulado, ese mismo jugador es quien inicia la nueva ronda. Él decide desde su mano con qué carta o combinación de cartas idénticas se vuelve a abrir la mesa.",
      "Recogida Voluntaria del Pozo (Estrategia): Un jugador puede elegir voluntariamente llevarse todas las cartas de la mesa a su mano durante su turno, sin importar si tiene en su mano cartas válidas para responder o no. Al hacerlo, se aplica la regla anterior: su turno actual termina recolectando las cartas y él mismo abre la mesa inmediatamente con una nueva jugada.",
      "Gestión de Mano Post-Mazo (Regla A): Si el mazo de robar se agota y un jugador se ve obligado a recoger el pozo de la mesa, el juego sigue su curso normal. Los jugadores que ya vaciaron su mano continúan en sus fases avanzadas (Visibles o Gambling), mientras que el jugador penalizado deberá jugar desde su mano en su turno hasta poder vaciarla para poder continuar a la siguiente fase.",
      "Desempate de Inicio (Regla B): Para el MVP, el servidor omitirá la verificación manual del \"3\". Al iniciar la partida, el servidor seleccionará a un jugador completamente al azar con el número más bajo para que realice el primer movimiento.",
      "Fase de Preparación Simultánea (Regla D): Al arrancar, todos los jugadores visualizan sus 8 cartas y eligen 4 al mismo tiempo (asíncronamente). El servidor esperará a que el 100% de los jugadores conectados hayan confirmado su selección antes de dar el \"visto bueno\" e iniciar oficialmente la ronda de turnos."
    ]
  },
  {
    title: "Especificaciones Técnicas del MVP",
    paragraphs: [
      "Persistencia Volátil (RAM): Cero bases de datos. Las salas, jugadores y estados de las barajas vivirán únicamente en la memoria del servidor de Node.js mientras dure la partida. Al recargar la página o salir, el estado se destruye.",
      "Escalabilidad de la Sala: El sistema admitirá un rango dinámico de mínimo 3 y máximo 7 jugadores por sala. La lógica de reparto y mezcla de las 104 cartas (2 barajas) se adaptará automáticamente al número de conectados.",
      "Tolerancia a Desconexiones (Manejo de Ragequit): Si un jugador pierde conexión o abandona la sala, el servidor eliminará sus cartas por completo del juego (no van a la mesa ni a otros jugadores) y su turno se saltará automáticamente a partir de ese momento, permitiendo que los amigos restantes terminen la partida."
    ]
  }
];
