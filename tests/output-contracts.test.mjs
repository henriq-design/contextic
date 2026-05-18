import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildDesignContextMarkdown, buildJsonExport } from '../src/export-markdown.js';
import { pageArchetypeClassifier } from '../src/page-archetype-classifier.js';

test('contrato service_landing: Vodafone mantiene matriz behavioral y no usa revisión app', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://www.vodafone.es/c/vodafone-care/',
    title: 'Vodafone Care',
    headings: ['Vodafone Care', 'Todo el soporte para cuidar de tu servicio', 'Preguntas frecuentes'],
    visibleText: 'Vodafone Care servicio soporte solución contacto beneficios solicitar información contratar preguntas frecuentes',
    components: {
      counts: { buttons: 2, forms: 1, cards: 4, ctaGroups: 1 },
      samples: { buttons: [{ text: 'Solicitar información' }], ctaGroups: [{ actions: ['Solicitar información', 'Ver beneficios'] }] }
    },
    presenceOfHero: true,
    presenceOfFaq: true
  });
  const markdown = buildDesignContextMarkdown(serviceLandingSnapshot(classification));

  assert.equal(classification.archetype, 'service_landing');
  assert.equal(classification.analysisMode, 'full_behavioral');
  assert.match(markdown, /Arquetipo: service_landing/);
  assert.match(markdown, /Modo de análisis: full_behavioral/);
  assert.match(markdown, /### Mapa de bloques behavioral/);
  assert.match(markdown, /Qué \(what\)/);
  assert.match(markdown, /Por qué \(why\)/);
  assert.match(markdown, /Por qué no \(why_not\)/);
  assert.match(markdown, /Para quién \(who\)/);
  assert.match(markdown, /Cómo \(how\)/);
  assert.match(markdown, /Dónde actuar \(where\)/);
  assert.match(markdown, /Cuándo \/ Urgencia \(when\)/);
  assert.match(markdown, /Asegura tu móvil/);
  assert.match(markdown, /Tarea principal de revisión[\s\S]*¿El CTA principal ‘Asegura tu móvil’ coincide con el objetivo real de la página\?/);
  assert.match(markdown, /Señales de revisión ligera: Para quién, Dónde actuar/);
  assert.match(markdown, /\[Dónde actuar \/ where\]/);
  assert.match(markdown, /Hipótesis principal/);
  assert.doesNotMatch(markdown, /app_usability_review|dashboard_or_app|dashboard_app/);
  assert.doesNotMatch(markdown, /Revisiones de app recomendadas|Cards\/listado|No se generan recomendaciones de conversión para dashboards\/apps/);
  assertNoVisibleMarkdownRoleRegressions(markdown);
  assert.doesNotMatch(markdown, /education_portal|Semantic state overrides|primario \(primary\): #ffffff/i);
});

test('contrato education_portal: Anaya pública no se convierte en dashboard por widget externo', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://www.anayaeducacion.es/',
    title: 'Anaya Educación - Libros de texto y recursos didácticos',
    headings: ['Anaya Educación', 'Proyectos educativos', 'Recursos para docentes'],
    visibleText: [
      'Libros de texto Recursos didácticos Catálogo Educación Infantil Primaria Secundaria Bachillerato',
      'Docentes Alumnado Centros proyectos educativos buscador catálogo',
      'button accessibility-tab-button accessibility widget panel configuración toolbar --bmv-primary --bmv-contrast'
    ].join(' '),
    components: {
      counts: { buttons: 2, cards: 6, ctaGroups: 1, forms: 0 },
      samples: { buttons: [{ text: 'Buscar en catálogo' }, { text: 'Acceso docentes' }], ctaGroups: [{ actions: ['Buscar en catálogo', 'Acceso docentes'] }] }
    },
    presenceOfHero: true
  });
  const markdown = buildDesignContextMarkdown(educationPortalSnapshot(classification));
  const json = JSON.parse(buildJsonExport(educationPortalSnapshot(classification)));

  assert.equal(json.pageClassification.archetype, 'education_portal');
  assert.notEqual(json.pageClassification.archetype, 'dashboard_or_app');
  assert.equal(json.pageClassification.analysisMode, 'portal_review');
  assert.match(markdown, /Arquetipo: education_portal/);
  assert.match(markdown, /Modo de análisis: portal_review/);
  assert.match(markdown, /Validar si la home permite diferenciar rápidamente rutas para docentes, familias\/estudiantes y centros/);
  assert.match(markdown, /¿La home deja clara la orientación principal: contenido, catálogo, recursos o acceso institucional\?/);
  assert.match(markdown, /¿La jerarquía de acciones diferencia rutas principales sin competir como CTAs de conversión\?/);
  assert.match(markdown, /Widgets\/utilidades externas detectadas/);
  assert.match(markdown, /accessibility_widget/);
  assert.match(markdown, /button#accessibility-tab-button/);
  assert.match(markdown, /--bmv-primary/);
  assert.doesNotMatch(markdown.split('### Variables CSS detectadas')[1].split('### Ruido visual de sistema/oculto')[0], /--bmv-/);
  assert.doesNotMatch(markdown, /app_usability_review|dashboard_app|Validar densidad, agrupación, jerarquía y estados de las cards del dashboard/);
  assert.doesNotMatch(markdown, /Revisiones de app recomendadas|No se generan recomendaciones de conversión para dashboards\/apps/);
  assertNoVisibleMarkdownRoleRegressions(markdown);
  assert.doesNotMatch(markdown, /\[Dónde actuar \/ where\]|CTA principal responde al objetivo de negocio/i);
});

