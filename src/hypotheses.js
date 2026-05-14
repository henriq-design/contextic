export function generateHypotheses(findings = [], pageClassification = {}, context = {}) {
  const behavioralHypotheses = hypothesesFromBehavioralMapping(context.behavioralMapping || [], pageClassification);
  const rankedFindings = findings
    .filter(finding => shouldCreateHypothesis(finding))
    .sort(compareFindingsForHypotheses)
    .slice(0, Math.max(0, 5 - behavioralHypotheses.length))
    .map((finding, index) => findingToHypothesis(finding, pageClassification, behavioralHypotheses.length + index + 1));

  return [...behavioralHypotheses, ...rankedFindings].map((hypothesis, index) => ({
    ...hypothesis,
    id: `H${index + 1}`
  }));
}

export function generateReviewTasks(findings = [], pageClassification = {}, context = {}) {
  const tasks = [];
  const actionableHypothesisAreas = new Set(hypothesesFromBehavioralMapping(context.behavioralMapping || [], pageClassification).map(hypothesis => hypothesis.affectedArea).filter(Boolean));

  for (const finding of findings) {
    if (!finding) continue;
    if (shouldCreateHypothesis(finding)) continue;
    tasks.push(findingToReviewTask(finding));
  }

  for (const block of context.behavioralMapping || []) {
    if (!['who', 'how', 'where', 'when'].includes(block.block)) continue;
    if (actionableHypothesisAreas.has(block.block)) continue;
    if (block.present === 'sí' && block.quality >= 4 && !(block.missing || []).length) continue;
    tasks.push(blockToReviewTask(block));
  }

  if (!tasks.length) tasks.push(baselineReviewTask(pageClassification));
  return dedupeTasks(tasks).slice(0, 6).map((task, index) => ({ id: `R${index + 1}`, ...task }));
}

function shouldCreateHypothesis(finding) {
  if (!finding) return false;
  if (finding.type === 'manual_review' && finding.confidence === 'low') return hasActionableExperimentInputs(finding);
  if (finding.confidence === 'low' && finding.priority === 'Review') return hasActionableExperimentInputs(finding);
  if (finding.type === 'design_system_debt') return hasConcreteEvidence(finding) && hasPrimaryMetric(finding);
  return hasConcreteEvidence(finding) && hasPrimaryMetric(finding) && (['medium', 'high'].includes(finding.confidence) || finding.impact === 'high');
}

function findingToHypothesis(finding, pageClassification, number) {
  const isManual = finding.priority === 'Review' || finding.confidence === 'low';
  const isDesignSystem = finding.type === 'design_system_debt';
  const metrics = metricsForFinding(finding, pageClassification);

  return {
    id: `H${number}`,
    title: hypothesisTitle(finding, isDesignSystem),
    because: becauseText(finding),
    weBelieve: beliefText(finding, isDesignSystem),
    ifWe: interventionText(finding, isDesignSystem, isManual),
    then: outcomeText(finding, isDesignSystem),
    metrics,
    segments: segmentsFor(pageClassification),
    confidence: finding.confidence || 'low',
    effort: finding.effort || 'medium',
    experimentType: experimentTypeFor(finding, isDesignSystem, isManual)
  };
}

function hypothesesFromBehavioralMapping(behavioralMapping = [], pageClassification = {}) {
  const where = behavioralMapping.find(block => block.block === 'where');
  const primary = where?.diagnostics?.ctaAssessment?.primary;
  if (!primary?.label) return [];
  if (!/acceso\s+a\s+mi\s+seguro/i.test(primary.label)) return [];

  return [{
    id: 'H1',
    affectedArea: 'where',
    title: 'Validate hero CTA intent',
    because: `El CTA principal visible es "${primary.label}".`,
    weBelieve: 'Si el objetivo de la landing es captación, el CTA puede parecer orientado a clientes existentes.',
    ifWe: 'Probamos CTA primario de contratación/simulación y movemos "Acceso a mi seguro" a secundario.',
    then: 'Debería mejorar el CTR del CTA primario y la progresión al flujo objetivo.',
    metrics: {
      primary: 'primary CTA CTR',
      secondary: ['qualified conversion rate', 'secondary CTA clicks', 'bounce'],
      guardrail: ['accessibility regressions']
    },
    segments: segmentsFor(pageClassification),
    confidence: where.confidence === 'high' ? 'high' : 'medium',
    effort: 'medium',
    experimentType: 'A/B test'
  }];
}

