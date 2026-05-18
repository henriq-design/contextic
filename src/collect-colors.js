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
const COLOR_ROLES = new Set(['text', 'surface', 'inverse_surface', 'inverse_button_surface', 'button_secondary_surface', 'brand_surface', 'brand', 'primary', 'secondary', 'accent', 'border', 'focus', 'shadow', 'error', 'success', 'warning', 'info', 'utility', 'unknown']);

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

        const context = buildColorContext(element, property, style);

        // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
        const weight = ['backgroundColor', 'background-color', 'color'].includes(property) ? 2 : 1;
        incrementMap(colorUsage, normalized, weight);
        if (context.isUserFacing && context.isVisualEvidence) incrementMap(userFacingColorUsage, normalized, weight);
        else incrementMap(systemColorUsage, normalized, weight);
        if (!colorContexts.has(normalized)) colorContexts.set(normalized, []);
        colorContexts.get(normalized).push(context);

        if (!colorSamples.has(normalized)) {
          colorSamples.set(normalized, {
            selector: readableSelector(element),
            property,
            context
          });
        }
        if (context.isUserFacing && context.isVisualEvidence && !userFacingColorSamples.has(normalized)) {
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
    const contexts = colorContexts.get(item.value) || [];
    const role = classifyColorUsage({ value: item.value, count: item.count, contexts, cssVariables });
    const dominantUse = dominantUseFor(item.value, contexts, userFacingColorSamples, colorSamples);
    const roleDeterminingUse = role.roleDeterminingUse || dominantUse;
    const observedUse = roleDeterminingUse;
    return {
      ...item,
      sample: observedUse,
      dominantUse,
      roleDeterminingUse,
      observedUse,
      usages: contexts.slice(0, 8),
      suggestedRole: role.role,
      displayRole: role.displayRole,
      roleConfidence: role.confidence,
      roleReason: role.reason,
      roleSource: role.source
    };
  });
  const systemHiddenVisualNoise = topFromMap(systemColorUsage, 8)
    .filter(item => item.count >= (userFacingColorUsage.get(item.value) || 0))
    .map(item => {
      const contexts = colorContexts.get(item.value) || [];
      const role = classifyColorUsage({ value: item.value, count: item.count, contexts, cssVariables });
      const dominantUse = dominantUseFor(item.value, contexts, undefined, colorSamples);
      const roleDeterminingUse = role.roleDeterminingUse || dominantUse;
      const observedUse = roleDeterminingUse;
      return {
        ...item,
        sample: observedUse,
        dominantUse,
        roleDeterminingUse,
        observedUse,
        usages: contexts.filter(context => context.isSystemOrHidden).slice(0, 4),
        suggestedRole: role.role,
        displayRole: role.displayRole,
        roleConfidence: role.confidence,
        roleReason: role.reason,
        roleSource: role.source
      };
    });

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

function visualEvidenceForProperty(element, style, property, context = {}) {
  const normalized = normalizeCssProperty(property);
  if (normalized === 'color' || normalized === 'backgroundcolor') {
    return { visible: true, quality: 'visible', reason: 'Direct visible CSS color property.' };
  }
  if (normalized === 'boxshadow' || normalized === 'textshadow') {
    const raw = style[property] || style.getPropertyValue?.(property) || '';
    const visible = raw && raw !== 'none' && extractColors(raw).length > 0;
    return {
      visible,
      quality: visible ? 'visible_shadow' : 'incidental_computed_style',
      reason: visible ? 'Shadow declaration contains a color.' : 'Shadow is none or has no color.'
    };
  }
  if (normalized === 'outline' || normalized === 'outlinecolor') {
    const visible = isVisibleOutline(style) && (context.interactive || ['focus', 'current', 'selected'].includes(context.stateContext));
    return {
      visible,
      quality: visible ? 'visible_outline' : 'incidental_computed_style',
      reason: visible ? 'Outline has visible style/width on an interactive or focused element.' : 'Outline is not visibly rendered for this element.'
    };
  }
  if (normalized.includes('border')) {
    const visible = isVisibleBorderForProperty(style, property);
    return {
      visible,
      quality: visible ? 'visible_border' : 'incidental_computed_style',
      reason: visible ? 'Border has visible style and width.' : 'Computed border color without visible border width/style.'
    };
  }
  return { visible: true, quality: 'visible', reason: 'Visible CSS property.' };
}

