export const MAX_ELEMENTS = 1800;

export function getCandidateElements(root = document.body, limit = MAX_ELEMENTS) {
  const elements = Array.from(root.querySelectorAll('*'));
  return elements.filter(isVisibleElement).slice(0, limit);
}

export function isVisibleElement(element) {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  return true;
}

export function toPxNumber(value) {
  if (!value || value === 'normal' || value === 'auto') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

export function compactText(text, max = 80) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function incrementMap(map, key, weight = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + weight);
}

export function topFromMap(map, limit = 12) {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
    .slice(0, limit);
}

export function normalizeColor(value) {
  if (!value) return null;
  const color = String(value).trim().toLowerCase();
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === 'initial' || color === 'inherit') return null;

  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return color;

  const parts = rgba[1].split(',').map(part => part.trim());
  const [r, g, b] = parts.slice(0, 3).map(Number);
  const alpha = parts[3] === undefined ? 1 : Number(parts[3]);

  if (![r, g, b].every(Number.isFinite) || !Number.isFinite(alpha) || alpha === 0) return null;

  return `#${[r, g, b].map(channel => {
    const safeChannel = Math.max(0, Math.min(255, Math.round(channel)));
    return safeChannel.toString(16).padStart(2, '0');
  }).join('')}`;
}

export function isProbablyGenericLinkText(text) {
  const normalized = compactText(text, 40).toLowerCase();
  return ['click here', 'here', 'learn more', 'more', 'read more', 'ver más', 'más información', 'aquí', 'pincha aquí'].includes(normalized);
}

export function getAccessibleName(element) {
  if (!(element instanceof Element)) return '';
  const aria = element.getAttribute('aria-label');
  if (aria) return compactText(aria);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || '')
      .join(' ');
    if (text.trim()) return compactText(text);
  }

  if ('labels' in element && element.labels?.length) {
    return compactText(Array.from(element.labels).map(label => label.textContent).join(' '));
  }

  return compactText(element.textContent || element.getAttribute('placeholder') || element.getAttribute('title') || '');
}

export function isSystemUtilityWidget(element) {
  if (!(element instanceof Element)) return false;

  const descriptors = elementAncestry(element).map(item => elementDescriptor(item));
  const ownDescriptor = descriptors[0] || '';
  const ancestryDescriptor = descriptors.join(' ');
  const hasWidgetSignal = /\b(accessibility|accessi|a11y|bmv|widget|plugin|floating|toolbar|overlay|assistive)\b/i.test(ancestryDescriptor);
  if (!hasWidgetSignal) return false;

  const hasStrongAccessibilitySignal = /\b(accessibility|accessi|a11y|bmv|assistive)\b/i.test(ancestryDescriptor);
  const hasUtilityShellSignal = /\b(widget|plugin|floating|toolbar|overlay|tab-button|accessibility-tab)\b/i.test(ancestryDescriptor);
  const hasFloatingGeometry = isFloatingUtilityElement(element);

  return hasStrongAccessibilitySignal || (hasUtilityShellSignal && (hasFloatingGeometry || /\b(widget|plugin|toolbar|overlay)\b/i.test(ownDescriptor)));
}

function isFloatingUtilityElement(element) {
  const rect = element.getBoundingClientRect?.();
  if (!rect) return false;
  const viewportWidth = window.innerWidth || 1200;
  const viewportHeight = window.innerHeight || 900;
  if (rect.width <= 0 || rect.height <= 0) return false;
  return rect.top <= 24 || rect.left <= 24 || rect.right >= viewportWidth - 24 || rect.bottom >= viewportHeight - 24;
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

function elementDescriptor(element) {
  const id = element.id || '';
  const classes = Array.from(element.classList || []).join(' ');
  const attributes = elementAttributes(element)
    .filter(attribute => /^(class|id|data-|aria-|role)/i.test(attribute.name || ''))
    .map(attribute => `${attribute.name || ''} ${attribute.value || ''}`)
    .join(' ');
  return `${id} ${classes} ${attributes}`.toLowerCase();
}

function elementAttributes(element) {
  if (!element?.attributes) return [];
  if (typeof element.attributes[Symbol.iterator] === 'function') return Array.from(element.attributes);
  return Object.entries(element.attributes).map(([name, value]) => ({ name, value }));
}
