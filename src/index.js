import { collectColors } from './collect-colors.js';
import { collectTypography } from './collect-typography.js';
import { collectSpacing } from './collect-spacing.js';
import { collectComponents } from './collect-components.js';
import { detectFrictions } from './detect-frictions.js';
import { buildBehavioralMapping, buildBehavioralStructureRecommendation } from './behavioral-model.js';
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
  const frictions = detectFrictions({ colors, typography, spacing, components }, root);
  const behavioralMapping = buildBehavioralMapping({ components, frictions }, root);
  const behavioralRecommendation = buildBehavioralStructureRecommendation({ behavioralMapping, frictions });

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
    frictions,
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

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        inset: 16px 16px 16px auto;
        width: min(460px, calc(100vw - 32px));
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
      }
      * { box-sizing: border-box; }
      .panel {
        height: 100%;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 16px;
        box-shadow: 0 24px 80px rgba(17, 24, 39, 0.24);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
        align-items: start;
        justify-content: space-between;
      }
      h2 {
        margin: 0;
        font-size: 16px;
        line-height: 24px;
        font-weight: 750;
      }
      .subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #4b5563;
      }
      .close {
        border: 0;
        border-radius: 8px;
        padding: 8px 10px;
        background: #f3f4f6;
        cursor: pointer;
        font: inherit;
      }
      .body {
        overflow: auto;
        padding: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 16px;
      }
      .metric {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #f9fafb;
      }
      .metric strong {
        display: block;
        font-size: 20px;
        line-height: 28px;
      }
      .metric span {
        font-size: 12px;
        color: #4b5563;
      }
      h3 {
        margin: 18px 0 8px;
        font-size: 13px;
        line-height: 18px;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #374151;
      }
      .swatches {
        display: grid;
        gap: 8px;
      }
      .swatch {
        display: grid;
        grid-template-columns: 28px 1fr auto;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .swatch-chip {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid rgba(0,0,0,.12);
      }
      .friction {
        border-left: 4px solid #111827;
        background: #f9fafb;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .friction strong {
        display: block;
        font-size: 13px;
        line-height: 18px;
      }
      .friction p {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #4b5563;
      }
      .actions {
        display: grid;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
      }
      button.copy {
        width: 100%;
        border: 0;
        border-radius: 12px;
        padding: 11px 12px;
        background: #111827;
        color: white;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      button.copy.secondary {
        background: #f3f4f6;
        color: #111827;
      }
      .notice {
        font-size: 11px;
        line-height: 16px;
        color: #6b7280;
        margin: 0;
      }
    </style>
    <div class="panel" role="dialog" aria-modal="false">
      <header>
        <div>
          <h2>Contextic</h2>
          <p class="subtitle">Contexto técnico de diseño listo para IA y handoff.</p>
        </div>
        <button class="close" type="button" aria-label="Cerrar panel">×</button>
      </header>
      <div class="body">
        <div class="grid">
          ${metric('Colores', snapshot.colors.totalUniqueColors)}
          ${metric('Estilos tipográficos', snapshot.typography.totalUniqueTypeStyles)}
          ${metric('Valores de espaciado', snapshot.spacing.totalUniqueSpacingValues)}
          ${metric('Fricciones', snapshot.frictions.length)}
          ${metric('Bloques débiles', snapshot.behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).length)}
        </div>

        <h3>Colores principales</h3>
        <div class="swatches">
          ${snapshot.colors.colors.slice(0, 8).map(color => `
            <div class="swatch">
              <span class="swatch-chip" style="background:${color.value}"></span>
              <span>${color.value}</span>
              <span>${color.count}</span>
            </div>
          `).join('') || '<p class="notice">No se detectan colores.</p>'}
        </div>

        <h3>Conteo de componentes</h3>
        <p class="notice">Botones ${snapshot.components.counts.buttons} · Inputs ${snapshot.components.counts.inputs} · Enlaces ${snapshot.components.counts.links} · Tarjetas ${snapshot.components.counts.cards}</p>

        <h3>Mapa behavioral</h3>
        <p class="notice">${snapshot.behavioralMapping.map(block => `${block.label}: ${block.present} (${block.quality}/5)`).join(' · ')}</p>

        <h3>Lente conductual</h3>
        ${snapshot.frictions.slice(0, 5).map(friction => `
          <div class="friction">
            <strong>${escapeHtml(friction.title)} · ${escapeHtml(friction.severity)}</strong>
            <p>${escapeHtml(friction.principle || 'revisión heurística')} · ${escapeHtml(friction.recommendation)}</p>
          </div>
        `).join('') || '<p class="notice">No se detectan fricciones heurísticas relevantes. Se recomienda revisión manual.</p>'}
      </div>
      <div class="actions">
        <button class="copy" type="button" data-copy="design">Copiar design-context.md</button>
        <button class="copy secondary" type="button" data-copy="json">Copiar JSON</button>
        <button class="copy secondary" type="button" data-copy="issue">Copiar GitHub Issue</button>
        <p class="notice" data-copy-status>Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.</p>
      </div>
    </div>
  `;

  shadow.querySelector('.close').addEventListener('click', () => host.remove());
  shadow.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-copy');
      const payload = key === 'design' ? designContext : key === 'json' ? jsonReport : githubIssue;
      const copied = await copyToClipboard(payload);
      const status = shadow.querySelector('[data-copy-status]');
      const previous = button.textContent;
      button.textContent = copied ? 'Copiado' : 'No se pudo copiar';
      if (status) status.textContent = copied ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.';
      setTimeout(() => { button.textContent = previous; }, 1200);
    });
  });
}

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
