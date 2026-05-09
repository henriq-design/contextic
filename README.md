# Contextic

**Contextic** es un bookmarklet de un clic que convierte cualquier página web en un briefing técnico de diseño para diseñadores, desarrolladores y agentes de IA.

Analiza lo que una pantalla ya comunica a través del DOM y los estilos calculados: tokens visuales, patrones UI, componentes candidatos, fricciones UX y reglas de implementación listas para handoff.

El objetivo no es sustituir el criterio de diseño. El objetivo es reducir ambigüedad antes de modificar una pantalla real.

## Por qué existe Contextic

Diseñadores y desarrolladores suelen modificar interfaces existentes sin documentación clara. La fuente de verdad suele estar repartida entre CSS, componentes, estados, textos y decisiones visuales que ya viven en producción.

Contextic crea una captura rápida de la página actual y la exporta como:

- `design-context.md` para Cursor, Codex, Claude y documentación de handoff,
- `contextic-report.json` para inspección estructurada,
- `github-issue.md` para documentar deuda UI/UX accionable.

## Instalación rápida

1. Abrir la página de instalación:
   - https://henriq-design.github.io/contextic/
2. Arrastrar el bookmarklet a la barra de favoritos.
3. Abrir cualquier página web.
4. Hacer clic en Contextic.
5. Copiar el output deseado.

## Qué detecta el MVP

Cuando se ejecuta el bookmarklet, Contextic abre un panel lateral y analiza la página actual:

- colores desde estilos calculados,
- patrones tipográficos,
- escala de espaciado,
- radios, sombras y bordes,
- componentes UI comunes,
- fricciones heurísticas de UX y sistema de diseño,
- claridad de decisión,
- riesgos en formularios y ayuda contextual,
- mapa behavioral de 7 bloques,
- scoring de prioridad P0/P1/P2,
- propuesta de estructura behavioral recomendada,
- recomendaciones de handoff para desarrollo/IA.

Contextic es un asistente heurístico, no una auditoría absoluta. Aporta evidencia para tomar mejores decisiones de producto y diseño.

## Modelo behavioral

La capa diferencial de Contextic es el diseño conductual. Una pantalla no se evalúa solo por su estética, sino por cómo responde a las preguntas mentales del usuario:

| Bloque | Pregunta mental | Fricción que reduce | Resultado esperado |
|---|---|---|---|
| What | ¿Qué es esto y qué gano? | Ambigüedad | Comprensión inmediata |
| Why | ¿Por qué debería importarme? | Baja motivación | Valor percibido |
| Why not | ¿Qué podría salir mal? | Riesgo percibido | Confianza |
| Who | ¿Esto es para alguien como yo? | Falta de identificación | Relevancia personal |
| How | ¿Cómo funciona o cómo empiezo? | Esfuerzo percibido | Facilidad |
| Where | ¿Dónde actúo? | Baja accionabilidad | Conversión accesible |
| When | ¿Por qué ahora? | Procrastinación | Acción inmediata legítima |

## Documentación operativa para IA

El repositorio incluye documentación de producto y documentación operativa para agentes de IA:

```txt
docs/diseno-conductual/
├─ README.md
├─ heuristicas-conductuales.md
├─ patrones-de-friccion.md
├─ claridad-de-decision.md
├─ plantilla-para-reglas.md
├─ roadmap.md
└─ operativa-ia/
   ├─ 00_system_prompt_landing_behavioral.md
   ├─ 01_output_schema_briefing_tecnico.md
   ├─ 02_behavioral_structure_7_blocks.md
   ├─ 03_detection_rules_ui_tokens_components.md
   ├─ 04_friction_scoring_and_prioritization.md
   ├─ 05_recommendation_engine_behavioral.md
   ├─ 06_quality_gate_and_guardrails.md
   └─ 07_codex_implementation_notes.md
```

La carpeta `operativa-ia/` funciona como fuente de verdad para evolucionar Contextic con Codex, Cursor o cualquier agente de código.

## Uso local

```bash
npm install
npm run build
npm run build:pages
npm test
npm run check
npm run serve
```

Abre:

```txt
http://localhost:5173
```

La página de demo local carga Contextic automáticamente para que puedas inspeccionar el panel desde el primer momento.

## GitHub Pages

Para publicar la página instalable desde este repo, ejecuta:

```bash
npm run build:pages
```

El script genera:

