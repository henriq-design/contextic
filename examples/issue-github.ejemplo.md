# Deuda UI/UX detectada en la página actual

URL: https://example.com/pricing

## Problema

Esta pantalla muestra posible deuda de sistema de diseño y UX que debería revisarse antes de implementar nuevos cambios.

## Evidencia

- 31 valores únicos de color detectados.
- 24 valores únicos de espaciado detectados.
- 7 valores únicos de radio detectados.
- 16 botones/acciones detectados.
- 2 muestras de input sin etiqueta accesible clara.

## Hallazgos conductuales y heurísticos

### Acciones primarias compitiendo por encima del primer pliegue

Severidad: alta  
Confianza: media  
Principio: claridad de decisión

Insight: Se detectan 3 acciones visualmente prominentes en el viewport inicial.

Riesgo: La claridad de decisión baja cuando varios elementos compiten por el mismo rol conductual.

Recomendación: Mantener una única acción primaria por bloque de decisión y degradar visualmente las acciones secundarias.

Implicación de sistema de diseño: Revisar variantes de jerarquía de botones y documentar cuándo usar acciones primarias, secundarias y terciarias.

## Solución sugerida

Normalizar valores visuales alrededor del sistema existente, aclarar la jerarquía de acciones y mejorar la ayuda contextual de formularios cuando sea necesario.

## Criterios de aceptación

- [ ] Una única acción primaria por bloque de decisión.
- [ ] Botones, inputs y tarjetas usan radios compartidos mediante tokens.
- [ ] El espaciado usa la escala acordada o documenta excepciones.
- [ ] Los inputs incluyen etiqueta, ayuda y estado de error cuando sea relevante.
- [ ] No se introduce ningún valor de color nuevo sin mapeo a token semántico.
