import { buildContexticReport, buildJsonExport as buildContexticJsonExport } from './contextic-report.js';

export function buildDesignContextMarkdown(snapshot) {
  const { meta, colors, typography, spacing, components, frictions, behavioralMapping, behavioralRecommendation } = snapshot;
  const report = buildContexticReport(snapshot);

  return `# Briefing técnico de diseño — Contextic

Capturado desde: ${report.meta.sourceUrl}
Título: ${report.screenSummary.pageTitle || 'Sin título'}
Generado en: ${report.meta.generatedAt}
Viewport: ${meta.viewport.width}x${meta.viewport.height}

## 1. Diagnóstico ejecutivo

### Tipo de pantalla
- Tipo detectado: ${formatReportValue(report.screenSummary.detectedScreenType)}
- Objetivo principal probable: ${formatReportValue(report.screenSummary.probableBusinessGoal)}
- Acción de conversión principal: ${formatReportValue(report.screenSummary.primaryConversionAction)}
- Nivel de madurez de la pantalla: ${inferMaturity(behavioralMapping)}
- Riesgo principal de conversión: ${formatReportValue(report.screenSummary.mainConversionRisk)}

### Lectura estratégica
${buildStrategicReading(frictions, behavioralMapping)}

---

## 2. Inventario técnico visual

### Tokens detectados
| Token | Valor observado | Uso | Consistencia | Riesgo |
|---|---:|---|---|---|
${buildTokenRows(colors, typography, spacing)}

### Patrones UI detectados
${buildPatternList(components, behavioralMapping)}

### Componentes detectados
- Botones: ${components.counts.buttons}
- Enlaces: ${components.counts.links}
- Inputs: ${components.counts.inputs}
- Formularios: ${components.counts.forms}
- Tarjetas: ${components.counts.cards}
- Alerts/regiones live: ${components.counts.alerts}
- Landmarks de navegación: ${components.counts.navigation}
- Imágenes: ${components.counts.images}

---

## 3. Mapa behavioral de la pantalla actual

| Bloque | Presente | Calidad | Evidencia | Fricción detectada | Severidad |
|---|---|---:|---|---|---:|
${behavioralMapping.map(formatBehavioralMapRow).join('\n')}

---

## 4. Fricciones UX priorizadas

${frictions.length ? frictions.map((friction, index) => formatFriction(friction, index + 1)).join('\n\n') : '- No se detectan fricciones heurísticas relevantes. Revisa manualmente antes de tomar decisiones de producto.'}

---

## 5. Propuesta de estructura behavioral recomendada

### Orden recomendado de bloques
${behavioralRecommendation.recommendedOrder.map((block, index) => `${index + 1}. ${block}`).join('\n')}

> Ajusta el orden solo si la pantalla, el producto o el funnel lo justifican. Explica siempre el trade-off.

### Sección propuesta por bloque

${behavioralRecommendation.sections.map(formatRecommendedSection).join('\n\n')}

---

## 6. Reglas de implementación

### Componentización recomendada
- Componentes base: Button, Link, Form field, Card, Section, Alert.
- Componentes compuestos: Hero, CTA group, Benefits list, FAQ, Trust bar, Stepper, CTA band.
- Variantes necesarias: primario, secundario, terciario, destructivo si aplica, disabled, loading, error y success.
- Props mínimas: label, href/action, variant, size, icon, disabledReason, ariaLabel, helperText, errorText.
- Estados: default, hover, focus, active, loading, disabled, success, error.
- Breakpoints: revisar jerarquía de CTA y legibilidad en mobile.
- Accesibilidad: contraste, focus visible, labels, orden semántico y mensajes de recuperación.

### Governance de design system
- Qué debe convertirse en patrón reutilizable: acciones, formularios, cards repetidas, FAQ, bloques de confianza y CTA contextual.
- Qué debe mantenerse específico de la landing: claims de campaña, ilustraciones únicas y contenido temporal.
- Qué naming usar: tokens semánticos por intención, no por apariencia puntual.
- Qué tokens faltan: revisar color, spacing, radius y estados si aparecen valores no mapeados.
- Qué inconsistencias deben corregirse: cualquier divergencia que afecte jerarquía, confianza o accionabilidad.

---

## 7. Priorización

| Prioridad | Cambio | Fricción resuelta | Impacto esperado | Esfuerzo | Dependencias |
|---:|---|---|---|---|---|
${buildPrioritizationRows(frictions, behavioralMapping)}

---

## 8. Métricas recomendadas

- CTR del CTA principal.
- Scroll depth por bloque behavioral.
- Ratio de interacción con prueba social.
- Inicio de formulario.
- Finalización de formulario.
- Clicks en CTA secundarios.
- Tiempo hasta primer CTA click.
- Drop-off por sección.
- Ratio de usuarios que llegan a bloques de objeción.
- Conversión final.

---

## 9. Resumen accionable

### Lo que funciona
${buildWhatWorks(behavioralMapping)}

### Lo que bloquea la conversión
${buildWhatBlocks(frictions, behavioralMapping)}

### Cambios mínimos de mayor impacto
${buildMinimumChanges(frictions, behavioralMapping)}

### Siguiente experimento recomendado
${buildNextExperiment(frictions, behavioralMapping)}
`;
}

