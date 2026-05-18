import { collectColors } from './collect-colors.js';
import { collectTypography } from './collect-typography.js';
import { collectSpacing } from './collect-spacing.js';
import { collectComponents } from './collect-components.js';
import { detectFrictions } from './detect-frictions.js';
import { behavioralBlockDisplayLabel, buildBehavioralMapping, buildBehavioralStructureRecommendation } from './behavioral-model.js';
import { pageArchetypeClassifier, shouldRunFullBehavioralAnalysis } from './page-archetype-classifier.js';
import { detectDomRegions } from './dom-regions.js';
import { buildFindings, groupFindings } from './findings-prioritization.js';
import { generateHypotheses, generateReviewTasks } from './hypotheses.js';
import { buildDesignContextMarkdown, buildGithubIssueExport, buildJsonExport } from './export-markdown.js';

const PANEL_ID = 'contextic-panel';
const CONTEXTIC_LOGO_SRC = 'data:image/png;base64,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';

export function runContextic() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const snapshot = createSnapshot();
  renderPanel(snapshot);
}

function createSnapshot() {
  const root = document.body;
  const colors = collectColors(root);
  const typography = collectTypography(root);
  const spacing = collectSpacing(root);
  const components = collectComponents(root);
  const scopeMap = detectDomRegions(root);
  const pageClassification = pageArchetypeClassifier({
    url: window.location.href,
    title: document.title,
    components
  }, scopeMap.behavioralRoot);
  const fullBehavioral = shouldRunFullBehavioralAnalysis(pageClassification);
  const behavioralComponents = fullBehavioral ? collectComponents(scopeMap.behavioralRoot) : components;
  const frictions = fullBehavioral ? detectFrictions({ colors, typography, spacing, components: behavioralComponents }, scopeMap.behavioralRoot) : [];
  const behavioralMapping = fullBehavioral ? buildBehavioralMapping({ components: behavioralComponents, frictions }, scopeMap.behavioralRoot) : [];
  const behavioralRecommendation = fullBehavioral ? buildBehavioralStructureRecommendation({ behavioralMapping, frictions }) : { sections: [] };
  const findings = buildFindings({ frictions, behavioralMapping });
  const hypotheses = generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = generateReviewTasks(findings, pageClassification, { behavioralMapping, components });

  return {
    meta: {
      url: window.location.href,
      title: document.title,
      generatedAt: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    },
    colors,
    typography,
    spacing,
    components,
    scopeMap: {
      regions: scopeMap.regions,
      usedForBehavioral: scopeMap.usedForBehavioral,
      excludedFromBehavioral: scopeMap.excludedFromBehavioral
    },
    pageClassification,
    frictions,
    findings,
    hypotheses,
    reviewTasks,
    behavioralMapping,
    behavioralRecommendation
  };
}

