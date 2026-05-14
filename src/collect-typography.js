import { getCandidateElements, incrementMap, toPxNumber, topFromMap } from './utils.js';
import { classifyElementRegion } from './dom-regions.js';

export function collectTypography(root = document.body, options = {}) {
  const limit = options.limit || 12;
  const typeStyles = new Map();
  const fontFamilies = new Map();
  const fontSizes = new Map();
  const allTypeStyles = new Map();
  const systemTypeStyles = new Map();
  const typeStyleSamples = new Map();

  for (const element of getCandidateElements(root)) {
    const text = element.textContent?.trim();
    if (!text) continue;
    const context = buildTypographyContext(element);

    const style = window.getComputedStyle(element);
    const fontSize = toPxNumber(style.fontSize);
    const lineHeight = toPxNumber(style.lineHeight);
    const fontWeight = style.fontWeight;
    const fontFamily = cleanFontFamily(style.fontFamily);
    const letterSpacing = toPxNumber(style.letterSpacing) ?? 0;

    if (!fontSize) continue;

    const key = `${fontFamily} | ${fontSize}px / ${lineHeight || 'normal'}px | ${fontWeight} | ${letterSpacing}px`;
    incrementMap(allTypeStyles, key);
    incrementMap(context.isUserFacing ? typeStyles : systemTypeStyles, key);
    if (context.isUserFacing) {
      incrementMap(fontFamilies, fontFamily);
      incrementMap(fontSizes, `${fontSize}px`);
    }
    if (!typeStyleSamples.has(key)) typeStyleSamples.set(key, context);
  }

  return {
    typeStyles: topFromMap(typeStyles, limit).map(item => ({ ...item, sample: typeStyleSamples.get(item.value) })),
    allTypeStyles: topFromMap(allTypeStyles, limit),
    systemHiddenVisualNoise: topFromMap(systemTypeStyles, 6)
      .filter(item => !typeStyles.has(item.value))
      .map(item => ({ ...item, sample: typeStyleSamples.get(item.value) })),
    fontFamilies: topFromMap(fontFamilies, 6),
    fontSizes: topFromMap(fontSizes, 10),
    totalUniqueTypeStyles: allTypeStyles.size
  };
}

function buildTypographyContext(element) {
  const region = classifyElementRegion(element);
  const isVisible = true;
  const isSystemOrHidden = region === 'hidden_or_system';
  const tag = element.tagName?.toLowerCase?.() || '';
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  return {
    selector: readableSelector(element),
    region,
    isVisible,
    isUserFacing: isVisible && !isSystemOrHidden,
    isInteractive: ['button', 'a', 'input', 'select', 'textarea'].includes(tag) || role === 'button',
    isSystemOrHidden
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName.toLowerCase()}${id}${classes}` || element.tagName.toLowerCase();
}

function cleanFontFamily(value) {
  return String(value || '')
    .split(',')
    .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
    .slice(0, 2)
    .join(', ');
}
