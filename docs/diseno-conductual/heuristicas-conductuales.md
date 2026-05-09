# Heurísticas conductuales

Conjunto de heurísticas de trabajo para futuras reglas de Contextic.

## 1. Claridad de decisión

El usuario debería entender la acción principal sin tener que comparar varios elementos compitiendo entre sí.

Señales observables:

- múltiples CTAs visualmente prominentes dentro del mismo bloque de decisión,
- botones con peso visual similar para acciones con distinta importancia,
- acción primaria colocada después de acciones secundarias o destructivas,
- copy de CTA que describe la acción de interfaz pero no el resultado para el usuario.

Riesgo potencial:

- sobrecarga de elección,
- duda antes de actuar,
- menor conversión,
- clics accidentales.

Patrón de recomendación:

- mantener una única acción primaria por bloque de decisión,
- degradar visualmente las acciones secundarias,
- usar copy orientado al resultado,
- agrupar alternativas bajo un patrón de menor énfasis.

## 2. Esfuerzo percibido

El usuario debería poder estimar el esfuerzo antes de comprometerse.

Señales observables:

- formularios largos sin progreso ni secciones,
- campos con expectativas de formato poco claras,
- acciones que exigen compromiso antes de explicar requisitos,
- bloques densos sin jerarquía.

Riesgo potencial:

- abandono,
- menor tasa de finalización,
- reducción de confianza.

Patrón de recomendación:

- exponer el esfuerzo de forma temprana,
- dividir flujos complejos en pasos con sentido,
- añadir ayuda contextual cuando el formato del input importe,
- reducir campos opcionales o separarlos visualmente.

## 3. Confianza antes de actuar

El usuario necesita información suficiente para confiar en el siguiente paso.

Señales observables:

- CTA sin propuesta de valor cercana,
- zonas de precio/acción sin refuerzo de confianza,
- acciones destructivas sin contexto de confirmación,
- términos poco familiares sin explicación.

Riesgo potencial:

- retraso en la decisión,
- aumento de contacto con soporte,
- menor activación.

Patrón de recomendación:

- situar refuerzos de confianza cerca de la acción,
- aclarar qué pasará después,
- explicar qué acciones son reversibles o irreversibles,
- usar etiquetas específicas frente a etiquetas genéricas.

## 4. Recuperación y feedback

El usuario debería saber qué ha pasado, qué ha fallado y cómo recuperarse.

Señales observables:

- controles deshabilitados sin explicación,
- errores de validación sin guía de recuperación,
- estados de carga sin información de progreso,
- campos que dependen solo del placeholder.

Riesgo potencial:

- clics repetidos,
- frustración,
- errores evitables,
- dependencia de soporte.

Patrón de recomendación:

- explicar por qué algo no está disponible,
- acompañar los errores con próximos pasos,
- preservar los datos introducidos después de un error,
- usar etiquetas visibles y ayuda contextual.

## 5. Hábito y comportamiento recurrente

Las interfaces deberían reforzar comportamientos útiles y repetidos sin manipular al usuario.

Señales observables:

- ausencia de una siguiente mejor acción tras completar una tarea,
- falta de estado guardado o señales de continuidad,
- tareas repetidas sin atajos,
- onboarding que no conduce a un primer éxito significativo.

Riesgo potencial:

- retención débil,
- baja activación,
- esfuerzo cognitivo repetido.

Patrón de recomendación:

- mostrar la siguiente mejor acción,
- preservar contexto,
- reducir configuración repetida,
- recompensar progreso significativo, no interacciones vacías.
