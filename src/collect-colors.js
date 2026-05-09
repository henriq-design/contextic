import { getCandidateElements, incrementMap, normalizeColor, topFromMap } from './utils.js';

const COLOR_PROPERTIES = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];

export function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const colorSamples = new Map();

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

  const colors = topFromMap(colorUsage, limit).map(item => ({
    ...item,
    sample: colorSamples.get(item.value),
    suggestedRole: guessColorRole(item.value, item.count)
  }));

  return {
    colors,
    totalUniqueColors: colorUsage.size
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName.toLowerCase()}${id}${classes}` || element.tagName.toLowerCase();
}

function guessColorRole(hex, count) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);

  if (luminance > 0.92 && count > 8) return 'superficie/fondo';
  if (luminance < 0.12 && count > 8) return 'texto/foreground';
  if (r > 180 && g < 90 && b < 90) return 'candidato a error/destructivo';
  if (g > 120 && r < 120 && b < 140) return 'candidato a éxito';
  if (b > 150 && r < 130) return 'candidato a primario/acento';
  return 'sin mapear';
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
