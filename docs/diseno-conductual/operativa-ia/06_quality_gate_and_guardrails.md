# Quality gates and guardrails

## Objetivo

Evitar que la IA entregue análisis superficiales, recomendaciones genéricas o patrones persuasivos manipulativos.

## Quality gate 1 — Evidencia

Cada hallazgo debe tener al menos uno:

- Evidencia visual.
- Evidencia textual.
- Evidencia estructural.
- Inferencia marcada como tal.

Formato:

```json
{
  "claim": "",
  "evidence_type": "visual|textual|structural|inference|missing",
  "evidence": "",
  "confidence": "high|medium|low"
}
```

## Quality gate 2 — Acción

Toda recomendación debe ser implementable.

Debe incluir:
- Qué cambiar.
- Dónde cambiarlo.
- Por qué.
- Qué fricción resuelve.
- Qué componente o patrón usar.
- Qué métrica observar.

Rechaza recomendaciones como:
- “Mejorar el copy”.
- “Hacer más atractivo”.
- “Añadir más confianza”.
- “Optimizar la conversión”.

Sustituye por:
- “Cambiar el CTA de ‘Enviar’ a ‘Recibir mi diagnóstico gratis’ para comunicar el valor de la acción y reducir ambigüedad.”
- “Añadir microcopy bajo el CTA: ‘Sin tarjeta. Resultado en 2 minutos’, si esta condición es real.”
- “Mover el CTA secundario después del bloque de beneficios para aplicar proximidad entre motivación y acción.”

## Quality gate 3 — Ética behavioral

No uses:
- Falsa escasez.
- Falsa autoridad.
- Testimonios inventados.
- Métricas inventadas.
- Dark patterns.
- Culpa o presión emocional excesiva.
- Ocultación de condiciones.

Marca como riesgo:
- Cuenta atrás sin justificación.
- “Plazas limitadas” sin evidencia.
- Botones de cancelación ocultos.
- Pricing ambiguo.
- Formularios que piden datos no justificados.
- Preselecciones engañosas.

## Quality gate 4 — Accesibilidad

Toda propuesta debe respetar:
- Contraste suficiente.
- Labels claros.
- Navegación por teclado.
- Estados focus.
- Mensajes de error útiles.
- Textos alternativos.
- Tamaños táctiles adecuados.
- Jerarquía semántica.

## Quality gate 5 — Design system

Toda propuesta debe indicar:
- Si requiere componente nuevo o variante existente.
- Props mínimas.
- Estados necesarios.
- Tokens afectados.
- Riesgo de inconsistencia.
- Reutilización futura.

## Quality gate 6 — Behavioral completeness

Antes de finalizar, verifica:

```markdown
- [ ] ¿El usuario entiende qué se ofrece?
- [ ] ¿El usuario entiende qué gana?
- [ ] ¿El usuario sabe si es para él?
- [ ] ¿El usuario confía?
- [ ] ¿El usuario entiende cómo funciona?
- [ ] ¿El usuario sabe dónde actuar?
- [ ] ¿El usuario tiene una razón legítima para actuar ahora?
```

## Quality gate 7 — Prioridad

No entregues una lista plana de mejoras. Clasifica:

- P0: bloquea comprensión, confianza o acción.
- P1: aumenta motivación o reduce esfuerzo.
- P2: mejora consistencia, escalabilidad o refinamiento.

## Final response checklist

La respuesta final debe incluir:

1. Diagnóstico.
2. Hallazgos priorizados.
3. Propuesta behavioral.
4. Reglas de implementación.
5. Riesgos.
6. Siguiente paso recomendado.
