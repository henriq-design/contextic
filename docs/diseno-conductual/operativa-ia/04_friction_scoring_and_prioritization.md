# Friction scoring and prioritization

## Objetivo

Evaluar fricciones UX desde el impacto conductual, no solo desde la estética.

## Tipos de fricción

### 1. Ambigüedad
El usuario no entiende qué se ofrece, para quién es, qué gana o qué debe hacer.

Señales:
- Headline vago.
- CTA genérico.
- Visual decorativo.
- Jerarquía débil.
- Exceso de claims abstractos.

Bloques afectados:
- What
- Who
- Where

### 2. Baja motivación
El usuario entiende la oferta, pero el valor no parece suficientemente relevante.

Señales:
- Features sin beneficios.
- Beneficios lejanos.
- Falta de prueba social.
- Ausencia de resultado claro.
- No hay conexión emocional.

Bloques afectados:
- Why
- What

### 3. Riesgo percibido
El usuario teme equivocarse, perder dinero, tiempo, privacidad o control.

Señales:
- No hay garantía.
- No se explica cancelación.
- No se aclaran condiciones.
- No se mencionan seguridad o soporte.
- Testimonios poco creíbles.

Bloques afectados:
- Why not
- Why
- Where

### 4. Falta de identificación
El usuario no siente que la solución sea para alguien como él.

Señales:
- Segmento no explícito.
- Lenguaje genérico.
- Casos de uso irrelevantes.
- Testimonios no representativos.
- Falta de contexto.

Bloques afectados:
- Who

### 5. Esfuerzo percibido
El usuario cree que empezar o completar la acción será difícil.

Señales:
- Proceso no explicado.
- Formulario largo.
- Falta de preview del siguiente paso.
- Demasiados pasos.
- Copy que sugiere complejidad.

Bloques afectados:
- How
- Where
- Why not

### 6. Baja accionabilidad
El usuario no sabe dónde actuar o no encuentra el CTA en el momento adecuado.

Señales:
- CTA poco visible.
- CTA solo al final.
- Jerarquía débil.
- Acción lejos del argumento.
- Demasiadas opciones.

Bloques afectados:
- Where

### 7. Procrastinación
El usuario ve valor, pero no tiene razón para actuar ahora.

Señales:
- No hay urgencia legítima.
- No se muestra beneficio inmediato.
- No hay coste de oportunidad.
- Cierre débil.
- CTA final repetitivo.

Bloques afectados:
- When

## Scoring

Evalúa cada fricción con estos criterios:

```json
{
  "severity": {
    "1": "cosmetic_or_low_impact",
    "2": "minor_clarity_issue",
    "3": "moderate_conversion_risk",
    "4": "major_decision_blocker",
    "5": "critical_conversion_blocker"
  },
  "confidence": "high|medium|low",
  "implementation_effort": "low|medium|high",
  "expected_impact": "low|medium|high"
}
```

## Fórmula de prioridad

Usa esta lógica:

```text
priority_score = severity * expected_impact_weight / implementation_effort_weight
```

Pesos:
- expected_impact: low=1, medium=2, high=3
- implementation_effort: low=1, medium=2, high=3

Prioridad:
- P0: score >= 9
- P1: score >= 5 and < 9
- P2: score < 5

## Reglas de priorización

1. Primero corrige comprensión: What.
2. Después corrige motivación: Why.
3. Después reduce riesgo: Why not.
4. Después mejora identificación: Who.
5. Después reduce esfuerzo: How.
6. Después optimiza accesibilidad de acción: Where.
7. Por último introduce urgencia legítima: When.

Excepción:
- Si no hay CTA visible, Where pasa a P0.
- Si el producto implica dinero, salud, privacidad, contratación o permanencia, Why not sube de prioridad.
- Si el tráfico viene de campaña segmentada, la coherencia entre anuncio y hero pasa a P0.
- Si hay falso claim, falsa escasez o patrón oscuro, debe marcarse como riesgo crítico.