function baselineReviewTask(pageClassification) {
  const archetype = pageClassification.archetype || 'unknown';
  return {
    question: `¿La página ${archetype} tiene una acción principal, audiencia y promesa suficientemente claras para proponer un experimento?`,
    evidence: ['No hay hipótesis accionables con evidencia, cambio propuesto y métrica clara.'],
    whyItMatters: 'Evita convertir señales débiles en recomendaciones de producto prematuras.',
    howToValidate: 'Revisar CTA principal, jerarquía, audiencia, copy post-CTA y eventos de analítica antes de diseñar variantes.',
    owner: 'product'
  };
}

function hypothesisTitle(finding, isDesignSystem) {
  if (isDesignSystem) return `System hypothesis: ${finding.title}`;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) return `Clarify the primary CTA: ${finding.title}`;
  return `Test: ${finding.title}`;
}

function hasActionableExperimentInputs(finding) {
  return hasConcreteEvidence(finding) && hasProposedChange(finding) && hasPrimaryMetric(finding) && (['medium', 'high'].includes(finding.confidence) || finding.impact === 'high');
}

function hasConcreteEvidence(finding) {
  const evidence = finding.evidence || [];
  return evidence.some(item => /["“”]|#[\w-]+|\.|cta|bot[oó]n|label|form|input|color|px|\d/.test(String(item || '').toLowerCase()));
}

function hasProposedChange(finding) {
  const text = `${finding.proposedChange || ''} ${finding.recommendation || ''} ${finding.rationale || ''} ${finding.title || ''}`.toLowerCase();
  return /\b(probar|cambiar|mover|sustituir|añadir|eliminar|reordenar|definir|consolidar|fix|replace|test|cta primario|cta principal|primary cta)\b/.test(text);
}

function hasPrimaryMetric(finding) {
  if (finding.primaryMetric) return true;
  if (finding.metric) return true;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title || '')) return true;
  if (finding.type === 'design_system_debt') return true;
  if (finding.type === 'accessibility_risk') return true;
  return false;
}

function findingToReviewTask(finding) {
  return {
    question: reviewQuestionForFinding(finding),
    evidence: finding.evidence?.length ? finding.evidence : [finding.rationale || 'Señal de baja confianza sin evidencia suficiente para experimento.'],
    whyItMatters: reviewWhyForFinding(finding),
    howToValidate: reviewValidationForFinding(finding),
    owner: reviewOwnerForFinding(finding)
  };
}

function blockToReviewTask(block) {
  return {
    question: reviewQuestionForBlock(block),
    evidence: [...(block.evidence || []), ...(block.missing || [])].filter(Boolean),
    whyItMatters: reviewWhyForBlock(block),
    howToValidate: reviewValidationForBlock(block),
    owner: reviewOwnerForBlock(block)
  };
}

function reviewQuestionForFinding(finding) {
  if (finding.affectedArea === 'where') return '¿La acción principal es visible, jerárquica y coherente con el objetivo real de la página?';
  if (finding.affectedArea === 'who') return '¿El usuario objetivo está suficientemente identificado sin inventar un segmento?';
  if (finding.affectedArea === 'how') return '¿La página explica qué ocurre después del CTA con suficiente precisión?';
  return `¿La señal "${finding.title}" requiere una intervención concreta o solo seguimiento manual?`;
}

