import { buildContexticReport } from './contextic-report.js';
import { groupFindings } from './findings-prioritization.js';
import { generateHypotheses, generateReviewTasks } from './hypotheses.js';
import { behavioralBlockDisplayLabel } from './behavioral-model.js';

export function buildDesignContextMarkdown(snapshot) {
  const meta = snapshot.meta || {};
  const colors = snapshot.colors || {};
  const typography = snapshot.typography || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const behavioralMapping = snapshot.behavioralMapping || [];
  const report = buildContexticReport(snapshot);
  const pageClassification = report.pageClassification || {};
  const scopeMap = report.scopeMap || {};
  const findings = report.findings || [];
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = report.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping });
  const findingGroups = groupFindings(findings);
  const lowConfidenceFindings = findings.filter(finding => finding.confidence === 'low' || finding.priority === 'Review');
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';

  return `# design-context.md — Contextic

## Metadatos de captura

- URL fuente: ${report.meta.sourceUrl}
- Título de página: ${report.screenSummary.pageTitle || 'Sin título'}
- Generado en: ${report.meta.generatedAt}
- Viewport: ${meta.viewport?.width || 'unknown'}x${meta.viewport?.height || 'unknown'}
- Política de evidencia: la evidencia observada viene del DOM/CSS visible y regiones acotadas. Las inferencias se marcan con confianza y deben validarse antes de implementar.

## Clasificación de página

- Arquetipo: ${pageClassification.archetype || 'unknown'}
- Confianza: ${pageClassification.confidence || 'low'}
- Modo de análisis: ${pageClassification.analysisMode || 'snapshot_only'}
- Alcance behavioral: ${behavioralScopeNote(pageClassification)}
- Señales: ${(pageClassification.signals || []).join('; ') || 'No hay señales suficientes.'}
- Nota de inferencia: ${confidenceNote(pageClassification.confidence, 'La clasificación de página es heurística y no debe tratarse como verdad absoluta.')}

## Mapa de alcance

### Regiones detectadas
${buildScopeRegionList(scopeMap.regions)}

### Usado para behavioral
${buildBehavioralScopeList(scopeMap.usedForBehavioral)}

### Excluido de behavioral
${buildScopeExclusionList(scopeMap.excludedFromBehavioral)}

## Resumen ejecutivo

${buildExecutiveSummary({ findings, findingGroups, hypotheses, reviewTasks, behavioralMapping, pageClassification })}

## Snapshot de sistema de diseño

### Colores detectados por frecuencia
| Color | Recuento | Rol inferido | Confianza | Uso observado | Razón del rol |
|---|---:|---|---|---|---|
${buildColorRows(colors)}

### Tipografía detectada
| Familia | Tamaño | Interlínea | Peso | Recuento | Uso probable |
|---|---:|---:|---:|---:|---|
${buildTypographyRows(typography)}

### Espaciado, radios, sombras y bordes
| Grupo de tokens | Valores recurrentes | Notas |
|---|---|---|
${buildDesignSystemTokenRows(spacing)}

### Variables CSS detectadas
${buildCssVariableList(colors.cssVariables || [])}

### Ruido visual de sistema/oculto
${buildSystemHiddenVisualNoise({ colors, typography, components })}

## Inventario de componentes

| Candidato de componente | Instancias | Variantes inferidas | Estados recomendados | Riesgo accesibilidad | Recomendación DS |
|---|---:|---|---|---|---|
${buildComponentInventoryRows(components)}

### Patrones UI observados
${buildPatternList(components, behavioralMapping)}

## Evaluación behavioral

${buildBehavioralAssessment({ fullBehavioral, behavioralMapping, pageClassification })}

## Hallazgos UX

${fullBehavioral
  ? buildFindingList(findingGroups.ux.filter(finding => finding.confidence !== 'low' && finding.priority !== 'Review'))
  : '- Análisis behavioral limitado o desactivado por clasificación de página. No se generan recomendaciones de conversión con la matriz actual para este arquetipo.'}

## Hallazgos de sistema de diseño

${buildFindingList(findingGroups.designSystem)}

## Hallazgos de accesibilidad

${buildFindingList(findingGroups.accessibility)}

## Hallazgos de baja confianza

${buildFindingList(lowConfidenceFindings)}

## Tareas de revisión

${buildReviewTasks(reviewTasks)}

## Hipótesis y experimentos

${buildHypothesisCards(hypotheses)}

## Guía de implementación

${buildImplementationGuidance(snapshot).filter(item => fullBehavioral || !isConversionGuidance(item)).map(item => `- ${item}`).join('\n')}

## Métricas recomendadas

${buildRecommendedMetrics(hypotheses, pageClassification)}

## Handoff summary

### Qué funciona
${buildWhatWorks(behavioralMapping)}

### Riesgos de alta confianza
${buildHighConfidenceRisks(findings)}

### Elementos de revisión manual
${buildManualReviewSummary(reviewTasks)}

### Tarea principal de revisión
${buildTopReviewTask(reviewTasks)}

### Deuda de sistema de diseño
${buildDesignSystemDebtSummary(findingGroups.designSystem)}

${buildTopHypothesisSection(hypotheses, behavioralMapping)}
`;
}

export function buildJsonExport(snapshot) {
  return JSON.stringify(buildContexticReport(snapshot), null, 2);
}

export function buildGithubIssueExport(input = {}) {
  const snapshot = looksLikeReport(input) ? {} : input;
  const report = looksLikeReport(input) ? input : buildContexticReport(snapshot);
  const pageClassification = report.pageClassification || {};
  const scopeMap = report.scopeMap || {};
  const findings = report.findings || [];
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping: Object.values(report.behavioralMapping || {}) });
  const reviewTasks = report.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping: Object.values(report.behavioralMapping || {}) });
  const groups = groupFindings(findings);
  const weakBlocks = Object.values(report.behavioralMapping || {}).filter(block => block.present === 'no' || block.quality <= 2);
  const title = `[Contextic] Revisar hallazgos ${pageClassification.archetype || 'unknown'} para ${report.screenSummary?.pageTitle || 'página sin título'}`;

