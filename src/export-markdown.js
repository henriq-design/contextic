import { buildContexticReport } from './contextic-report.js';
import { groupFindings } from './findings-prioritization.js';
import { generateHypotheses } from './hypotheses.js';

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
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification);
  const findingGroups = groupFindings(findings);
  const lowConfidenceFindings = findings.filter(finding => finding.confidence === 'low' || finding.priority === 'Review');
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';

  return `# design-context.md — Contextic

## Capture metadata

- Source URL: ${report.meta.sourceUrl}
- Page title: ${report.screenSummary.pageTitle || 'Sin título'}
- Generated at: ${report.meta.generatedAt}
- Viewport: ${meta.viewport?.width || 'unknown'}x${meta.viewport?.height || 'unknown'}
- Evidence policy: Observed evidence comes from visible DOM/CSS and scoped regions. Inferences below are marked with confidence and should be validated before implementation.

## Page classification

- Archetype: ${pageClassification.archetype || 'unknown'}
- Confidence: ${pageClassification.confidence || 'low'}
- Analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}
- Behavioral scope: ${behavioralScopeNote(pageClassification)}
- Signals: ${(pageClassification.signals || []).join('; ') || 'No hay señales suficientes.'}
- Inference note: ${confidenceNote(pageClassification.confidence, 'Page classification is heuristic and should not be treated as ground truth.')}

## Scope map

### Regions detected
${buildScopeRegionList(scopeMap.regions)}

### Used for behavioral
${buildBehavioralScopeList(scopeMap.usedForBehavioral)}

### Excluded from behavioral
${buildScopeExclusionList(scopeMap.excludedFromBehavioral)}

## Executive summary

${buildExecutiveSummary({ findings, findingGroups, hypotheses, behavioralMapping, pageClassification })}

## Design system snapshot

### Colors detected by frequency
| Color | Count | Inferred role | Confidence | Observed use | Role reason |
|---|---:|---|---|---|---|
${buildColorRows(colors)}

### Typography detected
| Font family | Size | Line height | Weight | Count | Probable use |
|---|---:|---:|---:|---:|---|
${buildTypographyRows(typography)}

### Spacing, radius, shadows and borders
| Token group | Recurrent values | Notes |
|---|---|---|
${buildDesignSystemTokenRows(spacing)}

### CSS variables detected
${buildCssVariableList(colors.cssVariables || [])}

## Component inventory

| Component candidate | Instances | Variants inferred | Recommended states | Accessibility risk | Design system recommendation |
|---|---:|---|---|---|---|
${buildComponentInventoryRows(components)}

### UI patterns observed
${buildPatternList(components, behavioralMapping)}

## Behavioral assessment

${buildBehavioralAssessment({ fullBehavioral, behavioralMapping, pageClassification })}

## UX findings

${fullBehavioral
  ? buildFindingList(findingGroups.ux.filter(finding => finding.confidence !== 'low' && finding.priority !== 'Review'))
  : '- Análisis behavioral limitado o desactivado por clasificación de página. No se generan recomendaciones de conversión con la matriz actual para este arquetipo.'}

## Design system findings

${buildFindingList(findingGroups.designSystem)}

## Accessibility findings

${buildFindingList(findingGroups.accessibility)}

## Low-confidence findings

${buildFindingList(lowConfidenceFindings)}

## Hypotheses and experiments

${buildHypothesisCards(hypotheses)}

## Implementation guidance

${buildImplementationGuidance(snapshot).filter(item => fullBehavioral || !isConversionGuidance(item)).map(item => `- ${item}`).join('\n')}

## Recommended metrics

${buildRecommendedMetrics(hypotheses)}

## Handoff summary

### What works
${buildWhatWorks(behavioralMapping)}

### High-confidence risks
${buildHighConfidenceRisks(findings)}

### Manual review items
${buildManualReviewSummary(findings, behavioralMapping)}

### Design system debt
${buildDesignSystemDebtSummary(findingGroups.designSystem)}

### Top hypothesis
${buildNextExperiment(hypotheses, behavioralMapping)}
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
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification);
  const groups = groupFindings(findings);
  const weakBlocks = Object.values(report.behavioralMapping || {}).filter(block => block.present !== 'sí' || block.quality <= 2);
  const title = `[Contextic] Review ${pageClassification.archetype || 'unknown'} findings for ${report.screenSummary?.pageTitle || 'untitled page'}`;

  return `# ${title}

