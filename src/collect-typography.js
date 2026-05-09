import { getCandidateElements, incrementMap, toPxNumber, topFromMap } from './utils.js';

export function collectTypography(root = document.body, options = {}) {
  const limit = options.limit || 12;
  const typeStyles = new Map();
  const fontFamilies = new Map();
  const fontSizes = new Map();

  for (const element of getCandidateElements(root)) {
    const text = element.textContent?.trim();
    if (!text) continue;

    const style = window.getComputedStyle(element);
    const fontSize = toPxNumber(style.fontSize);
    const lineHeight = toPxNumber(style.lineHeight);
    const fontWeight = style.fontWeight;
    const fontFamily = cleanFontFamily(style.fontFamily);
    const letterSpacing = toPxNumber(style.letterSpacing) ?? 0;

    if (!fontSize) continue;

    const key = `${fontFamily} | ${fontSize}px / ${lineHeight || 'normal'}px | ${fontWeight} | ${letterSpacing}px`;
    incrementMap(typeStyles, key);
    incrementMap(fontFamilies, fontFamily);
    incrementMap(fontSizes, `${fontSize}px`);
  }

  return {
    typeStyles: topFromMap(typeStyles, limit),
    fontFamilies: topFromMap(fontFamilies, 6),
    fontSizes: topFromMap(fontSizes, 10),
    totalUniqueTypeStyles: typeStyles.size
  };
}

function cleanFontFamily(value) {
  return String(value || '')
    .split(',')
    .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
    .slice(0, 2)
    .join(', ');
}
