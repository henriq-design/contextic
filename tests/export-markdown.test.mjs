import test from 'node:test';
import assert from 'node:assert/strict';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildDesignContextMarkdown, buildGitHubIssueMarkdown, buildGithubIssueExport, buildJsonExport } from '../src/export-markdown.js';

test('design context markdown leads with technical design context sections', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  assert.match(markdown, /## Page classification/);
  assert.match(markdown, /## Scope map/);
  assert.match(markdown, /## Capture metadata/);
  assert.match(markdown, /## Executive summary/);
  assert.match(markdown, /## Design system snapshot/);
  assert.match(markdown, /## Component inventory/);
  assert.match(markdown, /## Behavioral assessment/);
  assert.match(markdown, /## Implementation guidance/);
  assert.match(markdown, /## UX findings/);
  assert.match(markdown, /## Design system findings/);
  assert.match(markdown, /## Accessibility findings/);
  assert.match(markdown, /## Low-confidence findings/);
  assert.match(markdown, /## Hypotheses and experiments/);
  assert.match(markdown, /### High-confidence risks/);
  assert.match(markdown, /### Top hypothesis/);
});

test('behavioral notes are not the main axis above the technical snapshot', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  const snapshotIndex = markdown.indexOf('## Design system snapshot');
  const componentIndex = markdown.indexOf('## Component inventory');
  const assessmentIndex = markdown.indexOf('## Behavioral assessment');
  const frictionIndex = markdown.indexOf('## UX findings');
  const behavioralMapIndex = markdown.indexOf('### Behavioral block map');

  assert.ok(snapshotIndex > -1);
  assert.ok(componentIndex > snapshotIndex);
  assert.ok(assessmentIndex > componentIndex);
  assert.ok(behavioralMapIndex > assessmentIndex);
  assert.ok(frictionIndex > behavioralMapIndex);
});

test('github issue export includes the required issue structure', () => {
  const markdown = buildGithubIssueExport(createSnapshot());

  assert.match(markdown, /^# \[Contextic\] Review landing findings for Example page/);
  assert.match(markdown, /## Context/);
  assert.match(markdown, /## Summary/);
  assert.match(markdown, /## Top findings/);
  assert.match(markdown, /## Hypotheses/);
  assert.match(markdown, /## Implementation notes/);
  assert.match(markdown, /## Acceptance criteria/);
  assert.match(markdown, /## Raw exports/);
  assert.match(markdown, /- \[ \] CTA hierarchy validated/);
  assert.match(markdown, /Primary metric:/);
});

test('copy exports can be generated from the same snapshot', () => {
  const snapshot = createSnapshot();
  const designContext = buildDesignContextMarkdown(snapshot);
  const jsonReport = buildJsonExport(snapshot);
  const githubIssue = buildGithubIssueExport(snapshot);
  const parsedReport = JSON.parse(jsonReport);

  assert.match(designContext, /^# design-context\.md/);
  assert.equal(parsedReport.meta.sourceUrl, snapshot.meta.url);
  assert.equal(parsedReport.screenSummary.pageTitle, snapshot.meta.title);
  assert.equal(parsedReport.pageClassification.archetype, 'landing');
  assert.match(githubIssue, /Components affected: Button \(2\)/);
  assert.match(githubIssue, /Acciones primarias compitiendo/);
});

test('github issue export flags snapshot only mode without conversion recommendations', () => {
  const markdown = buildGithubIssueExport(createSnapshot({
    pageClassification: {
      archetype: 'unknown',
      confidence: 'low',
      signals: [],
      analysisMode: 'snapshot_only'
    },
    behavioralMapping: [],
    frictions: [],
    findings: [],
    hypotheses: [],
    behavioralRecommendation: { sections: [] }
  }));

  assert.match(markdown, /analysis mode is snapshot_only; no conversion recommendations are generated/);
  assert.match(markdown, /## Top findings/);
  assert.match(markdown, /No findings were generated/);
  assert.doesNotMatch(markdown, /CTR del CTA principal/);
});

test('limited archetypes do not emit conversion recommendation sections', () => {
  const snapshot = createSnapshot({
    pageClassification: {
      archetype: 'ecommerce_category',
      confidence: 'high',
      signals: ['12 product cards detected.'],
      analysisMode: 'limited_behavioral'
    },
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  });
  const markdown = buildDesignContextMarkdown(snapshot);
  const jsonReport = JSON.parse(buildJsonExport(snapshot));

  assert.match(markdown, /Analysis mode: limited_behavioral/);
  assert.match(markdown, /No se generan recomendaciones de conversión/);
  assert.match(markdown, /## Low-confidence findings/);
  assert.doesNotMatch(markdown, /## Prioritized follow-up/);
  assert.doesNotMatch(markdown, /CTR del CTA principal/);
  assert.equal(jsonReport.pageClassification.archetype, 'ecommerce_category');
  assert.equal(jsonReport.pageClassification.analysisMode, 'limited_behavioral');
});

test('GitHub issue compatibility export stays wired to the new export', () => {
  const snapshot = createSnapshot();

  assert.equal(buildGitHubIssueMarkdown(snapshot), buildGithubIssueExport(snapshot));
});

test('github issue export stays conservative when evidence is missing', () => {
  const markdown = buildGithubIssueExport({});

  assert.match(markdown, /Review unknown findings for untitled page/);
  assert.match(markdown, /snapshot_only; no conversion recommendations are generated/);
  assert.match(markdown, /No hay fricciones UX de alta confianza/);
  assert.doesNotMatch(markdown, /undefined|NaN/);
  assert.doesNotMatch(markdown, /0 button\/CTA candidate/);
  assert.doesNotMatch(markdown, /0 unique color/);
});

function createSnapshot(overrides = {}) {
  const finding = createBehavioralFinding({
    id: 'where.multiple-primary-actions',
    title: 'Acciones primarias compitiendo',
    block: 'where',
    frictionType: 'baja_accionabilidad',
    severity: 4,
    confidence: 'media',
    evidenceType: 'structural',
    evidence: '2 acciones prominentes.',
    recommendation: 'Mantener una acción primaria por bloque de decisión.',
    systemImplication: 'Gobernar variantes de Button y CTA group.',
    expectedImpact: 'high',
    implementationEffort: 'low',
    metric: 'CTR del CTA principal'
  });

  return {
    meta: {
      url: 'https://example.com',
      title: 'Example page',
      generatedAt: '2026-05-09T10:00:00.000Z',
      viewport: {
        width: 1440,
        height: 900
      }
    },
    colors: {
      colors: [
        {
          value: '#111111',
          count: 12,
          suggestedRole: 'text',
          roleConfidence: 'likely',
          sample: { selector: 'body', property: 'color' }
        },
        {
          value: '#2563eb',
          count: 4,
          suggestedRole: 'primary',
          roleConfidence: 'possible',
          sample: { selector: 'button.primary', property: 'backgroundColor' }
        }
      ],
      cssVariables: [{ name: '--color-primary', value: '#2563eb' }],
      totalUniqueColors: 8
    },
    typography: {
      typeStyles: [
        { value: 'Inter, sans-serif | 16px / 24px | 400 | 0px', count: 8 },
        { value: 'Inter, sans-serif | 32px / 40px | 700 | 0px', count: 1 }
      ],
      fontFamilies: [{ value: 'Inter, sans-serif', count: 9 }],
      totalUniqueTypeStyles: 2
    },
    spacing: {
      spacingScale: [{ value: '8px', count: 6 }, { value: '16px', count: 12 }],
      radii: [{ value: '8px', count: 4 }],
      shadows: [{ value: '0 8px 24px rgba(0,0,0,.12)', count: 1 }],
      borders: [{ value: '1px solid', count: 6 }],
      totalUniqueSpacingValues: 4,
      totalUniqueRadiusValues: 1
    },
    components: {
      counts: {
        buttons: 2,
        links: 3,
        inputs: 1,
        forms: 1,
        cards: 3,
        alerts: 1,
        navigation: 1,
        images: 1,
        badges: 1,
        dialogs: 0,
        ctaGroups: 1
      },
      samples: {
        buttons: [{ text: 'Crear mi plan', selector: 'button.primary', disabled: false }],
        unlabeledInputs: ['input.email'],
        disabledControls: [],
        genericLinks: ['leer más'],
        imagesWithoutAlt: [],
        badges: ['span.badge'],
        dialogs: [],
        ctaGroups: [{ selector: 'div.actions', actions: ['Crear mi plan', 'Ver precios'] }]
      }
    },
    pageClassification: {
      archetype: 'landing',
      confidence: 'medium',
      signals: ['Fixture landing con CTA y formulario.'],
      analysisMode: 'full_behavioral'
    },
    scopeMap: {
      regions: { main: 6, section: 2, header: 3, footer: 2 },
      usedForBehavioral: ['main', 'section'],
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
        quality: 3,
        evidence: ['CTA detectado'],
        missing: [],
        frictionType: 'baja_accionabilidad',
        detectedFriction: 'Acciones primarias compitiendo',
        severity: 4,
        recommendation: 'Mantener una acción primaria.',
        metrics: ['CTR del CTA principal']
      }
    ],
    frictions: [finding],
    behavioralRecommendation: {
      sections: []
    },
    ...overrides
  };
}