return `# ${title}

## Contexto
- URL: ${report.meta?.sourceUrl || 'unknown'}
- Viewport: ${formatViewport(snapshot.meta?.viewport)}
- Arquetipo de página: ${pageClassification.archetype || 'unknown'} (${pageClassification.confidence || 'low'} confianza)
- Modo de análisis: ${pageClassification.analysisMode || 'snapshot_only'}
- Generado en: ${report.meta?.generatedAt || 'unknown'}
${pageClassification.analysisMode === 'snapshot_only' ? '- Nota: el modo de análisis es snapshot_only; no se generan recomendaciones de conversión con el modelo behavioral actual.' : ''}

## Resumen
- Fricciones UX: ${groups.ux.length}
- Bloques a revisar: ${weakBlocks.length}${weakBlocks.length ? ` (${weakBlocks.map(block => blockLabel(block)).join(', ')})` : ''}
- Riesgos DS: ${groups.designSystem.length}
- Elementos de revisión manual: ${groups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length}

## Hallazgos principales
${buildGithubTopFindings(findings)}

## Hipótesis
${buildGithubHypotheses(hypotheses)}

## Tareas de revisión
${buildGithubReviewTasks(reviewTasks)}

## Notas de implementación
- Componentes afectados: ${githubComponentsAffected(report.detectedComponents || [])}
- Tokens afectados: ${githubTokensAffected(report.detectedTokens || {}, findings)}
- Checks de accesibilidad: ${githubAccessibilityChecks(report.detectedComponents || [], groups.accessibility)}
- Alcance behavioral: usado ${formatList(scopeMap.usedForBehavioral)}; excluido ${formatList((scopeMap.excludedFromBehavioral || []).map(item => item.region))}

## Criterios de aceptación
- [ ] Hallazgos revisados
- [ ] Jerarquía de CTA validada
- [ ] Roles de color validados
- [ ] Alcance behavioral revisado
- [ ] Métricas/instrumentación confirmadas

## Exports raw
- design-context.md disponible desde Contextic
- JSON disponible desde Contextic
`;
}

