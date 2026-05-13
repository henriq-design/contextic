import test from 'node:test';
import assert from 'node:assert/strict';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildFindings, groupFindings } from '../src/findings-prioritization.js';
import { buildDesignContextMarkdown } from '../src/export-markdown.js';

test('weak Where block without frictions does not generate P0', () => {
  const findings = buildFindings({
    frictions: [],
    behavioralMapping: [
      weakWhereBlock({ present: 'parcial', quality: 2 })
    ]
  });

  assert.equal(findings.some(finding => finding.priority === 'P0'), false);
  assert.equal(findings[0].priority, 'Review');
  assert.equal(findings[0].type, 'manual_review');
  assert.match(findings[0].rationale, /revisión manual/i);
});

test('absent CTA in landing can generate P0 with blocker evidence', () => {
  const friction = createBehavioralFinding({
    id: 'where.no-primary-cta-in-hero',
    title: 'No hay CTA primario visible en el primer bloque',
    block: 'where',
    frictionType: 'baja_accionabilidad',
    severity: 5,
    confidence: 'media',
    evidenceType: 'structural',
    evidence: 'No se detecta CTA primario ni formulario visible en el primer bloque.',
    recommendation: 'Añade una acción primaria visible en el primer bloque.',
    expectedImpact: 'high',
    implementationEffort: 'medium'
  });
  const findings = buildFindings({ frictions: [friction], behavioralMapping: [] });

  assert.equal(findings[0].priority, 'P0');
  assert.equal(findings[0].type, 'interaction_risk');
  assert.match(findings[0].rationale, /severidad 5/);
});

test('inconsistent radii become design system priority, not conversion P', () => {
  const friction = {
    id: 'design.radius-drift',
    ruleId: 'design.radius-drift',
    title: 'Inconsistencia en radios de borde',
    block: 'where',
    type: 'baja_accionabilidad',
    severityScore: 3,
    confidence: 'media',
    evidence: '8 valores únicos de radio.',
    expectedImpact: 'medium',
    implementationEffort: 'medium'
  };
  const findings = buildFindings({ frictions: [friction], behavioralMapping: [] });
  const grouped = groupFindings(findings);

  assert.equal(findings[0].priority, 'DS-P2');
  assert.equal(findings[0].type, 'design_system_debt');
  assert.equal(grouped.designSystem.length, 1);
  assert.equal(grouped.ux.length, 0);
});

test('markdown keeps weak blocks out of P0 prioritized follow-up', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot({
    frictions: [],
    behavioralMapping: [weakWhereBlock({ present: 'parcial', quality: 2 })]
  }));

  assert.match(markdown, /Weak block: Where/);
  assert.match(markdown, /Review/);
  assert.doesNotMatch(markdown, /\| P0 \| Reforzar Where/);
});

function weakWhereBlock(overrides = {}) {
  return {
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
    metrics: ['CTR del CTA principal'],
    ...overrides
  };
}

function createSnapshot(overrides = {}) {
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
    pageClassification: {
      archetype: 'landing',
      confidence: 'medium',
      signals: ['Fixture landing.'],
      analysisMode: 'full_behavioral'
    },
    scopeMap: { regions: { main: 1 }, usedForBehavioral: ['main'], excludedFromBehavioral: [] },
    behavioralRecommendation: { sections: [] },
    ...overrides
  };
}
