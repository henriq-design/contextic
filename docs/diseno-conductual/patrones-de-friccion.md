# Patrones de fricción

Este archivo lista patrones de fricción conductual que Contextic podrá detectar o documentar más adelante.

## Acciones primarias compitiendo

Señal:

- Dos o más acciones visualmente prominentes aparecen en el mismo viewport o bloque de decisión.

Riesgo conductual:

- El usuario tiene que inferir la prioridad en lugar de actuar con confianza.

Ángulo de sistema de diseño:

- Las variantes primaria, secundaria y terciaria podrían no estar gobernadas de forma consistente.

Recomendación sugerida:

- Mantener un único CTA primario por bloque de decisión. Usar variantes secundarias o terciarias para alternativas.

## Guía basada solo en placeholder

Señal:

- Los inputs no tienen etiquetas visibles o texto de ayuda y dependen del placeholder.

Riesgo conductual:

- Las expectativas desaparecen en cuanto el usuario empieza a escribir.

Ángulo de sistema de diseño:

- Los componentes de formulario necesitan slots de etiqueta, ayuda, error y estado deshabilitado como partes principales.

Recomendación sugerida:

- Usar etiquetas persistentes y ayuda contextual/error cuando exista formato esperado o riesgo de decisión.

## Control deshabilitado sin salida

Señal:

- Botón o input deshabilitado visible sin explicación cercana.

Riesgo conductual:

- El usuario no puede inferir cómo desbloquear la siguiente acción.

Ángulo de sistema de diseño:

- Los estados deshabilitados necesitan patrones de guía, no solo cambios de opacidad.

Recomendación sugerida:

- Explicar el requisito faltante o usar una acción habilitada que revele feedback de validación.

## Etiqueta de navegación genérica

Señal:

- Enlaces con etiquetas como “aquí”, “leer más”, “ver más”, “click here” o “más información”.

Riesgo conductual:

- El usuario no puede anticipar destino o valor antes de hacer clic.

Ángulo de sistema de diseño:

- Las guías de contenido deberían exigir etiquetas orientadas a destino o resultado.

Recomendación sugerida:

- Sustituir copy genérico por texto específico de destino, beneficio o acción.

## Lenguaje visual fragmentado

Señal:

- Demasiados valores únicos de color, espaciado, radio o sombra en una misma página.

Riesgo conductual:

- La jerarquía visual se vuelve más difícil de interpretar y la confianza baja.

Ángulo de sistema de diseño:

- La gobernanza de tokens y variantes de componentes probablemente es débil o se está saltando.

Recomendación sugerida:

- Consolidar valores en tokens semánticos y variantes reutilizables de componentes.