export function buildJsonExport(snapshot) {
  return buildContexticJsonExport(snapshot);
}

export function buildGitHubIssueMarkdown(snapshot) {
  const { meta, frictions, spacing, colors, components, behavioralMapping } = snapshot;
  const topFrictions = frictions.slice(0, 5);

  return `# Deuda UI/UX detectada por Contextic

URL: ${meta.url}

## Problema
Esta pantalla muestra posible deuda de sistema de diseño, consistencia UX y estructura behavioral que debería revisarse antes de implementar nuevos cambios.

## Evidencia
- ${colors.totalUniqueColors} valores únicos de color detectados.
- ${spacing.totalUniqueSpacingValues} valores únicos de espaciado detectados.
- ${spacing.totalUniqueRadiusValues} valores únicos de radio detectados.
- ${components.counts.buttons} botones/acciones detectados.
- ${components.samples.unlabeledInputs.length} input(s) sin etiqueta accesible clara.
- Bloques behavioral débiles: ${behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).map(block => block.label).join(', ') || 'ninguno detectado por heurística'}.

${topFrictions.length ? `## Hallazgos priorizados\n\n${topFrictions.map((friction, index) => formatFriction(friction, index + 1)).join('\n\n')}` : '## Hallazgos priorizados\n\nNo se detectan hallazgos heurísticos relevantes. Se recomienda revisión manual.'}

## Solución sugerida
Normalizar valores visuales alrededor del sistema existente, aclarar la jerarquía de acciones y reforzar la estructura behavioral What → Why → Why not → Who → How → Where → When según la evidencia real de la pantalla.

## Criterios de aceptación
- [ ] La propuesta de valor responde qué es y qué gana el usuario.
- [ ] Hay una única acción primaria por bloque de decisión.
- [ ] Los bloques de objeción reducen riesgo sin inventar garantías, urgencia ni prueba social.
- [ ] Botones, inputs y tarjetas usan variantes y tokens gobernados.
- [ ] Los inputs incluyen etiqueta, ayuda y estado de error cuando sea relevante.
- [ ] Cada recomendación incluye evidencia, fricción resuelta, componente/patrón y métrica.
`;
}

export function buildTokensSnapshot(snapshot) {
  const { colors, typography, spacing, behavioralMapping, frictions } = snapshot;
  return {
    generadoEn: snapshot.meta.generatedAt,
    fuente: snapshot.meta.url,
    colores: colors.colors.map(color => ({
      valor: color.value,
      recuento: color.count,
      rolSugerido: color.suggestedRole
    })),
    tipografia: typography.typeStyles.map(item => ({ valor: item.value, recuento: item.count })),
    espaciado: spacing.spacingScale.map(item => ({ valor: item.value, recuento: item.count })),
    radios: spacing.radii.map(item => ({ valor: item.value, recuento: item.count })),
    sombras: spacing.shadows.map(item => ({ valor: item.value, recuento: item.count })),
    bordes: spacing.borders.map(item => ({ valor: item.value, recuento: item.count })),
    behavioral: {
      bloques: behavioralMapping.map(block => ({
        bloque: block.block,
        presente: block.present,
        calidad: block.quality,
        evidencia: block.evidence,
        faltante: block.missing,
        friccion: block.detectedFriction,
        severidad: block.severity
      })),
      fricciones: frictions.map(friction => ({
        regla: friction.ruleId || '',
        prioridad: friction.priority,
        score: friction.priorityScore,
        bloque: friction.block,
        tipo: friction.type,
        severidad: friction.severityScore,
        confianza: friction.confidence,
        hipotesis: friction.hypothesis || '',
        evidencia: friction.evidence,
        recomendacion: friction.recommendation,
        metrica: friction.metric || ''
      }))
    }
  };
}

function formatBehavioralMapRow(block) {
  return `| ${block.label} | ${block.present} | ${block.quality} | ${escapePipes(block.evidence.slice(0, 2).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing[0] || 'Sin fricción clara')} | ${block.severity} |`;
}

function formatFriction(friction, index) {
  return `### Fricción #${index}: ${friction.title}
- Prioridad: ${friction.priority} · score ${friction.priorityScore}
- Tipo: ${friction.typeLabel || friction.type}
- Bloque afectado: ${friction.block || 'sin bloque'}
- Hipótesis: ${friction.hypothesis || friction.insight || 'Hallazgo heurístico que requiere validación de producto/diseño.'}
- Evidencia observada: ${friction.evidence || friction.insight}
- Tipo de evidencia: ${friction.evidenceType || 'inference'}
- Causa probable: ${friction.insight}
- Impacto en conversión: ${friction.risk}
- Principio behavioral afectado: ${friction.principle || 'revisión heurística'}
- Severidad: ${friction.severityScore} / 5
- Confianza del diagnóstico: ${friction.confidence || 'media'}
- Recomendación: ${friction.recommendation}
- Patrón UI recomendado: ${friction.recommendedPattern || friction.systemImplication || 'Revisar patrón correspondiente en sistema de diseño.'}
- Implicación de sistema de diseño: ${friction.systemImplication || 'Revisar patrón correspondiente en sistema de diseño.'}
- Métrica asociada: ${friction.metric || 'Conversión final'}
- Complejidad de implementación: ${translateEffort(friction.implementationEffort)}`;
}

function formatRecommendedSection(section) {
  return `#### ${section.sectionName}
- Objetivo: ${section.objective}
- Pregunta que responde: ${section.userQuestionAnswered}
- Fricción que resuelve: ${section.primaryFrictionResolved}
- Principios behavioral: ${section.behavioralPrinciples.join(', ')}
- Componentes recomendados: ${section.recommendedComponents.join(', ')}
- Contenido necesario: ${section.contentRequirements.join('; ')}
- Copy guidance: ${section.copyRules.join('; ')}
- Reglas de implementación: ${section.implementationRules.join('; ')}
- Accesibilidad: ${section.accessibilityRules.join('; ')}
- Riesgos: ${section.risks.join('; ')}
- Métrica asociada: ${section.metrics[0] || 'Conversión final'}
- Prioridad: ${section.priority}`;
}

function buildTokenRows(colors, typography, spacing) {
  const rows = [];
  const primaryColor = colors.colors[0];
  const secondaryColor = colors.colors[1];
  const type = typography.typeStyles[0];
  const space = spacing.spacingScale[0];
  const radius = spacing.radii[0];
  const shadow = spacing.shadows[0];
  const border = spacing.borders[0];

  rows.push(`| Color primario | ${primaryColor?.value || 'No detectado'} | ${primaryColor?.suggestedRole || 'CTA / énfasis'} | ${colors.totalUniqueColors <= 12 ? 'Alta' : colors.totalUniqueColors <= 28 ? 'Media' : 'Baja'} | ${colors.totalUniqueColors > 28 ? 'Deriva de color' : 'Sin riesgo alto'} |`);
  rows.push(`| Color secundario | ${secondaryColor?.value || 'No detectado'} | Superficie / apoyo | Media | Validar contraste |`);
  rows.push(`| Tipografía | ${type?.value || 'No detectada'} | Headings / body | ${typography.totalUniqueTypeStyles <= 8 ? 'Alta' : 'Media'} | Revisar jerarquía |`);
  rows.push(`| Espaciado | ${space?.value || 'No detectado'} | Secciones / cards | ${spacing.totalUniqueSpacingValues <= 18 ? 'Media' : 'Baja'} | ${spacing.totalUniqueSpacingValues > 18 ? 'Escala fragmentada' : 'Sin riesgo alto'} |`);
  rows.push(`| Radius | ${radius?.value || 'No detectado'} | Cards / buttons | ${spacing.totalUniqueRadiusValues <= 5 ? 'Media' : 'Baja'} | ${spacing.totalUniqueRadiusValues > 5 ? 'Inconsistencia de componentes' : 'Sin riesgo alto'} |`);
  rows.push(`| Sombra | ${shadow?.value || 'No detectada'} | Elevación | Media | Validar uso semántico |`);
  rows.push(`| Borde | ${border?.value || 'No detectado'} | Separación / estados | Media | Validar contraste |`);
  return rows.join('\n');
}

function buildPatternList(components, behavioralMapping) {
  const patterns = [];
  if (behavioralMapping.find(block => block.block === 'what')?.present !== 'no') patterns.push('- Hero');
  if (components.counts.navigation) patterns.push('- Header / navegación');
  if (components.counts.buttons) patterns.push('- CTA primario / grupo de acciones');
  if (components.counts.cards >= 3) patterns.push('- Cards de beneficios o features');
  if (components.counts.forms) patterns.push('- Formulario');
  if (behavioralMapping.find(block => block.block === 'why_not')?.present !== 'no') patterns.push('- FAQ / confianza / reducción de riesgo');
  return patterns.join('\n') || '- No se detectan patrones UI suficientes por heurística.';
}

function buildPrioritizationRows(frictions, behavioralMapping) {
  const rows = frictions.slice(0, 6).map(friction => `| ${friction.priority} | ${escapePipes(friction.recommendation)} | ${friction.typeLabel || friction.type} | ${translateImpact(friction.expectedImpact)} | ${translateEffort(friction.implementationEffort)} | ${escapePipes(friction.systemImplication || 'Revisión de sistema de diseño')} |`);
  if (rows.length) return rows.join('\n');

  return behavioralMapping
    .filter(block => block.present !== 'sí')
    .slice(0, 4)
    .map(block => `| ${block.block === 'what' || block.block === 'where' ? 'P0' : 'P1'} | Reforzar ${block.label} | ${escapePipes(block.frictionType)} | Medio | Medio | Contenido + patrón UI |`)
    .join('\n') || '| P2 | Revisión manual | Validación heurística | Bajo | Bajo | Ninguna |';
}

function formatReportValue(value) {
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value || 'unknown';
}

function inferScreenType(components, behavioralMapping) {
  if (components.counts.forms > 0 && behavioralMapping.some(block => block.block === 'where' && block.present !== 'no')) return 'Landing con formulario o captación';
  if (components.counts.buttons > 0) return 'Landing / pantalla transaccional';
  return 'Pantalla informativa';
}

function inferMaturity(behavioralMapping) {
  const average = behavioralMapping.reduce((sum, block) => sum + block.quality, 0) / Math.max(behavioralMapping.length, 1);
  if (average >= 4) return 'Alta';
  if (average >= 2.8) return 'Media';
  return 'Baja';
}

function getPrimaryActionLabel(components) {
  const first = components.samples.buttons.find(button => button.text);
  return first ? `“${first.text}”` : 'No detectada por heurística';
}

function getMainConversionRisk(frictions, behavioralMapping) {
  if (frictions[0]) return frictions[0].title;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Bloque ${weak.label} débil o ausente` : 'No detectado por heurística';
}

