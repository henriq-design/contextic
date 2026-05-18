import { compactText, isSystemUtilityWidget, isVisibleElement } from './utils.js';

const REGION_TYPES = [
  'header',
  'nav',
  'hero',
  'main',
  'section',
  'aside',
  'footer',
  'hidden_or_system',
  'unknown'
];

const BEHAVIORAL_REGIONS = new Set(['hero', 'main', 'section']);
const EXCLUDED_REASONS = {
  header: 'global header excluded from behavioral scoring',
  nav: 'global navigation excluded from behavioral scoring',
  footer: 'footer/contentinfo excluded from behavioral scoring',
  aside: 'aside/complementary content excluded from behavioral scoring',
  hidden_or_system: 'hidden, skip, modal, cookie, widget or system content excluded by default',
  unknown: 'unknown region excluded until manually reviewed'
};

export function detectDomRegions(root = document.body) {
  const elements = getElements(root);
  const elementRegions = new Map();
  const regionCounts = Object.fromEntries(REGION_TYPES.map(region => [region, 0]));
  const usedRegions = new Set();
  const excluded = new Map();
  const behavioralElements = [];

  for (const element of elements) {
    const region = classifyElementRegion(element);
    elementRegions.set(element, region);
    regionCounts[region] += 1;

    if (BEHAVIORAL_REGIONS.has(region)) {
      usedRegions.add(region);
      behavioralElements.push(element);
    } else {
      const reason = EXCLUDED_REASONS[region] || EXCLUDED_REASONS.unknown;
      if (!excluded.has(region)) excluded.set(region, reason);
    }
  }

  const behavioralRoot = createBehavioralScopeRoot(root, behavioralElements, elementRegions);

  return {
    regions: regionCounts,
    usedForBehavioral: Array.from(usedRegions),
    excludedFromBehavioral: Array.from(excluded, ([region, reason]) => ({ region, reason })),
    behavioralRoot,
    elementRegions
  };
}

export function classifyElementRegion(element) {
  if (!element || !element.tagName) return 'unknown';
  if (isHiddenOrSystem(element)) return 'hidden_or_system';

  const semantic = semanticRegion(element);
  if (semantic) return semantic;

  const ancestry = elementAncestry(element);
  const classAndId = ancestry.map(item => `${item.id || ''} ${Array.from(item.classList || []).join(' ')}`).join(' ').toLowerCase();

  if (/\b(skip|sr-only|visually-hidden|cookie|cookies|modal|dialog|toast|notification|consent)\b/.test(classAndId)) {
    if (!isBlockingOverlay(element)) return 'hidden_or_system';
  }
  if (/\b(hero|masthead|jumbotron)\b/.test(classAndId)) return 'hero';
  if (/\b(header|site-header|topbar)\b/.test(classAndId)) return 'header';
  if (/\b(nav|menu|navbar|navigation)\b/.test(classAndId)) return 'nav';
  if (/\b(footer|site-footer)\b/.test(classAndId)) return 'footer';
  if (/\b(aside|sidebar)\b/.test(classAndId)) return 'aside';
  if (/\b(main|content|page-content)\b/.test(classAndId)) return 'main';

  if (hasAncestor(element, ancestor => semanticRegion(ancestor) === 'main')) {
    if (element.tagName.toLowerCase() === 'section' || hasSectionLikeClass(element)) return 'section';
    return 'main';
  }

  if (element.tagName.toLowerCase() === 'section') return 'section';
  return 'unknown';
}

export function isBehavioralRegion(region) {
  return BEHAVIORAL_REGIONS.has(region);
}

function createBehavioralScopeRoot(root, behavioralElements, elementRegions) {
  const allowed = new Set(behavioralElements);

  return {
    __contexticBehavioralScope: true,
    __contexticText: buildScopedText(behavioralElements),
    __contexticRegionFor(element) {
      return elementRegions.get(element) || classifyElementRegion(element);
    },
    querySelectorAll(selector) {
      return getElements(root, selector).filter(element => allowed.has(element));
    }
  };
}

function buildScopedText(elements) {
  const textElements = elements
    .filter(element => !hasBehavioralDescendant(element, elements))
    .map(element => compactText(element.textContent || '', 240))
    .filter(Boolean);

  return compactText(textElements.join(' '), 12000);
}

function hasBehavioralDescendant(element, elements) {
  return elements.some(other => other !== element && element.contains?.(other));
}

function semanticRegion(element) {
  const tag = element.tagName.toLowerCase();
  const role = String(element.getAttribute?.('role') || '').toLowerCase();

  if (tag === 'header') return 'header';
  if (tag === 'nav' || role === 'navigation') return 'nav';
  if (tag === 'main' || role === 'main') return 'main';
  if (tag === 'footer' || role === 'contentinfo') return 'footer';
  if (tag === 'aside' || role === 'complementary') return 'aside';
  if (tag === 'section' && hasAncestor(element, ancestor => semanticRegion(ancestor) === 'main')) return 'section';
  return '';
}

function isHiddenOrSystem(element) {
  const tag = element.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'template'].includes(tag)) return true;
  if (!isVisibleElement(element)) return true;
  if (isSystemUtilityWidget(element)) return true;
  if (element.matches?.('[hidden], [aria-hidden="true"]')) return true;

  const ownClassAndId = `${element.id || ''} ${Array.from(element.classList || []).join(' ')}`.toLowerCase();
  if (/\b(skip|sr-only|visually-hidden)\b/.test(ownClassAndId)) return true;
  if (/\b(cookie|cookies|consent)\b/.test(ownClassAndId) && !isBlockingOverlay(element)) return true;
  if (/\b(modal|dialog|toast|notification)\b/.test(ownClassAndId) && !isBlockingOverlay(element)) return true;
  return false;
}

function isBlockingOverlay(element) {
  const rect = element.getBoundingClientRect?.();
  if (!rect) return false;
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 900;
  return rect.width >= viewportWidth * 0.75 && rect.height >= viewportHeight * 0.5;
}

function hasAncestor(element, predicate) {
  let current = element.parentElement;
  while (current) {
    if (predicate(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function elementAncestry(element) {
  const items = [];
  let current = element;
  while (current) {
    items.push(current);
    current = current.parentElement;
  }
  return items;
}

function hasSectionLikeClass(element) {
  const classAndId = `${element.id || ''} ${Array.from(element.classList || []).join(' ')}`.toLowerCase();
  return /\b(section|block|panel|module)\b/.test(classAndId);
}

function getElements(root, selector = '*') {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll(selector));
}
