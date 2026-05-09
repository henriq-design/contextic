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
