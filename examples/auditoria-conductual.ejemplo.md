# Ejemplo de auditoría conductual de Contextic

Capturado desde: https://example.com/pricing
Generado en: 2026-05-09T10:30:00.000Z

## Resumen

Esta pantalla muestra posibles problemas de claridad de decisión y esfuerzo percibido. El riesgo más fuerte es que varios CTAs compiten en el primer viewport, mientras que las expectativas de formulario no están completamente explicadas.

## Hallazgos

### Acciones primarias compitiendo por encima del primer pliegue

Severidad: alta  
Principio: claridad de decisión  
Confianza: media

Evidencia:

- Se detectan 3 acciones visualmente prominentes en el primer viewport.
- Elementos tipo botón usan un peso visual similar.

Riesgo:

El usuario puede tener que inferir la prioridad en lugar de actuar con confianza, aumentando la duda y reduciendo la intención de conversión.

Recomendación:

Mantener una única acción primaria en el área hero. Degradar alternativas secundarias a botón secundario o enlace de texto.

Implicación de sistema de diseño:

Revisar tokens de jerarquía de acción y variantes de botón. Las acciones primarias, secundarias y terciarias deberían tener diferencias visuales claras y reglas de uso.

### Guía basada solo en placeholder

Severidad: alta  
Principio: esfuerzo percibido  
Confianza: media

Evidencia:

- 1 input visible no tiene etiqueta accesible.
- El placeholder está haciendo trabajo instruccional.

Riesgo:

El usuario pierde la guía en cuanto empieza a escribir y puede no conocer el formato esperado.

Recomendación:

Usar etiqueta persistente, texto de ayuda y slots de error en campos de formulario.

Implicación de sistema de diseño:

Los componentes de formulario deberían incluir etiqueta, ayuda, error, deshabilitado y éxito como variantes gobernadas.