## Context
- URL: ${report.meta?.sourceUrl || 'unknown'}
- Viewport: ${formatViewport(snapshot.meta?.viewport)}
- Page archetype: ${pageClassification.archetype || 'unknown'} (${pageClassification.confidence || 'low'} confidence)
- Analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}
- Generated at: ${report.meta?.generatedAt || 'unknown'}
${pageClassification.analysisMode === 'snapshot_only' ? '- Note: analysis mode is snapshot_only; no conversion recommendations are generated by the current behavioral model.' : ''}

## Summary
- UX frictions: ${groups.ux.length}
- Weak blocks: ${weakBlocks.length}${weakBlocks.length ? ` (${weakBlocks.map(block => block.label || block.block).join(', ')})` : ''}
- DS risks: ${groups.designSystem.length}
- Manual review items: ${groups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length}

## Top findings
${buildGithubTopFindings(findings)}

## Hypotheses
${buildGithubHypotheses(hypotheses)}

## Implementation notes
- Components affected: ${githubComponentsAffected(report.detectedComponents || [])}
- Tokens affected: ${githubTokensAffected(report.detectedTokens || {}, findings)}
- Accessibility checks: ${githubAccessibilityChecks(report.detectedComponents || [], groups.accessibility)}
- Behavioral scope: used ${formatList(scopeMap.usedForBehavioral)}; excluded ${formatList((scopeMap.excludedFromBehavioral || []).map(item => item.region))}

## Acceptance criteria
- [ ] Findings reviewed
- [ ] CTA hierarchy validated
- [ ] Color roles validated
- [ ] Behavioral scope reviewed
- [ ] Metrics/instrumentation confirmed

## Raw exports
- design-context.md available from Contextic
- JSON available from Contextic
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

function buildColorRows(colors = {}) {
  const rows = (colors.colors || []).slice(0, 12).map(color => {
    const observedUse = color.sample ? `${color.sample.property} on ${color.sample.selector}` : 'unknown';
    const confidence = color.roleConfidence || roleConfidenceFromName(color.suggestedRole);
    const reason = color.roleReason || (confidence === 'low' || confidence === 'unknown' ? 'Low confidence: insufficient contextual evidence.' : 'Role inferred from color usage.');
    return `| ${color.value} | ${color.count} | ${color.suggestedRole || 'unknown'} | ${confidence} | ${escapePipes(observedUse)} | ${escapePipes(reason)} |`;
  });

  return rows.join('\n') || '| unknown | 0 | unknown | unknown | No color evidence detected | Low confidence: no usage context. |';
}

function buildTypographyRows(typography = {}) {
  const rows = (typography.typeStyles || []).slice(0, 10).map(style => {
    const parsed = parseTypeStyle(style.value);
    return `| ${escapePipes(parsed.fontFamily)} | ${parsed.fontSize} | ${parsed.lineHeight} | ${parsed.weight} | ${style.count} | ${inferTypographyUse(parsed)} |`;
  });

  return rows.join('\n') || '| unknown | unknown | unknown | unknown | 0 | No typography evidence detected |';
}

function buildDesignSystemTokenRows(spacing = {}) {
  const spacingValues = formatTokenValues(spacing.spacingScale, 10);
  const radiusValues = formatTokenValues(spacing.radii, 8);
  const shadowValues = formatTokenValues(spacing.shadows, 4);
  const borderValues = formatTokenValues(spacing.borders, 6);

  return [
    `| Spacing | ${spacingValues} | ${spacing.totalUniqueSpacingValues ? `${spacing.totalUniqueSpacingValues} unique spacing values detected.` : 'unknown'} |`,
    `| Radius | ${radiusValues} | ${spacing.totalUniqueRadiusValues ? `${spacing.totalUniqueRadiusValues} unique radius values detected.` : 'unknown'} |`,
    `| Shadows | ${shadowValues} | Preserve existing elevation before adding new shadows. |`,
    `| Borders | ${borderValues} | Reuse detected border widths/styles before adding new ones. |`
  ].join('\n');
}

