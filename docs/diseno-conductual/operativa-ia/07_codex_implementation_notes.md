# Codex implementation notes — Landing to technical design brief

## Objetivo

Ayudar a construir una herramienta que convierta cualquier pantalla web en un briefing técnico de diseño con valor diferencial behavioral.

## Pipeline recomendado

```text
INPUT
  -> screenshot / url / html / css
  -> extraction layer
  -> UI detection layer
  -> design system inference layer
  -> behavioral mapping layer
  -> friction scoring layer
  -> recommendation engine
  -> markdown + json output
```

## 1. Extraction layer

Extraer:
- Texto visible.
- Jerarquía de headings.
- CTAs.
- Links.
- Formularios.
- Imágenes.
- Componentes repetidos.
- Secciones.
- Colores.
- Tipografía.
- Espaciado.
- Layout.
- Posición relativa de CTA y contenido.

## 2. UI detection layer

Clasificar:
- Patrón UI.
- Componente.
- Variante.
- Rol funcional.
- Rol behavioral.
- Estado.
- Reutilización potencial.

Ejemplo:

```json
{
  "element_id": "hero_cta_primary",
  "ui_component": "Button",
  "variant": "primary",
  "text": "Start free trial",
  "behavioral_role": "where",
  "associated_block": "what",
  "issues": ["CTA describes action but not value"]
}
```

## 3. Design system inference layer

Inferir:
- Tokens.
- Componentes base.
- Componentes compuestos.
- Variantes.
- Estados faltantes.
- Inconsistencias.
- Reglas de responsive.
- Reglas de accesibilidad.

## 4. Behavioral mapping layer

Mapear contenido a bloques:

```json
{
  "behavioral_blocks": {
    "what": {
      "present": true,
      "quality": 3,
      "evidence": ["headline", "subheadline", "hero_cta"],
      "missing": ["clear immediate benefit"],
      "friction": "value proposition is category-led, not outcome-led"
    }
  }
}
```

## 5. Friction scoring layer

Calcular:
- Severidad.
- Confianza.
- Impacto.
- Esfuerzo.
- Prioridad.

```json
{
  "friction": "CTA copy is generic",
  "type": "ambiguity",
  "block": "where",
  "severity": 4,
  "expected_impact": "high",
  "implementation_effort": "low",
  "priority": "P0"
}
```

## 6. Recommendation engine

Generar:
- Propuesta estructural.
- Cambios por sección.
- Componentes necesarios.
- Copy rules.
- Métricas.
- Riesgos.
- Experimentos.

## 7. Suggested JSON root schema

```json
{
  "screen_summary": {},
  "detected_tokens": {},
  "detected_patterns": [],
  "detected_components": [],
  "behavioral_mapping": {},
  "ux_frictions": [],
  "design_system_recommendations": [],
  "behavioral_structure_recommendation": {},
  "implementation_rules": [],
  "metrics": [],
  "risks": [],
  "next_experiment": {}
}
```

## 8. Recommended markdown sections

```markdown
# Landing Design Brief

## Diagnóstico ejecutivo
## Inventario técnico visual
## Patrones UI detectados
## Componentes detectados
## Mapa behavioral
## Fricciones UX
## Propuesta behavioral
## Reglas de implementación
## Priorización
## Métricas
## Riesgos
## Siguiente experimento
```

## 9. Development guardrails

- Do not rely only on screenshot analysis if HTML is available.
- Preserve source evidence for every claim.
- Avoid hallucinating business facts.
- Keep observed and recommended data separate.
- Store reusable patterns in a pattern library.
- Version behavioral rules independently from UI detection rules.
- Make the output deterministic enough for regression tests.
- Add confidence scores.
- Allow manual overrides by designers.
- Log unresolved assumptions.

## 10. MVP scope

### Must have
- Screenshot or HTML input.
- Text and CTA extraction.
- Basic token inference.
- UI pattern detection.
- 7-block behavioral mapping.
- Friction scoring.
- Markdown output.

### Should have
- JSON output.
- Component inventory.
- Accessibility checks.
- Design system recommendations.
- Prioritization.

### Could have
- A/B test suggestions.
- Comparison against category benchmarks.
- Multi-screen funnel analysis.
- Auto-generated component specs.
- Export to Notion, Jira or Figma.
