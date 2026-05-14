import { getCandidateElements, incrementMap, normalizeColor, topFromMap } from './utils.js';
import { classifyElementRegion } from './dom-regions.js';

const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'background-color',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outline',
  'outlineColor',
  'boxShadow',
  'textShadow'
];
const COLOR_ROLES = new Set(['text', 'surface', 'brand', 'primary', 'secondary', 'accent', 'border', 'focus', 'shadow', 'error', 'success', 'warning', 'info', 'utility', 'unknown']);

export function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const userFacingColorUsage = new Map();
  const systemColorUsage = new Map();
  const colorSamples = new Map();
  const userFacingColorSamples = new Map();
  const colorContexts = new Map();
  const cssVariables = collectCssVariables();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);
    const seenPropertyColors = new Set();

    for (const property of COLOR_PROPERTIES) {
      const colors = colorsFromStyleProperty(style, property);
      for (const normalized of colors) {
        if (!normalized) continue;
        const usageKey = `${normalizeCssProperty(property)}:${normalized}`;
        if (seenPropertyColors.has(usageKey)) continue;
        seenPropertyColors.add(usageKey);

        const context = buildColorContext(element, property);

        // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
        const weight = ['backgroundColor', 'background-color', 'color'].includes(property) ? 2 : 1;
        incrementMap(colorUsage, normalized, weight);
        incrementMap(context.isUserFacing ? userFacingColorUsage : systemColorUsage, normalized, weight);
        if (!colorContexts.has(normalized)) colorContexts.set(normalized, []);
        colorContexts.get(normalized).push(context);

        if (!colorSamples.has(normalized)) {
          colorSamples.set(normalized, {
            selector: readableSelector(element),
            property,
            context
          });
        }
        if (context.isUserFacing && !userFacingColorSamples.has(normalized)) {
          userFacingColorSamples.set(normalized, {
            selector: readableSelector(element),
            property,
            context
          });
        }
      }
    }
  }

  const colors = topFromMap(userFacingColorUsage, limit).map(item => {
    const sample = userFacingColorSamples.get(item.value) || colorSamples.get(item.value);
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
  const systemHiddenVisualNoise = topFromMap(systemColorUsage, 8)
    .filter(item => !userFacingColorUsage.has(item.value))
    .map(item => ({
      ...item,
      sample: colorSamples.get(item.value),
      usages: (colorContexts.get(item.value) || []).filter(context => context.isSystemOrHidden).slice(0, 4)
    }));

  return {
    colors,
    allColors: topFromMap(colorUsage, limit),
    systemHiddenVisualNoise,
    totalUniqueColors: colorUsage.size,
    cssVariables: annotateCssVariableUsage(cssVariables, colorContexts)
  };
}

function colorsFromStyleProperty(style, property) {
  const rawValue = style[property] || style.getPropertyValue?.(property);
  if (!rawValue) return [];
  if (property === 'boxShadow' || property === 'textShadow' || property === 'outline') return extractColors(rawValue);
  const normalized = normalizeColor(rawValue);
  return normalized ? [normalized] : [];
}

function extractColors(value) {
  const text = String(value || '').toLowerCase();
  const matches = text.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi) || [];
  return Array.from(new Set(matches.map(match => normalizeColor(match)).filter(Boolean)));
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
  const isVisible = true;
  const isSystemOrHidden = region === 'hidden_or_system';
  const isUserFacing = isVisible && !isSystemOrHidden;
  const interactive = isInteractive(element);
  const appearsInCta = interactive && isMainAction(element);
  const semanticContext = semanticRoleFromContext(element, { componentType, region });

  return {
    property,
    selector,
    componentType,
    region,
    visible: isUserFacing,
    isVisible,
    isUserFacing,
    isInteractive: interactive,
    isSystemOrHidden,
    interactive,
    appearsInCta,
    semanticContext: semanticContext.role,
    semanticReason: semanticContext.reason
  };
}