function buildCssVariableList(cssVariables = []) {
  if (!cssVariables.length) return '- No CSS variables detected in computed root styles.';

  return [
    '| Variable | Value |',
    '|---|---|',
    ...cssVariables.slice(0, 16).map(variable => `| ${escapePipes(variable.name)} | ${escapePipes(variable.value)} |`)
  ].join('\n');
}

function buildComponentInventoryRows(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  const componentRows = [
    componentInventoryRow('Button', count(counts.buttons), inferButtonVariants(samples), interactiveStates('button'), buttonAccessibilityRisk(components), recommendComponent(count(counts.buttons), buttonAccessibilityRisk(components), 2)),
    componentInventoryRow('Link', count(counts.links), inferLinkVariants(samples), interactiveStates('link'), linkAccessibilityRisk(components), recommendComponent(count(counts.links), linkAccessibilityRisk(components), 4)),
    componentInventoryRow('Form field', count(counts.inputs), inferFormFieldVariants(components), interactiveStates('formField'), formFieldAccessibilityRisk(components), recommendComponent(count(counts.inputs), formFieldAccessibilityRisk(components), 2)),
    componentInventoryRow('Card', count(counts.cards), count(counts.cards) ? 'layout/content variants unknown' : 'none detected', 'default', 'unknown', recommendComponent(count(counts.cards), 'unknown', 3)),
    componentInventoryRow('Alert', count(counts.alerts), count(counts.alerts) ? 'status messaging candidate' : 'none detected', 'default, error, success, warning, info', count(counts.alerts) ? 'verify role and live region behavior' : 'unknown', recommendComponent(count(counts.alerts), 'unknown', 2)),
    componentInventoryRow('Badge', count(counts.badges), count(counts.badges) ? 'label/status candidate' : 'none detected', 'default', 'verify contrast at small sizes', recommendComponent(count(counts.badges), 'verify contrast at small sizes', 3)),
    componentInventoryRow('Navigation', count(counts.navigation), count(counts.navigation) ? 'landmark/navigation candidate' : 'none detected', 'default, hover, focus, current', count(counts.navigation) ? 'verify landmarks, current state and focus order' : 'unknown', recommendComponent(count(counts.navigation), 'unknown', 1)),
    componentInventoryRow('Modal/Dialog', count(counts.dialogs), count(counts.dialogs) ? 'dialog candidate' : 'none detected', 'default, focus-trapped, closing, loading, error', count(counts.dialogs) ? 'verify focus trap, escape behavior and aria-modal' : 'unknown', recommendComponent(count(counts.dialogs), 'verify focus trap, escape behavior and aria-modal', 1)),
    componentInventoryRow('Form', count(counts.forms), count(counts.forms) ? 'submission flow candidate' : 'none detected', 'default, validating, loading, disabled, error, success', formAccessibilityRisk(components), recommendComponent(count(counts.forms), formAccessibilityRisk(components), 1)),
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

  if (dominantSpacing) guidance.push(`[detected] Preserve the detected spacing rhythm: ${dominantSpacing}. Use these values before introducing new spacing.`);
  else guidance.push('[guidance] Define a small spacing scale before adding new layout values.');

  if (recurrentColors) guidance.push(`[detected] Reuse detected colors before adding new ones: ${recurrentColors}. Map any new grey or state color to a named token.`);
  else guidance.push('[guidance] Do not introduce new greys or state colors without mapping them to semantic tokens.');

  if (dominantRadius) guidance.push(`[detected] Do not create new radii unless needed; ${dominantRadius} is the most frequent detected radius.`);
  else guidance.push('[guidance] Choose one default radius for buttons/cards before adding variants.');

  if (fontFamilies) guidance.push(`[detected] Keep typography changes within the detected families first: ${fontFamilies}.`);
  guidance.push('[guidance] Maintain one primary CTA per decision block; secondary actions should look secondary.');
  guidance.push('[guidance] Define interactive states for reusable controls: default, hover, focus, loading, disabled, error and success.');
  guidance.push('[guidance] Do not rely on placeholder text as the only form label.');
  guidance.push('[guidance] Respect heading hierarchy and avoid skipping semantic heading levels when changing copy/layout.');
  guidance.push('[guidance] Maintain sufficient contrast for text, borders, focus rings and status colors.');

  if (count(components.counts?.inputs) && (components.samples?.unlabeledInputs || []).length) {
    guidance.push(`[detected] Add explicit labels or accessible names for ${(components.samples.unlabeledInputs || []).length} detected unlabeled form field(s).`);
  }

  if (count(components.counts?.buttons) > 1) {
    guidance.push(`[detected] Review ${components.counts.buttons} detected buttons/actions for primary vs secondary hierarchy.`);
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

function buildExecutiveSummary({ findings = [], findingGroups = {}, hypotheses = [], behavioralMapping = [], pageClassification = {} }) {
  const highConfidenceRisks = findings.filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority));
  const weakBlocks = getWeakBlocks(behavioralMapping);
  const topHypothesis = hypotheses[0];
  const lines = [
    `- Observed: ${findings.length} finding(s), ${findingGroups.designSystem?.length || 0} design-system debt item(s), ${findingGroups.accessibility?.length || 0} accessibility finding(s).`,
    `- Inferred: page archetype is ${pageClassification.archetype || 'unknown'} with ${pageClassification.confidence || 'low'} confidence.`,
    highConfidenceRisks.length
      ? `- High-confidence risks: ${highConfidenceRisks.map(finding => finding.title).slice(0, 3).join('; ')}.`
      : '- No se detectan fricciones UX de alta confianza.',
    weakBlocks.length
      ? `- Weak blocks for manual review: ${weakBlocks.map(block => block.label).join(', ')}.`
      : '- No weak behavioral blocks detected by current heuristics.',
    topHypothesis
      ? `- Top hypothesis: ${topHypothesis.id} ${topHypothesis.title}; primary metric: ${topHypothesis.metrics.primary}.`
      : '- No measurable hypothesis generated.'
  ];

  return lines.join('\n');
}

function buildBehavioralAssessment({ fullBehavioral, behavioralMapping = [], pageClassification = {} }) {
  if (!fullBehavioral) {
    return `- Behavioral analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}.
- No conversion recommendations are generated for this archetype with the current behavioral model.
- Treat any behavioral notes as manual review, not optimization instruction.`;
  }

  return `### Behavioral block map
| Block | Present | Quality | Evidence type | Evidence | Manual review note | Severity |
|---|---|---:|---|---|---|---:|
${behavioralMapping.map(formatBehavioralAssessmentRow).join('\n')}

### Weak blocks
${buildWeakBlockList(behavioralMapping)}`;
}

function buildWeakBlockList(behavioralMapping = []) {
  const weak = getWeakBlocks(behavioralMapping).map(block => `- ${block.label}: ${block.missing?.[0] || block.detectedFriction || 'Needs manual validation.'}`);
  return weak.join('\n') || '- No weak blocks detected.';
}

function getWeakBlocks(behavioralMapping = []) {
  return behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2);
}

