import test from 'node:test';
import assert from 'node:assert/strict';

import { generateHypotheses, generateReviewTasks } from '../src/hypotheses.js';
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
  assert.match(hypotheses[0].ifWe, /CTA principal/i);
});

test('design system debt creates system hypothesis, not conversion hypothesis', () => {
  const finding = {
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
  };
  const normalHypotheses = generateHypotheses([finding], landing);
  const hypotheses = generateHypotheses([
    finding
  ], { ...landing, analysisMode: 'design_system_audit' });

  assert.deepEqual(normalHypotheses, []);
  assert.equal(hypotheses[0].experimentType, 'QA audit');
  assert.equal(hypotheses[0].metrics.primary, 'component/token reuse rate');
  assert.doesNotMatch(hypotheses[0].then, /conversion/i);
});

test('design system debt becomes review task outside design system audit mode', () => {
  const reviewTasks = generateReviewTasks([
    {
      id: 'design.spacing-drift',
      type: 'design_system_debt',
      title: 'La escala de espaciado podría estar derivando',
      evidence: ['26 valores únicos de espaciado; 12 valores one-off.'],
      affectedArea: 'spacing scale / layout tokens',
      severity: 3,
      confidence: 'medium',
      impact: 'medium',
      effort: 'medium',
      priority: 'DS-P2',
      rationale: 'Deuda de sistema.'
    }
  ], landing);

  assert.match(reviewTasks[0].question, /espaciado|sistema/i);
  assert.equal(reviewTasks[0].owner, 'design-system');
});

test('education portal creates lightweight review tasks without A/B hypotheses', () => {
  const portal = {
    archetype: 'education_portal',
    confidence: 'medium',
    analysisMode: 'limited_behavioral',
    signals: ['Señales de educación, libros, docentes, alumnado, centros o recursos didácticos.']
  };
  const finding = {
    id: 'where.cta-clarity',
    type: 'conversion_risk',
    title: 'CTA principal poco claro',
    evidence: ['CTA detectado: "Entrar".'],
    affectedArea: 'where',
    severity: 3,
    confidence: 'high',
    impact: 'high',
    effort: 'low',
    priority: 'P1',
    rationale: 'CTA de alto impacto con evidencia textual.'
  };

  const hypotheses = generateHypotheses([finding], portal);
  const reviewTasks = generateReviewTasks([finding], portal, {
    components: { counts: { ctaGroups: 1 } }
  });

  assert.deepEqual(hypotheses, []);
  assert.ok(reviewTasks.some(task => /docentes, familias\/estudiantes y centros/.test(task.question)));
  assert.ok(reviewTasks.some(task => /jerarquía de acciones/.test(task.question)));
});

test('no high-confidence finding does not create baseline review task', () => {
  const hypotheses = generateHypotheses([], landing);
  const reviewTasks = generateReviewTasks([], landing);

  assert.deepEqual(hypotheses, []);
  assert.deepEqual(reviewTasks, []);
});

test('weak Where block markdown creates review task, not generic hypothesis', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  assert.match(markdown, /## Tareas de revisión/);
  assert.match(markdown, /## Hipótesis y experimentos/);
  assert.match(markdown, /Pregunta:/);
  assert.match(markdown, /Cómo validarlo:/);
  assert.match(markdown, /No se generaron hipótesis accionables/);
  assert.doesNotMatch(markdown, /Resolving this finding should improve/);
  assert.doesNotMatch(markdown, /Mantener la versión actual/);
});

test('Vodafone CTA label generates specific product hypothesis', () => {
  const hypotheses = generateHypotheses([], landing, {
    behavioralMapping: [{
      block: 'where',
      displayLabel: 'Dónde actuar',
      confidence: 'medium',
      diagnostics: {
        ctaAssessment: {
          primary: { label: 'Acceso a mi seguro' }
        }
      }
    }]
  });

  assert.equal(hypotheses[0].title, 'Validate hero CTA intent');
  assert.match(hypotheses[0].because, /"Acceso a mi seguro"/);
  assert.match(hypotheses[0].weBelieve, /clientes existentes/);
  assert.match(hypotheses[0].ifWe, /contratación\/simulación/);
  assert.equal(hypotheses[0].metrics.primary, 'primary CTA CTR');
  assert.deepEqual(hypotheses[0].metrics.secondary, ['qualified conversion rate', 'secondary CTA clicks', 'bounce']);
  assert.deepEqual(hypotheses[0].metrics.guardrail, ['accessibility regressions']);
});

test('clean CTA label creates actionable review task without absence finding', () => {
  const reviewTasks = generateReviewTasks([], landing, {
    behavioralMapping: [{
      block: 'where',
      displayLabel: 'Dónde actuar',
      present: 'parcial',
      quality: 3,
      confidence: 'medium',
      evidence: ['CTA principal visible en main: “Asegura tu móvil”.'],
      missing: ['Validar si el CTA expresa el objetivo real.'],
      diagnostics: {
        ctaAssessment: {
          primary: { cleanLabel: 'Asegura tu móvil', region: 'main' }
        }
      }
    }]
  });

  assert.equal(reviewTasks[0].question, '¿El CTA principal ‘Asegura tu móvil’ coincide con el objetivo real de la página?');
  assert.deepEqual(reviewTasks[0].evidence, ['CTA principal visible en main: “Asegura tu móvil”.']);
  assert.equal(reviewTasks[0].owner, 'product/design');
  assert.doesNotMatch(JSON.stringify(reviewTasks), /No hay fricciones UX de alta confianza/);
});

test('manual low-confidence Who and How do not generate generic hypotheses', () => {
  const findings = [
    {
      id: 'review.weak-block.who',
      type: 'manual_review',
      title: 'Bloque a revisar: Para quién (who)',
      evidence: ['Target funcional detectado en caso de uso: “para tus dispositivos”.'],
      affectedArea: 'who',
      severity: 1,
      confidence: 'low',
      impact: 'medium',
      effort: 'medium',
      priority: 'Review',
      rationale: 'Validar si el target funcional necesita traducirse a segmento comercial.'
    },
    {
      id: 'review.weak-block.how',
      type: 'manual_review',
      title: 'Bloque a revisar: Cómo (how)',
      evidence: ['Se detecta estructura de pasos o proceso.'],
      affectedArea: 'how',
      severity: 1,
      confidence: 'low',
      impact: 'medium',
      effort: 'medium',
      priority: 'Review',
      rationale: 'Validar qué ocurre tras el CTA.'
    }
  ];

  const hypotheses = generateHypotheses(findings, landing);
  const reviewTasks = generateReviewTasks(findings, landing);

  assert.deepEqual(hypotheses, []);
  assert.equal(reviewTasks.length, 2);
  assert.doesNotMatch(JSON.stringify(hypotheses), /Weak block: Who|Test:|Resolving this finding/);
});

test('handoff summary deduplicates manual review items and omits empty top hypothesis', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot({
    behavioralMapping: [
      {
        block: 'who',
        displayLabel: 'Para quién',
        present: 'parcial',
        quality: 2,
        evidence: ['Target funcional detectado en caso de uso: “para tus dispositivos”.'],
        missing: ['Validar si el target funcional necesita traducirse a segmento comercial.'],
        severity: 1
      },
      {
        block: 'how',
        displayLabel: 'Cómo',
        present: 'parcial',
        quality: 3,
        evidence: ['Se detecta estructura de pasos o proceso.'],
        missing: ['Validar qué ocurre tras el CTA: alta, contratación, gestión, activación, tiempos y siguiente estado.'],
        severity: 1
      },
      {
        block: 'where',
        displayLabel: 'Dónde actuar',
        present: 'parcial',
        quality: 2,
        evidence: ['CTA detectado con baja jerarquía.'],
        missing: ['La acción principal requiere revisión manual.'],
        severity: 2
      }
    ]
  }));
  const handoff = markdown.split('## Handoff summary')[1];

  assert.equal(countMatches(handoff, '[Para quién / who]'), 1);
  assert.equal(countMatches(handoff, '[Cómo / how]'), 1);
  assert.equal(countMatches(handoff, '[Dónde actuar / where]'), 1);
  assert.doesNotMatch(handoff, /\[(Who|How|Where)\]/);
  assert.doesNotMatch(handoff, /### (Top hypothesis|Hipótesis principal)/);
});