export function buildGitHubIssueMarkdown(snapshot) {
  return buildGithubIssueExport(snapshot);
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
        displayLabel: block.displayLabel || behavioralBlockDisplayLabel(block.block),
        presente: block.present,
        calidad: block.quality,
        confianza: block.confidence || 'unknown',
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

function buildColorRows(colors = {}) {
  const rows = (colors.colors || []).slice(0, 12).map(color => {
    const observedUse = color.sample ? `${color.sample.property} en ${color.sample.selector}` : 'desconocido';
    const confidence = color.roleConfidence || roleConfidenceFromName(color.suggestedRole);
    const reason = color.roleReason || (confidence === 'low' || confidence === 'unknown' ? 'Confianza baja: evidencia contextual insuficiente.' : 'Rol inferido desde el uso del color.');
    return `| ${color.value} | ${color.count} | ${color.suggestedRole || 'unknown'} | ${confidence} | ${escapePipes(observedUse)} | ${escapePipes(translateRoleReason(reason))} |`;
  });

  return rows.join('\n') || '| unknown | 0 | unknown | unknown | Sin evidencia de color detectada | Confianza baja: sin contexto de uso. |';
}

function buildTypographyRows(typography = {}) {
  const rows = (typography.typeStyles || []).slice(0, 10).map(style => {
    const parsed = parseTypeStyle(style.value);
    return `| ${escapePipes(parsed.fontFamily)} | ${parsed.fontSize} | ${parsed.lineHeight} | ${parsed.weight} | ${style.count} | ${inferTypographyUse(parsed)} |`;
  });

  return rows.join('\n') || '| unknown | unknown | unknown | unknown | 0 | Sin evidencia tipográfica detectada |';
}

function buildDesignSystemTokenRows(spacing = {}) {
  const spacingValues = formatTokenValues(spacing.spacingScale, 10);
  const radiusValues = formatTokenValues(spacing.radii, 8);
  const shadowValues = formatTokenValues(spacing.shadows, 4);
  const borderValues = formatTokenValues(spacing.borders, 6);

  return [
    `| Espaciado | ${spacingValues} | ${spacing.totalUniqueSpacingValues ? `${spacing.totalUniqueSpacingValues} valores únicos de espaciado detectados.` : 'unknown'} |`,
    `| Radios | ${radiusValues} | ${spacing.totalUniqueRadiusValues ? `${spacing.totalUniqueRadiusValues} valores únicos de radio detectados.` : 'unknown'} |`,
    `| Sombras | ${shadowValues} | Mantener la elevación existente antes de añadir sombras nuevas. |`,
    `| Bordes | ${borderValues} | Reutilizar anchos/estilos de borde detectados antes de añadir nuevos. |`
  ].join('\n');
}

function buildCssVariableList(cssVariables = []) {
  if (!cssVariables.length) return '- No se detectaron variables CSS en los estilos computados de root.';

  return [
    '| Variable | Valor | Uso |',
    '|---|---|---|',
    ...cssVariables.slice(0, 16).map(variable => `| ${escapePipes(variable.name)} | ${escapePipes(variable.value)} | ${escapePipes(translateUsageStatus(variable.usageStatus || 'unknown usage'))} |`)
  ].join('\n');
}

function buildSystemHiddenVisualNoise({ colors = {}, typography = {}, components = {} } = {}) {
  const lines = [];
  const noisyColors = colors.systemHiddenVisualNoise || [];
  const noisyType = typography.systemHiddenVisualNoise || [];
  const noisyComponents = Object.entries(components.systemHiddenComponents || {}).filter(([, value]) => count(value) > 0);

  if (noisyColors.length) lines.push(`- Colores usados sobre todo en contextos de sistema/ocultos: ${noisyColors.slice(0, 5).map(item => `${item.value} (${item.count})`).join(', ')}.`);
  if (noisyType.length) lines.push(`- Estilos tipográficos usados sobre todo en contextos de sistema/ocultos: ${noisyType.slice(0, 3).map(item => `${item.value} (${item.count})`).join(', ')}.`);
  if (noisyComponents.length) lines.push(`- Componentes excluidos del inventario principal: ${noisyComponents.map(([name, value]) => `${name} ${value}`).join(', ')}.`);

  return lines.join('\n') || '- Ningún ruido visual de sistema/oculto domina el snapshot visible.';
}

function buildComponentInventoryRows(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  const componentRows = [
    componentInventoryRow('Button', count(counts.buttons), inferButtonVariants(samples), interactiveStates('button'), buttonAccessibilityRisk(components), recommendComponent(count(counts.buttons), buttonAccessibilityRisk(components), 2)),
    componentInventoryRow('Link', count(counts.links), inferLinkVariants(samples), interactiveStates('link'), linkAccessibilityRisk(components), recommendComponent(count(counts.links), linkAccessibilityRisk(components), 4)),
    componentInventoryRow('Form field', count(counts.inputs), inferFormFieldVariants(components), interactiveStates('formField'), formFieldAccessibilityRisk(components), recommendComponent(count(counts.inputs), formFieldAccessibilityRisk(components), 2)),
    componentInventoryRow('Card', count(counts.cards), count(counts.cards) ? 'variantes de layout/contenido desconocidas' : 'no detectado', 'default', 'unknown', recommendComponent(count(counts.cards), 'unknown', 3)),
    componentInventoryRow('Alert', count(counts.alerts), count(counts.alerts) ? 'candidato a mensaje de estado' : 'no detectado', 'default, error, success, warning, info', count(counts.alerts) ? 'verificar role y live region' : 'unknown', recommendComponent(count(counts.alerts), 'unknown', 2)),
    componentInventoryRow('Badge', count(counts.badges), count(counts.badges) ? 'candidato a label/estado' : 'no detectado', 'default', 'verificar contraste en tamaños pequeños', recommendComponent(count(counts.badges), 'verificar contraste en tamaños pequeños', 3)),
    componentInventoryRow('Navigation', count(counts.navigation), count(counts.navigation) ? 'candidato a landmark/navegación' : 'no detectado', 'default, hover, focus, current', count(counts.navigation) ? 'verificar landmarks, estado actual y orden de foco' : 'unknown', recommendComponent(count(counts.navigation), 'unknown', 1)),
    componentInventoryRow('Modal/Dialog', count(counts.dialogs), count(counts.dialogs) ? 'candidato a diálogo' : 'no detectado', 'default, focus-trapped, closing, loading, error', count(counts.dialogs) ? 'verificar focus trap, escape y aria-modal' : 'unknown', recommendComponent(count(counts.dialogs), 'verificar focus trap, escape y aria-modal', 1)),
    componentInventoryRow('Form', count(counts.forms), count(counts.forms) ? 'candidato a flujo de envío' : 'no detectado', 'default, validating, loading, disabled, error, success', formAccessibilityRisk(components), recommendComponent(count(counts.forms), formAccessibilityRisk(components), 1)),
    componentInventoryRow('CTA group', count(counts.ctaGroups), inferCtaGroupVariants(components), interactiveStates('button'), ctaGroupAccessibilityRisk(components), recommendComponent(count(counts.ctaGroups), ctaGroupAccessibilityRisk(components), 1))
  ];

  return componentRows.join('\n');
}

function componentInventoryRow(name, instances, variants, states, risk, recommendation) {
  return `| ${name} | ${instances} | ${escapePipes(variants)} | ${escapePipes(states)} | ${escapePipes(risk)} | ${recommendation} |`;
}

function buildImplementationGuidance(snapshot = {}) {
  const colors = snapshot.colors || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const typography = snapshot.typography || {};
  const dominantSpacing = (spacing.spacingScale || []).slice(0, 5).map(item => item.value).join(', ');
  const dominantRadius = (spacing.radii || [])[0]?.value;
  const recurrentColors = (colors.colors || []).slice(0, 6).map(color => `${color.value} (${color.suggestedRole || 'unknown'})`).join(', ');
  const fontFamilies = (typography.fontFamilies || []).slice(0, 3).map(item => item.value).join(', ');
  const guidance = [];

  if (dominantSpacing) guidance.push(`[detectado] Mantener el ritmo de espaciado detectado: ${dominantSpacing}. Usar estos valores antes de introducir espaciado nuevo.`);
  else guidance.push('[guía] Definir una escala pequeña de espaciado antes de añadir valores nuevos de layout.');

  if (recurrentColors) guidance.push(`[detectado] Reutilizar colores detectados antes de añadir nuevos: ${recurrentColors}. Mapear cualquier gris o color de estado nuevo a un token nombrado.`);
  else guidance.push('[guía] No introducir grises ni colores de estado nuevos sin mapearlos a tokens semánticos.');

  if (dominantRadius) guidance.push(`[detectado] No crear radios nuevos salvo necesidad clara; ${dominantRadius} es el radio detectado más frecuente.`);
  else guidance.push('[guía] Elegir un radio por defecto para botones/cards antes de añadir variantes.');

  if (fontFamilies) guidance.push(`[detectado] Mantener primero los cambios tipográficos dentro de las familias detectadas: ${fontFamilies}.`);
  guidance.push('[guía] Mantener un solo CTA primario por bloque de decisión; las acciones secundarias deben leerse como secundarias.');
  guidance.push('[guía] Definir estados interactivos para controles reutilizables: default, hover, focus, loading, disabled, error y success.');
  guidance.push('[guía] No depender del placeholder como única etiqueta de formulario.');
  guidance.push('[guía] Respetar la jerarquía de headings y evitar saltos de nivel semántico al cambiar copy/layout.');
  guidance.push('[guía] Mantener contraste suficiente en texto, bordes, anillos de foco y colores de estado.');

  if (count(components.counts?.inputs) && (components.samples?.unlabeledInputs || []).length) {
    guidance.push(`[detectado] Añadir labels explícitos o nombres accesibles para ${(components.samples.unlabeledInputs || []).length} campo(s) de formulario detectados sin label.`);
  }

  if (count(components.counts?.buttons) > 1) {
    guidance.push(`[detectado] Revisar ${components.counts.buttons} botones/acciones detectados para validar jerarquía primaria vs secundaria.`);
  }

  return guidance;
}

function behavioralScopeNote(pageClassification = {}) {
  if (pageClassification.analysisMode === 'full_behavioral') {
    return 'La matriz behavioral completa se aplica porque la página parece una landing o service landing con confianza suficiente.';
  }
  if (pageClassification.analysisMode === 'limited_behavioral') {
    return 'La matriz behavioral de conversión queda desactivada; se entrega snapshot, inventario, riesgos de accesibilidad y notas de revisión manual.';
  }
  return 'Sin señales suficientes para aplicar análisis behavioral; se entrega snapshot técnico y revisión manual.';
}

function buildScopeRegionList(regions = {}) {
  const rows = Object.entries(regions)
    .filter(([, countValue]) => count(countValue) > 0)
    .map(([region, countValue]) => `- ${region}: ${countValue}`);

  return rows.join('\n') || '- No hay mapa de regiones disponible.';
}

function buildBehavioralScopeList(regions = []) {
  if (!regions.length) return '- Ninguna región quedó habilitada para scoring behavioral.';
  return regions.map(region => `- ${region}`).join('\n');
}

function buildScopeExclusionList(exclusions = []) {
  if (!exclusions.length) return '- No se excluyeron regiones por heurística.';
  return exclusions.map(item => `- ${item.region}: ${item.reason}`).join('\n');
}

function buildExecutiveSummary({ findings = [], findingGroups = {}, hypotheses = [], reviewTasks = [], behavioralMapping = [], pageClassification = {} }) {
  const highConfidenceRisks = findings.filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority));
  const weakBlocks = getWeakBlocks(behavioralMapping);
  const topProductHypothesis = hypotheses.find(hypothesis => !isSystemHypothesis(hypothesis));
  const topSystemHypothesis = hypotheses.find(isSystemHypothesis);
  const lines = [
    `- Observado: ${findings.length} hallazgo(s), ${findingGroups.designSystem?.length || 0} deuda(s) de sistema de diseño, ${findingGroups.accessibility?.length || 0} hallazgo(s) de accesibilidad.`,
    `- Inferido: arquetipo ${pageClassification.archetype || 'unknown'} con confianza ${pageClassification.confidence || 'low'}.`,
    highConfidenceRisks.length
      ? `- Riesgos UX de alta confianza: ${highConfidenceRisks.map(finding => finding.title).slice(0, 3).join('; ')}.`
      : '- No se detectan fricciones UX de alta confianza.',
    weakBlocks.length
      ? `- Bloques behavioral para revisión manual: ${weakBlocks.map(block => blockLabel(block)).join(', ')}.`
      : '- No se detectan bloques behavioral débiles con la heurística actual.',
    topProductHypothesis
      ? `- Hipótesis principal: ${topProductHypothesis.id} ${topProductHypothesis.title}; métrica primaria: ${topProductHypothesis.metrics.primary}.`
      : topSystemHypothesis && pageClassification.analysisMode === 'design_system_audit'
        ? `- Hipótesis principal de sistema: ${topSystemHypothesis.id} ${topSystemHypothesis.title}; métrica primaria: ${topSystemHypothesis.metrics.primary}.`
      : '- No se generó hipótesis accionable con evidencia, cambio propuesto y métrica clara.',
    reviewTasks[0]
      ? `- Tarea principal de revisión: ${reviewTasks[0].question}`
      : '- No se generó tarea de revisión.'
  ];

  return lines.join('\n');
}