function renderPanel(snapshot) {
  const host = document.createElement('aside');
  host.id = PANEL_ID;
  host.setAttribute('aria-label', 'Panel de Contextic');
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const designContext = buildDesignContextMarkdown(snapshot);
  const jsonReport = buildJsonExport(snapshot);
  const githubIssue = buildGithubIssueExport(snapshot);

  const style = document.createElement('style');
  style.textContent = `
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        inset: 14px 14px 14px auto;
        width: min(448px, calc(100vw - 28px));
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #151515;
        -webkit-font-smoothing: antialiased;
      }
      * { box-sizing: border-box; }
      button:focus-visible,
      [tabindex]:focus-visible {
        outline: 3px solid #0e7c66;
        outline-offset: 2px;
      }
      .panel {
        height: 100%;
        background: #f6f8f7;
        border: 1px solid #d7ded8;
        border-radius: 10px;
        box-shadow: 0 28px 90px rgba(22, 34, 28, 0.26);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .panel-header {
        padding: 18px;
        border-bottom: 1px solid #d7ded8;
        background: #ffffff;
        display: flex;
        gap: 14px;
        align-items: center;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 0;
      }
      .brand-mark {
        flex: 0 0 auto;
        display: block;
        width: 38px;
        height: 38px;
        border-radius: 9px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }
      .kicker {
        margin: 0 0 2px;
        color: #075f4d;
        font-size: 11px;
        font-weight: 850;
        line-height: 16px;
        text-transform: uppercase;
      }
      h2,
      h3 {
        margin: 0;
      }
      h2 {
        color: #151515;
        font-size: 18px;
        line-height: 24px;
        font-weight: 850;
      }
      .subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #5f6761;
      }
      .close {
        border: 0;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        background: #eef4f0;
        color: #151515;
        cursor: pointer;
        font: inherit;
        font-size: 18px;
        line-height: 18px;
        transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms cubic-bezier(0.2, 0, 0, 1);
      }
      .body {
        overflow: auto;
        padding: 0;
      }
      .tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        padding: 10px;
        border-bottom: 1px solid #d7ded8;
        background: #ffffff;
      }
      .tab {
        min-height: 40px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: #5f6761;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 850;
        line-height: 16px;
      }
      .tab[aria-selected="true"] {
        border-color: #b8c7bd;
        background: #151515;
        color: #ffffff;
        box-shadow: 0 8px 20px rgba(22, 34, 28, 0.14);
      }
      .tabpanel {
        display: none;
        padding: 14px;
      }
      .tabpanel.is-active {
        display: block;
      }
      .hero-summary {
        display: grid;
        grid-template-columns: 116px minmax(0, 1fr);
        gap: 12px;
        align-items: stretch;
        margin-bottom: 12px;
      }
      .score {
        display: grid;
        place-items: center;
        min-height: 104px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        background: #151515;
        color: #ffffff;
        text-align: center;
      }
      .score strong {
        display: block;
        font-size: 38px;
        line-height: 42px;
        font-weight: 900;
      }
      .score span {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, .76);
        font-size: 11px;
        font-weight: 750;
        line-height: 16px;
        text-transform: uppercase;
      }
      .summary-copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 104px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 14px;
        background: #ffffff;
      }
      .summary-copy strong {
        color: #151515;
        font-size: 15px;
        line-height: 21px;
      }
      .summary-copy p {
        margin: 6px 0 0;
        color: #5f6761;
        font-size: 12px;
        line-height: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .metric {
        min-height: 72px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 11px 12px;
        background: #ffffff;
      }
      .metric strong {
        display: block;
        color: #151515;
        font-size: 24px;
        line-height: 28px;
        font-weight: 850;
        font-variant-numeric: tabular-nums;
      }
      .metric span {
        display: block;
        margin-top: 3px;
        font-size: 11px;
        line-height: 16px;
        color: #5f6761;
      }
      .section {
        border-top: 1px solid #d7ded8;
        padding: 16px 0 0;
        margin-top: 16px;
      }
      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        color: #151515;
        font-size: 12px;
        font-weight: 850;
        line-height: 18px;
        text-transform: uppercase;
      }
      .section-title span {
        color: #7a837b;
        font-weight: 750;
      }
      .swatches {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }
      .swatch {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        min-width: 0;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 8px;
        background: #ffffff;
      }
      .swatch-chip {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        border: 1px solid rgba(0,0,0,.12);
      }
      .swatch-code {
        display: block;
        overflow: hidden;
        color: #151515;
        font-size: 12px;
        font-weight: 800;
        line-height: 16px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .swatch-role {
        display: block;
        overflow: hidden;
        color: #7a837b;
        font-size: 11px;
        line-height: 15px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .component-line,
      .detail-card,
      .mapping-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 10px 11px;
        background: #ffffff;
        color: #151515;
        font-size: 12px;
        line-height: 17px;
      }
      .detail-card {
        display: block;
      }
      .detail-card strong {
        display: block;
        margin-bottom: 4px;
        color: #151515;
        font-size: 12px;
        line-height: 17px;
      }
      .detail-card p,
      .detail-card ul {
        margin: 0;
        color: #5f6761;
        font-size: 12px;
        line-height: 18px;
      }
      .detail-card ul {
        padding-left: 18px;
      }
      .detail-card li + li {
        margin-top: 4px;
      }
      .detail-grid {
        display: grid;
        gap: 7px;
      }
      .token-list {
        display: grid;
        gap: 7px;
      }
      .token-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 9px 10px;
        background: #ffffff;
        color: #151515;
        font-size: 12px;
        line-height: 17px;
      }
      .token-line span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mapping-list {
        display: grid;
        gap: 7px;
      }
      .mapping-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }
      .mapping-copy {
        min-width: 0;
      }
      .mapping-copy strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        background: #eef4f0;
        color: #075f4d;
        font-size: 11px;
        font-weight: 850;
        line-height: 16px;
        white-space: nowrap;
      }
      .friction {
        border: 1px solid #d7ded8;
        border-left: 5px solid #0e7c66;
        background: #ffffff;
        padding: 11px 12px;
        border-radius: 8px;
        margin-bottom: 7px;
      }
      .friction.severity-alta,
      .friction.severity-critica {
        border-left-color: #c94d3f;
      }
      .friction.severity-media {
        border-left-color: #d99b2b;
      }
      .friction strong {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        color: #151515;
        font-size: 13px;
        line-height: 18px;
      }
      .friction p {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #5f6761;
      }
      .top-findings {
        display: grid;
        gap: 7px;
      }
      .finding-type {
        color: #075f4d;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .02em;
        text-transform: uppercase;
      }
      .actions {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }
      .secondary-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      button.copy {
        width: 100%;
        border: 0;
        border-radius: 8px;
        padding: 12px 12px;
        background: #151515;
        color: white;
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
        transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms cubic-bezier(0.2, 0, 0, 1);
      }
      button.copy:active,
      .close:active {
        transform: scale(0.96);
      }
      button.copy.secondary {
        background: #eef4f0;
        color: #151515;
      }
      .notice {
        font-size: 11px;
        line-height: 16px;
        color: #7a837b;
        margin: 0;
      }
      @media (max-width: 520px) {
        :host {
          inset: 10px;
          width: auto;
        }
        .hero-summary {
          grid-template-columns: 1fr;
        }
        .score {
          min-height: 86px;
        }
        .swatches,
        .secondary-actions {
          grid-template-columns: 1fr;
        }
      }
  `;

  const closeButton = element('button', {
    class: 'close',
    type: 'button',
    'aria-label': 'Cerrar panel'
  }, ['×']);

  const weakBlocksCount = snapshot.behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).length;
  const lightReviewCount = snapshot.behavioralMapping.filter(isLightBehavioralReviewSignal).length;
  const classification = snapshot.pageClassification || {};
  const findings = snapshot.findings || [];
  const findingGroups = groupFindings(findings);
  const uxFrictionCount = findingGroups.ux.filter(finding => finding.confidence === 'high' && finding.priority !== 'Review').length;
  const manualReviewCount = findingGroups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length;
  const dsRiskCount = findingGroups.designSystem.length;
  const summaryText = uxFrictionCount > 0
    ? `${uxFrictionCount} fricción(es) UX de alta confianza.`
    : weakBlocksCount > 0
      ? 'No se detectan fricciones UX de alta confianza. Hay bloques que conviene revisar.'
      : classification.analysisMode === 'full_behavioral'
        ? 'No se detectan fricciones UX de alta confianza.'
        : 'Análisis conductual limitado por arquetipo de página.';
  const componentSummary = `Botones ${snapshot.components.counts.buttons} · Inputs ${snapshot.components.counts.inputs} · Enlaces ${snapshot.components.counts.links} · Tarjetas ${snapshot.components.counts.cards}`;

  const heroSummary = element('div', { class: 'hero-summary' }, [
    element('div', { class: 'score' }, [
      element('div', {}, [
        element('strong', {}, [String(snapshot.frictions.length)]),
        element('span', {}, ['Señales raw'])
      ])
    ]),
    element('div', { class: 'summary-copy' }, [
      element('strong', {}, [summaryText]),
      element('p', {}, [`${snapshot.meta.title || 'Pantalla actual'} · ${snapshot.meta.viewport.width}×${snapshot.meta.viewport.height}`])
    ])
  ]);

  const grid = element('div', { class: 'grid' }, [
    metric('Fricciones UX', uxFrictionCount),
    metric('Bloques débiles', weakBlocksCount),
    metric('Revisión ligera', lightReviewCount),
    metric('Riesgos sistema', dsRiskCount),
    metric('Revisión manual', manualReviewCount)
  ]);

  const swatches = element('div', { class: 'swatches' });
  for (const color of snapshot.colors.colors.slice(0, 8)) {
    swatches.appendChild(element('div', { class: 'swatch' }, [
      element('span', { class: 'swatch-chip', style: { background: color.value } }),
      element('span', {}, [
        element('span', { class: 'swatch-code' }, [color.value]),
        element('span', { class: 'swatch-role', title: color.roleReason || '' }, [`${colorRoleLabel(displayColorRole(color))} · ${color.count}`])
      ])
    ]));
  }
  if (!swatches.childElementCount) {
    swatches.appendChild(element('p', { class: 'notice' }, ['No se detectan colores.']));
  }

  const mappingRows = snapshot.behavioralMapping.map(block => element('div', { class: 'mapping-row' }, [
    element('div', { class: 'mapping-copy' }, [
      element('strong', {}, [block.displayLabel || behavioralBlockDisplayLabel(block.block)]),
      element('div', { class: 'mapping-meta' }, [
        element('span', { class: 'pill' }, [presenceLabel(block.present)]),
        element('span', { class: 'pill' }, [`calidad ${block.quality}/5`]),
        element('span', { class: 'pill' }, [confidenceLabel(block.confidence || blockConfidence(block))])
      ])
    ]),
        element('span', { class: 'pill' }, [behavioralBlockTypeLabel(block.title)])
  ]));

  const copyButtons = [
    element('button', { class: 'copy primary', type: 'button', 'data-copy': 'design' }, ['Copiar design-context.md']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'json' }, ['Copiar JSON']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'issue' }, ['Copiar issue de GitHub'])
  ];

  const copyStatus = element('p', { class: 'notice', 'data-copy-status': '' }, [
    'Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.'
  ]);

  const topReviewTask = snapshot.reviewTasks[0];
  const diagnosticPanel = element('section', {
    class: 'tabpanel is-active',
    id: 'contextic-tabpanel-diagnostico',
    role: 'tabpanel',
    'aria-labelledby': 'contextic-tab-diagnostico',
    tabindex: '0'
  }, [
    heroSummary,
    grid,
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Clasificación']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [`${classificationLabel(classification.archetype)} · ${confidenceLabel(classification.confidence)}`]),
        element('span', { class: 'pill' }, [analysisModeLabel(classification.analysisMode)])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [classification.analysisMode === 'full_behavioral' ? 'Mapa conductual' : 'Revisión manual']),
      ...(classification.analysisMode === 'full_behavioral'
        ? (mappingRows.length ? [element('div', { class: 'mapping-list' }, mappingRows)] : [element('p', { class: 'notice' }, ['No hay mapa conductual disponible.'])])
        : [element('p', { class: 'notice' }, ['No se generan recomendaciones de conversión con la matriz conductual actual para este arquetipo.'])])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Tarea principal de revisión']),
      topReviewTask ? element('div', { class: 'detail-card' }, [
        element('strong', {}, [topReviewTask.question || 'Revisar evidencia principal']),
        element('p', {}, [topReviewTask.howToValidate || 'Validar con revisión manual y datos reales.'])
      ]) : element('p', { class: 'notice' }, ['No hay tareas de revisión prioritarias con la evidencia actual.'])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Fricciones UX']),
      ...(findingGroups.ux.length ? [element('div', { class: 'top-findings' }, findingCards(findingGroups.ux.slice(0, 4), 'UX'))] : [
        element('p', { class: 'notice' }, ['No hay fricciones UX de alta confianza en esta captura.'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Hipótesis']),
      ...(snapshot.hypotheses.length ? [element('div', { class: 'detail-grid' }, hypothesisCards(snapshot.hypotheses.slice(0, 3)))] : [
        element('p', { class: 'notice' }, ['No hay hipótesis accionables con la evidencia actual.'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Tareas de revisión']),
      ...(snapshot.reviewTasks.length ? [element('div', { class: 'detail-grid' }, reviewTaskCards(snapshot.reviewTasks))] : [
        element('p', { class: 'notice' }, ['No hay tareas de revisión prioritarias con la evidencia actual.'])
      ])
    ])
  ]);

  const visualNoise = [
    ...(snapshot.colors.systemHiddenVisualNoise || []),
    ...(snapshot.typography.systemHiddenVisualNoise || [])
  ];
  const visualSystemPanel = element('section', {
    class: 'tabpanel',
    id: 'contextic-tabpanel-sistema',
    role: 'tabpanel',
    'aria-labelledby': 'contextic-tab-sistema',
    tabindex: '0',
    hidden: ''
  }, [
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [
        'Colores',
        element('span', {}, [`${snapshot.colors.colors.length} muestras`])
      ]),
      swatches
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Tipografía']),
      tokenList(snapshot.typography.typeStyles || [], styleTokenLabel, 'No se detectan estilos tipográficos.')
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Espaciado, radios, sombras y bordes']),
      element('div', { class: 'detail-grid' }, [
        tokenGroup('Espaciado', snapshot.spacing.spacingScale || []),
        tokenGroup('Radios', snapshot.spacing.radii || []),
        tokenGroup('Sombras', snapshot.spacing.shadows || []),
        tokenGroup('Bordes', snapshot.spacing.borders || [])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Variables CSS']),
      tokenList(snapshot.colors.cssVariables || [], cssVariableLabel, 'No se detectaron variables CSS.')
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Inventario de componentes']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [componentSummary]),
        element('span', { class: 'pill' }, [`${snapshot.components.counts.ctaGroups} grupos CTA`])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Ruido visual del sistema']),
      tokenList(visualNoise, visualNoiseLabel, 'No se detecta ruido visual oculto del sistema.')
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Widgets/utilidades externas detectadas']),
      tokenList(snapshot.components.systemUtilityWidgets || [], systemWidgetLabel, 'No se detectaron widgets o utilidades externas visibles.')
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Hallazgos de sistema']),
      ...(findingGroups.designSystem.length ? [element('div', { class: 'top-findings' }, findingCards(findingGroups.designSystem.slice(0, 4), 'Sistema'))] : [
        element('p', { class: 'notice' }, ['No hay hallazgos de sistema priorizados en esta captura.'])
      ])
    ])
  ]);

  const exportPanel = element('section', {
    class: 'tabpanel',
    id: 'contextic-tabpanel-exportar',
    role: 'tabpanel',
    'aria-labelledby': 'contextic-tab-exportar',
    tabindex: '0',
    hidden: ''
  }, [
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Exportar']),
      element('div', { class: 'actions' }, [
        copyButtons[0],
        element('div', { class: 'secondary-actions' }, [copyButtons[1], copyButtons[2]]),
        copyStatus
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Resumen para traspaso']),
      element('div', { class: 'detail-card' }, [
        element('p', {}, [handoffSummary(snapshot, summaryText)])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Métricas recomendadas']),
      tokenList(recommendedMetrics(snapshot), metricLabel, 'No hay métricas recomendadas con la evidencia actual.')
    ])
  ]);

  const tabButtons = [
    element('button', { class: 'tab', id: 'contextic-tab-diagnostico', type: 'button', role: 'tab', 'aria-selected': 'true', 'aria-controls': 'contextic-tabpanel-diagnostico', tabindex: '0' }, ['Diagnóstico']),
    element('button', { class: 'tab', id: 'contextic-tab-sistema', type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'contextic-tabpanel-sistema', tabindex: '-1' }, ['Sistema visual']),
    element('button', { class: 'tab', id: 'contextic-tab-exportar', type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'contextic-tabpanel-exportar', tabindex: '-1' }, ['Exportar'])
  ];
  const tabPanels = [diagnosticPanel, visualSystemPanel, exportPanel];
  const body = element('div', { class: 'body' }, [
    element('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones de Contextic' }, tabButtons),
    diagnosticPanel,
    visualSystemPanel,
    exportPanel
  ]);

  const panel = element('div', { class: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'contextic-title' }, [
    element('header', { class: 'panel-header' }, [
      element('div', { class: 'brand' }, [
        element('img', { class: 'brand-mark', src: CONTEXTIC_LOGO_SRC, alt: 'Contextic', width: '38', height: '38', draggable: 'false' }),
        element('div', {}, [
          element('p', { class: 'kicker' }, ['Contexto de diseño']),
          element('h2', { id: 'contextic-title' }, ['Contextic']),
          element('p', { class: 'subtitle' }, ['Evidencia, confianza e hipótesis listas para traspaso.'])
        ])
      ]),
      closeButton
    ]),
    body
  ]);

  shadow.append(style, panel);

  const removePanel = () => host.remove();
  closeButton.addEventListener('click', removePanel);
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      removePanel();
    }
  });
  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectTab(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabButtons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
      selectTab(nextIndex);
      tabButtons[nextIndex].focus();
    });
  });
  function selectTab(activeIndex) {
    tabButtons.forEach((button, index) => {
      const selected = index === activeIndex;
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('tabindex', selected ? '0' : '-1');
      tabPanels[index].classList.toggle('is-active', selected);
      if (selected) {
        tabPanels[index].removeAttribute('hidden');
      } else {
        tabPanels[index].setAttribute('hidden', '');
      }
    });
  }
  closeButton.focus({ preventScroll: true });
  copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-copy');
      const payload = key === 'design' ? designContext : key === 'json' ? jsonReport : githubIssue;
      const copied = await copyToClipboard(payload);
      const previous = button.textContent;
      button.textContent = copied ? 'Copiado' : 'No se pudo copiar';
      copyStatus.textContent = copied ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.';
      setTimeout(() => { button.textContent = previous; }, 1200);
    });
  });
}

