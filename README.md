# Contextic

Contextic convierte cualquier página web en un `design-context.md` con tokens visuales, componentes detectados, fricciones UX y reglas de implementación listas para diseño, desarrollo e IA.

## Qué es

Contextic es un bookmarklet ligero que funciona desde el navegador. Analiza el DOM visible y los estilos calculados de la página actual, abre un panel lateral y genera contexto accionable para handoff. No necesita backend, login ni instalación de extensión.

## Para quién es

- Product Designers.
- UX/UI Designers.
- Design System Designers.
- Developers.
- PMs.
- Equipos que trabajan con Cursor, Codex, Claude, Jira o GitHub Issues.

## Qué problema resuelve

Antes de pedir cambios a IA, diseño o desarrollo suele faltar contexto real de la interfaz: tokens usados, patrones existentes, componentes visibles, fricciones UX, reglas de implementación y criterios de aceptación.

Contextic reduce ese trabajo manual creando una captura técnica de la pantalla actual, lista para pegar en herramientas de IA, documentación de handoff o issues.

## Qué genera

### `design-context.md`

El briefing principal para diseño, desarrollo e IA. Incluye:

- Design System Snapshot.
- Component Inventory.
- UX Friction Notes.
- Implementation guidance.

### `contextic-report.json`

Datos estructurados para automatización, tests, exploración técnica o futuros flujos de integración.

### `github-issue.md`

Un issue accionable con:

- Problem.
- Evidence.
- Suggested fix.
- Acceptance criteria.
- Notes for implementation.

## Instalación rápida

1. Abrir `https://henriq-design.github.io/contextic/`.
2. Arrastrar el bookmarklet Contextic a la barra de favoritos.
3. Abrir cualquier página web.
4. Hacer clic en Contextic.
5. Copiar el output deseado.

Si la página pública todavía no carga, activa GitHub Pages en:

```txt
Settings → Pages → Deploy from branch → main → /docs
```

## Uso local

```bash
npm install
npm run build
npm run build:pages
npm test
npm run check
```

Para abrir la demo local:

```bash
npm run serve
```

Después visita:

```txt
http://localhost:5173
```

## Ejemplo de uso con IA

1. Copia `design-context.md` desde Contextic.
2. Pégalo en Cursor, Codex o Claude.
3. Añade una petición como:

```md
Usa este design-context.md como contexto. Propón cambios de UI respetando tokens, componentes existentes, fricciones detectadas y reglas de implementación.
```

También puedes pegar `github-issue.md` directamente en GitHub Issues o Jira como punto de partida para una tarea de deuda UI/UX.

## Ejemplo de output

```md
## Design System Snapshot

### Colors
- #0057FF — posible primary
- #F5F7FA — posible surface

### Components
- Button — primary / secondary
- Form field — default / focus / error
- Card — feature / benefit

## UX Friction Notes

- P1 — CTA principal poco específico
- P1 — Formulario sin microcopy de confianza

## Implementation guidance

- Reutilizar tokens detectados antes de introducir nuevos colores.
- Mantener un único CTA primario por bloque de decisión.
- Definir estados focus, loading, disabled y error.
```

## Qué analiza actualmente

- Colores.
- Tipografía.
- Espaciado.
- Radios.
- Sombras.
- Bordes.
- CSS variables.
- Botones.
- Enlaces.
- Formularios.
- Badges.
- Modales/dialogs.
- CTA groups.
- Fricciones UX básicas.
- Reglas de implementación.

## Limitaciones

- Analiza DOM visible y estilos calculados.
- No ve intención de negocio con certeza.
- No sustituye revisión humana de producto, diseño o accesibilidad.
- Puede fallar o ver menos información en páginas con Shadow DOM, iframes o apps muy dinámicas.
- Algunas inferencias son aproximadas.
- Behavioral es una capa de apoyo dentro de UX Friction Notes, no una verdad absoluta.

## Roadmap

- v0.1.0 — Bookmarklet MVP.
- v0.2.0 — Mejor inferencia de design system.
- v0.3.0 — Más modos de handoff.
- v0.4.0 — Behavioral layer avanzada.
- v1.0.0 — Herramienta estable.

Ver roadmap completo en [`ROADMAP.md`](./ROADMAP.md).

## Desarrollo

```bash
npm install
npm test
npm run check
npm run build
npm run build:pages
```

## Verificación

- `npm test`: ejecuta la suite de tests.
- `npm run check`: valida sintaxis del entrypoint.
- `npm run build`: genera el bundle local en `dist/`.
- `npm run build:pages`: genera los archivos publicables en `docs/`.

## Licencia

MIT