function buildBehavioralAssessment({ fullBehavioral, behavioralMapping = [], pageClassification = {} }) {
  if (!fullBehavioral) {
    return `- Modo de análisis behavioral: ${pageClassification.analysisMode || 'snapshot_only'}.
- No se generan recomendaciones de conversión para este arquetipo con el modelo behavioral actual.
- Tratar cualquier nota behavioral como revisión manual, no como instrucción de optimización.`;
  }

  return `### Mapa de bloques behavioral
| Bloque | Key interna | Presencia | Calidad | Confianza | Evidencia específica | Nota de revisión manual | Severidad |
|---|---|---|---:|---|---|---|---:|
${behavioralMapping.map(formatBehavioralAssessmentRow).join('\n')}

### Bloques a revisar
${buildWeakBlockList(behavioralMapping)}`;
}

function buildWeakBlockList(behavioralMapping = []) {
  const weak = getWeakBlocks(behavioralMapping).map(block => `- ${blockLabel(block)}: ${block.missing?.[0] || block.detectedFriction || 'Validar manualmente con evidencia de producto.'}`);
  return weak.join('\n') || '- No se detectan bloques débiles.';
}

function getWeakBlocks(behavioralMapping = []) {
  return behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2);
}

function blockLabel(block = {}) {
  return `${block.displayLabel || behavioralBlockDisplayLabel(block.block)}${block.block ? ` (${block.block})` : ''}`;
}

function formatBehavioralAssessmentRow(block) {
  return `| ${blockLabel(block)} | ${block.block || ''} | ${block.present} | ${block.quality} | ${block.confidence || 'unknown'} | ${escapePipes((block.evidence || []).slice(0, 3).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing?.[0] || 'Sin fricción clara')} | ${block.severity} |`;
}

function confidenceNote(confidence = 'low', fallback = '') {
  if (confidence === 'high') return 'Inferencia de alta confianza basada en múltiples señales observadas.';
  if (confidence === 'medium') return `Inferencia de confianza media; validar antes de tomar decisiones de producto. ${fallback}`;
  return `Inferencia de baja confianza; usar solo como input de revisión manual. ${fallback}`;
}

function buildFindingList(findings = []) {
  if (!findings.length) return '- No se detectan hallazgos en esta categoría.';
  return findings.map(formatFinding).join('\n\n');
}