test('summary separates weak blocks from light review signals and excludes strong How block', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot({
    frictions: [],
    behavioralMapping: [
      {
        block: 'how',
        displayLabel: 'Cómo',
        present: 'sí',
        quality: 4,
        confidence: 'high',
        evidence: ['Se explica el proceso principal.'],
        missing: [],
        detectedFriction: '',
        severity: 0
      },
      {
        block: 'who',
        displayLabel: 'Para quién',
        present: 'parcial',
        quality: 3,
        confidence: 'medium',
        evidence: ['Target funcional detectado.'],
        missing: ['Validar si el target funcional necesita segmento explícito.'],
        severity: 1
      },
      {
        block: 'where',
        displayLabel: 'Dónde actuar',
        present: 'parcial',
        quality: 3,
        confidence: 'medium',
        evidence: ['CTA principal visible en main: “Asegura tu móvil”.'],
        missing: ['Validar objetivo real del CTA.'],
        severity: 1,
        diagnostics: {
          ctaAssessment: {
            primary: { cleanLabel: 'Asegura tu móvil', region: 'main' }
          }
        }
      }
    ]
  }));
  const summary = markdown.split('## Resumen ejecutivo')[1].split('## Snapshot de sistema de diseño')[0];
  const handoff = markdown.split('## Handoff summary')[1];

  assert.match(summary, /Bloques débiles: 0/);
  assert.match(summary, /Señales de revisión ligera: Para quién, Dónde actuar/);
  assert.doesNotMatch(handoff, /\[Cómo \/ how\]/);
  assert.match(handoff, /¿El CTA principal ‘Asegura tu móvil’ coincide con el objetivo real de la página\?/);
  assert.doesNotMatch(markdown, /No hay fricciones UX de alta confianza requiere una intervención/);
});

test('recommended metrics do not duplicate metrics between primary and secondary', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot({
    hypotheses: [
      {
        id: 'H1',
        title: 'Validate CTA',
        because: 'CTA evidence.',
        weBelieve: 'CTA can improve progression.',
        ifWe: 'Change CTA.',
        then: 'Progression improves.',
        metrics: {
          primary: 'primary CTA CTR',
          secondary: ['primary CTA CTR', 'qualified conversion rate', 'bounce'],
          guardrail: ['accessibility regressions']
        },
        segments: ['mobile users'],
        confidence: 'medium',
        effort: 'medium',
        experimentType: 'A/B test'
      }
    ]
  }));
  const metrics = markdown.split('## Métricas recomendadas')[1].split('## Handoff summary')[0];
  const primary = metrics.split('### Secundarias')[0];
  const secondary = metrics.split('### Secundarias')[1].split('### Controles de seguridad')[0];

  assert.match(primary, /primary CTA CTR/);
  assert.doesNotMatch(secondary, /primary CTA CTR/);
  assert.match(secondary, /qualified conversion rate/);
});

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
    behavioralRecommendation: { sections: [] },
    ...overrides
  };
}

function countMatches(text, pattern) {
  return (text.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}
