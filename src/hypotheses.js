export function generateHypotheses(findings = [], pageClassification = {}) {
  const rankedFindings = findings
    .filter(shouldCreateHypothesis)
    .sort(compareFindingsForHypotheses);
  const hypotheses = rankedFindings.slice(0, 5).map((finding, index) => findingToHypothesis(finding, pageClassification, index + 1));

  if (hypotheses.length) return hypotheses;

  return [baselineHypothesis(pageClassification)];
}

function shouldCreateHypothesis(finding) {
  if (!finding) return false;
  if (finding.type === 'design_system_debt') return true;
  return finding.priority !== 'Review' || finding.type === 'manual_review';
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

function baselineHypothesis(pageClassification) {
  const archetype = pageClassification.archetype || 'unknown';
  return {
    id: 'H1',
    title: 'Baseline manual review',
    because: 'No hay findings de alta confianza; la salida automática no debe inventar una recomendación de conversión.',
    weBelieve: `La página ${archetype} necesita una revisión de baseline antes de cambiar la experiencia.`,
    ifWe: 'Usamos el snapshot actual como baseline y validamos manualmente CTA, jerarquía, accesibilidad y eventos de analítica.',
    then: 'Podremos decidir qué hipótesis merece diseño, QA o experimento sin elevar señales débiles a prioridad crítica.',
    metrics: {
      primary: 'baseline completion rate or primary task success',
      secondary: ['primary CTA CTR', 'secondary action clicks', 'bounce rate'],
      guardrail: ['no accessibility regressions', 'no increase in rage/dead clicks']
    },
    segments: segmentsFor(pageClassification),
    confidence: 'low',
    effort: 'low',
    experimentType: 'design review'
  };
}

function hypothesisTitle(finding, isDesignSystem) {
  if (isDesignSystem) return `System hypothesis: ${finding.title}`;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) return `Clarify the primary CTA: ${finding.title}`;
  return `Test: ${finding.title}`;
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
  return 'Resolving this finding should improve user comprehension, confidence, or task progression.';
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