function formatFinding(finding) {
  const uncertainty = finding.confidence === 'high'
    ? ''
    : `\n- Incertidumbre: ${finding.confidence === 'medium' ? 'Inferencia de confianza media; validar con analítica o evidencia de usuarios.' : 'Señal de baja confianza; solo revisión manual.'}`;
  return `### ${finding.priority}: ${finding.title}
- Tipo: ${finding.type}
- Área afectada: ${finding.affectedArea}
- Severidad/confianza: ${finding.severity}/5 · ${finding.confidence}
- Impacto/esfuerzo: ${translateImpact(finding.impact)} · ${translateEffort(finding.effort)}
- Evidencia: ${finding.evidence.length ? finding.evidence.map(escapePipes).join('; ') : 'Sin evidencia automática fuerte.'}
- Razonamiento: ${finding.rationale}${uncertainty}`;
}

function buildHypothesisCards(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis accionables. Revisa la sección “Tareas de revisión”.';
  return hypotheses.map(formatHypothesisCard).join('\n\n');
}

function formatHypothesisCard(hypothesis) {
  return `### ${hypothesis.id}: ${hypothesis.title}
- Porque: ${hypothesis.because}
- Creemos que: ${hypothesis.weBelieve}
- Si hacemos: ${hypothesis.ifWe}
- Entonces: ${hypothesis.then}
- Métrica primaria: ${hypothesis.metrics.primary}
- Métricas secundarias: ${hypothesis.metrics.secondary.join(', ')}
- Controles de seguridad: ${hypothesis.metrics.guardrail.join(', ')}
- Segmentos: ${hypothesis.segments.join(', ')}
- Confianza/esfuerzo: ${hypothesis.confidence} · ${hypothesis.effort}
- Tipo de experimento: ${hypothesis.experimentType}`;
}

function buildReviewTasks(tasks = []) {
  if (!tasks.length) return '- No hay tareas de revisión.';
  return tasks.map(task => `### ${task.id}: ${task.question}
- Pregunta: ${task.question}
- Evidencia: ${(task.evidence || []).map(escapePipes).join('; ') || 'Sin evidencia automática fuerte.'}
- Por qué importa: ${task.whyItMatters}
- Cómo validarlo: ${task.howToValidate}
- Responsable: ${task.owner}`).join('\n\n');
}

function isConversionGuidance(item = '') {
  return /primary CTA|CTA principal|conversi[oó]n|decision block|bloque de decisi[oó]n/i.test(item);
}

function buildGithubTopFindings(findings = []) {
  if (!findings.length) return '- No se generaron hallazgos. Úsalo como baseline o tarea de revisión manual.';
  return findings.slice(0, 5).map(finding => `### ${finding.title}
- Tipo: ${finding.type}
- Prioridad: ${finding.priority}
- Evidencia: ${finding.evidence?.[0] || 'Sin evidencia automática fuerte.'}
- Recomendación: ${finding.rationale || 'Revisar manualmente antes de cambiar la página.'}
- Confianza: ${finding.confidence}`).join('\n\n');
}

function buildGithubHypotheses(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis.';
  return hypotheses.map(hypothesis => `### ${hypothesis.id}: ${hypothesis.title}
- Si hacemos: ${hypothesis.ifWe}
- Entonces: ${hypothesis.then}
- Métrica primaria: ${hypothesis.metrics.primary}
- Controles de seguridad: ${hypothesis.metrics.guardrail.join(', ')}`).join('\n\n');
}

function buildGithubReviewTasks(tasks = []) {
  if (!tasks.length) return '- No se generaron tareas de revisión.';
  return tasks.slice(0, 5).map(task => `### ${task.id}: ${task.question}
- Evidencia: ${(task.evidence || [])[0] || 'Sin evidencia automática fuerte.'}
- Cómo validarlo: ${task.howToValidate}
- Responsable: ${task.owner}`).join('\n\n');
}

function githubComponentsAffected(components = []) {
  const names = components
    .filter(component => Number(component.count) > 0)
    .map(component => `${component.name} (${component.count})`)
    .slice(0, 6);
  return names.join(', ') || 'none detected';
}

function githubTokensAffected(tokens = {}, findings = []) {
  const hasDesignDebt = findings.some(finding => finding.type === 'design_system_debt');
  const colorRolesNeedReview = (tokens.colors || []).filter(color => color.roleConfidence === 'low' || color.suggestedRole === 'unknown').slice(0, 3);
  const notes = [];

  if (hasDesignDebt) {
    if ((tokens.spacing || []).length) notes.push(`spacing (${tokens.spacing.length} detected)`);
    if ((tokens.radius || []).length) notes.push(`radius (${tokens.radius.length} detected)`);
    if ((tokens.colors || []).length) notes.push(`colors (${tokens.colors.length} detected)`);
  }
  if (colorRolesNeedReview.length) notes.push(`color roles to validate: ${colorRolesNeedReview.map(color => color.value).join(', ')}`);

  return notes.join('; ') || 'none beyond normal design-system review';
}

function githubAccessibilityChecks(components = [], accessibilityFindings = []) {
  const checks = [];
  if (accessibilityFindings.length) checks.push(`${accessibilityFindings.length} accessibility finding(s)`);
  if (components.some(component => component.name === 'Form field')) checks.push('form labels/help/error states');
  if (components.some(component => component.name === 'Button' || component.name === 'Link')) checks.push('keyboard focus and accessible names');
  checks.push('contrast and focus visible');
  return Array.from(new Set(checks)).join(', ');
}

function formatViewport(viewport = {}) {
  if (!viewport.width && !viewport.height) return 'unknown';
  return `${viewport.width || 'unknown'}x${viewport.height || 'unknown'}`;
}

function formatList(items = []) {
  return items.length ? items.join(', ') : 'none';
}