function buildStrategicReading(frictions, behavioralMapping) {
  const weakBlocks = behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).map(block => block.label);
  const top = frictions[0];
  if (top) {
    return `La pantalla parece necesitar refuerzo en ${weakBlocks.slice(0, 3).join(', ') || 'su estructura behavioral'}. El principal riesgo detectado es “${top.title}”, que afecta a ${top.typeLabel || top.type}. Trata esta salida como hipótesis basada en DOM/CSS visible y valida con datos reales de comportamiento.`;
  }
  return `La pantalla no muestra fricciones heurísticas fuertes, pero hay que validar manualmente la claridad de What, Why not y Where. Esta lectura separa observación técnica de recomendación para evitar conclusiones no evidenciadas.`;
}

function buildWhatWorks(behavioralMapping) {
  const strong = behavioralMapping.filter(block => block.present === 'sí' && block.quality >= 4).map(block => `- ${block.label}: ${block.evidence[0] || 'bloque presente con señales suficientes'}`);
  return strong.join('\n') || '- No hay suficientes señales fuertes; conviene validar manualmente.';
}

function buildWhatBlocks(frictions, behavioralMapping) {
  const top = frictions.slice(0, 3).map(friction => `- ${friction.priority}: ${friction.title}`);
  if (top.length) return top.join('\n');
  const weak = behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).map(block => `- ${block.label}: ${block.missing[0] || 'bloque débil'}`);
  return weak.join('\n') || '- No se detectan bloqueos heurísticos relevantes.';
}

