# Captura de Contextic

Capturado desde: https://example.com/pricing
Generado en: 2026-05-09T10:30:00.000Z
Viewport: 1440x900

## 1. Captura de sistema de diseño

### Colores
- #0057ff — usado 42 veces — candidato a primario/acento
- #ffffff — usado 36 veces — superficie/fondo
- #111827 — usado 28 veces — texto/foreground

### Tipografía
- Inter | 16px | 24px | 400 — usado 55 veces
- Inter | 14px | 20px | 600 — usado 18 veces
- Inter | 48px | 56px | 700 — usado 1 vez

### Escala de espaciado
- 8px — usado 20 veces
- 16px — usado 28 veces
- 24px — usado 12 veces
- 32px — usado 8 veces

### Radios
- 8px — usado 14 veces
- 12px — usado 8 veces

### Componentes detectados
- Botones: 16
- Enlaces: 42
- Inputs: 5
- Formularios: 1
- Tarjetas: 6
- Alerts/regiones live: 0
- Landmarks de navegación: 2
- Imágenes: 9

## 2. Lente de fricción conductual / UX

### Acciones primarias compitiendo por encima del primer pliegue
Severidad: alta  
Confianza: media  
Principio: claridad de decisión

Insight: Se detectan 3 acciones visualmente prominentes en el viewport inicial.

Riesgo: La claridad de decisión baja cuando varios elementos compiten por el mismo rol conductual.

Recomendación: Mantener una única acción primaria por bloque de decisión y degradar visualmente las acciones secundarias.

Implicación de sistema de diseño: Revisar variantes de jerarquía de botones y documentar cuándo usar acciones primarias, secundarias y terciarias.

## 3. Guía de implementación para desarrollo / IA

Al modificar esta pantalla:

- Preserva el ritmo dominante de espaciado antes de introducir nuevos valores.
- Reutiliza colores y radios existentes salvo que se añada intencionadamente un token semántico nuevo.
- Mantén una acción primaria por bloque de decisión.
- No dependas solo de placeholders para guiar formularios.
- Los mensajes de error deberían explicar causa y acción de recuperación.
- No introduzcas valores visuales puntuales sin mapearlos a un token.