function buildGithubEvidence(snapshot = {}, report = {}) {
  const evidence = [];
  const colors = snapshot.colors || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const counts = components.counts || {};
  const samples = components.samples || {};
  const frictions = snapshot.frictions || report.uxFrictions || [];
  const reportTokens = report.detectedTokens || {};

  if (Number.isFinite(colors.totalUniqueColors)) evidence.push(`${colors.totalUniqueColors} valor(es) únicos de color detectados.`);
  else if ((reportTokens.colors || []).length) evidence.push(`${reportTokens.colors.length} token(s) de color reportados.`);
  if (Number.isFinite(spacing.totalUniqueSpacingValues)) evidence.push(`${spacing.totalUniqueSpacingValues} valor(es) únicos de espaciado detectados.`);
  else if ((reportTokens.spacing || []).length) evidence.push(`${reportTokens.spacing.length} token(s) de espaciado reportados.`);
  if (Number.isFinite(spacing.totalUniqueRadiusValues)) evidence.push(`${spacing.totalUniqueRadiusValues} valor(es) únicos de radio detectados.`);
  else if ((reportTokens.radius || []).length) evidence.push(`${reportTokens.radius.length} token(s) de radio reportados.`);
  if (Number.isFinite(counts.buttons)) evidence.push(`${counts.buttons} candidato(s) botón/CTA detectados.`);
  else if (getDetectedComponentCount(report, 'Button')) evidence.push(`${getDetectedComponentCount(report, 'Button')} candidato(s) botón/CTA detectados.`);
  if (Number.isFinite(counts.ctaGroups) && counts.ctaGroups > 0) evidence.push(`${counts.ctaGroups} grupo(s) CTA detectados.`);
  if ((samples.unlabeledInputs || []).length) evidence.push(`${samples.unlabeledInputs.length} campo(s) de formulario sin label accesible claro.`);
  if ((samples.genericLinks || []).length) evidence.push(`${samples.genericLinks.length} label(s) genéricos de enlace detectados.`);
  if (frictions.length) evidence.push(`${frictions.length} nota(s) de fricción UX detectadas; nota principal: ${frictions[0].title}.`);

  return evidence;
}

function buildGithubProblem(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.title) return `${frictions[0].title}. Debe revisarse como deuda UI/UX antes de añadir nuevos cambios de interfaz.`;
  if (evidence.length) return 'La página actual muestra señales observables de UI/sistema de diseño que conviene revisar antes de continuar la implementación.';
  return 'Contextic no detectó evidencia observable suficiente para un defecto específico. Usa este issue como checklist conservadora de revisión manual UI.';
}

function buildGithubSuggestedFix(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.recommendation) return frictions[0].recommendation;
  if (evidence.length) return 'Normalizar la UI alrededor de los tokens detectados, clarificar estados de componentes reutilizables y resolver riesgos de accesibilidad con evidencia directa DOM/CSS.';
  return 'Revisar la pantalla manualmente, capturar evidencia concreta y acotar una corrección pequeña de consistencia UI en vez de rediseñar desde supuestos.';
}

function buildGithubAcceptanceCriteria(snapshot, report, evidence) {
  const criteria = ['La evidencia usada para el fix queda listada en las notas de implementación o en la descripción de la PR.'];
  const components = snapshot.components || {};

  if (count(components.counts?.buttons) > 0 || getDetectedComponentCount(report, 'Button') > 0) criteria.push('Las acciones primarias y secundarias son distinguibles visualmente y solo aparece un CTA primario por bloque de decisión.');
  if (count(components.counts?.inputs) > 0 || getDetectedComponentCount(report, 'Form field') > 0) criteria.push('Los campos de formulario tienen labels visibles o nombres accesibles, además de texto de error/ayuda cuando aplique.');
  if (evidence.some(item => item.includes('color'))) criteria.push('Los colores nuevos o modificados están mapeados a tokens semánticos existentes o nombrados explícitamente.');
  if (evidence.some(item => item.includes('espaciado') || item.includes('radio'))) criteria.push('Los cambios de espaciado y radio reutilizan la escala detectada salvo excepción documentada.');

  criteria.push('Los componentes interactivos definen estados default, hover, focus, loading, disabled, error y success cuando aplique.');
  criteria.push('Contraste y jerarquía de headings revisados antes del merge.');

  return criteria;
}

function looksLikeReport(input) {
  return Boolean(input?.meta?.toolName && input?.detectedTokens && input?.detectedComponents);
}

function getDetectedComponentCount(report = {}, name) {
  const match = (report.detectedComponents || []).find(component => component.name === name);
  return count(match?.count);
}

function parseTypeStyle(value = '') {
  const parts = String(value).split('|').map(part => part.trim());
  const sizeLine = parts[1] || '';
  const sizeMatch = sizeLine.match(/^([^/]+)(?:\/(.+))?$/);

  return {
    fontFamily: parts[0] || 'unknown',
    fontSize: sizeMatch?.[1]?.trim() || 'unknown',
    lineHeight: sizeMatch?.[2]?.trim() || 'unknown',
    weight: parts[2] || 'unknown',
    letterSpacing: parts[3] || 'unknown'
  };
}

function inferTypographyUse(style) {
  const size = Number.parseFloat(style.fontSize);
  const weight = Number.parseInt(style.weight, 10);

  if (Number.isFinite(size) && size >= 32) return 'display/hero heading';
  if (Number.isFinite(size) && size >= 20) return 'heading';
  if (Number.isFinite(weight) && weight >= 650) return 'énfasis o heading';
  if (Number.isFinite(size) && size <= 13) return 'caption/texto de apoyo';
  if (Number.isFinite(size)) return 'texto base';
  return 'unknown';
}

function formatTokenValues(items = [], limit = 8) {
  const values = items.slice(0, limit).map(item => `${item.value} (${item.count})`);
  return values.join(', ') || 'unknown';
}

function roleConfidenceFromName(role) {
  if (!role || role === 'unknown' || role === 'sin mapear') return 'unknown';
  if (String(role).includes('candidato') || String(role).includes('possible')) return 'low';
  return 'medium';
}

