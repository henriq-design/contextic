# Recommendation engine — Propuesta behavioral

## Objetivo

Convertir el diagnóstico en una propuesta estructural, no en recomendaciones sueltas.

## Input esperado

La IA debe recibir uno o varios de estos inputs:

- Captura de pantalla.
- HTML/CSS.
- URL.
- Texto extraído.
- Tokens detectados.
- Componentes detectados.
- Objetivo de negocio.
- Tipo de usuario.
- Conversión esperada.
- Restricciones técnicas.

## Output recomendado

```json
{
  "behavioral_structure_recommendation": {
    "summary": "",
    "recommended_order": ["what", "why", "why_not", "who", "how", "where", "when"],
    "sections": []
  }
}
```

## Section recommendation schema

```json
{
  "block": "what|why|why_not|who|how|where|when",
  "section_name": "",
  "objective": "",
  "user_question_answered": "",
  "primary_friction_resolved": "",
  "behavioral_principles": [],
  "recommended_components": [],
  "content_requirements": [],
  "copy_rules": [],
  "implementation_rules": [],
  "accessibility_rules": [],
  "metrics": [],
  "risks": [],
  "priority": "P0|P1|P2"
}
```

## Reglas de generación por bloque

### What
Genera:
- Headline basado en resultado.
- Subheadline con mecanismo o diferenciador.
- CTA basado en valor.
- 3 bullets de beneficio inmediato.
- Visual que demuestre producto, no decoración.

No generes:
- Claims no demostrables.
- CTAs genéricos.
- Headlines centrados en la empresa.

### Why
Genera:
- Beneficios orientados a resultado.
- Prueba social contextual.
- Evidencia o dato si existe.
- Beneficio emocional.
- Demo, trial o preview si aplica.

No generes:
- Features sin traducción.
- Testimonios inventados.
- Métricas ficticias.

### Why not
Genera:
- Objeciones probables.
- Garantías reales.
- Microcopy de reducción de riesgo.
- FAQ orientada a conversión.
- Mensajes sobre seguridad, cancelación o soporte si aplican.

No generes:
- Falsa seguridad.
- Promesas legales o comerciales sin base.
- Urgencia antes de confianza.

### Who
Genera:
- Perfil objetivo.
- Casos de uso.
- Señales de identidad.
- Testimonios por segmento si existen.
- Lenguaje del usuario.

No generes:
- “Para todos”.
- Segmentos incompatibles en el mismo mensaje.
- Personas inventadas.

### How
Genera:
- Proceso en 3 pasos si es posible.
- Expectativa post-click.
- Instrucciones simples.
- Reducción de esfuerzo.
- Microcopy de duración o facilidad si está justificado.

No generes:
- Procesos internos irrelevantes.
- Pasos técnicos innecesarios.
- Over-explanation.

### Where
Genera:
- CTA principal.
- CTAs contextuales.
- Ubicación por sección.
- Reglas de visibilidad y proximidad.
- Estados del botón y formulario.

No generes:
- Múltiples CTAs primarios compitiendo.
- CTAs fuera de contexto.
- Botones con labels ambiguos.

### When
Genera:
- Urgencia legítima.
- Beneficio inmediato.
- Coste de oportunidad.
- Escasez solo si está probada.
- Cierre con acción clara.

No generes:
- Falsa cuenta atrás.
- “Solo hoy” sin evidencia.
- Manipulación o presión excesiva.

## Plantilla de propuesta final

```markdown
# Propuesta behavioral recomendada

## Diagnóstico
[Resumen del problema de conversión principal]

## Estructura propuesta

### 1. What — [Nombre de sección]
- Objetivo:
- Fricción que resuelve:
- Componentes:
- Copy recomendado:
- Reglas de implementación:
- Métrica:

### 2. Why — [Nombre de sección]
...

## Priorización
| Prioridad | Cambio | Motivo | Impacto | Esfuerzo |
|---|---|---|---|---|

## Riesgos
- [Riesgo]
- [Mitigación]

## Siguiente experimento recomendado
[Experimento A/B o cambio incremental]
```