function reviewWhyForFinding(finding) {
  if (finding.affectedArea === 'where') return 'Un CTA ambiguo puede dividir intención o medir clics que no representan progresión real.';
  if (finding.affectedArea === 'who') return 'Una audiencia mal inferida puede llevar a copy demasiado específico o incorrecto.';
  if (finding.affectedArea === 'how') return 'Sin expectativa post-CTA, el usuario puede percibir más esfuerzo o riesgo.';
  return 'La señal no tiene todavía suficiente evidencia para convertirse en experimento.';
}

function reviewValidationForFinding(finding) {
  if (finding.affectedArea === 'where') return 'Comprobar label, destino, jerarquía visual, eventos de clic y relación con el objetivo de negocio.';
  if (finding.affectedArea === 'who') return 'Contrastar con briefing, tráfico esperado y lenguaje real del usuario antes de ajustar copy.';
  if (finding.affectedArea === 'how') return 'Revisar flujo tras clic, alta, contratación, gestión, activación y mensajes de confirmación.';
  return 'Recoger evidencia DOM/copy/analytics adicional y definir cambio + métrica antes de proponer hipótesis.';
}

function reviewOwnerForFinding(finding) {
  if (finding.type === 'accessibility_risk') return 'dev';
  if (finding.affectedArea === 'who' || finding.type === 'content_gap') return 'content';
  if (finding.affectedArea === 'where') return 'design';
  return 'product';
}

function reviewQuestionForBlock(block) {
  if (block.block === 'who') return '¿El target funcional detectado equivale a un público objetivo suficiente para esta landing?';
  if (block.block === 'how') return '¿La estructura de pasos explica también qué ocurre después del CTA?';
  if (block.block === 'where') return '¿Hay un CTA primario claro en hero/main y su label coincide con el objetivo de la página?';
  if (block.block === 'when') return '¿Existe un motivo temporal real para actuar ahora o solo límites de valor/cobertura?';
  return `¿El bloque ${block.displayLabel || block.block} necesita una intervención concreta?`;
}

function reviewWhyForBlock(block) {
  if (block.block === 'where') return 'Sin label/destino claro no hay base suficiente para diseñar una variante de CTA.';
  if (block.block === 'how') return 'Una estructura de pasos puede ser útil, pero no garantiza claridad sobre contratación, alta o activación.';
  if (block.block === 'who') return 'El target funcional ayuda a relevancia, pero puede no sustituir una persona o segmento comercial.';
  if (block.block === 'when') return 'La urgencia artificial puede sesgar decisiones y dañar confianza.';
  return 'Las señales parciales deben validarse antes de convertirse en hipótesis.';
}

function reviewValidationForBlock(block) {
  if (block.block === 'where') return 'Registrar CTA candidates con label, destino, región, jerarquía y eventos antes de proponer test.';
  if (block.block === 'how') return 'Validar con producto/contenido el flujo posterior al CTA: alta, contratación, gestión, activación y confirmación.';
  if (block.block === 'who') return 'Comprobar si el caso de uso detectado aparece en briefing, campañas o segmentación de tráfico.';
  if (block.block === 'when') return 'Separar límites de cobertura/precio de urgencia real basada en fechas o promoción verificable.';
  return 'Definir evidencia concreta, cambio propuesto y métrica primaria.';
}

