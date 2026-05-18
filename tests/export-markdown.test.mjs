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

test('Vodafone color table stays aligned with conservative color roles', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot({
    colors: {
      colors: [
        colorToken('#0d0d0d', 2892, 'text', 'texto (text)', 'high', 'color', 'div.copy'),
        colorToken('#ffffff', 2167, 'text', 'texto (text)', 'medium', 'color', 'a.skip-link'),
        colorToken('#000000', 120, 'shadow', 'sombra (shadow)', 'medium', 'boxShadow', 'button.primary'),
        colorToken('#e60000', 201, 'primary', 'primario (primary)', 'medium', 'backgroundColor', 'a.primary.cta')
      ],
      cssVariables: [],
      totalUniqueColors: 4
    }
  }));
  const colorTable = markdown.split('### Colores detectados por frecuencia')[1].split('### Tipografía detectada')[0];
  const guidance = markdown.split('## Guía de implementación')[1].split('## Métricas recomendadas')[0];

  assert.doesNotMatch(colorTable, /\#0d0d0d\s*\|\s*\d+\s*\|\s*(warning|aviso)/i);
  assert.doesNotMatch(colorTable, /\#ffffff\s*\|\s*\d+\s*\|\s*(warning|aviso)/i);
  assert.doesNotMatch(colorTable, /\#000000\s*\|\s*\d+\s*\|\s*(primary|primario)/i);
  assert.match(colorTable, /\#0d0d0d\s*\|\s*2892\s*\|\s*texto \(text\)/);
  assert.match(colorTable, /\#000000\s*\|\s*120\s*\|\s*sombra \(shadow\)/);
  assert.match(colorTable, /\#e60000\s*\|\s*201\s*\|\s*primario \(primary\)/);
  assert.match(guidance, /texto \(text\): #0d0d0d/);
  assert.match(guidance, /primario \(primary\): #e60000/);
  assert.doesNotMatch(guidance, /#0d0d0d \(warning|#ffffff \(warning|#000000 \(primary/i);
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

test('dashboard app usability review output is specific and avoids landing noise', () => {
  const snapshot = createSnapshot({
    meta: {
      url: 'https://privatearea.grupoanaya.es/anaya/dashboard',
      title: 'Área privada Anaya dashboard',
      generatedAt: '2026-05-09T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification: {
      archetype: 'dashboard_or_app',
      confidence: 'medium',
      analysisMode: 'app_usability_review',
      reviewModel: 'dashboard_app',
      signals: ['Señales fuertes de dashboard, panel y usuario autenticado.']
    },
    components: {
      counts: {
        buttons: 2,
        links: 8,
        inputs: 1,
        forms: 1,
        cards: 104,
        alerts: 0,
        navigation: 1,
        images: 0,
        badges: 11,
        dialogs: 0,
        ctaGroups: 1
      },
      samples: {
        buttons: [{ text: 'Buscar' }],
        unlabeledInputs: [],
        disabledControls: [],
        genericLinks: [],
        imagesWithoutAlt: [],
        badges: ['span.badge'],
        dialogs: [],
        ctaGroups: [{ selector: '.dashboard-actions', actions: ['Buscar', 'Filtrar'] }]
      }
    },
    frictions: [],
    behavioralMapping: [
      {
        block: 'where',
        displayLabel: 'Dónde actuar',
        present: 'parcial',
        quality: 2,
        evidence: ['CTA detectado en dashboard.'],
        missing: ['Validar objetivo real del CTA.'],
        severity: 2,
        diagnostics: {
          ctaAssessment: {
            primary: { cleanLabel: 'Buscar', region: 'main' }
          }
        }
      }
    ]
  });
  const markdown = buildDesignContextMarkdown(snapshot);
  const summary = markdown.split('## Resumen ejecutivo')[1].split('## Snapshot de sistema de diseño')[0];
  const lowConfidence = markdown.split('## Hallazgos de baja confianza')[1].split('## Tareas de revisión')[0];
  const handoff = markdown.split('## Handoff summary')[1];
  const patterns = markdown.split('### Patrones UI observados')[1].split('## Evaluación behavioral')[0];
  const topReview = markdown.split('### Tarea principal de revisión')[1].split('### Deuda de sistema de diseño')[0];

  assert.match(markdown, /Modo de análisis: app_usability_review/);
  assert.match(summary, /se recomiendan \d+ revisiones de app y \d+ revisiones de accesibilidad/);
  assert.match(summary, /Revisiones de app recomendadas: 5/);
  assert.match(summary, /Revisiones de accesibilidad recomendadas: 3/);
  assert.doesNotMatch(markdown, /¿La señal .* requiere una intervención concreta/);
  assert.match(topReview, /Validar densidad, agrupación, jerarquía y estados de las cards del dashboard/);
  assert.match(lowConfidence, /No hay hallazgos adicionales de baja confianza fuera de accesibilidad/);
  assert.doesNotMatch(handoff, /\[Cómo \/ how\]|\[Dónde actuar \/ where\]/);
  assert.match(handoff, /\[Cards\/listado\]/);
  assert.match(handoff, /\[Badges\/status\]/);
  assert.match(handoff, /\[Formulario\]/);
  assert.doesNotMatch(patterns, /Cards de beneficios o features/);
  assert.match(patterns, /Cards\/listado de contenido/);
  assert.match(markdown, /No se generaron hipótesis accionables/);
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

function colorToken(value, count, role, displayRole, confidence, property, selector) {
  return {
    value,
    count,
    suggestedRole: role,
    displayRole,
    roleConfidence: confidence,
    roleReason: `Propiedad CSS ${property} clasificada por el clasificador conservador.`,
    roleSource: property === 'backgroundColor' ? 'cta_context' : 'base_css_property',
    sample: {
      selector,
      property,
      context: { region: 'main', isSystemOrHidden: false }
    },
    usages: [{ selector, property, region: 'main', isSystemOrHidden: false }]
  };
}
