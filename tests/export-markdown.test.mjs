import test from 'node:test';
import assert from 'node:assert/strict';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildDesignContextMarkdown, buildGitHubIssueMarkdown, buildGithubIssueExport, buildJsonExport } from '../src/export-markdown.js';

test('design context markdown leads with technical design context sections', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  assert.match(markdown, /## Clasificación de página/);
  assert.match(markdown, /## Mapa de alcance/);
  assert.match(markdown, /## Metadatos de captura/);
  assert.match(markdown, /## Resumen ejecutivo/);
  assert.match(markdown, /## Snapshot de sistema de diseño/);
  assert.match(markdown, /## Inventario de componentes/);
  assert.match(markdown, /## Evaluación behavioral/);
  assert.match(markdown, /## Guía de implementación/);
  assert.match(markdown, /## Hallazgos UX/);
  assert.match(markdown, /## Hallazgos de sistema de diseño/);
  assert.match(markdown, /## Hallazgos de accesibilidad/);
  assert.match(markdown, /## Hallazgos de baja confianza/);
  assert.match(markdown, /## Hipótesis y experimentos/);
  assert.match(markdown, /### Riesgos de alta confianza/);
  assert.match(markdown, /### Hipótesis principal/);
});

test('behavioral notes are not the main axis above the technical snapshot', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  const snapshotIndex = markdown.indexOf('## Snapshot de sistema de diseño');
  const componentIndex = markdown.indexOf('## Inventario de componentes');
  const assessmentIndex = markdown.indexOf('## Evaluación behavioral');
  const frictionIndex = markdown.indexOf('## Hallazgos UX');
  const behavioralMapIndex = markdown.indexOf('### Mapa de bloques behavioral');

  assert.ok(snapshotIndex > -1);
  assert.ok(componentIndex > snapshotIndex);
  assert.ok(assessmentIndex > componentIndex);
  assert.ok(behavioralMapIndex > assessmentIndex);
  assert.ok(frictionIndex > behavioralMapIndex);
});

test('github issue export includes the required issue structure', () => {
  const markdown = buildGithubIssueExport(createSnapshot());

  assert.match(markdown, /^# \[Contextic\] Revisar hallazgos landing para Example page/);
  assert.match(markdown, /## Contexto/);
  assert.match(markdown, /## Resumen/);
  assert.match(markdown, /## Hallazgos principales/);
  assert.match(markdown, /## Hipótesis/);
  assert.match(markdown, /## Notas de implementación/);
  assert.match(markdown, /## Criterios de aceptación/);
  assert.match(markdown, /## Exports raw/);
  assert.match(markdown, /- \[ \] Jerarquía de CTA validada/);
  assert.match(markdown, /Métrica primaria:/);
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
  assert.match(githubIssue, /Componentes afectados: Button \(2\)/);
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

  assert.match(markdown, /modo de análisis es snapshot_only; no se generan recomendaciones de conversión/);
  assert.match(markdown, /## Hallazgos principales/);
  assert.match(markdown, /No se generaron hallazgos/);
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

  assert.match(markdown, /Modo de análisis: limited_behavioral/);
  assert.match(markdown, /No se generan recomendaciones de conversión/);
  assert.match(markdown, /## Hallazgos de baja confianza/);
  assert.doesNotMatch(markdown, /## Seguimiento priorizado/);
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

  assert.match(markdown, /Revisar hallazgos unknown para página sin título/);
  assert.match(markdown, /snapshot_only; no se generan recomendaciones de conversión/);
  assert.match(markdown, /Fricciones UX: 0/);
  assert.doesNotMatch(markdown, /No hay fricciones UX de alta confianza requiere una intervención/);
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
        displayLabel: 'Dónde actuar',
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