function formatBehavioralAssessmentRow(block) {
  const evidenceType = block.evidence?.length ? 'observed/inferred from scoped DOM' : 'missing evidence';
  return `| ${block.label} | ${block.present} | ${block.quality} | ${evidenceType} | ${escapePipes((block.evidence || []).slice(0, 2).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing?.[0] || 'Sin fricción clara')} | ${block.severity} |`;
}

function confidenceNote(confidence = 'low', fallback = '') {
  if (confidence === 'high') return 'High confidence inference based on multiple observed signals.';
  if (confidence === 'medium') return `Medium confidence inference; validate before making product decisions. ${fallback}`;
  return `Low confidence inference; use as manual review input only. ${fallback}`;
}

function buildFindingList(findings = []) {
  if (!findings.length) return '- No se detectan hallazgos en esta categoría.';
  return findings.map(formatFinding).join('\n\n');
}

function formatFinding(finding) {
  const uncertainty = finding.confidence === 'high'
    ? ''
    : `\n- Uncertainty: ${finding.confidence === 'medium' ? 'Medium-confidence inference; validate with analytics or user evidence.' : 'Low-confidence signal; manual review only.'}`;
  return `### ${finding.priority}: ${finding.title}
- Tipo: ${finding.type}
- Área afectada: ${finding.affectedArea}
- Severidad/confianza: ${finding.severity}/5 · ${finding.confidence}
- Impacto/esfuerzo: ${translateImpact(finding.impact)} · ${translateEffort(finding.effort)}
- Evidencia: ${finding.evidence.length ? finding.evidence.map(escapePipes).join('; ') : 'Sin evidencia automática fuerte.'}
- Rationale: ${finding.rationale}${uncertainty}`;
}

