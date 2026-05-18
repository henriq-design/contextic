import { buildFindings } from './findings-prioritization.js';
import { generateHypotheses, generateReviewTasks } from './hypotheses.js';
import { behavioralBlockDisplayLabel } from './behavioral-model.js';

const TOOL_NAME = 'Contextic';
const LANGUAGE = 'es';

export function buildContexticReport(snapshot = {}) {
  const colors = snapshot.colors || {};
  const typography = snapshot.typography || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const scopeMap = snapshot.scopeMap || {
    regions: {},
    usedForBehavioral: [],
    excludedFromBehavioral: []
  };
  const pageClassification = snapshot.pageClassification || {
    archetype: 'unknown',
    confidence: 'low',
    signals: ['No hay clasificación de arquetipo disponible en el snapshot.'],
    analysisMode: 'snapshot_only'
  };
  const behavioralMapping = snapshot.behavioralMapping || [];
  const frictions = snapshot.frictions || [];
  const behavioralRecommendation = snapshot.behavioralRecommendation || {};
  const findings = snapshot.findings || buildFindings(snapshot);
  const hypotheses = snapshot.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = snapshot.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping, components });

  return {
    meta: {
      toolName: TOOL_NAME,
      version: snapshot.meta?.version || '',
      generatedAt: snapshot.meta?.generatedAt || '',
      sourceUrl: snapshot.meta?.url || snapshot.meta?.sourceUrl || '',
      language: LANGUAGE
    },
    screenSummary: {
      pageTitle: snapshot.meta?.title || '',
      detectedScreenType: inferScreenType(components, behavioralMapping),
      probableBusinessGoal: inferProbableBusinessGoal(components, behavioralMapping),
      primaryConversionAction: getPrimaryActionLabel(components),
      mainConversionRisk: getMainConversionRisk(frictions, behavioralMapping)
    },
    pageClassification,
    scopeMap,
    detectedTokens: {
      colors: colors.colors || [],
      systemHiddenVisualNoise: colors.systemHiddenVisualNoise || [],
      cssVariables: colors.cssVariables || [],
      typography: typography.typeStyles || [],
      typographySystemHiddenVisualNoise: typography.systemHiddenVisualNoise || [],
      spacing: spacing.spacingScale || [],
      radius: spacing.radii || [],
      shadows: spacing.shadows || [],
      borders: spacing.borders || []
    },
    detectedComponents: buildDetectedComponents(components),
    findings,
    hypotheses,
    reviewTasks,
    behavioralMapping: normalizeBehavioralMapping(behavioralMapping),
    uxFrictions: frictions.map(normalizeFrictionForReport),
    implementationRules: buildImplementationRules(behavioralRecommendation),
    metrics: buildMetrics(behavioralMapping, frictions, behavioralRecommendation),
    risks: buildRisks(frictions, behavioralRecommendation),
    nextExperiment: null
  };
}

export function buildJsonExport(snapshot = {}) {
  return JSON.stringify(buildContexticReport(snapshot), null, 2);
}

function inferProbableBusinessGoal(components, behavioralMapping) {
  const counts = components.counts || {};
  const hasAction = Number(counts.buttons) > 0 || Number(counts.links) > 0 || Number(counts.forms) > 0;
  const hasBehavioralAction = behavioralMapping.some(block => block.block === 'where' && block.present !== 'no');
  if (!hasAction && !hasBehavioralAction) return 'unknown';

  return {
    value: 'conversión o navegación hacia una acción principal',
    evidenceType: 'inference',
    evidence: ['Inferido desde componentes interactivos visibles y estructura behavioral.']
  };
}

function inferScreenType(components, behavioralMapping) {
  const counts = components.counts || {};
  if (counts.forms > 0 && behavioralMapping.some(block => block.block === 'where' && block.present !== 'no')) {
    return {
      value: 'Landing con formulario o captación',
      evidenceType: 'inference',
      evidence: ['Se detectan formularios y señales de acción en Dónde actuar (where).']
    };
  }
  if (counts.buttons > 0) {
    return {
      value: 'Landing / pantalla transaccional',
      evidenceType: 'inference',
      evidence: [`${counts.buttons} botón(es) o acciones detectadas.`]
    };
  }
  return 'unknown';
}