function metric(label, value) {
  return element('div', { class: 'metric' }, [
    element('strong', {}, [String(value)]),
    element('span', {}, [label])
  ]);
}

function tokenGroup(label, tokens = []) {
  const sample = tokens.slice(0, 4).map(token => token.value || token.name || String(token)).join(' · ');
  return element('div', { class: 'detail-card' }, [
    element('strong', {}, [label]),
    element('p', {}, [sample || 'Sin muestras detectadas.'])
  ]);
}

function tokenList(items = [], formatter = String, emptyText = 'Sin datos detectados.') {
  if (!items.length) return element('p', { class: 'notice' }, [emptyText]);
  return element('div', { class: 'token-list' }, items.slice(0, 8).map(item => {
    const formatted = formatter(item);
    return element('div', { class: 'token-line' }, [
      element('span', {}, [formatted.label]),
      element('span', { class: 'pill' }, [formatted.meta])
    ]);
  }));
}

function styleTokenLabel(token = {}) {
  return {
    label: token.value || `${token.fontSize || 'tamaño desconocido'} / ${token.lineHeight || 'interlínea desconocida'}`,
    meta: `${token.count || 1} uso(s)`
  };
}

function cssVariableLabel(variable = {}) {
  return {
    label: `${variable.name || 'variable sin nombre'}: ${variable.value || 'valor desconocido'}`,
    meta: variable.visibleUsage === false ? 'sin uso visible' : 'uso visible'
  };
}