test('contrato dashboard_or_app: Anaya private usa revisión app sin bloques landing', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://privatearea.grupoanaya.es/anaya/dashboard',
    title: 'Área privada Anaya - Dashboard',
    headings: ['Panel de control', 'Mis recursos', 'Actividad reciente'],
    visibleText: 'Dashboard workspace panel de control usuario autenticado menú lateral configuración informes proyectos recursos asignados',
    components: {
      counts: { buttons: 4, cards: 104, badges: 11, inputs: 1, forms: 1, navigation: 1, ctaGroups: 1 },
      samples: { buttons: [{ text: 'Crear recurso' }], ctaGroups: [{ actions: ['Crear recurso', 'Filtrar'] }] }
    }
  });
  const markdown = buildDesignContextMarkdown(dashboardSnapshot(classification));

  assert.equal(classification.archetype, 'dashboard_or_app');
  assert.equal(classification.analysisMode, 'app_usability_review');
  assert.match(markdown, /Arquetipo: dashboard_or_app/);
  assert.match(markdown, /Modo de análisis: app_usability_review/);
  assert.match(markdown, /Revisiones de app recomendadas: 5/);
  assert.match(markdown, /Validar densidad, agrupación, jerarquía y estados de las cards del dashboard/);
  assert.match(markdown, /\[Cards\/listado\]/);
  assert.match(markdown, /\[Badges\/status\]/);
  assert.match(markdown, /\[Formulario\]/);
  assert.match(markdown, /\[Navegación\]/);
  assert.match(markdown, /\[Acciones\]/);
  assert.doesNotMatch(markdown, /\[Cómo \/ how\]|\[Dónde actuar \/ where\]/);
  assert.doesNotMatch(markdown, /full_behavioral|service_landing|Cards de beneficios o features|Hipótesis principal|CTR del CTA principal/);
  assert.doesNotMatch(markdown, /¿La señal/);
  assert.doesNotMatch(markdown, /Test: Weak block/i);
  assert.doesNotMatch(markdown, /Hipótesis de conversión/i);
  assert.doesNotMatch(markdown, /A\/B test/i);
  assertNoVisibleMarkdownRoleRegressions(markdown);
});

test('contrato ecommerce_category: listado de producto no hereda copy de landing ni app', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://shop.example.com/collections/phones',
    title: 'Teléfonos móviles',
    headings: ['Teléfonos móviles', 'Filtrar por marca'],
    visibleText: 'Productos Ordenar Filtrar Añadir al carrito Precio 299€ Precio 399€ Precio 499€',
    numberOfProductCards: 12,
    presenceOfCartCheckoutTerms: true,
    components: {
      counts: { buttons: 8, cards: 12, ctaGroups: 0, forms: 1, inputs: 2 },
      samples: { buttons: [{ text: 'Añadir al carrito' }] }
    }
  });
  const markdown = buildDesignContextMarkdown(ecommerceSnapshot(classification));

  assert.equal(classification.archetype, 'ecommerce_category');
  assert.equal(classification.analysisMode, 'limited_behavioral');
  assert.match(markdown, /Arquetipo: ecommerce_category/);
  assert.match(markdown, /Cards\/listado de producto/);
  assert.match(markdown, /Filtros o formulario de refinamiento/);
  assert.doesNotMatch(markdown, /Cards de beneficios o features|app_usability_review|Revisiones de app recomendadas/);
  assert.doesNotMatch(markdown, /\[Cards\/listado\]|\[Badges\/status\]|Hipótesis principal/);
});

