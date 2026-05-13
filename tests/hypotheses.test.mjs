import test from 'node:test';
import assert from 'node:assert/strict';

import { generateHypotheses } from '../src/hypotheses.js';
import { buildDesignContextMarkdown } from '../src/export-markdown.js';

const landing = {
  archetype: 'landing',
  confidence: 'medium',
  analysisMode: 'full_behavioral',
  signals: ['Landing fixture.']
};

test('conversion finding generates measurable hypothesis with guardrails', () => {
  const hypotheses = generateHypotheses([
    {
      id: 'where.cta-clarity',
      type: 'conversion_risk',
      title: 'CTA principal poco claro',
      evidence: ['CTA detectado: "Enviar".'],
      affectedArea: 'where',
      severity: 4,
      confidence: 'high',
      impact: 'high',
      effort: 'low',
      priority: 'P1',
      rationale: 'CTA de alto impacto con evidencia textual.'
    }
  ], landing);

  assert.equal(hypotheses[0].id, 'H1');
  assert.equal(hypotheses[0].metrics.primary, 'primary CTA CTR');
  assert.ok(hypotheses[0].metrics.guardrail.length > 0);
  assert.equal(hypotheses[0].experimentType, 'A/B test');
  assert.match(hypotheses[0].ifWe, /primary CTA/i);
});

test('design system debt creates system hypothesis, not conversion hypothesis', () => {
  const hypotheses = generateHypotheses([
    {
      id: 'design.radius-drift',
      type: 'design_system_debt',
      title: 'Inconsistencia en radios de borde',
      evidence: ['8 valores únicos de radio.'],
      affectedArea: 'radius',
      severity: 3,
      confidence: 'medium',
      impact: 'medium',
      effort: 'medium',
      priority: 'DS-P2',
      rationale: 'Deuda de sistema.'
    }
  ], landing);

  assert.equal(hypotheses[0].experimentType, 'QA audit');
  assert.equal(hypotheses[0].metrics.primary, 'component/token reuse rate');
  assert.doesNotMatch(hypotheses[0].then, /conversion/i);
});

test('no high-confidence finding returns baseline manual review hypothesis', () => {
  const hypotheses = generateHypotheses([], landing);

  assert.equal(hypotheses[0].title, 'Baseline manual review');
  assert.equal(hypotheses[0].experimentType, 'design review');
  assert.ok(hypotheses[0].metrics.guardrail.length > 0);
});

test('weak Where block markdown uses baseline validation, not maintain-current generic copy', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  assert.match(markdown, /## Hypotheses and experiments/);
  assert.match(markdown, /Review the clarity of the primary CTA|review the clarity of the primary CTA/i);
  assert.match(markdown, /primary CTA CTR/);
  assert.match(markdown, /bounce rate/);
  assert.doesNotMatch(markdown, /Mantener la versión actual/);
});

function createSnapshot() {
  return {
    meta: {
      url: 'https://example.com',
      title: 'Landing fixture',
      generatedAt: '2026-05-09T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    colors: { colors: [], cssVariables: [] },
    typography: { typeStyles: [], fontFamilies: [] },
    spacing: { spacingScale: [], radii: [], shadows: [], borders: [] },
    components: {
      counts: { buttons: 1, links: 0, inputs: 0, forms: 0, cards: 0, alerts: 0, navigation: 0, images: 0, badges: 0, dialogs: 0, ctaGroups: 0 },
      samples: { buttons: [{ text: 'Ver más' }], unlabeledInputs: [], disabledControls: [], genericLinks: [], imagesWithoutAlt: [], badges: [], dialogs: [], ctaGroups: [] }
    },
    pageClassification: landing,
    scopeMap: { regions: { main: 1 }, usedForBehavioral: ['main'], excludedFromBehavioral: [] },
    frictions: [],
    behavioralMapping: [
      {
        block: 'where',
        label: 'Where',
        present: 'parcial',
        quality: 2,
        evidence: ['CTA detectado con baja jerarquía.'],
        missing: ['La acción principal requiere revisión manual.'],
        frictionType: 'Baja accionabilidad',
        detectedFriction: '',
        severity: 2,
        recommendation: 'Revisar jerarquía de acción antes de priorizar.',
        metrics: ['CTR del CTA principal']
      }
    ],
    behavioralRecommendation: { sections: [] }
  };
}
