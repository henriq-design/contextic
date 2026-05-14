import { getCandidateElements, incrementMap, toPxNumber, topFromMap } from './utils.js';
import { classifyElementRegion } from './dom-regions.js';

const SPACING_PROPERTIES = [
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'rowGap', 'columnGap'
];

export function collectSpacing(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const spacing = new Map();
  const spacingContexts = new Map();
  const radius = new Map();
  const shadows = new Map();
  const borders = new Map();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of SPACING_PROPERTIES) {
      const px = toPxNumber(style[property]);
      if (px && px > 0 && px <= 160) {
        const value = `${px}px`;
        incrementMap(spacing, value);
        if (!spacingContexts.has(value)) spacingContexts.set(value, []);
        spacingContexts.get(value).push({
          property,
          region: classifyElementRegion(element),
          selector: readableSelector(element),
          usesCssVariable: usesCssVariable(element, property),
          alignedToFour: px % 4 === 0,
          alignedToEight: px % 8 === 0
        });
      }
    }

    const borderRadius = toPxNumber(style.borderTopLeftRadius);
    if (borderRadius && borderRadius > 0 && borderRadius <= 80) incrementMap(radius, `${borderRadius}px`);

    if (style.boxShadow && style.boxShadow !== 'none') incrementMap(shadows, style.boxShadow);

    const borderWidth = toPxNumber(style.borderTopWidth);
    if (borderWidth && borderWidth > 0) incrementMap(borders, `${borderWidth}px ${style.borderTopStyle}`);
  }

  return {
    spacingScale: sortPxItems(topFromMap(spacing, limit)),
    radii: sortPxItems(topFromMap(radius, 10)),
    shadows: topFromMap(shadows, 8),
    borders: topFromMap(borders, 8),
    totalUniqueSpacingValues: spacing.size,
    totalUniqueRadiusValues: radius.size,
    spacingDiagnostics: buildSpacingDiagnostics(spacing, spacingContexts)
  };
}

function sortPxItems(items) {
  return [...items].sort((a, b) => Number.parseFloat(a.value) - Number.parseFloat(b.value));
}

function buildSpacingDiagnostics(spacing, spacingContexts) {
  const entries = Array.from(spacing.entries());
  const totalUsage = entries.reduce((sum, [, count]) => sum + count, 0);
  const topFiveUsage = entries.sort((a, b) => b[1] - a[1]).slice(0, 5).reduce((sum, [, count]) => sum + count, 0);
  const values = Array.from(spacing.keys()).map(value => Number.parseFloat(value)).filter(Number.isFinite);
  const oneOffs = entries.filter(([, count]) => count === 1).length;
  const alignedToFour = values.filter(value => value % 4 === 0).length;
  const alignedToEight = values.filter(value => value % 8 === 0).length;
  const allContexts = Array.from(spacingContexts.values()).flat();
  const mainHeroReusableUsage = allContexts.filter(context => ['hero', 'main', 'section'].includes(context.region)).length;
  const systemOrFooterUsage = allContexts.filter(context => ['hidden_or_system', 'footer', 'nav'].includes(context.region)).length;
  const cssVariableUsage = allContexts.filter(context => context.usesCssVariable).length;

  return {
    uniqueValues: spacing.size,
    oneOffs,
    topFiveCoverage: totalUsage ? Math.round((topFiveUsage / totalUsage) * 100) / 100 : 0,
    alignedToFourRatio: values.length ? Math.round((alignedToFour / values.length) * 100) / 100 : 0,
    alignedToEightRatio: values.length ? Math.round((alignedToEight / values.length) * 100) / 100 : 0,
    mainHeroReusableUsage,
    systemOrFooterUsage,
    cssVariableUsage,
    totalUsage
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName?.toLowerCase?.() || 'element'}${id}${classes}`;
}

function usesCssVariable(element, property) {
  const inline = element.getAttribute?.('style') || '';
  const cssName = property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
  return inline.includes(cssName) && inline.includes('var(');
}