function getPrimaryActionLabel(components) {
  const first = (components.samples?.buttons || []).find(button => button.text);
  return first ? first.text : 'unknown';
}

function getMainConversionRisk(frictions, behavioralMapping) {
  if (frictions[0]) {
    return {
      value: frictions[0].title,
      evidenceType: frictions[0].evidenceType || 'inference',
      evidence: [frictions[0].evidence || frictions[0].hypothesis || 'Finding priorizado por Contextic.']
    };
  }

  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  if (!weak) return 'unknown';

  return {
    value: `Bloque ${weak.displayLabel || behavioralBlockDisplayLabel(weak.block)} (${weak.block}) débil o ausente`,
    evidenceType: 'inference',
    evidence: weak.missing?.length ? weak.missing : ['Inferido desde calidad/presencia del mapa behavioral.']
  };
}

function buildDetectedComponents(components) {
  const counts = components.counts || {};
  return [
    ['Button', counts.buttons],
    ['Link', counts.links],
    ['Form field', counts.inputs],
    ['Form', counts.forms],
    ['Card', counts.cards],
    ['Alert / live region', counts.alerts],
    ['Navigation', counts.navigation],
    ['Modal / dialog', counts.dialogs],
    ['Badge', counts.badges],
    ['CTA group', counts.ctaGroups],
    ['Image', counts.images]
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => ({ name, count, evidenceType: 'structural' }));
}

function normalizeBehavioralMapping(behavioralMapping) {
  return Object.fromEntries(behavioralMapping.map(block => [block.block, {
    block: block.block,
    label: block.label,
    displayLabel: block.displayLabel || behavioralBlockDisplayLabel(block.block),
    present: block.present,
    quality: block.quality,
    confidence: block.confidence || 'unknown',
    evidence: block.evidence || [],
    missing: block.missing || [],
    frictionType: block.frictionType || 'unknown',
    detectedFriction: block.detectedFriction || '',
    severity: block.severity ?? null,
    recommendation: block.recommendation || '',
    metrics: block.metrics || [],
    diagnostics: block.diagnostics || {}
  }]));
}

function normalizeFrictionForReport(friction) {
  return {
    id: friction.id || friction.ruleId || '',
    ruleId: friction.ruleId || friction.id || '',
    title: friction.title || '',
    block: friction.block || 'unknown',
    frictionType: friction.frictionType || friction.type || 'unknown',
    severity: friction.severity ?? friction.severityScore ?? null,
    confidence: friction.confidence || 'unknown',
    evidenceType: friction.evidenceType || 'inference',
    evidence: friction.evidence || '',
    observed: friction.observed || null,
    hypothesis: friction.hypothesis || '',
    recommendation: friction.recommendation || '',
    systemImplication: friction.systemImplication || '',
    expectedImpact: friction.expectedImpact || 'unknown',
    implementationEffort: friction.implementationEffort || 'unknown',
    priority: friction.priority || 'unknown',
    priorityScore: friction.priorityScore ?? null,
    metric: friction.metric || '',
    risk: friction.risk || '',
    recommendedPattern: friction.recommendedPattern || ''
  };
}

function buildImplementationRules(behavioralRecommendation) {
  return (behavioralRecommendation.sections || []).map(section => ({
    block: section.block,
    priority: section.priority || 'unknown',
    rules: section.implementationRules || [],
    accessibilityRules: section.accessibilityRules || [],
    recommendedComponents: section.recommendedComponents || []
  }));
}

function buildMetrics(behavioralMapping, frictions, behavioralRecommendation) {
  const metrics = new Set();
  for (const block of behavioralMapping) for (const metric of block.metrics || []) metrics.add(metric);
  for (const friction of frictions) if (friction.metric) metrics.add(friction.metric);
  for (const section of behavioralRecommendation.sections || []) for (const metric of section.metrics || []) metrics.add(metric);
  return Array.from(metrics);
}

function buildRisks(frictions, behavioralRecommendation) {
  const risks = [];
  for (const friction of frictions) {
    if (friction.risk) risks.push({ source: friction.id || friction.ruleId || friction.title, risk: friction.risk });
  }
  for (const section of behavioralRecommendation.sections || []) {
    for (const risk of section.risks || []) risks.push({ source: section.block || 'behavioral_structure', risk });
  }
  return risks;
}
