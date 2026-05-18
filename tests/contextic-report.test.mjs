import test from 'node:test';
import assert from 'node:assert/strict';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildContexticReport, buildJsonExport } from '../src/contextic-report.js';

test('buildContexticReport returns the expected root keys', () => {
  const report = buildContexticReport(createSnapshot());

  assert.deepEqual(Object.keys(report), [
    'meta',
    'screenSummary',
    'pageClassification',
    'scopeMap',
    'detectedTokens',
    'detectedComponents',
    'findings',
    'hypotheses',
    'reviewTasks',
    'behavioralMapping',
    'uxFrictions',
    'implementationRules',
    'metrics',
    'risks',
    'nextExperiment'
  ]);

  assert.equal(report.meta.toolName, 'Contextic');
  assert.equal(report.meta.language, 'es');
  assert.equal(report.pageClassification.archetype, 'landing');
});

test('uxFrictions preserves normalized behavioral findings', () => {
  const finding = createBehavioralFinding({
    id: 'where.multiple-primary-actions',
    title: 'Acciones primarias compitiendo',
    block: 'where',
    frictionType: 'baja_accionabilidad',
    severity: 4,
    confidence: 'media',
    evidenceType: 'structural',
    evidence: '2 acciones prominentes.',
    recommendation: 'Mantener una acción primaria.',
    systemImplication: 'Gobernar variantes de botón.',
    expectedImpact: 'high',
    implementationEffort: 'low',
    metric: 'CTR del CTA principal'
  });

  const report = buildContexticReport(createSnapshot({ frictions: [finding] }));

  assert.equal(report.uxFrictions.length, 1);
  assert.equal(report.uxFrictions[0].id, 'where.multiple-primary-actions');
  assert.equal(report.uxFrictions[0].frictionType, 'baja_accionabilidad');
  assert.equal(report.uxFrictions[0].priority, 'P0');
  assert.equal(report.uxFrictions[0].metric, 'CTR del CTA principal');
});

test('unknown fields stay unknown or null instead of being invented', () => {
  const report = buildContexticReport(createSnapshot({
    components: { counts: {}, samples: { buttons: [] } },
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  }));

  assert.equal(report.screenSummary.primaryConversionAction, 'unknown');
  assert.equal(report.screenSummary.probableBusinessGoal, 'unknown');
  assert.equal(report.screenSummary.detectedScreenType, 'unknown');
  assert.equal(report.screenSummary.mainConversionRisk, 'unknown');
  assert.equal(report.nextExperiment, null);
});

test('report and JSON export are serializable', () => {
  const snapshot = createSnapshot();
  const report = buildContexticReport(snapshot);
  const json = buildJsonExport(snapshot);

  assert.equal(JSON.parse(JSON.stringify(report)).meta.toolName, 'Contextic');
  assert.equal(JSON.parse(json).meta.toolName, 'Contextic');
});

test('dashboard app report includes component accessibility review findings', () => {
  const report = buildContexticReport(createSnapshot({
    pageClassification: {
      archetype: 'dashboard_or_app',
      confidence: 'medium',
      signals: ['Señales fuertes de dashboard.'],
      analysisMode: 'app_usability_review',
      reviewModel: 'dashboard_app'
    },
    components: {
      counts: {
        buttons: 0,
        links: 0,
        inputs: 1,
        forms: 1,
        cards: 104,
        badges: 11,
        navigation: 1,
        ctaGroups: 1
      },
      samples: {
        buttons: [],
        unlabeledInputs: ['input#search'],
        ctaGroups: [{ actions: ['Crear', 'Filtrar'] }]
      }
    },
    behavioralMapping: [],
    frictions: []
  }));

  assert.equal(report.pageClassification.analysisMode, 'app_usability_review');
  assert.equal(report.hypotheses.length, 0);
  assert.ok(report.findings.some(finding => finding.type === 'accessibility_risk' && finding.priority === 'Review'));
  assert.ok(report.reviewTasks.some(task => /densidad, agrupación, jerarquía y estados/.test(task.question)));
  assert.equal(report.detectedComponents.find(component => component.name === 'Form field').accessibilityRisk, 'needs_review');
});

function createSnapshot(overrides = {}) {
  const base = {
    meta: {
      url: 'https://example.com',
      title: 'Example page',
      generatedAt: '2026-05-09T10:00:00.000Z'
    },
    colors: {
      colors: [{ value: '#111111', count: 3, suggestedRole: 'text' }]
    },
    typography: {
      typeStyles: [{ value: '16px / 24px', count: 2 }]
    },
    spacing: {
      spacingScale: [{ value: '16px', count: 5 }],
      radii: [{ value: '8px', count: 2 }],
      shadows: []
    },
    components: {
      counts: {
        buttons: 1,
        links: 2,
        inputs: 0,
        forms: 0,
        cards: 0,
        alerts: 0,
        navigation: 1,
        images: 1
      },
      samples: {
        buttons: [{ text: 'Crear mi plan' }]
      }
    },
    pageClassification: {
      archetype: 'landing',
      confidence: 'medium',
      signals: ['Fixture landing con CTA.'],
      analysisMode: 'full_behavioral'
    },
    scopeMap: {
      regions: { main: 4, header: 2, footer: 1 },
      usedForBehavioral: ['main'],
      excludedFromBehavioral: [
        { region: 'header', reason: 'global header excluded from behavioral scoring' },
        { region: 'footer', reason: 'footer/contentinfo excluded from behavioral scoring' }
      ]
    },
    behavioralMapping: [
      {
        block: 'where',
        label: 'Where',
        present: 'sí',
        quality: 4,
        evidence: ['CTA detectado'],
        missing: [],
        frictionType: 'Baja accionabilidad',
        detectedFriction: '',
        severity: 1,
        recommendation: 'Mantener CTA visible.',
        metrics: ['CTR del CTA principal']
      }
    ],
    frictions: [],
    behavioralRecommendation: {
      sections: [
        {
          block: 'where',
          priority: 'P2',
          implementationRules: ['Variantes claras de botón.'],
          accessibilityRules: ['Focus visible.'],
          recommendedComponents: ['CTA contextual'],
          metrics: ['CTR del CTA principal'],
          risks: ['Crear competencia entre acciones primarias.']
        }
      ]
    }
  };

  return {
    ...base,
    ...overrides
  };
}
