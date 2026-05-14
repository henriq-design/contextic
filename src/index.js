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
  const reviewTasks = generateReviewTasks(findings, pageClassification, { behavioralMapping });

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
        display: inline-grid;
        flex: 0 0 auto;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: #151515;
        color: #ffffff;
        font-size: 17px;
        font-weight: 850;
        line-height: 20px;
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
        padding: 14px;
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
        padding: 12px 14px 14px;
        border-top: 1px solid #d7ded8;
        background: #ffffff;
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
        : 'Análisis behavioral limitado por arquetipo de página.';
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
    metric('Bloques a revisar', weakBlocksCount),
    metric('Riesgos DS', dsRiskCount),
    metric('Revisión manual', manualReviewCount)
  ]);

  const swatches = element('div', { class: 'swatches' });
  for (const color of snapshot.colors.colors.slice(0, 8)) {
    swatches.appendChild(element('div', { class: 'swatch' }, [
      element('span', { class: 'swatch-chip', style: { background: color.value } }),
      element('span', {}, [
        element('span', { class: 'swatch-code' }, [color.value]),
        element('span', { class: 'swatch-role', title: color.roleReason || '' }, [`${displayColorRole(color)} · ${color.count}`])
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
    element('span', { class: 'pill' }, [block.title || 'bloque'])
  ]));

  const topFindingNodes = topFindingsByType(findingGroups, findings).map(item => element('div', { class: `friction ${severityClass(item.finding.severity)}` }, [
    element('strong', {}, [
      element('span', {}, [
        element('span', { class: 'finding-type' }, [item.type]),
        ' ',
        item.finding.title
      ]),
      element('span', { class: 'pill' }, [item.finding.priority])
    ]),
    element('p', {}, [`${confidenceLabel(item.finding.confidence)} · ${item.finding.rationale}`])
  ]));

  const body = element('div', { class: 'body' }, [
    heroSummary,
    grid,
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [
        'Colores principales',
        element('span', {}, [`${snapshot.colors.colors.length} muestras`])
      ]),
      swatches
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Componentes']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [componentSummary]),
        element('span', { class: 'pill' }, [`${snapshot.components.counts.ctaGroups} grupos CTA`])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Clasificación']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [`${classification.archetype || 'unknown'} · ${classification.confidence || 'low'}`]),
        element('span', { class: 'pill' }, [classification.analysisMode || 'snapshot_only'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [classification.analysisMode === 'full_behavioral' ? 'Mapa behavioral' : 'Revisión manual']),
      ...(classification.analysisMode === 'full_behavioral'
        ? (mappingRows.length ? [element('div', { class: 'mapping-list' }, mappingRows)] : [element('p', { class: 'notice' }, ['No hay mapa behavioral disponible.'])])
        : [element('p', { class: 'notice' }, ['No se generan recomendaciones de conversión con la matriz behavioral actual para este arquetipo.'])])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Lente conductual']),
      ...(classification.analysisMode === 'full_behavioral' ? [
        element('p', { class: 'notice' }, [uxFrictionCount ? 'Hay fricciones UX de alta confianza; revisar tarjetas de hipótesis antes de actuar.' : 'No se detectan fricciones UX de alta confianza. Los bloques a revisar son revisión, no bloqueo crítico.'])
      ] : [
        element('p', { class: 'notice' }, ['Salida acotada a snapshot, inventario, accesibilidad y notas manuales.'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Hallazgos principales']),
      ...(topFindingNodes.length ? [element('div', { class: 'top-findings' }, topFindingNodes)] : [
        element('p', { class: 'notice' }, ['No hay hallazgos priorizados. Revisa el markdown para baseline y notas manuales.'])
      ])
    ])
  ]);

  const copyButtons = [
    element('button', { class: 'copy primary', type: 'button', 'data-copy': 'design' }, ['Copiar design-context.md']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'json' }, ['Copiar JSON']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'issue' }, ['Copiar issue GitHub'])
  ];

  const copyStatus = element('p', { class: 'notice', 'data-copy-status': '' }, [
    'Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.'
  ]);

  const panel = element('div', { class: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'contextic-title' }, [
    element('header', { class: 'panel-header' }, [
      element('div', { class: 'brand' }, [
        element('span', { class: 'brand-mark' }, ['C']),
        element('div', {}, [
          element('p', { class: 'kicker' }, ['Contexto de diseño']),
          element('h2', { id: 'contextic-title' }, ['Contextic']),
          element('p', { class: 'subtitle' }, ['Evidencia, confianza e hipótesis listas para handoff.'])
        ])
      ]),
      closeButton
    ]),
    body,
    element('div', { class: 'actions' }, [
      copyButtons[0],
      element('div', { class: 'secondary-actions' }, [copyButtons[1], copyButtons[2]]),
      copyStatus
    ])
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

function topFindingsByType(groups = {}, findings = []) {
  const buckets = [
    ['UX', groups.ux || []],
    ['DS', groups.designSystem || []],
    ['Accesibilidad', groups.accessibility || []],
    ['Revisión', [...(groups.manualReview || []), ...findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review')]]
  ];
  const items = [];

  for (const [type, findings] of buckets) {
    const finding = findings[0];
    if (finding) items.push({ type, finding });
    if (items.length >= 3) break;
  }

  return items;
}

function displayColorRole(color = {}) {
  const role = color.suggestedRole || 'unknown';
  const confidence = color.roleConfidence || 'low';
  if (confidence === 'low') {
    if (role === 'error' || role === 'success') return 'unknown';
    if (role !== 'unknown') return `${role}?`;
  }
  return role;
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