function buildColorContext(element, property, style = window.getComputedStyle(element)) {
  const selector = readableSelector(element);
  const region = classifyElementRegion(element);
  const componentType = inferComponentType(element);
  const stateContext = inferStateContext(element, { componentType });
  const isVisible = true;
  const isSystemOrHidden = region === 'hidden_or_system';
  const isUserFacing = isVisible && !isSystemOrHidden;
  const interactive = isInteractive(element);
  const appearsInCta = interactive && isMainAction(element);
  const semanticContext = semanticRoleFromContext(element, { componentType, region, stateContext });
  const visualEvidence = visualEvidenceForProperty(element, style, property, { interactive, stateContext });

  return {
    property,
    selector,
    componentType,
    stateContext,
    region,
    visible: isUserFacing,
    isVisible,
    isUserFacing,
    isInteractive: interactive,
    isSystemOrHidden,
    interactive,
    appearsInCta,
    isVisualEvidence: visualEvidence.visible,
    evidenceQuality: visualEvidence.quality,
    evidenceReason: visualEvidence.reason,
    semanticContext: semanticContext.role,
    semanticReason: semanticContext.reason
  };
}

function annotateCssVariableUsage(cssVariables, colorContexts) {
  return cssVariables.map(variable => {
    const normalized = normalizeColor(variable.value);
    const contexts = normalized ? colorContexts.get(normalized) || [] : [];
    const visibleUse = contexts.some(context => context.isUserFacing);
    const systemUse = contexts.some(context => context.isSystemOrHidden);
    const isThirdPartySystem = isThirdPartySystemVariable(variable.name) || (systemUse && !visibleUse);
    return {
      ...variable,
      usageStatus: isThirdPartySystem
        ? 'third-party/accessibility-widget usage'
        : visibleUse
          ? 'used visible'
          : contexts.length ? 'declared only' : 'unknown usage',
      systemUtility: isThirdPartySystem
    };
  });
}

function isThirdPartySystemVariable(name = '') {
  return /^--bmv-/i.test(name) || /\b(accessibility|accessi|a11y|assistive|widget|plugin)\b/i.test(name);
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
  if (hasAncestor(element, ancestor => ancestor.tagName?.toLowerCase?.() === 'nav' || String(ancestor.getAttribute?.('role') || '').toLowerCase() === 'navigation')) return 'navigation_item';
  if (role === 'alert' || role === 'status' || /\b(alert|toast|banner|message)\b/.test(classAndId)) return 'alert';
  if (/\b(circle|dot|blob|shape|decorative|decoration)\b/.test(classAndId)) return 'decorative';
  if (/\b(help|tip|tooltip|hint)\b/.test(classAndId)) return 'help';
  if (/\b(card)\b/.test(classAndId)) return 'card';
  if (/\b(logo|brand)\b/.test(classAndId)) return 'brand_asset';
  return 'static';
}