function buildMinimumChanges(frictions, behavioralMapping) {
  const top = frictions.filter(friction => friction.priority === 'P0' || friction.priority === 'P1').slice(0, 3).map(friction => `- ${friction.recommendation}`);
  if (top.length) return top.join('\n');
  return behavioralMapping.filter(block => block.present !== 'sí').slice(0, 3).map(block => `- ${block.recommendation}`).join('\n') || '- Mantener estructura y medir antes de rediseñar.';
}

function buildNextExperiment(frictions, behavioralMapping) {
  const top = frictions[0];
  if (top) return `Probar una variante que resuelva “${top.title}” y medir ${getMetricForBlock(top.block, behavioralMapping)} frente a la versión actual.`;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Probar una variante que refuerce ${weak.label} y medir ${weak.metrics[0] || 'conversión final'}.` : 'Mantener la versión actual y usar el briefing como baseline para futuras iteraciones.';
}

function getMetricForBlock(block, behavioralMapping) {
  return behavioralMapping.find(item => item.block === block)?.metrics[0] || 'conversión final';
}

function translateImpact(value) {
  return { low: 'Bajo', medium: 'Medio', high: 'Alto' }[value] || 'Medio';
}

function translateEffort(value) {
  return { low: 'Baja', medium: 'Media', high: 'Alta' }[value] || 'Media';
}

function escapePipes(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