test('contrato checkout_or_form_flow: flujo de formulario queda en modo limitado y no app', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://shop.example.com/checkout/payment',
    title: 'Checkout - Pago y envío',
    headings: ['Datos de envío', 'Pago'],
    visibleText: 'Carrito checkout pago envío dirección facturación continuar finalizar compra',
    presenceOfCartCheckoutTerms: true,
    components: {
      counts: { buttons: 2, cards: 0, ctaGroups: 0, forms: 2, inputs: 8, navigation: 1 },
      samples: { buttons: [{ text: 'Continuar' }, { text: 'Finalizar compra' }] }
    }
  });
  const markdown = buildDesignContextMarkdown(checkoutSnapshot(classification));

  assert.equal(classification.archetype, 'checkout_or_form_flow');
  assert.equal(classification.analysisMode, 'limited_behavioral');
  assert.match(markdown, /Arquetipo: checkout_or_form_flow/);
  assert.match(markdown, /Flujo de formulario/);
  assert.match(markdown, /Acciones de avance o envío/);
  assert.doesNotMatch(markdown, /app_usability_review|dashboard_app|Revisiones de app recomendadas/);
  assert.doesNotMatch(markdown, /Cards de beneficios o features|\[Cómo \/ how\]|\[Dónde actuar \/ where\]/);
});

