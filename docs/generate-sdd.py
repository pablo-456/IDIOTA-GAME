#!/usr/bin/env python3
"""
Generador de Documentación Técnica IEEE (SDD) — IDIOTA-GAME
Produce: docs/IDIOTA-Documentacion-Tecnica-IEEE.docx
Versión 1.1 — incluye salas públicas (feature flag) y refuerzo de conexiones.
"""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(__file__).resolve().parent / "IDIOTA-Documentacion-Tecnica-IEEE.docx"
OUTPUT_FALLBACK = Path(__file__).resolve().parent / "IDIOTA-Documentacion-Tecnica-IEEE-v1.1.docx"
DOC_VERSION = "1.1"
DOC_DATE = date.today().strftime("%d de %B de %Y").replace(
    "January", "enero"
).replace("February", "febrero").replace("March", "marzo").replace(
    "April", "abril"
).replace("May", "mayo").replace("June", "junio").replace(
    "July", "julio"
).replace("August", "agosto").replace("September", "septiembre").replace(
    "October", "octubre"
).replace("November", "noviembre").replace("December", "diciembre"
)

FONT_NAME = "Times New Roman"
BODY_SIZE = Pt(10)
HEADING1_SIZE = Pt(12)
TITLE_SIZE = Pt(24)
SUBTITLE_SIZE = Pt(14)

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
         "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"]

_table_counter = 0
_figure_counter = 0


def _set_run_font(run, size=BODY_SIZE, bold=False, italic=False):
    run.font.name = FONT_NAME
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_NAME)
    run.font.size = size
    run.bold = bold
    run.italic = italic


def _style_paragraph(paragraph, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=6, line_spacing=1.15):
    paragraph.alignment = align
    pf = paragraph.paragraph_format
    pf.space_after = Pt(space_after)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing = line_spacing


def add_paragraph(doc, text, *, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                  size=BODY_SIZE, space_after=6):
    p = doc.add_paragraph()
    run = p.add_run(text)
    _set_run_font(run, size=size, bold=bold, italic=italic)
    _style_paragraph(p, align=align, space_after=space_after)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    size = HEADING1_SIZE if level == 1 else Pt(11)
    run = p.add_run(text)
    _set_run_font(run, size=size, bold=True)
    pf = p.paragraph_format
    pf.space_before = Pt(12 if level == 1 else 8)
    pf.space_after = Pt(6)
    pf.keep_with_next = True
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    if level:
        p.paragraph_format.left_indent = Inches(0.25 * level)
    run = p.add_run(text)
    _set_run_font(run)
    _style_paragraph(p, space_after=3)
    return p


def add_code_block(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = "Courier New"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Courier New")
    run.font.size = Pt(8)
    pf = p.paragraph_format
    pf.left_indent = Inches(0.3)
    pf.space_after = Pt(6)
    pf.line_spacing = 1.0
    return p


def add_table(doc, headers, rows, caption=None):
    global _table_counter
    _table_counter += 1
    cap = caption or f"Tabla {ROMAN[_table_counter - 1] if _table_counter <= len(ROMAN) else _table_counter}"

    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"

    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ""
        run = hdr_cells[i].paragraphs[0].add_run(h)
        _set_run_font(run, bold=True)

    for r_idx, row in enumerate(rows):
        cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row):
            cells[c_idx].text = ""
            run = cells[c_idx].paragraphs[0].add_run(str(val))
            _set_run_font(run)

    cap_p = doc.add_paragraph()
    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cap_p.add_run(cap)
    _set_run_font(run, italic=True, size=Pt(9))
    cap_p.paragraph_format.space_after = Pt(10)
    return table


def add_figure(doc, diagram_text, caption):
    global _figure_counter
    _figure_counter += 1
    add_code_block(doc, diagram_text)
    cap_p = doc.add_paragraph()
    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cap_p.add_run(f"Fig. {_figure_counter}. {caption}")
    _set_run_font(run, italic=True, size=Pt(9))
    cap_p.paragraph_format.space_after = Pt(10)


