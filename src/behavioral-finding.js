const IMPACT_WEIGHTS = { low: 1, medium: 2, high: 3 };
const EFFORT_WEIGHTS = { low: 1, medium: 2, high: 3 };
const SEVERITY_SCORES = { baja: 2, media: 3, alta: 4, critica: 5 };

export function calculatePriority({ severity = 3, expectedImpact = 'medium', implementationEffort = 'medium' } = {}) {
  const severityScore = normalizeSeverityScore(severity);
  const impactWeight = IMPACT_WEIGHTS[expectedImpact] || IMPACT_WEIGHTS.medium;
  const effortWeight = EFFORT_WEIGHTS[implementationEffort] || EFFORT_WEIGHTS.medium;
  const priorityScore = Math.round((severityScore * impactWeight / effortWeight) * 100) / 100;
  const priority = priorityScore >= 9 ? 'P0' : priorityScore >= 5 ? 'P1' : 'P2';

  return { priority, priorityScore, severityScore };
}

export function createBehavioralFinding(input = {}) {
  const expectedImpact = input.expectedImpact || 'medium';
  const implementationEffort = input.implementationEffort || 'medium';
  const severityScore = normalizeSeverityScore(input.severityScore ?? input.severity);
  const priority = calculatePriority({ severity: severityScore, expectedImpact, implementationEffort });
  const evidence = input.evidence || '';
  const hypothesis = input.hypothesis || toHypothesis(input.insight || evidence);
  const frictionType = input.frictionType || input.type || 'ambiguedad';
  const frictionLabel = input.frictionLabel || input.typeLabel || frictionType;

  return {
    id: input.id || input.ruleId || '',
    ruleId: input.ruleId || input.id || '',
    ruleVersion: input.ruleVersion || '',
    title: input.title || 'Hallazgo behavioral',
    block: input.block || 'what',
    affectedBlocks: input.affectedBlocks || [],
    frictionType,
    frictionLabel,
    type: frictionType,
    typeLabel: frictionLabel,
    severity: severityScore,
    severityScore,
    confidence: input.confidence || 'media',
    evidenceType: input.evidenceType || 'inference',
    evidence,
    observed: input.observed || null,
    hypothesis,
    insight: input.insight || hypothesis,
    risk: input.risk || '',
    principle: input.principle || '',
    recommendation: input.recommendation || '',
    systemImplication: input.systemImplication || '',
    recommendedPattern: input.recommendedPattern || '',
    expectedImpact,
    implementationEffort,
    priority: priority.priority,
    priorityScore: priority.priorityScore,
    metric: input.metric || '',
    signal: input.signal || '',
    falsePositiveNotes: input.falsePositiveNotes || ''
  };
}

function normalizeSeverityScore(severity = 3) {
  if (typeof severity === 'number' && Number.isFinite(severity)) return Math.max(1, Math.min(5, severity));
  return SEVERITY_SCORES[severity] || 3;
}

function toHypothesis(signal = '') {
  if (!signal) return 'Podría existir una fricción conductual que requiere validación de producto/diseño.';
  return `Podría existir una fricción conductual asociada a esta señal: ${signal}`;
}
