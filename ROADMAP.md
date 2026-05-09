# Contextic Roadmap

## MVP goal

Contextic MVP permite:

- instalar un bookmarklet,
- analizar cualquier página web,
- abrir un panel lateral,
- copiar `design-context.md`,
- copiar `contextic-report.json`,
- copiar `github-issue.md`,
- pegar el resultado en Cursor, Codex, Claude, Jira, GitHub Issues o documentación de handoff.

## Estado actual

- [x] Core bookmarklet.
- [x] Panel lateral.
- [x] Design System Snapshot.
- [x] Component Inventory.
- [x] UX Friction Notes.
- [x] Implementation guidance.
- [x] Export `design-context.md`.
- [x] Export JSON.
- [x] Export GitHub Issue.
- [x] Tests básicos.
- [x] Build funcional.

## Roadmap MVP

### Iteración 1 — Panel con modos de copia

Estado: completado.

### Iteración 2 — GitHub Pages + bookmarklet instalable

Estado: en curso.

Criterio de aceptación:

- existe una página pública o preparada para GitHub Pages,
- el usuario puede copiar o arrastrar el bookmarklet,
- el bundle `contextic.iife.js` está disponible para uso desde navegador,
- README explica cómo instalarlo.

### Iteración 3 — README de adopción

Estado: pendiente.

Criterio de aceptación:

- alguien entiende el valor del repo en menos de 30 segundos,
- hay instalación clara,
- hay ejemplo de output,
- hay limitaciones documentadas.

### Iteración 4 — Ejemplo real completo

Estado: pendiente.

Criterio de aceptación:

- existe un ejemplo real de `design-context.md`,
- existe un ejemplo real de `contextic-report.json`,
- existe un ejemplo real de `github-issue.md`.

### Iteración 5 — Release v0.1.0

Estado: pendiente.

Criterio de aceptación:

- tests pasan,
- build pasa,
- GitHub Pages funciona,
- README está listo,
- ejemplos incluidos,
- release v0.1.0 preparada.

## Post-MVP

- Mejor inferencia de design system.
- Mejor agrupación de colores.
- Más exports para agentes IA.
- Modo Jira.
- Modo Cursor/Codex Prompt.
- Mejoras behavioral avanzadas.
- Comparación entre pantallas.
- Extensión de navegador.
- Integración con Figma o MCP.
