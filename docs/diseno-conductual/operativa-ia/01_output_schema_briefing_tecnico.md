# Output schema — Briefing técnico de diseño

Usa esta estructura para analizar cualquier pantalla web.

```markdown
# Briefing técnico de diseño — Landing Page

## 1. Diagnóstico ejecutivo

### Tipo de pantalla
- Tipo detectado:
- Objetivo principal probable:
- Acción de conversión principal:
- Nivel de madurez de la landing:
- Riesgo principal de conversión:

### Lectura estratégica
Resume en 3-5 líneas qué intenta conseguir la pantalla y dónde está su mayor debilidad conductual.

---

## 2. Inventario técnico visual

### Tokens detectados
| Token | Valor observado | Uso | Consistencia | Riesgo |
|---|---:|---|---|---|
| Color primario | | CTA / énfasis | Alta / Media / Baja | |
| Color secundario | | | | |
| Tipografía | | Headings / body | | |
| Espaciado | | Secciones / cards | | |
| Radius | | Cards / buttons | | |
| Sombra | | Elevación | | |
| Iconografía | | Beneficios / navegación | | |

### Patrones UI detectados
- Hero
- Header / navegación
- CTA primario
- CTA secundario
- Benefits list
- Social proof
- Testimonials
- Feature cards
- Pricing
- FAQ
- Formulario
- Footer
- Sticky CTA
- Otros:

### Componentes detectados
Para cada componente:
- Nombre:
- Rol funcional:
- Estado visible:
- Variante:
- Props inferidas:
- Riesgos de accesibilidad:
- Reutilización potencial:
- Dependencias de contenido:

---

## 3. Mapa behavioral de la pantalla actual

| Bloque | Presente | Calidad | Evidencia | Fricción detectada | Severidad |
|---|---|---:|---|---|---:|
| What | Sí/No/Parcial | 1-5 | | | |
| Why | Sí/No/Parcial | 1-5 | | | |
| Why not | Sí/No/Parcial | 1-5 | | | |
| Who | Sí/No/Parcial | 1-5 | | | |
| How | Sí/No/Parcial | 1-5 | | | |
| Where | Sí/No/Parcial | 1-5 | | | |
| When | Sí/No/Parcial | 1-5 | | | |

---

## 4. Fricciones UX priorizadas

Para cada fricción:

### Fricción #[n]
- Tipo: Ambigüedad / Motivación / Riesgo / Identificación / Esfuerzo / Accionabilidad / Procrastinación
- Evidencia observada:
- Causa probable:
- Impacto en conversión:
- Principio behavioral afectado:
- Severidad: 1-5
- Confianza del diagnóstico: Alta / Media / Baja
- Recomendación:
- Patrón UI recomendado:
- Complejidad de implementación: Baja / Media / Alta

---

## 5. Propuesta de estructura behavioral recomendada

### Orden recomendado de bloques
1. What
2. Why
3. Why not
4. Who
5. How
6. Where
7. When

> Ajusta el orden solo si la pantalla, el producto o el funnel lo justifican. Explica siempre el trade-off.

### Sección propuesta por bloque
Para cada bloque:
- Objetivo del bloque:
- Fricción que resuelve:
- Principio behavioral principal:
- Contenido necesario:
- Componentes recomendados:
- Copy guidance:
- Estados o variantes:
- Riesgos:
- Métrica asociada:

---

## 6. Reglas de implementación

### Componentización recomendada
- Componentes base:
- Componentes compuestos:
- Variantes necesarias:
- Props mínimas:
- Estados:
- Breakpoints:
- Accesibilidad:

### Governance de design system
- Qué debe convertirse en patrón reutilizable:
- Qué debe mantenerse específico de la landing:
- Qué naming usar:
- Qué tokens faltan:
- Qué inconsistencias deben corregirse:

---

## 7. Priorización

| Prioridad | Cambio | Fricción resuelta | Impacto esperado | Esfuerzo | Dependencias |
|---:|---|---|---|---|---|
| P0 | | | Alto/Medio/Bajo | Bajo/Medio/Alto | |
| P1 | | | | | |
| P2 | | | | | |

---

## 8. Métricas recomendadas

- CTR del CTA principal
- Scroll depth por bloque
- Ratio de interacción con prueba social
- Inicio de formulario
- Finalización de formulario
- Clicks en CTA secundarios
- Tiempo hasta primer CTA click
- Drop-off por sección
- Ratio de usuarios que llegan a bloques de objeción
- Conversión final

---

## 9. Resumen accionable

### Lo que funciona
-

### Lo que bloquea la conversión
-

### Cambios mínimos de mayor impacto
-

### Siguiente experimento recomendado
-
```