function visualNoiseLabel(item = {}) {
  return {
    label: item.reason || item.value || item.name || 'Señal visual oculta',
    meta: item.count ? `${item.count} uso(s)` : 'revisar'
  };
}

function systemWidgetLabel(item = {}) {
  return {
    label: item.selector || 'Widget externo detectado',
    meta: item.type === 'accessibility_widget' ? 'accesibilidad' : 'utilidad'
  };
}

function metricLabel(metric = '') {
  return {
    label: spanishMetricLabel(metric),
    meta: 'métrica'
  };
}

function findingCards(findings = [], type = 'Hallazgo') {
  return findings.map(finding => element('div', { class: `friction ${severityClass(finding.severity)}` }, [
    element('strong', {}, [
      element('span', {}, [
        element('span', { class: 'finding-type' }, [type]),
        ' ',
        finding.title || 'Hallazgo sin título'
      ]),
      element('span', { class: 'pill' }, [finding.priority || 'Revisión'])
    ]),
    element('p', {}, [`${confidenceLabel(finding.confidence)} · ${finding.rationale || finding.recommendation || 'Revisar evidencia en el export completo.'}`])
  ]));
}

function hypothesisCards(hypotheses = []) {
  return hypotheses.map(hypothesis => element('div', { class: 'detail-card' }, [
    element('strong', {}, [hypothesis.title || 'Hipótesis sin título']),
    element('p', {}, [hypothesis.ifWe || hypothesis.rationale || 'Validar con experimento o revisión cualitativa.'])
  ]));
}