function buildHypothesisCards(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis medibles.';
  return hypotheses.map(formatHypothesisCard).join('\n\n');
}

function formatHypothesisCard(hypothesis) {
  return `### ${hypothesis.id}: ${hypothesis.title}
- Because: ${hypothesis.because}
- We believe: ${hypothesis.weBelieve}
- If we: ${hypothesis.ifWe}
- Then: ${hypothesis.then}
- Primary metric: ${hypothesis.metrics.primary}
- Secondary metrics: ${hypothesis.metrics.secondary.join(', ')}
- Guardrails: ${hypothesis.metrics.guardrail.join(', ')}
- Segments: ${hypothesis.segments.join(', ')}
- Confidence/effort: ${hypothesis.confidence} · ${hypothesis.effort}
- Experiment type: ${hypothesis.experimentType}`;
}

function isConversionGuidance(item = '') {
  return /primary CTA|CTA principal|conversi[oó]n|decision block|bloque de decisi[oó]n/i.test(item);
}

function buildGithubTopFindings(findings = []) {
  if (!findings.length) return '- No findings were generated. Use this as a baseline/manual review task.';
  return findings.slice(0, 5).map(finding => `### ${finding.title}
- Type: ${finding.type}
- Priority: ${finding.priority}
- Evidence: ${finding.evidence?.[0] || 'No strong automatic evidence.'}
- Recommendation: ${finding.rationale || 'Review manually before changing the page.'}
- Confidence: ${finding.confidence}`).join('\n\n');
}

function buildGithubHypotheses(hypotheses = []) {
  if (!hypotheses.length) return '- No hypotheses generated.';
  return hypotheses.map(hypothesis => `### ${hypothesis.id}: ${hypothesis.title}
- If we: ${hypothesis.ifWe}
- Then: ${hypothesis.then}
- Primary metric: ${hypothesis.metrics.primary}
- Guardrails: ${hypothesis.metrics.guardrail.join(', ')}`).join('\n\n');
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

  if (Number.isFinite(colors.totalUniqueColors)) evidence.push(`${colors.totalUniqueColors} unique color value(s) detected.`);
  else if ((reportTokens.colors || []).length) evidence.push(`${reportTokens.colors.length} reported color token(s) detected.`);
  if (Number.isFinite(spacing.totalUniqueSpacingValues)) evidence.push(`${spacing.totalUniqueSpacingValues} unique spacing value(s) detected.`);
  else if ((reportTokens.spacing || []).length) evidence.push(`${reportTokens.spacing.length} reported spacing token(s) detected.`);
  if (Number.isFinite(spacing.totalUniqueRadiusValues)) evidence.push(`${spacing.totalUniqueRadiusValues} unique radius value(s) detected.`);
  else if ((reportTokens.radius || []).length) evidence.push(`${reportTokens.radius.length} reported radius token(s) detected.`);
  if (Number.isFinite(counts.buttons)) evidence.push(`${counts.buttons} button/CTA candidate(s) detected.`);
  else if (getDetectedComponentCount(report, 'Button')) evidence.push(`${getDetectedComponentCount(report, 'Button')} button/CTA candidate(s) detected.`);
  if (Number.isFinite(counts.ctaGroups) && counts.ctaGroups > 0) evidence.push(`${counts.ctaGroups} CTA group candidate(s) detected.`);
  if ((samples.unlabeledInputs || []).length) evidence.push(`${samples.unlabeledInputs.length} form field(s) without a clear accessible label.`);
  if ((samples.genericLinks || []).length) evidence.push(`${samples.genericLinks.length} generic link label(s) detected.`);
  if (frictions.length) evidence.push(`${frictions.length} UX friction note(s) detected; top note: ${frictions[0].title}.`);

  return evidence;
}