```txt
docs/index.html
docs/contextic.iife.js
docs/bookmarklet.txt
```

La URL pública prevista del bundle es:

```txt
https://henriq-design.github.io/contextic/contextic.iife.js
```

Si GitHub Pages todavía no está activado, configúralo en GitHub:

```txt
Settings → Pages → Source: Deploy from branch → Branch: main → Folder: /docs
```

## Exports disponibles

- `design-context.md`
- `contextic-report.json`
- `github-issue.md`

## Bookmarklet de producción

Después de ejecutar:

```bash
npm run build:pages
```

Obtendrás:

```txt
docs/contextic.iife.js
docs/bookmarklet.txt
```

El bookmarklet de `docs/bookmarklet.txt` carga el bundle público:

```js
javascript:(()=>{const s=document.createElement('script');s.src='https://henriq-design.github.io/contextic/contextic.iife.js?v='+Date.now();document.documentElement.appendChild(s);})();
```

Crea un marcador en el navegador y pega esa URL de una sola línea como ubicación del marcador.

## Limitaciones

- Funciona sobre DOM visible y estilos calculados.
- No interpreta intención de negocio con certeza.
- No sustituye revisión humana de producto, diseño o accesibilidad.
- Algunas inferencias pueden ser aproximadas.
- Páginas con Shadow DOM, iframes o apps muy dinámicas pueden limitar el análisis.

## Estructura del repositorio

```txt
contextic/
├─ bookmarklet.js
├─ src/
│  ├─ index.js
│  ├─ utils.js
│  ├─ collect-colors.js
│  ├─ collect-typography.js
│  ├─ collect-spacing.js
│  ├─ collect-components.js
│  ├─ behavioral-model.js
│  ├─ detect-frictions.js
│  └─ export-markdown.js
├─ docs/
│  ├─ index.html
│  ├─ contextic.iife.js
│  ├─ bookmarklet.txt
│  └─ diseno-conductual/
│     ├─ README.md
│     ├─ heuristicas-conductuales.md
│     ├─ patrones-de-friccion.md
│     ├─ claridad-de-decision.md
│     ├─ plantilla-para-reglas.md
│     ├─ roadmap.md
│     └─ operativa-ia/
├─ examples/
│  ├─ contexto-diseno.ejemplo.md
│  ├─ auditoria-conductual.ejemplo.md
│  ├─ issue-github.ejemplo.md
│  └─ tokens-contextic.ejemplo.json
├─ scripts/
│  ├─ build.mjs
│  ├─ build-pages.mjs
│  ├─ make-bookmarklet.mjs
│  └─ serve.mjs
├─ CODEX_CONTEXT.md
├─ ROADMAP.md
├─ README.md
└─ demo.gif
```

## Heurísticas actuales

El MVP detecta:

- demasiadas acciones visualmente primarias por encima del primer pliegue,
- deriva en la escala de espaciado,
- inconsistencia en radios,
- inputs sin etiqueta clara,
- controles deshabilitados que podrían necesitar guía de recuperación,
- textos de enlace genéricos,
- imágenes sin atributo `alt`,
- paletas de color fragmentadas,
- presencia y calidad heurística de los bloques What, Why, Why not, Who, How, Where y When.

Estas reglas son intencionadamente simples. La siguiente capa debería hacerlas configurables, mejor evidenciadas y menos ruidosas.

## Roadmap

El roadmap del MVP vive en [`ROADMAP.md`](./ROADMAP.md).

## Cómo usarlo con Codex o Cursor

1. Ejecuta Contextic sobre una página real.
2. Copia `design-context.md`.
3. Pégalo en tu agente de código junto con el cambio que quieres hacer.
4. Pide al agente que preserve las restricciones visuales, sistémicas y behavioral de la captura.

Prompt de ejemplo:

```md
Usa este briefing de Contextic como contexto de implementación. Refactoriza el componente de tarjeta de precios sin introducir nuevos colores, valores de espaciado ni radios salvo que sea estrictamente necesario. Mantén una única acción primaria por bloque de decisión y mejora la estructura behavioral What → Why → Why not → Who → How → Where → When sin inventar claims, métricas, testimonios ni urgencia falsa.
```

## Principio de diseño

Una buena salida no es solo datos. Una buena salida ayuda a decidir qué cambiar, qué preservar y qué no romper.

Contextic debe mantenerse rápido, transparente y útil en flujos reales de trabajo.

## Licencia

MIT