def add_toc(doc):
    p = doc.add_paragraph()
    run = p.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")
    run._r.append(fld_char_begin)

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    run._r.append(instr)

    fld_char_separate = OxmlElement("w:fldChar")
    fld_char_separate.set(qn("w:fldCharType"), "separate")
    run._r.append(fld_char_separate)

    run2 = p.add_run("Actualice la tabla de contenidos: clic derecho → Actualizar campo.")
    _set_run_font(run2, italic=True, size=Pt(9))

    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_end)
    p.paragraph_format.space_after = Pt(12)


def collect_file_tree(root: Path, prefix="") -> list[str]:
    lines = []
    try:
        entries = sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except OSError:
        return lines
    for i, entry in enumerate(entries):
        if entry.name in {".git", "node_modules", "__pycache__", ".cursor"}:
            continue
        connector = "└── " if i == len(entries) - 1 else "├── "
        lines.append(f"{prefix}{connector}{entry.name}{'/' if entry.is_dir() else ''}")
        if entry.is_dir() and entry.name not in {"node_modules", ".git", "__pycache__"}:
            extension = "    " if i == len(entries) - 1 else "│   "
            lines.extend(collect_file_tree(entry, prefix + extension))
    return lines


def build_cover(doc):
    for _ in range(4):
        doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Documentación Técnica del Sistema IDIOTA")
    _set_run_font(run, size=TITLE_SIZE, bold=True)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = sub.add_run("Juego de Cartas Multijugador en Tiempo Real")
    _set_run_font(run, size=SUBTITLE_SIZE, italic=True)

    doc.add_paragraph()
    meta_lines = [
        "Software Design Document (SDD)",
        f"Versión del documento: {DOC_VERSION}",
        f"Fecha: {DOC_DATE}",
        "Estado del sistema: Beta funcional",
        "URL de producción: https://idiota-game.vercel.app",
    ]
    for line in meta_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(line)
        _set_run_font(run, size=Pt(11))

    doc.add_page_break()


def build_revision_table(doc):
    add_heading(doc, "Control de revisiones", level=1)
    add_table(
        doc,
        ["Versión", "Fecha", "Descripción"],
        [
            ["1.0", "12 de agosto de 2026", "Documento inicial: arquitectura, diseño backend/frontend, contratos Socket.io y reglas de negocio."],
            ["1.1", DOC_DATE, "Salas públicas (feature flag), página PublicLobbies, token de sesión sin BD, gracia de reconexión 45 s y refuerzo cliente frente a Render free."],
        ],
        caption="Tabla I. Control de revisiones del documento",
    )
    doc.add_page_break()