function annotateCssVariableUsage(cssVariables, colorContexts) {
  return cssVariables.map(variable => {
    const normalized = normalizeColor(variable.value);
    const contexts = normalized ? colorContexts.get(normalized) || [] : [];
    const visibleUse = contexts.some(context => context.isUserFacing);
    return {
      ...variable,
      usageStatus: visibleUse ? 'used visible' : contexts.length ? 'declared only' : 'unknown usage'
    };
  });
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
  if (role === 'alert' || role === 'status' || /\b(alert|toast|banner|message)\b/.test(classAndId)) return 'alert';
  if (/\b(help|tip|tooltip|hint)\b/.test(classAndId)) return 'help';
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

function semanticRoleFromContext(element, context = {}) {
  if (context.region === 'hidden_or_system') return { role: 'none', reason: 'Hidden/system or utility context is not semantic state evidence.' };

  const descriptor = elementDescriptor(element);
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const ariaInvalid = element.getAttribute?.('aria-invalid') === 'true';
  const text = String(element.textContent || '').toLowerCase();
  const evidence = `${descriptor} ${text}`;
  const isAlert = role === 'alert' || context.componentType === 'alert';

  if (ariaInvalid) return { role: 'error', reason: 'aria-invalid="true" is strong error evidence.' };
  if (/\b(error|invalid|danger|destructive)\b/.test(descriptor)) return { role: 'error', reason: 'Class, id or data attribute contains error/invalid/danger evidence.' };
  if (/\b(error|errores|obligatorio|obligatoria|inv[aá]lido|inv[aá]lida|fallo|failed|failure)\b/.test(text)) return { role: 'error', reason: 'Visible copy contains explicit error/required/invalid/failure language.' };
  if (isAlert && /\b(error|errores|obligatorio|obligatoria|inv[aá]lido|inv[aá]lida|fallo|failed|failure)\b/.test(evidence)) return { role: 'error', reason: 'Alert component carries explicit error language.' };

  if (/\b(success|valid|completed|complete|confirmation|confirmed)\b/.test(descriptor)) return { role: 'success', reason: 'Class, id or data attribute contains success/valid/completed evidence.' };
  if (role === 'status' && /\b(success|valid|confirmed|completed|complete|ok|done|[eé]xito|confirmado|confirmada|completado|completada)\b/.test(text)) return { role: 'success', reason: 'role="status" contains positive confirmation copy.' };
  if (/\b(success|confirmed|completed|complete|done|[eé]xito|correcto|confirmado|confirmada|completado|completada)\b/.test(text)) return { role: 'success', reason: 'Visible copy contains confirmation language.' };

  if (/\b(warning|caution|notice)\b/.test(descriptor)) return { role: 'warning', reason: 'Class, id or data attribute contains warning/caution/notice evidence.' };
  if (isAlert && !/\b(error|danger|destructive|invalid)\b/.test(evidence)) return { role: 'warning', reason: 'Non-destructive alert component is warning evidence.' };
  if (/\b(warning|caution|advertencia|aviso|precauci[oó]n)\b/.test(text)) return { role: 'warning', reason: 'Visible copy contains warning/advisory language.' };

  if (context.componentType !== 'link' && (context.componentType === 'help' || /\b(alert-info|info-alert|help|tip|tooltip|hint)\b/.test(descriptor))) {
    return { role: 'info', reason: 'Explicit info/help/tip component evidence.' };
  }
  return { role: 'none', reason: '' };
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

  const baseRole = baseRoleFromCssProperty(hex, count, relevantContexts, variableHints, { luminance, saturation });
  const semanticRole = semanticRoleFromContexts(relevantContexts);
  if (semanticRole.role !== 'none') {
    const confidence = semanticRole.role === 'info' ? 'medium' : 'high';
    return role(semanticRole.role, confidence, `${semanticRole.reason} Semantic state overrides base CSS role "${baseRole.role}".`);
  }

  if (variableHints.some(name => /\b(brand|primary|main)\b/.test(name)) && isActionColor(relevantContexts)) {
    return role('primary', 'high', 'Brand/primary variable used on visible main action.');
  }
  if (variableHints.some(name => /\b(brand)\b/.test(name))) return role('brand', 'medium', 'Color is exposed through a brand CSS variable.');

  if (isActionColor(relevantContexts)) {
    return role('primary', 'medium', 'Used as background color on visible CTA button or main action.');
  }
  if (relevantContexts.some(context => context.componentType === 'brand_asset')) return role('brand', 'medium', 'Used in visible logo or brand asset context.');

  if (variableHints.some(name => /\b(accent|secondary)\b/.test(name))) return role(variableHints.some(name => name.includes('secondary')) ? 'secondary' : 'accent', 'medium', 'Role inferred from CSS variable name and visible usage.');
  return baseRole;
}

function role(roleName, confidence, reason) {
  return { role: COLOR_ROLES.has(roleName) ? roleName : 'unknown', confidence, reason };
}

function baseRoleFromCssProperty(hex, count, contexts, variableHints, metrics) {
  const { luminance, saturation } = metrics;
  const properties = contexts.map(context => context.property);
  const hasProperty = matcher => properties.some(property => matcher(normalizeCssProperty(property)));

  if (hasProperty(property => property === 'color')) {
    const confidence = count > 1 ? 'high' : 'medium';
    return role('text', confidence, 'Base role from CSS property: color maps to text; no strong semantic state evidence found.');
  }
  if (hasProperty(property => property.includes('border'))) {
    return role('border', saturation < 0.25 ? 'medium' : 'low', 'Base role from CSS property: border color maps to border.');
  }
  if (hasProperty(property => property === 'outline' || property === 'outlinecolor')) {
    return role('focus', 'medium', 'Base role from CSS property: outline/outlineColor maps to focus.');
  }
  if (hasProperty(property => property === 'boxshadow' || property === 'textshadow')) {
    return role('shadow', 'medium', 'Base role from CSS property: boxShadow/textShadow maps to shadow.');
  }
  if (hasProperty(property => property === 'backgroundcolor')) {
    if (variableHints.some(name => /\b(brand|primary|main)\b/.test(name)) && isActionColor(contexts)) {
      return role('primary', 'high', 'Base role from background color on primary/brand variable used in CTA.');
    }
    if (isActionColor(contexts)) return role('primary', 'medium', 'Base role from CSS property: background color on visible CTA maps to primary.');
    if (variableHints.some(name => /\b(brand)\b/.test(name))) return role('brand', 'medium', 'Base role from CSS variable name: brand background color.');
    if (variableHints.some(name => /\b(accent|secondary)\b/.test(name))) return role(variableHints.some(name => name.includes('secondary')) ? 'secondary' : 'accent', 'medium', 'Base role from CSS variable name and background usage.');
    if (luminance > 0.92 || isNeutralHex(hex)) return role('surface', 'medium', 'Base role from CSS property: neutral/light background color maps to surface.');
    if (saturation > 0.35) return role('accent', 'low', 'Base role from CSS property: saturated background without semantic state evidence maps to accent.');
    return role('unknown', 'low', 'Base role from CSS property: background color without action, brand, accent or surface evidence remains unknown.');
  }
  return role('unknown', 'low', 'Insufficient CSS property evidence for a semantic role.');
}

function semanticRoleFromContexts(contexts) {
  const semanticContexts = contexts.filter(context => context.semanticContext && context.semanticContext !== 'none');
  const precedence = ['error', 'success', 'warning', 'info'];
  for (const semanticRole of precedence) {
    const match = semanticContexts.find(context => context.semanticContext === semanticRole);
    if (match) return { role: semanticRole, reason: match.semanticReason || 'Strong semantic context evidence found.' };
  }
  return { role: 'none', reason: '' };
}

function isActionColor(contexts) {
  return contexts.some(context => context.appearsInCta && ['backgroundcolor', 'color', 'bordercolor', 'bordertopcolor', 'borderrightcolor', 'borderbottomcolor', 'borderleftcolor'].includes(normalizeCssProperty(context.property)));
}

function normalizeCssProperty(property) {
  return String(property || '').replace(/-/g, '').toLowerCase();
}

function isNeutralHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
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