function reviewTaskCards(tasks = []) {
  return tasks.slice(0, 6).map(task => element('div', { class: 'detail-card' }, [
    element('strong', {}, [task.question || 'Revisar evidencia']),
    element('p', {}, [task.whyItMatters || task.howToValidate || 'Validar manualmente antes de implementar.'])
  ]));
}

function recommendedMetrics(snapshot = {}) {
  const metrics = new Set();
  for (const hypothesis of snapshot.hypotheses || []) {
    if (hypothesis.metrics?.primary) metrics.add(hypothesis.metrics.primary);
    for (const metric of hypothesis.metrics?.secondary || []) metrics.add(metric);
    for (const metric of hypothesis.metrics?.guardrail || []) metrics.add(metric);
  }
  for (const block of snapshot.behavioralMapping || []) for (const metric of block.metrics || []) metrics.add(metric);
  for (const section of snapshot.behavioralRecommendation?.sections || []) for (const metric of section.metrics || []) metrics.add(metric);
  return Array.from(metrics);
}

function handoffSummary(snapshot = {}, fallback = '') {
  const topHypothesis = (snapshot.hypotheses || [])[0];
  const topTask = (snapshot.reviewTasks || [])[0];
  if (topHypothesis) {
    return `${topHypothesis.title || 'Hipótesis principal'}. Medir ${spanishMetricLabel(topHypothesis.metrics?.primary || 'la métrica principal')} y validar antes de implementar.`;
  }
  if (topTask) return `${topTask.question || 'Tarea de revisión principal'}. ${topTask.howToValidate || 'Validar con revisión manual.'}`;
  return fallback || 'Exportación lista para traspaso con evidencia DOM/CSS y notas de revisión.';
}

