# Capa de diseño conductual

Esta carpeta define la capa de diseño conductual de Contextic.

El escáner técnico detecta señales del DOM, estilos visuales y componentes. La capa conductual convierte esas señales en una lectura de decisión:

```txt
What → Why → Why not → Who → How → Where → When
```

Cada bloque responde a una pregunta mental del usuario y reduce una fricción concreta:

- What: ¿Qué es esto y qué gano? → Ambigüedad.
- Why: ¿Por qué debería importarme? → Baja motivación.
- Why not: ¿Qué podría salir mal? → Riesgo percibido.
- Who: ¿Esto es para alguien como yo? → Falta de identificación.
- How: ¿Cómo funciona o cómo empiezo? → Esfuerzo percibido.
- Where: ¿Dónde actúo? → Baja accionabilidad.
- When: ¿Por qué actuar ahora? → Procrastinación.

## Documentación de producto

```txt
heuristicas-conductuales.md
patrones-de-friccion.md
claridad-de-decision.md
plantilla-para-reglas.md
roadmap.md
```

Estos archivos explican el criterio de diseño, los patrones de fricción y cómo convertirlos en reglas.

## Documentación operativa para IA

```txt
operativa-ia/
├─ 00_system_prompt_landing_behavioral.md
├─ 01_output_schema_briefing_tecnico.md
├─ 02_behavioral_structure_7_blocks.md
├─ 03_detection_rules_ui_tokens_components.md
├─ 04_friction_scoring_and_prioritization.md
├─ 05_recommendation_engine_behavioral.md
├─ 06_quality_gate_and_guardrails.md
└─ 07_codex_implementation_notes.md
```

Esta carpeta es la fuente de verdad para trabajar con Codex, Cursor o cualquier agente de código. Define rol de IA, schema de salida, modelo behavioral, reglas de detección, scoring, motor de recomendación, quality gates y notas de implementación.

## Cómo debería evolucionar

1. Mantener la documentación como referencia de producto.
2. Convertir heurísticas estables en reglas pequeñas y testeables.
3. Versionar las reglas por bloque behavioral.
4. Preservar evidencia en cada hallazgo.
5. Separar lo observado, lo inferido y lo recomendado.
6. Añadir tests para evitar falsos positivos ruidosos.
7. Mantener la salida útil para diseño, desarrollo y agentes de IA.

## Criterio de calidad de una regla

Una regla conductual de Contextic debería ser:

- observable desde la página,
- explicable para diseño y desarrollo,
- accionable sin requerir un estudio de research completo,
- prudente con el nivel de certeza,
- útil para handoff e implementación,
- conectada con un bloque behavioral,
- trazable a evidencia visual, textual, estructural o inferencia marcada.

Evita hallazgos vagos como “mejorar UX”. Prioriza hallazgos que conecten evidencia, riesgo y siguiente acción.