test('contrato UI modal: exportar es footer transversal y no tab principal', () => {
  const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const tabButtonBlock = source.slice(source.indexOf('const tabButtons = ['), source.indexOf('const tabPanels ='));
  const panelBlock = source.slice(source.indexOf('const panel = element'), source.indexOf('shadow.append'));

  assert.match(tabButtonBlock, /Diagnóstico/);
  assert.match(tabButtonBlock, /Sistema visual/);
  assert.doesNotMatch(tabButtonBlock, /Exportar/);
  assert.equal(countMatches(tabButtonBlock, "role: 'tab'"), 2);
  assert.match(source, /class: 'panel-footer'/);
  assert.match(source, /data-copy': 'design'/);
  assert.match(source, /data-copy': 'json'/);
  assert.match(source, /data-copy': 'issue'/);
  assert.ok(panelBlock.indexOf('body') < panelBlock.indexOf('footer'));
});

function serviceLandingSnapshot(pageClassification) {
  return baseSnapshot({
    meta: {
      url: 'https://www.vodafone.es/c/vodafone-care/',
      title: 'Vodafone Care',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification,
    components: componentFixture({ buttons: 2, forms: 1, inputs: 2, cards: 4, ctaGroups: 1 }),
    behavioralMapping: behavioralLandingMap(),
    colors: contractColors(),
    frictions: [ctaFriction()],
    behavioralRecommendation: { sections: [] }
  });
}

function educationPortalSnapshot(pageClassification) {
  return baseSnapshot({
    meta: {
      url: 'https://www.anayaeducacion.es/',
      title: 'Anaya Educación - Libros de texto y recursos didácticos',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification,
    components: {
      ...componentFixture({ buttons: 2, cards: 6, ctaGroups: 1 }),
      systemUtilityWidgets: [
        {
          selector: 'button#accessibility-tab-button.accessibility-tab-button',
          type: 'accessibility_widget',
          reason: 'Widget externo de accesibilidad detectado.'
        }
      ]
    },
    colors: {
      ...contractColors(),
      cssVariables: [{ name: '--bmv-primary', value: '#000000', usage: 'third-party/accessibility-widget usage', systemUtility: true }],
      systemHiddenVisualNoise: [{ value: '#000000', count: 12, reason: 'Color procedente de accessibility_widget/system_utility.' }]
    },
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  });
}

function dashboardSnapshot(pageClassification) {
  return baseSnapshot({
    meta: {
      url: 'https://privatearea.grupoanaya.es/anaya/dashboard',
      title: 'Área privada Anaya - Dashboard',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification,
    components: componentFixture({ buttons: 4, links: 8, inputs: 1, forms: 1, cards: 104, badges: 11, navigation: 1, ctaGroups: 1 }),
    behavioralMapping: [{
      block: 'where',
      displayLabel: 'Dónde actuar',
      present: 'parcial',
      quality: 2,
      confidence: 'medium',
      evidence: ['CTA detectado en dashboard.'],
      missing: ['Validar objetivo real del CTA.'],
      severity: 2
    }],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  });
}

function ecommerceSnapshot(pageClassification) {
  return baseSnapshot({
    meta: {
      url: 'https://shop.example.com/collections/phones',
      title: 'Teléfonos móviles',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification,
    components: componentFixture({ buttons: 8, inputs: 2, forms: 1, cards: 12 }),
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  });
}

function checkoutSnapshot(pageClassification) {
  return baseSnapshot({
    meta: {
      url: 'https://shop.example.com/checkout/payment',
      title: 'Checkout - Pago y envío',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    pageClassification,
    components: componentFixture({ buttons: 2, inputs: 8, forms: 2, navigation: 1 }),
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] }
  });
}

function baseSnapshot(overrides = {}) {
  return {
    meta: {
      url: 'https://example.com',
      title: 'Fixture',
      generatedAt: '2026-05-18T10:00:00.000Z',
      viewport: { width: 1440, height: 900 }
    },
    colors: baseColors(),
    typography: {
      typeStyles: [{ value: 'Inter, sans-serif | 16px / 24px | 400 | 0px', count: 8 }],
      fontFamilies: [{ value: 'Inter, sans-serif', count: 8 }]
    },
    spacing: {
      spacingScale: [{ value: '8px', count: 6 }, { value: '16px', count: 12 }],
      radii: [{ value: '8px', count: 4 }],
      shadows: [],
      borders: [{ value: '1px solid', count: 6 }]
    },
    scopeMap: { regions: { main: 4 }, usedForBehavioral: ['main'], excludedFromBehavioral: [] },
    components: componentFixture(),
    pageClassification: { archetype: 'unknown', confidence: 'low', analysisMode: 'snapshot_only', signals: [] },
    behavioralMapping: [],
    frictions: [],
    behavioralRecommendation: { sections: [] },
    ...overrides
  };
}

function baseColors() {
  return {
    colors: [
      { value: '#111111', count: 12, suggestedRole: 'text', roleConfidence: 'likely', sample: { selector: 'body', property: 'color' } },
      { value: '#e60000', count: 4, suggestedRole: 'primary', roleConfidence: 'possible', sample: { selector: 'button.primary', property: 'backgroundColor' } }
    ],
    cssVariables: [{ name: '--color-primary', value: '#e60000' }],
    totalUniqueColors: 2
  };
}

function contractColors() {
  return {
    colors: [
      {
        value: '#0d0d0d',
        count: 40,
        suggestedRole: 'text',
        displayRole: 'texto (text)',
        roleConfidence: 'high',
        roleReason: 'Propiedad CSS color mapea a texto; sin evidencia semántica fuerte localizada.',
        sample: { selector: 'body', property: 'color' },
        usages: [{ selector: 'body', property: 'color' }]
      },
      {
        value: '#ffffff',
        count: 24,
        suggestedRole: 'surface',
        displayRole: 'superficie (surface)',
        roleConfidence: 'medium',
        roleReason: 'BackgroundColor neutro/claro mapea a superficie.',
        sample: { selector: 'a.btn.inverse', property: 'backgroundColor' },
        usages: [{ selector: 'a.btn.inverse', property: 'backgroundColor' }]
      },
      {
        value: '#000000',
        count: 10,
        suggestedRole: 'inverse_surface',
        displayRole: 'superficie inversa (inverse_surface)',
        roleConfidence: 'medium',
        roleReason: 'BackgroundColor oscuro en footer mapea a superficie inversa, no a acción primaria.',
        sample: { selector: 'footer', property: 'backgroundColor' },
        usages: [{ selector: 'footer', property: 'backgroundColor' }]
      },
      {
        value: '#e60000',
        count: 8,
        suggestedRole: 'primary',
        displayRole: 'primario (primary)',
        roleConfidence: 'medium',
        roleReason: 'BackgroundColor en CTA visible mapea a primario.',
        sample: { selector: 'a.primary.cta', property: 'backgroundColor' },
        usages: [{ selector: 'a.primary.cta', property: 'backgroundColor' }]
      }
    ],
    cssVariables: [{ name: '--color-primary', value: '#e60000', usageStatus: 'used visible' }],
    totalUniqueColors: 4
  };
}

function componentFixture(counts = {}) {
  return {
    counts: {
      buttons: 0,
      links: 0,
      inputs: 0,
      forms: 0,
      cards: 0,
      alerts: 0,
      navigation: 0,
      images: 0,
      badges: 0,
      dialogs: 0,
      ctaGroups: 0,
      ...counts
    },
    samples: {
      buttons: [{ text: 'Continuar' }],
      unlabeledInputs: [],
      disabledControls: [],
      genericLinks: [],
      imagesWithoutAlt: [],
      badges: ['span.badge'],
      dialogs: [],
      ctaGroups: [{ selector: '.actions', actions: ['Continuar', 'Ver más'] }]
    }
  };
}

function behavioralLandingMap() {
  return [
    {
      block: 'what',
      label: 'What',
      displayLabel: 'Qué',
      present: 'sí',
      quality: 4,
      confidence: 'high',
      evidence: ['Propuesta de servicio Vodafone Care visible.'],
      missing: [],
      severity: 0
    },
    {
      block: 'why',
      label: 'Why',
      displayLabel: 'Por qué',
      present: 'sí',
      quality: 4,
      confidence: 'high',
      evidence: ['Beneficios del soporte y cuidado del servicio visibles.'],
      missing: [],
      severity: 0
    },
    {
      block: 'why_not',
      label: 'Why not',
      displayLabel: 'Por qué no',
      present: 'sí',
      quality: 4,
      confidence: 'high',
      evidence: ['Preguntas frecuentes y objeciones visibles.'],
      missing: [],
      severity: 0
    },
    {
      block: 'who',
      label: 'Who',
      displayLabel: 'Para quién',
      present: 'parcial',
      quality: 3,
      confidence: 'medium',
      evidence: ['Target funcional detectado en caso de uso: “para tu móvil”.'],
      missing: ['Validar si el target funcional necesita traducirse a segmento comercial.'],
      severity: 1
    },
    {
      block: 'how',
      label: 'How',
      displayLabel: 'Cómo',
      present: 'sí',
      quality: 4,
      confidence: 'high',
      evidence: ['Se explica el proceso de alta y soporte.'],
      missing: [],
      severity: 0
    },
    {
      block: 'where',
      label: 'Where',
      displayLabel: 'Dónde actuar',
      present: 'sí',
      quality: 3,
      confidence: 'medium',
      evidence: ['CTA principal visible en hero: “Asegura tu móvil”.'],
      missing: ['Validar si el CTA coincide con el objetivo real de la página.'],
      diagnostics: {
        ctaAssessment: {
          primary: { cleanLabel: 'Asegura tu móvil', label: 'Asegura tu móvil', region: 'hero' }
        }
      },
      frictionType: 'baja_accionabilidad',
      detectedFriction: 'Acciones primarias compitiendo',
      severity: 4,
      recommendation: 'Mantener una acción primaria.',
      metrics: ['CTR del CTA principal']
    },
    {
      block: 'when',
      label: 'When',
      displayLabel: 'Cuándo / Urgencia',
      present: 'sí',
      quality: 4,
      confidence: 'high',
      evidence: ['Se explican condiciones y límites temporales sin urgencia artificial.'],
      missing: [],
      severity: 0
    }
  ];
}

function ctaFriction() {
  return createBehavioralFinding({
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
}

function countMatches(text, pattern) {
  return (text.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function assertNoVisibleMarkdownRoleRegressions(markdown) {
  assert.doesNotMatch(markdown, /#0d0d0d\s*\|\s*\d+\s*\|\s*aviso \(warning\)/i);
  assert.doesNotMatch(markdown, /#ffffff\s*\|\s*\d+\s*\|\s*aviso \(warning\)/i);
  assert.doesNotMatch(markdown, /#000000\s*\|\s*\d+\s*\|\s*primario \(primary\)/i);
  assert.doesNotMatch(markdown, /#000000\s*\|\s*\d+\s*\|\s*aviso \(warning\)/i);
  assert.doesNotMatch(markdown, /Non-destructive alert component is warning evidence/i);
}