function colorRoleLabel(role = '') {
  const unsure = String(role).endsWith('?');
  const clean = String(role).replace(/\?$/, '');
  const labels = {
    text: 'texto',
    background: 'fondo',
    primary: 'primario',
    secondary: 'secundario',
    accent: 'acento',
    brand: 'marca',
    border: 'borde',
    focus: 'foco',
    shadow: 'sombra',
    error: 'error',
    success: 'éxito',
    warning: 'aviso',
    info: 'información',
    utility: 'utilidad',
    unknown: 'desconocido'
  };
  return `${labels[clean] || clean || 'desconocido'}${unsure ? '?' : ''}`;
}

function behavioralBlockTypeLabel(value = '') {
  const labels = {
    what: 'qué',
    why: 'por qué',
    why_not: 'por qué no',
    who: 'para quién',
    how: 'cómo',
    where: 'dónde actuar',
    when: 'cuándo'
  };
  return labels[value] || value || 'bloque';
}

function spanishMetricLabel(value = '') {
  return String(value || '')
    .replace(/primary CTA CTR/gi, 'CTR del CTA principal')
    .replace(/primary task completion rate/gi, 'tasa de finalización de la tarea principal')
    .replace(/task completion rate for affected interaction/gi, 'tasa de finalización de la interacción afectada')
    .replace(/component\/token reuse rate/gi, 'tasa de reutilización de componentes y tokens')
    .replace(/qualified conversion rate/gi, 'tasa de conversión cualificada')
    .replace(/secondary CTA clicks/gi, 'clics en CTA secundarios')
    .replace(/bounce/gi, 'rebote')
    .replace(/accessibility regressions/gi, 'regresiones de accesibilidad')
    .replace(/guardrails/gi, 'controles de seguridad');
}

