import { getCandidateElements, incrementMap, normalizeColor, topFromMap } from './utils.js';
import { classifyElementRegion } from './dom-regions.js';

const COLOR_PROPERTIES = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
const COLOR_ROLES = new Set(['text', 'surface', 'brand', 'primary', 'secondary', 'accent', 'border', 'focus', 'error', 'success', 'warning', 'info', 'utility', 'unknown']);

export function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const colorSamples = new Map();
  const colorContexts = new Map();
  const cssVariables = collectCssVariables();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of COLOR_PROPERTIES) {
      const normalized = normalizeColor(style[property]);
      if (!normalized) continue;
      const context = buildColorContext(element, property);

      // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
      const weight = context.region === 'hidden_or_system' ? 0.25 : property === 'backgroundColor' || property === 'color' ? 2 : 1;
      incrementMap(colorUsage, normalized, weight);
      if (!colorContexts.has(normalized)) colorContexts.set(normalized, []);
      colorContexts.get(normalized).push(context);

      if (!colorSamples.has(normalized)) {
        colorSamples.set(normalized, {
          selector: readableSelector(element),
          property,
          context
        });
      }
    }
  }

  const colors = topFromMap(colorUsage, limit).map(item => {
    const sample = colorSamples.get(item.value);
    const contexts = colorContexts.get(item.value) || [];
    const role = guessColorRole(item.value, item.count, contexts, cssVariables);
    return {
      ...item,
      sample,
      usages: contexts.slice(0, 8),
      suggestedRole: role.role,
      roleConfidence: role.confidence,
      roleReason: role.reason
    };
  });

  return {
    colors,
    totalUniqueColors: colorUsage.size,
    cssVariables
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName.toLowerCase()}${id}${classes}` || element.tagName.toLowerCase();
}

function buildColorContext(element, property) {
  const selector = readableSelector(element);
  const region = classifyElementRegion(element);
  const componentType = inferComponentType(element);
  const visible = region !== 'hidden_or_system';
  const interactive = isInteractive(element);
  const appearsInCta = interactive && isMainAction(element);
  const validationContext = inferValidationContext(element);

  return {
    property,
    selector,
    componentType,
    region,
    visible,
    interactive,
    appearsInCta,
    validationContext
  };
}

function inferComponentType(element) {
  const tag = element.tagName.toLowerCase();
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const classAndId = elementDescriptor(element);
  if (tag === 'button' || role === 'button' || (tag === 'a' && /\b(btn|button|cta)\b/.test(classAndId))) return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'form_field';
  if (tag === 'form') return 'form';
  if (tag === 'nav' || role === 'navigation') return 'navigation';
  if (role === 'alert' || role === 'status') return 'alert';
  if (/\b(card)\b/.test(classAndId)) return 'card';
  if (/\b(logo|brand)\b/.test(classAndId)) return 'brand_asset';
  return 'static';
}

function isInteractive(element) {
  const tag = element.tagName.toLowerCase();
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  return tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea' || role === 'button' || Boolean(element.getAttribute?.('tabindex'));
}

function isMainAction(element) {
  const descriptor = elementDescriptor(element);
  const text = String(element.textContent || element.getAttribute?.('aria-label') || '').toLowerCase();
  return /\b(cta|primary|main-action|hero|button|btn|brand)\b/.test(descriptor) || /\b(comprar|contratar|empezar|crear|solicitar|contactar|get started|buy|start|sign up|request)\b/.test(text);
}

function inferValidationContext(element) {
  const descriptor = elementDescriptor(element);
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const ariaInvalid = element.getAttribute?.('aria-invalid') === 'true';
  const text = String(element.textContent || '').toLowerCase();

  if (ariaInvalid || role === 'alert' || /\b(error|invalid|danger|destructive|delete|remove|eliminar|borrar)\b/.test(descriptor + ' ' + text)) return 'error';
  if (role === 'status' || /\b(success|valid|confirmation|confirmed|completed|complete|ok|done|exito|éxito|confirmado|completado)\b/.test(descriptor + ' ' + text)) return 'success';
  if (/\b(warning|warn|alerta|aviso)\b/.test(descriptor + ' ' + text)) return 'warning';
  if (/\b(info|notice|help|ayuda)\b/.test(descriptor + ' ' + text)) return 'info';
  return 'none';
}

function elementDescriptor(element) {
  const id = element.id || '';
  const classes = Array.from(element.classList || []).join(' ');
  return `${id} ${classes}`.toLowerCase();
}

function collectCssVariables() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.documentElement) return [];

  const style = window.getComputedStyle(document.documentElement);
  const variables = [];

  if (typeof style.getPropertyValue !== 'function') return [];

  for (let index = 0; index < (style.length || 0); index += 1) {
    const name = style[index];
    if (!name?.startsWith('--')) continue;

    const value = style.getPropertyValue(name).trim();
    if (!value || !isVisualVariable(name, value)) continue;

    variables.push({ name, value });
  }

  return variables.slice(0, 24);
}

function isVisualVariable(name, value) {
  const key = name.toLowerCase();
  return (
    key.includes('color') ||
    key.includes('bg') ||
    key.includes('surface') ||
    key.includes('text') ||
    key.includes('border') ||
    key.includes('space') ||
    key.includes('radius') ||
    key.includes('shadow') ||
    key.includes('font') ||
    looksLikeColorValue(value) ||
    /^\d+(\.\d+)?(px|rem|em)$/.test(value)
  );
}

function looksLikeColorValue(value) {
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
    /^rgba?\(/i.test(value) ||
    /^hsla?\(/i.test(value)
  );
}

function guessColorRole(hex, count, contexts = [], cssVariables = []) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  const saturation = colorSaturation(r, g, b);
  const relevantContexts = contexts.filter(context => context.visible && context.region !== 'hidden_or_system');
  const variableHints = cssVariables.filter(variable => normalizeColor(variable.value) === hex).map(variable => variable.name.toLowerCase());

  if (!relevantContexts.length) return role('utility', 'low', 'Only observed in hidden/system or utility contexts.');

  if (hasValidationContext(relevantContexts, 'error')) return role('error', 'high', 'Used in explicit error/invalid/destructive context.');
  if (hasValidationContext(relevantContexts, 'success')) return role('success', 'high', 'Used in explicit success/valid/confirmation context.');
  if (hasValidationContext(relevantContexts, 'warning')) return role('warning', 'high', 'Used in explicit warning context.');
  if (hasValidationContext(relevantContexts, 'info')) return role('info', 'medium', 'Used in explicit informational context.');

  if (variableHints.some(name => /\b(brand|primary|main)\b/.test(name)) && isActionColor(relevantContexts)) {
    return role('primary', 'high', 'Brand/primary variable used on visible main action.');
  }
  if (variableHints.some(name => /\b(brand)\b/.test(name))) return role('brand', 'medium', 'Color is exposed through a brand CSS variable.');

  if (isActionColor(relevantContexts)) {
    return role('primary', 'medium', 'Used as background color on visible CTA button or main action.');
  }
  if (relevantContexts.some(context => context.componentType === 'brand_asset')) return role('brand', 'medium', 'Used in visible logo or brand asset context.');
  if (relevantContexts.some(context => context.property === 'outlineColor')) return role('focus', 'medium', 'Used as outline/focus color.');
  if (relevantContexts.some(context => context.property.toLowerCase().includes('border'))) return role('border', saturation < 0.25 ? 'medium' : 'low', 'Used primarily as border color.');

  if (luminance > 0.92 && count > 8) return role('surface', 'medium', 'Frequent light color used on visible elements.');
  if (luminance < 0.12 && count > 8) return role('text', 'medium', 'Frequent dark color used on visible elements.');
  if (variableHints.some(name => /\b(accent|secondary)\b/.test(name))) return role(variableHints.some(name => name.includes('secondary')) ? 'secondary' : 'accent', 'medium', 'Role inferred from CSS variable name and visible usage.');
  if (saturation > 0.35 && count > 1) return role('accent', 'low', 'Saturated visible color without semantic state evidence; kept conservative.');
  return role('unknown', 'low', 'Insufficient contextual evidence for a semantic role.');
}

function role(roleName, confidence, reason) {
  return { role: COLOR_ROLES.has(roleName) ? roleName : 'unknown', confidence, reason };
}

function hasValidationContext(contexts, type) {
  return contexts.some(context => context.validationContext === type);
}

function isActionColor(contexts) {
  return contexts.some(context => context.appearsInCta && ['backgroundColor', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].includes(context.property));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function relativeLuminance(r, g, b) {
  const channels = [r, g, b].map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function colorSaturation(r, g, b) {
  const channels = [r, g, b].map(value => value / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  if (max === 0) return 0;
  return (max - min) / max;
}