function inferStateContext(element, context = {}) {
  const descriptor = elementDescriptor(element);
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const ariaCurrent = String(element.getAttribute?.('aria-current') || '').toLowerCase();
  const ariaSelected = String(element.getAttribute?.('aria-selected') || '').toLowerCase();
  const ariaDisabled = String(element.getAttribute?.('aria-disabled') || '').toLowerCase();
  const disabled = element.matches?.(':disabled, [aria-disabled="true"]') || ariaDisabled === 'true';
  const isNav = context.componentType === 'navigation' || context.componentType === 'navigation_item' || role === 'navigation' || hasAncestor(element, ancestor => ancestor.tagName?.toLowerCase?.() === 'nav' || String(ancestor.getAttribute?.('role') || '').toLowerCase() === 'navigation');

  if (disabled || /\b(disabled|is-disabled)\b/.test(descriptor)) return 'disabled';
  if (ariaCurrent && ariaCurrent !== 'false') return isNav ? 'active_navigation' : 'current';
  if (ariaSelected === 'true' || /\b(selected|is-selected)\b/.test(descriptor)) return 'selected';
  if (isNav && /\b(active|current|is-active)\b/.test(descriptor)) return 'active_navigation';
  if (/\b(focus|focused|focus-visible)\b/.test(descriptor)) return 'focus';
  return 'none';
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
  if (['active_navigation', 'selected', 'current', 'focus', 'disabled'].includes(context.stateContext)) {
    return { role: 'none', reason: 'UI state context is not semantic success/warning/error evidence.' };
  }

  const descriptor = elementDescriptor(element);
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const ariaInvalid = element.getAttribute?.('aria-invalid') === 'true';
  const evidence = descriptor;
  const isAlert = role === 'alert' || context.componentType === 'alert';
  const isStatus = role === 'status';
  const hasValidationComponent = /\b(error|invalid|danger|destructive|field-error|validation|form-error)\b/.test(descriptor);
  const hasWarningComponent = /\b(warning|caution|alert-warning|warning-alert|validation-warning)\b/.test(descriptor);
  const hasSuccessComponent = /\b(success|valid|completed|complete|confirmation|confirmed|alert-success|success-alert)\b/.test(descriptor);
  const hasInfoComponent = /\b(alert-info|info-alert|help|tip|tooltip|hint|notice)\b/.test(descriptor) && context.componentType !== 'link';

  if (ariaInvalid) return { role: 'error', reason: 'aria-invalid="true" is strong error evidence.' };
  if (hasValidationComponent) return { role: 'error', reason: 'Class, id or data attribute contains error/invalid/danger validation evidence.' };
  if (isAlert && /\b(error|invalid|danger|destructive|validation)\b/.test(evidence)) return { role: 'error', reason: 'Alert component carries explicit error evidence.' };

  if (hasSuccessComponent && (isStatus || isAlert || /\b(status|alert|message|notification|toast|validation)\b/.test(descriptor))) return { role: 'success', reason: 'Semantic status/alert component contains success/valid/completed evidence.' };
  if (isStatus && hasSuccessComponent) return { role: 'success', reason: 'role="status" contains explicit success evidence.' };

  if (hasWarningComponent) return { role: 'warning', reason: 'Class, id or data attribute contains explicit warning/caution state evidence.' };

  if (hasInfoComponent || context.componentType === 'help') {
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

function hasAncestor(element, predicate) {
  let current = element.parentElement;
  while (current) {
    if (predicate(current)) return true;
    current = current.parentElement;
  }
  return false;
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

export function classifyColorUsage(colorUsage = {}) {
  const hex = colorUsage.value || colorUsage.hex || '';
  const count = colorUsage.count || 0;
  const contexts = colorUsage.contexts || colorUsage.usages || [];
  const cssVariables = colorUsage.cssVariables || [];
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  const saturation = colorSaturation(r, g, b);
  const relevantContexts = contexts.filter(context => context.visible && context.region !== 'hidden_or_system');
  const variableHints = cssVariables.filter(variable => normalizeColor(variable.value) === hex).map(variable => variable.name.toLowerCase());

  if (!relevantContexts.length) {
    return role('utility', 'low', 'Solo observado en contextos ocultos, de sistema o utilidad.', 'base_css_property', contextToUse(contexts[0]));
  }

  const metrics = { luminance, saturation };
  const candidateContexts = relevantContexts.filter(context => context.isVisualEvidence);
  const contextsForCandidates = candidateContexts.length
    ? candidateContexts
    : relevantContexts.filter(context => normalizeCssProperty(context.property) === 'color');
  const candidates = contextsForCandidates.map((context, index) => {
    const roleInfo = roleFromSingleUse(hex, count, context, variableHints, metrics);
    return { ...roleInfo, index };
  });
  const best = candidates.sort(compareRoleCandidates)[0];
  if (best) return best;

  return role('unknown', 'low', 'Evidencia insuficiente de propiedad CSS para inferir rol.', 'fallback', contextToUse(relevantContexts[0]));
}

function dominantUseFor(value, contexts, userFacingColorSamples, colorSamples) {
  return userFacingColorSamples?.get(value) || colorSamples?.get(value) || contextToUse(contexts[0]);
}

function roleFromSingleUse(hex, count, context = {}, variableHints = [], metrics = {}) {
  const property = normalizeCssProperty(context.property);
  const { luminance = 0, saturation = 0 } = metrics;
  const use = contextToUse(context);

  if (property === 'boxshadow' || property === 'textshadow') {
    return role('shadow', 'medium', 'Propiedad CSS boxShadow/textShadow mapea a sombra.', 'base_css_property', use, 35);
  }

  if (property.includes('border')) {
    const semantic = semanticRoleForVisualUse(context, variableHints);
    if (semantic.role !== 'none') return role(semantic.role, semantic.confidence, semantic.reason, 'semantic_component', use, semantic.priority);
    return role('border', saturation < 0.25 ? 'medium' : 'low', 'Propiedad CSS de borde mapea a borde.', 'base_css_property', use, 30);
  }

  if (property === 'outline' || property === 'outlinecolor') {
    return role('focus', 'medium', 'Propiedad CSS outline/outlineColor mapea a foco.', 'base_css_property', use, 32);
  }

  if (property === 'backgroundcolor') {
    const semantic = semanticRoleForVisualUse(context, variableHints);
    if (semantic.role !== 'none') return role(semantic.role, semantic.confidence, semantic.reason, 'semantic_component', use, semantic.priority);

    if (context.appearsInCta && !isNeutralActionSurface(hex, [context], metrics) && isPrimaryActionRegion(context)) {
      const hasBrandPrimary = variableHints.some(name => /\b(brand|primary|main)\b/.test(name));
      return role('primary', hasBrandPrimary ? 'high' : 'medium', hasBrandPrimary ? 'Variable brand/primary usada como fondo de una acción principal visible.' : 'Usado como backgroundColor en un CTA o acción principal visible.', 'cta_context', use, 90);
    }

    if (context.componentType === 'button' && isInverseOrSecondarySurfaceContext(context) && (luminance > 0.92 || isNeutralHex(hex))) {
      return role('inverse_button_surface', 'medium', 'BackgroundColor claro en botón inverso/secundario mapea a superficie de botón, no a primario.', 'base_css_property', use, 84);
    }

    if (isDarkNeutral(hex, luminance, saturation)) {
      const reason = context.region === 'footer'
        ? 'BackgroundColor oscuro en footer mapea a superficie inversa, no a acción primaria.'
        : 'BackgroundColor oscuro mapea a superficie inversa, no a acción primaria.';
      return role('inverse_surface', 'medium', reason, 'base_css_property', use, 78);
    }

    if (luminance > 0.92 || isNeutralHex(hex)) {
      const reason = ['header', 'nav'].includes(context.region)
        ? 'BackgroundColor claro en header/nav mapea a superficie.'
        : 'BackgroundColor neutro/claro mapea a superficie.';
      return role('surface', 'medium', reason, 'base_css_property', use, 74);
    }

    if (variableHints.some(name => /\b(brand)\b/.test(name))) {
      return role('brand_surface', 'medium', 'BackgroundColor con variable CSS de marca mapea a superficie de marca.', 'brand_context', use, 70);
    }
    if (variableHints.some(name => /\b(accent|secondary)\b/.test(name))) {
      const roleName = variableHints.some(name => name.includes('secondary')) ? 'secondary' : 'accent';
      return role(roleName, 'medium', 'BackgroundColor inferido desde variable CSS.', 'brand_context', use, 66);
    }
    if (saturation > 0.35) {
      return role('accent', 'low', 'BackgroundColor saturado sin evidencia de CTA ni estado semántico mapea a accent.', 'base_css_property', use, 45);
    }
    return role('unknown', 'low', 'BackgroundColor sin evidencia de acción, marca, accent o superficie.', 'fallback', use, 20);
  }

  if (property === 'color') {
    const semantic = semanticRoleForTextUse(hex, context, variableHints, metrics);
    if (semantic.role !== 'none') return role(semantic.role, semantic.confidence, semantic.reason, 'semantic_component', use, semantic.priority);
    const confidence = count > 1 ? 'high' : 'medium';
    return role('text', confidence, 'Propiedad CSS color mapea a texto; sin evidencia semántica fuerte localizada.', 'base_css_property', use, 40);
  }

  return role('unknown', 'low', 'Evidencia insuficiente de propiedad CSS para inferir rol.', 'fallback', use, 10);
}

function semanticRoleForVisualUse(context = {}, variableHints = []) {
  if (!context.semanticContext || context.semanticContext === 'none') return { role: 'none' };
  if (['active_navigation', 'selected', 'current', 'focus', 'disabled'].includes(context.stateContext)) return { role: 'none' };
  if (context.semanticContext === 'warning') {
    return { role: 'warning', confidence: 'high', reason: context.semanticReason || 'Evidencia visual explícita de warning en background/borde/token.', priority: 88 };
  }
  if (['error', 'success'].includes(context.semanticContext)) {
    return { role: context.semanticContext, confidence: 'high', reason: context.semanticReason || 'Evidencia semántica fuerte y localizada.', priority: 86 };
  }
  if (context.semanticContext === 'info') {
    return { role: 'info', confidence: 'medium', reason: context.semanticReason || 'Evidencia visual explícita de info/help.', priority: 64 };
  }
  if (hasExplicitSemanticTokenVariable(variableHints)) {
    const tokenRole = variableHints.find(name => /\b(error|invalid|danger|success|warning|alert|notice|info)\b/.test(name)) || '';
    if (/\b(error|invalid|danger)\b/.test(tokenRole)) return { role: 'error', confidence: 'high', reason: 'Token visual explícito de error/danger.', priority: 86 };
    if (/\b(success)\b/.test(tokenRole)) return { role: 'success', confidence: 'high', reason: 'Token visual explícito de success.', priority: 86 };
    if (/\b(warning|alert|notice)\b/.test(tokenRole)) return { role: 'warning', confidence: 'high', reason: 'Token visual explícito de warning/alert.', priority: 88 };
    if (/\b(info)\b/.test(tokenRole)) return { role: 'info', confidence: 'medium', reason: 'Token visual explícito de info.', priority: 64 };
  }
  return { role: 'none' };
}

function semanticRoleForTextUse(hex, context = {}, variableHints = [], metrics = {}) {
  if (!context.semanticContext || context.semanticContext === 'none') return { role: 'none' };
  if (context.semanticContext === 'warning') return { role: 'none' };
  if (isNeutralHex(hex)) return { role: 'none' };
  if (!hasExplicitSemanticTokenVariable(variableHints) && Number(metrics.saturation || 0) < 0.28) return { role: 'none' };
  if (['error', 'success'].includes(context.semanticContext)) {
    return { role: context.semanticContext, confidence: 'high', reason: context.semanticReason || 'Evidencia semántica fuerte y localizada en texto de estado.', priority: 62 };
  }
  if (context.semanticContext === 'info') {
    return { role: 'info', confidence: 'medium', reason: context.semanticReason || 'Evidencia semántica localizada en texto informativo.', priority: 42 };
  }
  return { role: 'none' };
}

function compareRoleCandidates(a = {}, b = {}) {
  return Number(b.priority || 0) - Number(a.priority || 0) || Number(a.index || 0) - Number(b.index || 0);
}

function contextToUse(context = {}) {
  if (!context) return undefined;
  return {
    selector: context.selector,
    property: context.property,
    context
  };
}

function role(roleName, confidence, reason, source = 'fallback', roleDeterminingUse, priority = 0) {
  const normalizedRole = COLOR_ROLES.has(roleName) ? roleName : 'unknown';
  return {
    role: normalizedRole,
    displayRole: displayRoleFor(normalizedRole),
    confidence,
    reason,
    source,
    roleDeterminingUse,
    priority
  };
}

function displayRoleFor(roleName) {
  return {
    text: 'texto (text)',
    surface: 'superficie (surface)',
    inverse_surface: 'superficie inversa (inverse_surface)',
    inverse_button_surface: 'superficie de botón inverso (inverse_button_surface)',
    button_secondary_surface: 'superficie de botón secundario (button_secondary_surface)',
    brand_surface: 'superficie de marca (brand_surface)',
    brand: 'marca (brand)',
    primary: 'primario (primary)',
    secondary: 'secundario (secondary)',
    accent: 'acento (accent)',
    border: 'borde (border)',
    focus: 'foco (focus)',
    shadow: 'sombra (shadow)',
    error: 'error (error)',
    success: 'éxito (success)',
    warning: 'aviso (warning)',
    info: 'info (info)',
    utility: 'utilidad (utility)',
    unknown: 'desconocido (unknown)'
  }[roleName] || 'desconocido (unknown)';
}

function hasExplicitSemanticTokenVariable(variableHints = []) {
  return variableHints.some(name => /\b(error|invalid|danger|success|warning|alert|notice|info)\b/.test(name));
}

function isPrimaryActionRegion(context = {}) {
  if (['hero', 'main', 'section'].includes(context.region)) return true;
  if (['header', 'nav'].includes(context.region)) {
    return /\b(cta|primary|main-action)\b/i.test(`${context.selector || ''} ${context.componentType || ''}`);
  }
  return false;
}

function isNeutralActionSurface(hex, contexts, metrics = {}) {
  const descriptor = contexts.map(context => `${context.selector || ''} ${context.componentType || ''} ${context.stateContext || ''}`).join(' ').toLowerCase();
  const luminance = Number(metrics.luminance || 0);
  const neutral = isNeutralHex(hex);
  if (luminance > 0.92) return true;
  if (neutral && /\b(inverse|secondary|tertiary|ghost|outline|nav|navigation|header)\b/.test(descriptor)) return true;
  return false;
}

function isVisibleBorderForProperty(style, property) {
  const normalized = normalizeCssProperty(property);
  if (normalized === 'bordercolor') {
    return ['Top', 'Right', 'Bottom', 'Left'].some(side => isVisibleBorderSide(style, side));
  }
  if (normalized === 'bordertopcolor') return isVisibleBorderSide(style, 'Top');
  if (normalized === 'borderrightcolor') return isVisibleBorderSide(style, 'Right');
  if (normalized === 'borderbottomcolor') return isVisibleBorderSide(style, 'Bottom');
  if (normalized === 'borderleftcolor') return isVisibleBorderSide(style, 'Left');
  return false;
}

function isVisibleBorderSide(style, side) {
  const width = cssPixelValue(style[`border${side}Width`] || style.getPropertyValue?.(`border-${side.toLowerCase()}-width`));
  const borderStyle = String(style[`border${side}Style`] || style.getPropertyValue?.(`border-${side.toLowerCase()}-style`) || '').toLowerCase();
  return width > 0 && borderStyle && !['none', 'hidden'].includes(borderStyle);
}

function isVisibleOutline(style) {
  const width = cssPixelValue(style.outlineWidth || style.getPropertyValue?.('outline-width'));
  const outlineStyle = String(style.outlineStyle || style.getPropertyValue?.('outline-style') || '').toLowerCase();
  return width > 0 && outlineStyle && !['none', 'hidden'].includes(outlineStyle);
}

function cssPixelValue(value) {
  const number = Number.parseFloat(String(value || '0'));
  return Number.isFinite(number) ? number : 0;
}

function normalizeCssProperty(property) {
  return String(property || '').replace(/-/g, '').toLowerCase();
}

function isNeutralHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
}

function isDarkNeutral(hex, luminance, saturation) {
  return isNeutralHex(hex) && Number(luminance || 0) < 0.18 && Number(saturation || 0) < 0.18;
}

function isInverseOrSecondarySurfaceContext(context = {}) {
  return /\b(inverse|secondary|tertiary|ghost|outline)\b/i.test(`${context.selector || ''} ${context.componentType || ''}`);
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
