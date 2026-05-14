import { behavioralBlockDisplayLabel } from './behavioral-model.js';

const FINDING_TYPES = new Set([
  'conversion_risk',
  'content_gap',
  'interaction_risk',
  'accessibility_risk',
  'design_system_debt',
  'semantic_inference_risk',
  'instrumentation_gap',
  'manual_review'
]);

const CRITICAL_BLOCKER_RULES = new Set([
  'where.no-primary-cta-in-hero'
]);

export function buildFindings(snapshot = {}) {
  const frictions = snapshot.frictions || [];
  const behavioralMapping = snapshot.behavioralMapping || [];
  const findings = [
    ...frictions.map(frictionToFinding),
    ...weakBlocksToReviewFindings(behavioralMapping)
  ];

  return findings.sort(compareFindings);
}

export function groupFindings(findings = []) {
  return {
    ux: findings.filter(finding => ['conversion_risk', 'content_gap', 'interaction_risk', 'semantic_inference_risk', 'instrumentation_gap'].includes(finding.type)),
    designSystem: findings.filter(finding => finding.type === 'design_system_debt'),
    accessibility: findings.filter(finding => finding.type === 'accessibility_risk'),
    manualReview: findings.filter(finding => finding.type === 'manual_review')
  };
}

function frictionToFinding(friction = {}) {
  const type = inferFindingType(friction);
  const severity = normalizeSeverity(friction.severityScore ?? friction.severity);
  const confidence = normalizeConfidence(friction.confidence);
  const impact = normalizeImpact(friction.expectedImpact);
  const effort = normalizeEffort(friction.implementationEffort);

  return createFinding({
    id: friction.id || friction.ruleId || slugify(friction.title),
    type,
    title: friction.title || 'Hallazgo UX',
    evidence: normalizeEvidence(friction),
    affectedArea: type === 'design_system_debt' ? (friction.affectedArea || designSystemAffectedArea(friction)) : (friction.block || friction.affectedArea || 'screen'),
    severity,
    confidence,
    impact,
    effort,
    priority: assignPriority({ friction, type, severity, confidence, impact }),
    rationale: buildRationale({ friction, type, severity, confidence, impact }),
    recommendation: friction.recommendation || '',
    metric: friction.metric || '',
    proposedChange: friction.proposedChange || friction.recommendation || ''
  });
}

function weakBlocksToReviewFindings(behavioralMapping = []) {
  return behavioralMapping
    .filter(block => block.present === 'no' || block.quality <= 2)
    .map(block => createFinding({
      id: `review.weak-block.${block.block}`,
      type: 'manual_review',
      title: `Bloque a revisar: ${block.displayLabel || behavioralBlockDisplayLabel(block.block)} (${block.block})`,
      evidence: [
        ...(block.evidence || []).slice(0, 2),
        ...(block.missing || []).slice(0, 2)
      ].filter(Boolean),
      affectedArea: block.block || 'behavioral_block',
      severity: block.quality <= 1 ? 2 : 1,
      confidence: 'low',
      impact: 'medium',
      effort: 'medium',
      priority: 'Review',
      rationale: block.missing?.[0] || 'Bloque behavioral débil sin fricción heurística fuerte; se mantiene como revisión manual, no como bloqueo crítico.'
    }));
}

function createFinding(input = {}) {
  return {
    id: input.id || '',
    type: FINDING_TYPES.has(input.type) ? input.type : 'manual_review',
    title: input.title || 'Finding',
    evidence: Array.isArray(input.evidence) ? input.evidence : [input.evidence].filter(Boolean),
    affectedArea: input.affectedArea || 'screen',
    severity: normalizeSeverity(input.severity),
    confidence: normalizeConfidence(input.confidence),
    impact: normalizeImpact(input.impact),
    effort: normalizeEffort(input.effort),
    priority: input.priority || 'Review',
    rationale: input.rationale || 'Prioridad asignada por evidencia, severidad, confianza e impacto.',
    recommendation: input.recommendation || '',
    metric: input.metric || '',
    proposedChange: input.proposedChange || ''
  };
}