def build_document(doc):
    add_heading(doc, "1. Introducción")
    add_heading(doc, "1.1 Propósito", level=2)
    add_paragraph(
        doc,
        "El presente Software Design Document (SDD) describe la arquitectura, el diseño "
        "y la implementación del sistema IDIOTA, un juego de cartas multijugador online "
        "en tiempo real. Su objetivo es servir como referencia técnica para desarrolladores, "
        "mantenedores y evaluadores académicos."
    )

    add_heading(doc, "1.2 Alcance", level=2)
    add_paragraph(
        doc,
        "Este documento cubre el mono-repositorio IDIOTA-GAME: backend Node.js con Socket.io "
        "y frontend React/Vite. Incluye reglas de negocio, máquina de estados, contratos "
        "WebSocket, salas públicas (deshabilitadas por flag), sesiones de reconexión en RAM "
        "y el despliegue actual. Quedan fuera: persistencia en BD, autenticación de usuarios "
        "completa y sistemas de pago."
    )

    add_heading(doc, "1.3 Audiencia", level=2)
    add_bullet(doc, "Desarrolladores que mantengan o extiendan el código fuente.")
    add_bullet(doc, "Revisores técnicos y evaluadores académicos.")
    add_bullet(doc, "Operadores que desplieguen el sistema en entornos de prueba o producción.")

    add_heading(doc, "1.4 Resumen ejecutivo", level=2)
    add_paragraph(
        doc,
        "IDIOTA es un juego de cartas para 3 a 7 jugadores conectados mediante WebSockets. "
        "El servidor mantiene el estado en memoria RAM, valida jugadas de forma autoritativa "
        "y sincroniza el estado con los clientes. El último jugador con cartas es el "
        "\"idiota\" (perdedor). La versión actual incorpora bases de salas públicas (flag OFF "
        "en producción) y un mecanismo de token de sesión con gracia de 45 s para mitigar "
        "desconexiones típicas del plan gratuito de Render."
    )

    add_heading(doc, "2. Referencias")
    for ref in [
        "[1] README del proyecto — IDIOTA-GAME/README.md",
        "[2] Reglas internas — .cursor/rules/ (01–06)",
        "[3] Dependencias backend — backend/package.json",
        "[4] Dependencias frontend — frontend/package.json",
        "[5] Feature flags — frontend/src/constants/features.js y backend/src/constants/features.js",
        "[6] Documentación Socket.io — https://socket.io/docs/v4/",
        "[7] Documentación React — https://react.dev/",
        "[8] Estándar IEEE 1016 — Software Design Descriptions",
    ]:
        add_bullet(doc, ref)

    add_heading(doc, "3. Definiciones, acrónimos y abreviaturas")
    add_table(
        doc,
        ["Término", "Definición"],
        [
            ["SDD", "Software Design Document."],
            ["WebSocket", "Protocolo full-duplex sobre TCP para tiempo real."],
            ["SRP", "Single Responsibility Principle (SOLID)."],
            ["LOBBY / SETUP / PLAYING / FINISHED", "Estados de la máquina de partida."],
            ["Idiota", "Perdedor: último jugador con cartas."],
            ["Saved", "Jugador sin cartas; pasa a espectador."],
            ["isPublic", "Marca de sala visible en el listado de lobbies públicos."],
            ["sessionToken", "UUID de sesión en RAM + localStorage para reconexión."],
            ["Gracia de desconexión", "45 s antes de expulsar tras un disconnect."],
            ["PUBLIC_ROOMS_ENABLED", "Feature flag booleano en front y back."],
            ["Cold start", "Retraso al despertar un servicio dormido (Render free)."],
        ],
        caption="Tabla II. Glosario de términos y acrónimos",
    )

    add_heading(doc, "4. Descripción general del sistema")
    add_heading(doc, "4.1 Perspectiva del producto", level=2)
    add_paragraph(
        doc,
        "Cliente web (React/Vite) ↔ servidor (Node/Express/Socket.io). Sin autenticación "
        "de cuentas: identificación por socket.id, username y sessionToken efímero. "
        "Estado de partidas solo en RAM del proceso Node."
    )

    add_heading(doc, "4.2 Funciones principales", level=2)
    for f in [
        "Crear/unirse a salas privadas con código de 6 caracteres.",
        "Bases de salas públicas (listado + crear) detrás de feature flag.",
        "Lobby 3–7 jugadores; fase SETUP; partida por turnos.",
        "Reconexión con token de sesión (gracia 45 s) sin base de datos.",
        "Wake-up HTTP /health y reintentos Socket.io frente a cold starts.",
        "Efectos visuales, overlays y audio en el cliente.",
    ]:
        add_bullet(doc, f)

    add_heading(doc, "4.3 Restricciones de diseño", level=2)
    add_bullet(doc, "Estado efímero: reinicio/redeploy del servidor borra salas y tokens.")
    add_bullet(doc, "Validación autoritativa en Game.js.")
    add_bullet(doc, "Render free puede dormir el backend (~15 min sin tráfico).")
    add_bullet(doc, "Salas públicas OFF por defecto en features.js (ambos lados).")

    add_heading(doc, "4.4 Supuestos y dependencias", level=2)
    add_bullet(doc, "Node.js 18+, navegador con WebSocket.")
    add_bullet(doc, "Variables: PORT, FRONTEND_URL, VITE_SERVER_URL.")
    add_bullet(doc, "Flags locales: PUBLIC_ROOMS_ENABLED en constants/features.js.")

    add_heading(doc, "5. Arquitectura del sistema")
    add_figure(
        doc,
        """┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                     │
│  Pages: Home / PublicLobbies / Lobby / Game                   │
│  Hooks: useSocket | useRoomSession | useGameActions | ...     │
│  localStorage: idiota_room_session (token)                    │
└───────────────────────────┬───────────────────────────────────┘
                            │ Socket.io + GET /health (wake)
┌───────────────────────────▼───────────────────────────────────┐
│                    BACKEND (Node.js)                            │
│  server.js → roomController (salas + sesiones + gracia)        │
│            → Game.js + Deck.js (dominio)                       │
│  features.js → PUBLIC_ROOMS_ENABLED                            │
└───────────────────────────────────────────────────────────────┘""",
        "Arquitectura en capas actualizada (salas públicas y sesiones)",
    )

    add_heading(doc, "5.1 Estructura del mono-repositorio", level=2)
    add_code_block(
        doc,
        """IDIOTA-GAME/
├── backend/src/
│   ├── server.js
│   ├── constants/features.js
│   ├── controllers/roomController.js
│   └── models/Game.js, Deck.js
├── frontend/src/
│   ├── constants/features.js, socketEvents.js
│   ├── utils/roomSession.js
│   ├── pages/Home, PublicLobbies, Lobby, Game
│   └── hooks/useSocket, useRoomSession, ...
└── docs/""",
    )

    add_heading(doc, "5.2 Principios de diseño", level=2)
    add_paragraph(
        doc,
        "SRP: transporte (server.js), salas/sesiones (roomController), reglas (Game.js). "
        "Frontend: hooks desacoplados; feature flags espejo en front y back."
    )

    add_heading(doc, "6. Diseño detallado — Backend")
    add_heading(doc, "6.1 Máquina de estados", level=2)
    add_figure(
        doc,
        "LOBBY ──start_setup──► SETUP ──allReady──► PLAYING ──gameOver──► FINISHED",
        "Transiciones de estado de una partida",
    )

    add_heading(doc, "6.2 Modelo de jugador", level=2)
    add_table(
        doc,
        ["Campo", "Descripción"],
        [
            ["id", "socket.id actual (cambia en reattach)."],
            ["username", "Nombre visible."],
            ["sessionToken", "UUID de sesión para rejoin."],
            ["isConnected", "false durante gracia de desconexión."],
            ["manoPrivada / cartasVisibles / cartasOcultas", "Zonas de cartas."],
            ["isReady / isSaved", "Setup listo / salvado."],
        ],
        caption="Tabla III. Campos relevantes del jugador",
    )

    add_heading(doc, "6.3 Mazo y turnos", level=2)
    add_paragraph(
        doc,
        "Mazo de 108 cartas (Fisher-Yates). Turnos: mismo valor y power ≥ pila; "
        "especiales 2/8/JOKER. nextTurn() salta jugadores isSaved o isConnected===false."
    )

    add_heading(doc, "6.4 Gestión de salas y sesiones", level=2)
    add_paragraph(
        doc,
        "roomController mantiene games{}, playerRoomMap, sessionByToken{} y "
        "pendingDisconnects{}. Al disconnect se llama beginPendingDisconnect (gracia 45 s). "
        "rejoinSession reatacha el nuevo socket.id. leave_room expulsa de inmediato. "
        "Tras la gracia, finalizeDisconnect elimina al jugador como antes."
    )

    add_heading(doc, "6.5 Endpoint HTTP", level=2)
    add_table(
        doc,
        ["Método", "Ruta", "Uso"],
        [["GET", "/health", "Health check y wake-up del cold start de Render."]],
        caption="Tabla IV. Endpoints HTTP",
    )

    add_heading(doc, "7. Contrato de comunicación (Socket.io)")
    add_heading(doc, "7.1 Eventos cliente → servidor", level=2)
    add_table(
        doc,
        ["Evento", "Payload", "Notas"],
        [
            ["create_room", "{ username, isPublic? }", "isPublic solo si flag ON."],
            ["join_room", "{ roomId, username }", "Solo LOBBY."],
            ["start_setup / confirm_setup", "{ roomId, ... }", "Host / elección visibles."],
            ["play_turn / pick_up_pile", "{ roomId, ... }", "Jugada / recogida."],
            ["list_public_rooms", "—", "Solo si PUBLIC_ROOMS_ENABLED."],
            ["rejoin_session", "{ sessionToken }", "Reenganche post-disconnect."],
            ["leave_room", "{ roomId? }", "Salida voluntaria sin gracia."],
        ],
        caption="Tabla V. Eventos Cliente → Servidor",
    )

    add_heading(doc, "7.2 Eventos servidor → cliente", level=2)
    add_table(
        doc,
        ["Evento", "Rol"],
        [
            ["room_created / room_joined", "Incluyen sessionToken + estado privado."],
            ["session_restored", "Rejoin exitoso; restaura LOBBY o GAME."],
            ["player_pending_disconnect", "Aviso de gracia 45 s + isConnected false."],
            ["player_disconnected", "Expulsión definitiva tras gracia o leave."],
            ["public_rooms_updated", "Listado de lobbies públicos."],
            ["room_updated / setup_started / game_started / ...", "Sync de partida (sin cambios mayores)."],
        ],
        caption="Tabla VI. Eventos Servidor → Cliente (ampliados)",
    )

    add_heading(doc, "7.3 Diagrama de reconexión", level=2)
    add_figure(
        doc,
        """Cliente                 Servidor
   │── create/join ────────►│
   │◄── sessionToken ───────│  (localStorage)
   │        ...             │
   │──x disconnect          │
   │                        │ markDisconnected + timer 45s
   │── connect ─────────────►│
   │── rejoin_session ──────►│
   │◄── session_restored ───│  (reattach socket.id)
   │                        │  (si no: finalizeDisconnect)""",
        "Flujo de token de sesión y gracia de desconexión",
    )

    add_heading(doc, "8. Diseño detallado — Frontend")
    add_heading(doc, "8.1 Navegación", level=2)
    add_figure(
        doc,
        "HOME → PUBLIC_LOBBIES (flag) → LOBBY → GAME\n"
        "Al connect: si hay token en localStorage → rejoin_session automático",
        "Flujo de pantallas y auto-rejoin",
    )

    add_heading(doc, "8.2 Hooks", level=2)
    add_table(
        doc,
        ["Hook", "Responsabilidad"],
        [
            ["useSocket", "Singleton Socket.io; fases connecting/connected/reconnecting/failed; wakeServer(); reconnect()."],
            ["useRoomSession", "Pantallas, gameState, persistencia token, leave_room al volver a Home."],
            ["useGameActions", "Emits: create/join/play/.../rejoinSession/leaveRoom."],
            ["useGameEvents / useAudio", "Overlays FX y audio."],
        ],
        caption="Tabla VII. Hooks del frontend",
    )

    add_heading(doc, "8.3 Salas públicas (UI)", level=2)
    add_paragraph(
        doc,
        "Home muestra el botón de salas públicas. Con PUBLIC_ROOMS_ENABLED=false "
        "aparece deshabilitado: \"Salas públicas próximamente\". Con true, navega a "
        "PublicLobbies (lista + crear sala pública). Lobby reutilizado: si isPublic, "
        "muestra \"Este lobby es público\"."
    )

    add_heading(doc, "8.4 Feature flags", level=2)
    add_code_block(
        doc,
        """// frontend/src/constants/features.js
export const PUBLIC_ROOMS_ENABLED = false;

// backend/src/constants/features.js
const PUBLIC_ROOMS_ENABLED = false;
module.exports = { PUBLIC_ROOMS_ENABLED };""",
    )
    add_paragraph(
        doc,
        "Ambos deben coincidir. Activar: true en los dos archivos, reiniciar backend "
        "y refrescar/redeploy frontend."
    )

    add_heading(doc, "8.5 Estabilidad de conexión (cliente)", level=2)
    add_bullet(doc, "reconnectionAttempts: Infinity; delayMax 10 s; timeout 20 s.")
    add_bullet(doc, "wakeServer(): fetch GET /health (hasta ~60 s) al montar Home/sesión.")
    add_bullet(doc, "UI: mensaje de despertar tras 4 s; botón Reconectar; banner en Lobby/Game.")
    add_bullet(doc, "utils/roomSession.js: save/load/clear de { token, roomId, username }.")

    add_heading(doc, "9. Reglas de negocio del juego")
    add_bullet(doc, "SETUP: 4 ocultas + 8 a elegir → 4 visibles + 4 mano.")
    add_bullet(doc, "Jugada: mismo valor, power ≥ pila (salvo 2/8/Joker).")
    add_bullet(doc, "Recogida voluntaria/forzosa: el mismo jugador abre la ronda.")
    add_bullet(doc, "Último con cartas = idiota. Mínimo 3, máximo 7 jugadores.")

    add_heading(doc, "10. Despliegue e infraestructura")
    add_table(
        doc,
        ["Componente", "Plataforma", "Notas"],
        [
            ["Frontend", "Vercel", "Vite build; VITE_SERVER_URL."],
            ["Backend", "Render", "Free puede dormir; /health + reintentos mitigan."],
            ["Local", "localhost", "Backend :3000, Frontend :5173."],
        ],
        caption="Tabla VIII. Despliegue",
    )
    add_paragraph(
        doc,
        "Recomendación operativa: un monitor externo (p. ej. UptimeRobot) puede "
        "consultar GET /health cada 5–10 minutos para reducir cold starts. No forma "
        "parte del código del repositorio."
    )

    add_heading(doc, "11. Limitaciones conocidas y trabajo futuro")
    add_table(
        doc,
        ["Ítem", "Estado"],
        [
            ["Salas públicas (código listo, flag OFF)", "Bases listas; no activas en prod"],
            ["Token de sesión + gracia 45 s", "Implementado (RAM; no sobrevive redeploy)"],
            ["Wake-up /health + reintentos Socket", "Implementado"],
            ["Persistencia BD / historial", "Pendiente"],
            ["Auth de usuarios", "Pendiente"],
            ["Tests automatizados de reglas", "Pendiente"],
            ["Música de suspenso fase final", "Roadmap"],
        ],
        caption="Tabla IX. Limitaciones y hoja de ruta",
    )

    add_heading(doc, "Apéndice A. Árbol de archivos (extracto)")
    tree_lines = collect_file_tree(ROOT)
    add_code_block(doc, "IDIOTA-GAME/\n" + "\n".join(tree_lines[:90]))
    if len(tree_lines) > 90:
        add_paragraph(doc, f"(… {len(tree_lines) - 90} entradas omitidas)", italic=True)

    add_heading(doc, "Apéndice B. Dependencias")
    add_table(
        doc,
        ["Paquete", "Versión", "Capa"],
        [
            ["express", "^4.22.2", "Backend"],
            ["socket.io", "^4.8.3", "Backend"],
            ["react / react-dom", "^18.2.0", "Frontend"],
            ["socket.io-client", "^4.7.2", "Frontend"],
            ["vite", "^5.0.8", "Frontend"],
        ],
        caption="Tabla X. Dependencias principales",
    )

    add_heading(doc, "Apéndice C. Payloads de ejemplo")
    add_paragraph(doc, "room_created (con sesión):", bold=True)
    add_code_block(
        doc,
        '{ "roomId": "ABC123", "sessionToken": "uuid-...", "state": { "status": "LOBBY", "isPublic": false, ... } }',
    )
    add_paragraph(doc, "rejoin_session:", bold=True)
    add_code_block(doc, '{ "sessionToken": "uuid-..." }')
    add_paragraph(doc, "player_pending_disconnect:", bold=True)
    add_code_block(
        doc,
        '{ "playerId": "...", "username": "Ana", "graceMs": 45000, "state": { "players": [{ "isConnected": false, ... }] } }',
    )

    add_heading(doc, "Apéndice D. Guía rápida")
    add_bullet(doc, "Backend: cd backend && npm install && npm start")
    add_bullet(doc, "Frontend: cd frontend && npm install && npm run dev")
    add_bullet(doc, "Activar salas públicas: true en ambos features.js + reinicio.")
    add_bullet(doc, "Health: GET http://localhost:3000/health")
    add_bullet(doc, "Regenerar este documento: python docs/generate-sdd.py")


def main():
    global _table_counter, _figure_counter
    _table_counter = 0
    _figure_counter = 0

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    build_cover(doc)
    build_revision_table(doc)
    add_heading(doc, "Tabla de contenidos")
    add_toc(doc)
    doc.add_page_break()
    build_document(doc)

    os.makedirs(OUTPUT.parent, exist_ok=True)
    try:
        doc.save(str(OUTPUT))
        out = OUTPUT
    except PermissionError:
        doc.save(str(OUTPUT_FALLBACK))
        out = OUTPUT_FALLBACK
        print(f"AVISO: {OUTPUT.name} está bloqueado (¿Word abierto?). Guardado como {out.name}")
    print(f"Documento generado: {out}")
    print(f"Tablas: {_table_counter} | Figuras: {_figure_counter}")


if __name__ == "__main__":
    main()
