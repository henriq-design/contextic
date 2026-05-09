import { getCandidateElements, incrementMap, normalizeColor, topFromMap } from './utils.js';

const COLOR_PROPERTIES = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];

export function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const colorSamples = new Map();
  const cssVariables = collectCssVariables();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of COLOR_PROPERTIES) {
      const normalized = normalizeColor(style[property]);
      if (!normalized) continue;

      // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
      const weight = property === 'backgroundColor' || property === 'color' ? 2 : 1;
      incrementMap(colorUsage, normalized, weight);

      if (!colorSamples.has(normalized)) {
        colorSamples.set(normalized, {
          selector: readableSelector(element),
          property
        });
      }
    }
  }

  const colors = topFromMap(colorUsage, limit).map(item => {
    const sample = colorSamples.get(item.value);
    const role = guessColorRole(item.value, item.count, sample?.property);
    return {
      ...item,
      sample,
      suggestedRole: role.role,
      roleConfidence: role.confidence
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

function guessColorRole(hex, count, property = '') {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  const saturation = colorSaturation(r, g, b);

  if (property.toLowerCase().includes('border') && saturation < 0.18) return { role: 'border', confidence: 'possible' };
  if (luminance > 0.92 && count > 8) return { role: 'surface', confidence: 'likely' };
  if (luminance < 0.12 && count > 8) return { role: 'text', confidence: 'likely' };
  if (r > 180 && g < 100 && b < 110) return { role: 'error', confidence: 'possible' };
  if (g > 120 && r < 140 && b < 150) return { role: 'success', confidence: 'possible' };
  if (r > 190 && g > 120 && b < 90) return { role: 'warning', confidence: 'possible' };
  if (b > 150 && r < 140 && g > 90) return { role: 'info', confidence: 'possible' };
  if (saturation > 0.35 && count > 1) return { role: 'primary', confidence: 'possible' };
  return { role: 'unknown', confidence: 'unknown' };
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