function translateRoleReason(reason = '') {
  return String(reason)
    .replace('Role inferred from color usage.', 'Rol inferido desde el uso del color.')
    .replace('Low confidence: insufficient contextual evidence.', 'Confianza baja: evidencia contextual insuficiente.')
    .replace('Low confidence: no usage context.', 'Confianza baja: sin contexto de uso.')
    .replace('Only observed in hidden/system or utility contexts.', 'Solo observado en contextos ocultos, de sistema o utilidad.')
    .replace('CSS property color maps to text role.', 'La propiedad CSS color se mapea a rol text.')
    .replace('CSS border property maps to border role.', 'La propiedad CSS de borde se mapea a rol border.')
    .replace('CSS outlineColor maps to focus role.', 'La propiedad CSS outlineColor se mapea a rol focus.')
    .replace('CSS boxShadow maps to shadow role.', 'La propiedad CSS boxShadow se mapea a rol shadow.')
    .replace('CTA background color maps to brand action role.', 'El color de fondo de CTA se mapea a rol de acción de marca.')
    .replace('Brand variable/name hint plus CTA background usage.', 'Pista de variable/nombre de marca junto a uso como fondo de CTA.')
    .replace('Neutral or white background maps to surface.', 'Un fondo neutro o blanco se mapea a surface.')
    .replace('Saturated background without CTA evidence maps to accent.', 'Un fondo saturado sin evidencia de CTA se mapea a accent.')
    .replace('Insufficient CSS property evidence for a semantic role.', 'Evidencia insuficiente de propiedad CSS para un rol semántico.');
}

function translateUsageStatus(status = '') {
  return String(status)
    .replace('unknown usage', 'uso desconocido')
    .replace('visible usage', 'uso visible')
    .replace('hidden/system usage', 'uso oculto/sistema');
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function inferButtonVariants(samples = {}) {
  const buttons = samples.buttons || [];
  const variants = [];
  if (buttons.length) variants.push('candidato primario desde acciones visibles');
  if (buttons.some(button => button.disabled)) variants.push('disabled');
  return variants.join(', ') || 'no detectado';
}

function inferLinkVariants(samples = {}) {
  const variants = ['default'];
  if ((samples.genericLinks || []).length) variants.push('riesgo de label genérico');
  return variants.join(', ');
}

function inferFormFieldVariants(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  if (!count(counts.inputs)) return 'no detectado';
  const variants = ['candidato texto/input'];
  if ((samples.unlabeledInputs || []).length) variants.push('sin label');
  if ((samples.disabledControls || []).length) variants.push('disabled');
  return variants.join(', ');
}

function inferCtaGroupVariants(components = {}) {
  const groups = components.samples?.ctaGroups || [];
  if (!groups.length) return 'no detectado';
  return groups.map(group => `${group.actions.length} acción(es)`).join(', ');
}

function interactiveStates(type) {
  if (type === 'link') return 'default, hover, focus, visited, disabled si aplica';
  if (type === 'formField') return 'default, focus, filled, disabled, error, success, loading';
  return 'default, hover, focus, loading, disabled, error, success';
}

function buttonAccessibilityRisk(components = {}) {
  const disabled = components.samples?.disabledControls || [];
  if (disabled.length) return `${disabled.length} control(es) disabled; verificar recuperación/microcopy`;
  return count(components.counts?.buttons) ? 'verificar foco visible y nombres accesibles' : 'unknown';
}

function linkAccessibilityRisk(components = {}) {
  const genericLinks = components.samples?.genericLinks || [];
  if (genericLinks.length) return `${genericLinks.length} label(s) genéricos de enlace`;
  return count(components.counts?.links) ? 'verificar foco visible y labels descriptivos' : 'unknown';
}

function formFieldAccessibilityRisk(components = {}) {
  const unlabeled = components.samples?.unlabeledInputs || [];
  if (unlabeled.length) return `${unlabeled.length} campo(s) sin label claro`;
  return count(components.counts?.inputs) ? 'verificar labels, texto de ayuda y estado de error' : 'unknown';
}

function formAccessibilityRisk(components = {}) {
  if (!count(components.counts?.forms)) return 'unknown';
  if ((components.samples?.unlabeledInputs || []).length) return 'contiene candidatos de campo sin label';
  return 'verificar envío, loading, success, error y microcopy de privacidad';
}

function ctaGroupAccessibilityRisk(components = {}) {
  if (!count(components.counts?.ctaGroups)) return 'unknown';
  return 'verificar jerarquía primaria/secundaria y orden de foco por teclado';
}

function recommendComponent(instances, risk, promotionThreshold) {
  if (instances <= 0) return 'keep_local';
  if (risk && risk !== 'unknown' && !risk.startsWith('verify focus visible') && !risk.startsWith('verificar foco visible')) return 'needs_review';
  if (instances >= promotionThreshold) return 'promote_to_core_component';
  return 'keep_local';
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
  const counts = components.counts || {};
  const hasWhat = behavioralMapping.find(block => block.block === 'what')?.present;
  const hasWhyNot = behavioralMapping.find(block => block.block === 'why_not')?.present;
  if (hasWhat && hasWhat !== 'no') patterns.push('- Hero');
  if (counts.navigation) patterns.push('- Header / navegación');
  if (counts.buttons) patterns.push('- CTA primario / grupo de acciones');
  if (counts.cards >= 3) patterns.push('- Cards de beneficios o features');
  if (counts.forms) patterns.push('- Formulario');
  if (hasWhyNot && hasWhyNot !== 'no') patterns.push('- FAQ / confianza / reducción de riesgo');
  return patterns.join('\n') || '- No se detectan patrones UI suficientes por heurística.';
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
  return weak ? `Bloque ${blockLabel(weak)} débil o ausente` : 'No detectado por heurística';
}

function buildStrategicReading(frictions, behavioralMapping) {
  const weakBlocks = behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).map(blockLabel);
  const top = frictions[0];
  if (top) {
    return `La pantalla parece necesitar refuerzo en ${weakBlocks.slice(0, 3).join(', ') || 'su estructura behavioral'}. El principal riesgo detectado es “${top.title}”, que afecta a ${top.typeLabel || top.type}. Trata esta salida como hipótesis basada en DOM/CSS visible y valida con datos reales de comportamiento.`;
  }
  return `La pantalla no muestra fricciones heurísticas fuertes, pero hay que validar manualmente la claridad de Qué (what), Por qué no (why_not) y Dónde actuar (where). Esta lectura separa observación técnica de recomendación para evitar conclusiones no evidenciadas.`;
}