function buildGithubProblem(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.title) return `${frictions[0].title}. This should be reviewed as UI/UX debt before new interface changes are layered on top.`;
  if (evidence.length) return 'The current page shows observable UI/design-system signals that should be reviewed before implementation work continues.';
  return 'Contextic did not detect enough observable evidence for a specific defect. Use this issue as a conservative manual UI review checklist.';
}

function buildGithubSuggestedFix(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.recommendation) return frictions[0].recommendation;
  if (evidence.length) return 'Normalize the UI around the detected tokens, clarify reusable component states and resolve any accessibility risks with direct DOM/CSS evidence.';
  return 'Review the screen manually, capture concrete evidence, then scope a small UI consistency fix instead of redesigning from assumptions.';
}

function buildGithubAcceptanceCriteria(snapshot, report, evidence) {
  const criteria = ['Evidence used for the fix is listed in the implementation notes or PR description.'];
  const components = snapshot.components || {};

  if (count(components.counts?.buttons) > 0 || getDetectedComponentCount(report, 'Button') > 0) criteria.push('Primary and secondary actions are visually distinguishable and only one primary CTA appears per decision block.');
  if (count(components.counts?.inputs) > 0 || getDetectedComponentCount(report, 'Form field') > 0) criteria.push('Form fields have visible labels or accessible names plus error/help text where relevant.');
  if (evidence.some(item => item.includes('color'))) criteria.push('New or changed colors are mapped to existing or explicitly named semantic tokens.');
  if (evidence.some(item => item.includes('spacing') || item.includes('radius'))) criteria.push('Spacing and radius changes reuse the detected scale unless a documented exception is needed.');

  criteria.push('Interactive components define default, hover, focus, loading, disabled, error and success states when applicable.');
  criteria.push('Contrast and heading hierarchy are checked before merge.');

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
  if (Number.isFinite(weight) && weight >= 650) return 'emphasis or heading';
  if (Number.isFinite(size) && size <= 13) return 'caption/supporting text';
  if (Number.isFinite(size)) return 'body text';
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

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function inferButtonVariants(samples = {}) {
  const buttons = samples.buttons || [];
  const variants = [];
  if (buttons.length) variants.push('primary candidate from visible actions');
  if (buttons.some(button => button.disabled)) variants.push('disabled');
  return variants.join(', ') || 'none detected';
}

function inferLinkVariants(samples = {}) {
  const variants = ['default'];
  if ((samples.genericLinks || []).length) variants.push('generic-label risk');
  return variants.join(', ');
}

function inferFormFieldVariants(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  if (!count(counts.inputs)) return 'none detected';
  const variants = ['text/input candidate'];
  if ((samples.unlabeledInputs || []).length) variants.push('unlabeled');
  if ((samples.disabledControls || []).length) variants.push('disabled');
  return variants.join(', ');
}

function inferCtaGroupVariants(components = {}) {
  const groups = components.samples?.ctaGroups || [];
  if (!groups.length) return 'none detected';
  return groups.map(group => `${group.actions.length} action(s)`).join(', ');
}

function interactiveStates(type) {
  if (type === 'link') return 'default, hover, focus, visited, disabled if applicable';
  if (type === 'formField') return 'default, focus, filled, disabled, error, success, loading';
  return 'default, hover, focus, loading, disabled, error, success';
}

function buttonAccessibilityRisk(components = {}) {
  const disabled = components.samples?.disabledControls || [];
  if (disabled.length) return `${disabled.length} disabled control(s); verify recovery/microcopy`;
  return count(components.counts?.buttons) ? 'verify focus visible and accessible names' : 'unknown';
}

function linkAccessibilityRisk(components = {}) {
  const genericLinks = components.samples?.genericLinks || [];
  if (genericLinks.length) return `${genericLinks.length} generic link label(s)`;
  return count(components.counts?.links) ? 'verify focus visible and descriptive labels' : 'unknown';
}

function formFieldAccessibilityRisk(components = {}) {
  const unlabeled = components.samples?.unlabeledInputs || [];
  if (unlabeled.length) return `${unlabeled.length} field(s) without clear label`;
  return count(components.counts?.inputs) ? 'verify labels, help text and error state' : 'unknown';
}

function formAccessibilityRisk(components = {}) {
  if (!count(components.counts?.forms)) return 'unknown';
  if ((components.samples?.unlabeledInputs || []).length) return 'contains unlabeled field candidates';
  return 'verify submit, loading, success, error and privacy microcopy';
}

function ctaGroupAccessibilityRisk(components = {}) {
  if (!count(components.counts?.ctaGroups)) return 'unknown';
  return 'verify primary/secondary hierarchy and keyboard focus order';
}

function recommendComponent(instances, risk, promotionThreshold) {
  if (instances <= 0) return 'keep_local';
  if (risk && risk !== 'unknown' && !risk.startsWith('verify focus visible')) return 'needs_review';
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

function buildNextExperiment(hypotheses, behavioralMapping) {
  const top = hypotheses[0];
  if (top) return `${top.id}: ${top.title}. ${top.ifWe} Medir ${top.metrics.primary}; guardrails: ${top.metrics.guardrail.join(', ')}. Tipo: ${top.experimentType}.`;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Use the current page as baseline and validate ${weak.label} before changing the experience.` : 'Use the current page as baseline and validate the next measurable question before changing the experience.';
}

function buildHighConfidenceRisks(findings = []) {
  const risks = findings
    .filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority) && finding.type !== 'design_system_debt')
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidence: ${finding.evidence[0] || 'not available'}`);
  return risks.join('\n') || '- No se detectan fricciones UX de alta confianza.';
}

function buildManualReviewSummary(findings = [], behavioralMapping = []) {
  const reviewFindings = findings
    .filter(finding => finding.priority === 'Review' || finding.confidence === 'low')
    .map(finding => `- ${finding.title}: ${finding.rationale}`);
  const weakBlocks = getWeakBlocks(behavioralMapping)
    .map(block => `- Weak block ${block.label}: ${block.missing?.[0] || 'needs manual review'}`);
  return [...reviewFindings, ...weakBlocks].join('\n') || '- No manual review items detected beyond normal QA.';
}

function buildDesignSystemDebtSummary(findings = []) {
  return findings
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidence: ${finding.evidence[0] || 'not available'}`)
    .join('\n') || '- No design system debt findings detected.';
}

function buildRecommendedMetrics(hypotheses = []) {
  const primary = new Set();
  const secondary = new Set();
  const guardrail = new Set();

  for (const hypothesis of hypotheses) {
    if (hypothesis.metrics?.primary) primary.add(hypothesis.metrics.primary);
    for (const metric of hypothesis.metrics?.secondary || []) secondary.add(metric);
    for (const metric of hypothesis.metrics?.guardrail || []) guardrail.add(metric);
  }

  return [
    '### Primary',
    ...(primary.size ? Array.from(primary).map(metric => `- ${metric}`) : ['- primary task completion rate']),
    '',
    '### Secondary',
    ...(secondary.size ? Array.from(secondary).map(metric => `- ${metric}`) : ['- primary CTA CTR', '- bounce rate']),
    '',
    '### Guardrails',
    ...(guardrail.size ? Array.from(guardrail).map(metric => `- ${metric}`) : ['- no accessibility regressions'])
  ].join('\n');
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