function classificationLabel(value = '') {
  const labels = {
    landing: 'landing',
    product: 'producto',
    article: 'contenido',
    dashboard: 'dashboard',
    unknown: 'desconocido'
  };
  return labels[value] || value || 'desconocido';
}

function analysisModeLabel(value = '') {
  const labels = {
    full_behavioral: 'behavioral completo',
    limited_behavioral: 'behavioral limitado',
    snapshot_only: 'solo snapshot'
  };
  return labels[value] || 'solo snapshot';
}

function presenceLabel(value = '') {
  if (value === 'sí') return 'presente';
  if (value === 'parcial') return 'parcial';
  if (value === 'no') return 'ausente';
  return value || 'desconocido';
}

function confidenceLabel(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high' || normalized === 'alta') return 'confianza alta';
  if (normalized === 'medium' || normalized === 'media') return 'confianza media';
  if (normalized === 'low' || normalized === 'baja') return 'confianza baja';
  return 'confianza desconocida';
}

function blockConfidence(block = {}) {
  if (block.present === 'sí' && block.quality >= 4 && (block.evidence || []).length >= 2) return 'high';
  if (block.present === 'parcial' || (block.evidence || []).length) return 'medium';
  return 'low';
}

function displayColorRole(color = {}) {
  if (color.displayRole) return color.displayRole;
  const role = color.suggestedRole || 'unknown';
  const confidence = color.roleConfidence || 'low';
  if (confidence === 'low') {
    if (role === 'error' || role === 'success') return 'unknown';
    if (role !== 'unknown') return `${role}?`;
  }
  return role;
}

function isLightBehavioralReviewSignal(block = {}) {
  if (block.present === 'no' || Number(block.quality || 0) <= 2) return false;
  if (Number(block.quality || 0) >= 4 && block.confidence === 'high' && !(block.missing || []).length && !block.detectedFriction) return false;
  const hasConcreteNote = Boolean((block.missing || []).filter(Boolean).length || block.detectedFriction || block.diagnostics?.ctaAssessment?.primary);
  return hasConcreteNote && (Number(block.quality || 0) === 3 || block.confidence === 'medium');
}

function severityClass(severity = '') {
  const normalized = String(severity).toLowerCase();
  if (normalized.includes('cr')) return 'severity-critica';
  if (normalized.includes('alt')) return 'severity-alta';
  if (normalized.includes('med')) return 'severity-media';
  return 'severity-baja';
}

function element(tagName, attributes = {}, children = []) {
  const node = document.createElement(tagName);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    if (name === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else {
      node.setAttribute(name, String(value));
    }
  }

  for (const child of children) {
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

async function copyToClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Sigue con fallback manual.
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy') === true;
  textarea.remove();
  return copied;
}

runContextic();