function buildWhatWorks(behavioralMapping) {
  const strong = uniqueLines(behavioralMapping
    .filter(block => block.present === 'sí' && block.quality >= 4)
    .map(block => `- ${blockLabel(block)}: ${block.evidence[0] || 'bloque presente con señales suficientes'}`));
  return strong.join('\n') || '- No hay suficientes señales fuertes; conviene validar manualmente.';
}

function buildNextExperiment(hypotheses, behavioralMapping) {
  const top = hypotheses[0];
  if (top) return `${top.id}: ${top.title}. ${top.ifWe} Medir ${top.metrics.primary}; guardrails: ${top.metrics.guardrail.join(', ')}. Tipo: ${top.experimentType}.`;
  return 'No hay hipótesis accionable con evidencia, cambio propuesto y métrica clara.';
}

function buildTopHypothesisSection(hypotheses, behavioralMapping) {
  if (!hypotheses.length) return '';
  const productHypothesis = hypotheses.find(hypothesis => !isSystemHypothesis(hypothesis));
  if (productHypothesis) {
    return `### Hipótesis principal
${formatNextExperiment(productHypothesis)}`;
  }
  const systemHypothesis = hypotheses.find(isSystemHypothesis);
  if (!systemHypothesis) return '';
  return `### Hipótesis principal de sistema
${formatNextExperiment(systemHypothesis)}`;
}

function buildTopReviewTask(tasks = []) {
  const top = tasks[0];
  if (!top) return '- No hay tareas de revisión.';
  return `- Pregunta: ${top.question}
- Evidencia: ${(top.evidence || []).map(escapePipes).join('; ') || 'Sin evidencia automática fuerte.'}
- Por qué importa: ${top.whyItMatters}
- Cómo validarlo: ${top.howToValidate}
- Responsable: ${top.owner}`;
}

function buildHighConfidenceRisks(findings = []) {
  const risks = findings
    .filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority) && finding.type !== 'design_system_debt')
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidencia: ${finding.evidence[0] || 'no disponible'}`);
  return risks.join('\n') || '- No se detectan fricciones UX de alta confianza.';
}

function buildManualReviewSummary(reviewTasks = []) {
  const items = uniqueReviewTasks(reviewTasks).map(task => `- [${reviewTaskTag(task)}] ${reviewTaskSummary(task)}`);
  return items.join('\n') || '- No hay elementos de revisión manual más allá del QA normal.';
}

function buildDesignSystemDebtSummary(findings = []) {
  return findings
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidencia: ${finding.evidence[0] || 'no disponible'}`)
    .join('\n') || '- No se detectó deuda de sistema de diseño.';
}

function buildRecommendedMetrics(hypotheses = [], pageClassification = {}) {
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';
  const primary = new Set();
  const secondary = new Set();
  const guardrail = new Set();

  for (const hypothesis of hypotheses) {
    if (hypothesis.metrics?.primary) primary.add(hypothesis.metrics.primary);
    for (const metric of hypothesis.metrics?.secondary || []) secondary.add(metric);
    for (const metric of hypothesis.metrics?.guardrail || []) guardrail.add(metric);
  }
  for (const metric of primary) secondary.delete(metric);

  return [
    '### Primaria',
    ...(primary.size ? Array.from(primary).map(metric => `- ${metric}`) : ['- tasa de completitud de la tarea principal']),
    '',
    '### Secundarias',
    ...(secondary.size
      ? Array.from(secondary).map(metric => `- ${metric}`)
      : fullBehavioral
        ? ['- CTR del CTA principal', '- tasa de rebote']
        : ['- tasa de finalización de tarea', '- incidencias de accesibilidad abiertas']),
    '',
    '### Controles de seguridad',
    ...(guardrail.size ? Array.from(guardrail).map(metric => `- ${metric}`) : ['- sin regresiones de accesibilidad'])
  ].join('\n');
}

function uniqueReviewTasks(tasks = []) {
  const seen = new Set();
  return tasks.filter(task => {
    const key = `${reviewTaskTag(task)}:${reviewTaskSummary(task)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reviewTaskTag(task = {}) {
  const text = `${task.question || ''} ${(task.evidence || []).join(' ')}`.toLowerCase();
  if (/target|audiencia|perfil|dispositivo|para qui[eé]n/.test(text)) return 'Para quién / who';
  if (/proceso|pasos|despu[eé]s|cta|alta|contrataci[oó]n|gesti[oó]n|activaci[oó]n/.test(text) && !/cta principal|label|jerarqu/i.test(text)) return 'Cómo / how';
  if (/cta principal|label|jerarqu|objetivo de negocio|dónde actuar/.test(text)) return 'Dónde actuar / where';
  if (/urgencia|temporal|hasta|cobertura/.test(text)) return 'Cuándo / when';
  return 'Revisión';
}

function reviewTaskSummary(task = {}) {
  const question = task.question || '';
  const tag = reviewTaskTag(task);
  if (tag === 'Para quién / who') return 'Validar si el target funcional por dispositivo es suficiente o necesita perfil explícito.';
  if (tag === 'Cómo / how') return 'Validar si el proceso explica qué ocurre después del CTA.';
  if (tag === 'Dónde actuar / where') return 'Validar si el CTA principal responde al objetivo de negocio.';
  if (tag === 'Cuándo / when') return 'Validar si existe urgencia real o solo límites de valor/cobertura.';
  return question || 'Validar la señal antes de proponer cambios.';
}

function isSystemHypothesis(hypothesis = {}) {
  return /^(system hypothesis|hipótesis de sistema):/i.test(hypothesis.title || '') || hypothesis.experimentType === 'QA audit';
}

function formatNextExperiment(hypothesis = {}) {
  return `${hypothesis.id}: ${hypothesis.title}. ${hypothesis.ifWe} Medir ${hypothesis.metrics.primary}; guardrails: ${hypothesis.metrics.guardrail.join(', ')}. Tipo: ${hypothesis.experimentType}.`;
}

function uniqueLines(lines = []) {
  return Array.from(new Set(lines.filter(Boolean)));
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