function reviewOwnerForBlock(block) {
  if (block.block === 'who' || block.block === 'how') return 'content';
  if (block.block === 'where') return 'design';
  if (block.block === 'when') return 'product';
  return 'product';
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter(task => {
    const key = task.question;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function becauseText(finding) {
  return finding.evidence?.length
    ? finding.evidence.slice(0, 2).join('; ')
    : finding.rationale || 'Contextic detected a review signal without strong evidence.';
}

function beliefText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'A clearer component/token decision will improve implementation consistency and reduce future UI drift.';
  }
  if (finding.affectedArea === 'where') {
    return 'Users may hesitate or split attention when the primary action does not clearly match the page objective.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Fixing the accessibility risk will improve task completion without reducing comprehension or conversion.';
  }
  return 'La intervención propuesta debe cambiar una señal observable ligada a la métrica primaria definida.';
}

function interventionText(finding, isDesignSystem, isManual) {
  if (isDesignSystem) {
    return 'Define or consolidate the affected token/component rule, document it, and verify affected components against the rule.';
  }
  if (isManual && finding.affectedArea === 'where') {
    return 'Review the clarity of the primary CTA, validate whether it answers the page objective, and compare it against secondary actions.';
  }
  if (finding.affectedArea === 'where') {
    return 'Make the primary CTA copy, hierarchy, and placement match the main page objective while keeping secondary actions visibly secondary.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Fix the accessibility issue and run keyboard/screen-reader and regression checks on the affected component.';
  }
  return 'Create a focused variant or review pass that addresses only this finding and preserves the current design baseline.';
}

function outcomeText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'Implementation effort and UI inconsistency should decrease without changing product or content claims.';
  }
  if (finding.affectedArea === 'where') {
    return 'Primary CTA engagement should improve while secondary clicks and bounce do not worsen.';
  }
  return 'The affected user task should become clearer or safer without harming guardrail metrics.';
}

function metricsForFinding(finding, pageClassification) {
  if (finding.type === 'design_system_debt') {
    return {
      primary: 'component/token reuse rate',
      secondary: ['number of one-off styles', 'implementation time for affected component'],
      guardrail: ['no visual regressions in affected states', 'no accessibility regressions']
    };
  }

  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) {
    return {
      primary: 'primary CTA CTR',
      secondary: ['secondary action clicks', 'conversion rate', 'bounce rate'],
      guardrail: ['no increase in form abandonment', 'no accessibility regressions']
    };
  }

  if (finding.type === 'accessibility_risk') {
    return {
      primary: 'task completion rate for affected interaction',
      secondary: ['keyboard completion rate', 'form completion rate', 'error recovery rate'],
      guardrail: ['no contrast regressions', 'no focus order regressions']
    };
  }

  return {
    primary: primaryMetricForPage(pageClassification),
    secondary: ['primary CTA CTR', 'scroll depth to affected block', 'bounce rate'],
    guardrail: ['no accessibility regressions', 'no increase in support/error events']
  };
}

function primaryMetricForPage(pageClassification) {
  if (['landing', 'service_landing'].includes(pageClassification.archetype)) return 'qualified conversion rate';
  if (pageClassification.archetype === 'article_or_blog') return 'engaged reading completion';
  if (pageClassification.archetype === 'ecommerce_category') return 'product detail click-through rate';
  return 'primary task completion rate';
}

function experimentTypeFor(finding, isDesignSystem, isManual) {
  if (isDesignSystem) return 'QA audit';
  if (isManual) return finding.confidence === 'low' ? 'design review' : 'analytics review';
  if (finding.type === 'accessibility_risk') return 'QA audit';
  if (finding.confidence === 'high' && ['conversion_risk', 'interaction_risk', 'content_gap'].includes(finding.type)) return 'A/B test';
  if (finding.confidence === 'medium') return 'usability test';
  return 'analytics review';
}

function segmentsFor(pageClassification) {
  const archetype = pageClassification.archetype || 'unknown';
  if (['landing', 'service_landing'].includes(archetype)) return ['new visitors', 'returning visitors', 'mobile users'];
  if (archetype === 'ecommerce_category') return ['category browsers', 'mobile users'];
  return ['all users', 'mobile users'];
}

function compareFindingsForHypotheses(a, b) {
  const priorityOrder = { P0: 0, P1: 1, 'DS-P1': 2, P2: 3, 'DS-P2': 4, P3: 5, Review: 6 };
  return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) || b.severity - a.severity;
}
