import { getCandidateElements, incrementMap, toPxNumber, topFromMap } from './utils.js';

const SPACING_PROPERTIES = [
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'rowGap', 'columnGap'
];

export function collectSpacing(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const spacing = new Map();
  const radius = new Map();
  const shadows = new Map();
  const borders = new Map();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of SPACING_PROPERTIES) {
      const px = toPxNumber(style[property]);
      if (px && px > 0 && px <= 160) incrementMap(spacing, `${px}px`);
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
    totalUniqueRadiusValues: radius.size
  };
}

function sortPxItems(items) {
  return [...items].sort((a, b) => Number.parseFloat(a.value) - Number.parseFloat(b.value));
}