function assignPriority({ friction, type, severity, confidence, impact }) {
  if (type === 'design_system_debt') return severity >= 4 ? 'DS-P1' : 'DS-P2';
  if (confidence === 'low') return 'Review';

  if (isCriticalBlocker(friction, type, severity, confidence)) return 'P0';
  if (type === 'accessibility_risk' && severity >= 5 && confidence !== 'low') return 'P0';

  if (['conversion_risk', 'interaction_risk', 'accessibility_risk'].includes(type) && severity >= 4 && ['medium', 'high'].includes(confidence)) return 'P1';
  if (type === 'content_gap' && severity >= 4 && confidence === 'high') return 'P1';
  if (impact === 'high' && severity >= 3) return 'P2';
  if (severity >= 3) return 'P2';
  return 'P3';
}

function isCriticalBlocker(friction, type, severity, confidence) {
  const id = friction.ruleId || friction.id || '';
  const text = `${friction.title || ''} ${friction.evidence || ''} ${friction.insight || ''}`.toLowerCase();
  if (CRITICAL_BLOCKER_RULES.has(id) && severity >= 5 && confidence !== 'low') return true;
  if (type !== 'conversion_risk' && type !== 'interaction_risk') return false;
  if (severity < 5 || confidence === 'low') return false;
  return /cta.*(ausente|roto)|formulario.*(inutilizable|bloqueado)|error funcional|layout roto|navegaci[oó]n bloqueante|contraste cr[ií]tico|no hay cta/i.test(text);
}

function buildRationale({ friction, type, severity, confidence, impact }) {
  const evidence = normalizeEvidence(friction)[0] || 'evidencia heurística limitada';
  if (type === 'design_system_debt') {
    return `Deuda de sistema de diseño: prioridad DS basada en severidad ${severity}, confianza ${confidence} y evidencia técnica: ${evidence}`;
  }
  if (confidence === 'low') {
    return `Señal ambigua o de baja confianza; requiere revisión manual antes de priorizar. Evidencia: ${evidence}`;
  }
  return `Prioridad basada en severidad ${severity}, confianza ${confidence}, impacto ${impact} y evidencia: ${evidence}`;
}

function inferFindingType(friction) {
  const id = friction.ruleId || friction.id || '';
  const title = String(friction.title || '').toLowerCase();
  const type = friction.type || friction.frictionType || '';

  if (/spacing|radius|color|palette|radio|espaciado|paleta|token/.test(id + title)) return 'design_system_debt';
  if (/alt|unlabeled|label|disabled|focus|contrast|contraste|accesibilidad/.test(id + title)) return 'accessibility_risk';
  if (/where\.|cta|form|input|navigation|navegaci[oó]n|acción|accionabilidad/.test(id + title)) return 'interaction_risk';
  if (/what\.|why\.|ambiguedad|ambigüedad|copy|contenido|propuesta/.test(id + title + type)) return 'content_gap';
  if (/inference|semantic|heuristic/.test(String(friction.evidenceType || ''))) return 'semantic_inference_risk';
  return 'conversion_risk';
}

function designSystemAffectedArea(friction = {}) {
  const text = `${friction.ruleId || friction.id || ''} ${friction.title || ''}`.toLowerCase();
  if (/spacing|espaciado/.test(text)) return 'spacing scale / layout tokens';
  if (/radius|radio/.test(text)) return 'radius / component tokens';
  if (/color|paleta/.test(text)) return 'color tokens';
  return 'design system tokens';
}

function normalizeEvidence(friction) {
  const evidence = [];
  if (Array.isArray(friction.evidence)) evidence.push(...friction.evidence);
  else if (friction.evidence) evidence.push(friction.evidence);
  if (friction.observed?.samples?.length) evidence.push(`Muestras: ${friction.observed.samples.join(', ')}`);
  if (friction.hypothesis) evidence.push(friction.hypothesis);
  return evidence.filter(Boolean);
}

function normalizeSeverity(value = 3) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.min(5, value));
  const normalized = String(value || '').toLowerCase();
  return { baja: 2, media: 3, alta: 4, critica: 5, crítica: 5 }[normalized] || 3;
}

function normalizeConfidence(value = 'medium') {
  const normalized = String(value || '').toLowerCase();
  return { baja: 'low', low: 'low', media: 'medium', medium: 'medium', alta: 'high', high: 'high' }[normalized] || 'medium';
}

function normalizeImpact(value = 'medium') {
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function normalizeEffort(value = 'medium') {
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function compareFindings(a, b) {
  const priorityOrder = { P0: 0, P1: 1, 'DS-P1': 2, P2: 3, 'DS-P2': 4, P3: 5, Review: 6 };
  return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) || b.severity - a.severity;
}

function slugify(value = 'finding') {
  return String(value || 'finding').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
