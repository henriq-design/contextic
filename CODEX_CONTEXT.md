# Contexto para Codex — Contextic

## Producto

Contextic es un bookmarklet ligero que convierte cualquier página web en un briefing técnico de diseño para diseñadores, desarrolladores y agentes de IA.

No es una app con backend. No debe pedir login. No debe depender de Figma API. Su valor está en ejecutar un análisis útil en un clic desde el navegador.

## Promesa

> Convertir una pantalla real en contexto accionable: tokens, patrones UI, componentes, fricciones UX, reglas de implementación y propuesta behavioral basada en What, Why, Why not, Who, How, Where y When.

## Criterios de diseño del producto

- Un clic.
- Sin backend.
- Sin dependencias de runtime salvo que sean imprescindibles.
- Salida útil para diseñadores, developers y agentes de código.
- Evidencia antes que opinión.
- Recomendaciones implementables, no consejos genéricos.
- El análisis se formula como hipótesis, no como verdad absoluta.
- No inventar datos, testimonios, garantías, urgencia, métricas ni claims.
- No usar dark patterns ni falsa escasez.

## Arquitectura actual

```txt
src/
├─ index.js
├─ utils.js
├─ collect-colors.js
├─ collect-typography.js
├─ collect-spacing.js
├─ collect-components.js
├─ behavioral-model.js
├─ detect-frictions.js
└─ export-markdown.js
```

### Flujo actual

```txt
DOM visible
  → collect-colors
  → collect-typography
  → collect-spacing
  → collect-components
  → detect-frictions
  → behavioral-model
  → export-markdown
  → panel + copiar Markdown/JSON
```

## Fuente de verdad behavioral

La documentación operativa vive en:

```txt
docs/diseno-conductual/operativa-ia/
├─ 00_system_prompt_landing_behavioral.md
├─ 01_output_schema_briefing_tecnico.md
├─ 02_behavioral_structure_7_blocks.md
├─ 03_detection_rules_ui_tokens_components.md
├─ 04_friction_scoring_and_prioritization.md
├─ 05_recommendation_engine_behavioral.md
├─ 06_quality_gate_and_guardrails.md
└─ 07_codex_implementation_notes.md
```

Antes de proponer cambios relevantes, lee esos archivos.

## Modelo behavioral

Cada pantalla debe evaluarse como una secuencia de decisión:

1. What — ¿Qué es esto y qué gano?
2. Why — ¿Por qué debería importarme?
3. Why not — ¿Qué podría salir mal?
4. Who — ¿Esto es para alguien como yo?
5. How — ¿Cómo funciona o cómo empiezo?
6. Where — ¿Dónde actúo?
7. When — ¿Por qué actuar ahora?

Cada bloque reduce una fricción específica:

- What → ambigüedad.
- Why → baja motivación.
- Why not → riesgo percibido.
- Who → falta de identificación.
- How → esfuerzo percibido.
- Where → baja accionabilidad.
- When → procrastinación.

## Scoring

Las fricciones deben usar:

```json
{
  "severityScore": 1,
  "confidence": "high|medium|low",
  "expectedImpact": "low|medium|high",
  "implementationEffort": "low|medium|high",
  "priority": "P0|P1|P2"
}
```

Fórmula:

```txt
priority_score = severity * expected_impact_weight / implementation_effort_weight
```

Pesos:

- expectedImpact: low=1, medium=2, high=3
- implementationEffort: low=1, medium=2, high=3

Prioridad:

- P0: score >= 9
- P1: score >= 5 y < 9
- P2: score < 5

## Quality gates

Cada hallazgo debe tener:

- evidencia visual, textual, estructural o inferencia marcada como tal,
- fricción que resuelve,
- recomendación implementable,
- componente o patrón UI sugerido,
- implicación de design system,
- métrica asociada,
- prioridad.

Evita recomendaciones como:

- “mejorar el copy”,
- “hacerlo más atractivo”,
- “añadir confianza”,
- “optimizar conversión”.

Sustituye por recomendaciones concretas:

- qué cambiar,
- dónde,
- por qué,
- qué componente usar,
- qué métrica observar.

## Guardrails éticos

No recomendar:

- falsa escasez,
- falsa autoridad,
- testimonios inventados,
- métricas inventadas,
- urgencia artificial,
- ocultación de condiciones,
- presión emocional excesiva,
- patrones oscuros.

Si detectas esos patrones en una página, márcalos como riesgo crítico.

## Estado de implementación

Ya existe una primera integración mínima:

- `behavioral-model.js` define los 7 bloques, señales, mapping y recomendación estructural.
- `detect-frictions.js` devuelve fricciones con bloque, tipo, severidad, evidencia, esfuerzo, impacto y prioridad.
- `export-markdown.js` genera un briefing técnico ampliado con mapa behavioral, fricciones priorizadas, propuesta, reglas de implementación y métricas.
- El panel muestra un resumen de bloques behavioral y permite copiar el briefing completo.

## Próximo paso recomendado

No sobredimensionar. El siguiente paso debe ser extraer reglas behavioral a una estructura versionada y testeable.

Propuesta:

```txt
src/behavioral-rules/
├─ index.js
├─ what.rules.js
├─ why.rules.js
├─ why-not.rules.js
├─ who.rules.js
├─ how.rules.js
├─ where.rules.js
└─ when.rules.js
```

Cada regla debería tener:

```js
{
  id: 'where.multiple-primary-actions',
  block: 'where',
  type: 'baja_accionabilidad',
  signal: 'multiple_primary_like_actions_above_fold',
  severity: 4,
  expectedImpact: 'high',
  implementationEffort: 'low',
  evidenceType: 'structural',
  detect(context) {},
  recommendation: {},
  designSystemImplication: ''
}
```

## Prompt operativo recomendado para Codex

```md
Lee `CODEX_CONTEXT.md`, `README.md` y todos los archivos de `docs/diseno-conductual/operativa-ia/`.

Trabaja sobre Contextic respetando su intención de producto: un bookmarklet ligero que convierte cualquier página web en contexto útil para diseño, desarrollo y agentes de IA.

Objetivo: mejorar la primera integración behavioral sin sobredimensionar la arquitectura.

Mantén estas restricciones:

- Sin backend.
- Sin login.
- Sin dependencias de runtime salvo necesidad real.
- Todo debe funcionar desde el DOM visible y estilos calculados.
- Cada hallazgo debe tener evidencia observable o inferencia marcada.
- No inventes claims, garantías, datos, testimonios, precios ni urgencia.
- Separa `observed`, `inferred` y `recommended` cuando amplíes el schema.
- Toda recomendación debe indicar fricción, principio behavioral, componente/patrón, implicación de design system, esfuerzo e impacto esperado.

Antes de escribir código, propón:

1. Qué reglas actuales moverías a una estructura versionada.
2. Qué reglas dejarías como heurística simple.
3. Qué edge cases podrían generar falsos positivos.
4. Qué tests mínimos añadirías.
5. Qué cambios concretos harías en el código.

Después, implementa solo una iteración mínima: extrae 2 o 3 reglas a una estructura reutilizable y deja preparado el patrón para seguir escalando.
```
