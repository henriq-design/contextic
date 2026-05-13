const ARCHETYPES = new Set([
  'landing',
  'service_landing',
  'product_detail',
  'ecommerce_category',
  'checkout_or_form_flow',
  'article_or_blog',
  'dashboard_or_app',
  'legal_or_support',
  'unknown'
]);

const FULL_BEHAVIORAL_ARCHETYPES = new Set(['landing', 'service_landing']);

export function pageArchetypeClassifier(input = {}, root = input.root) {
  const signals = normalizeSignals(input, root);
  const scored = scoreArchetypes(signals).sort((a, b) => b.score - a.score);
  const best = scored[0] || { archetype: 'unknown', score: 0, signals: [] };
  const confidence = confidenceFromScore(best.score, best.signals.length);
  const archetype = confidence === 'low' && best.score < 3 ? 'unknown' : best.archetype;
  const outputSignals = archetype === 'unknown'
    ? best.signals.length ? best.signals : ['No hay señales suficientes para clasificar la página con seguridad.']
    : best.signals;

  return {
    archetype: ARCHETYPES.has(archetype) ? archetype : 'unknown',
    confidence,
    signals: outputSignals.slice(0, 8),
    analysisMode: analysisModeFor(archetype, confidence)
  };
}

export function shouldRunFullBehavioralAnalysis(pageClassification = {}) {
  return pageClassification.analysisMode === 'full_behavioral';
}

function normalizeSignals(input, root) {
  const components = input.detectedComponents || input.components || {};
  const counts = components.counts || {};
  const samples = components.samples || {};
  const headings = normalizeList(input.headings || input.h1 || input.h1Headings || readHeadings(root));
  const visibleText = compactWhitespace(input.visibleText || readVisibleText(root));
  const title = compactWhitespace(input.title || '');
  const url = compactWhitespace(input.url || '');
  const joinedText = `${url} ${title} ${headings.join(' ')} ${visibleText}`.toLowerCase();
  const buttonText = normalizeList(samples.buttons || []).map(button => typeof button === 'string' ? button : button.text).join(' ').toLowerCase();
  const ctaText = normalizeList(samples.ctaGroups || []).flatMap(group => group.actions || []).join(' ').toLowerCase();
  const forms = numeric(input.numberOfForms, counts.forms);
  const cards = numeric(counts.cards);
  const productCards = numeric(input.numberOfProductCards, counts.productCards, countProductCards(root, joinedText, cards));
  const hasCartCheckoutTerms = Boolean(input.presenceOfCartCheckoutTerms ?? input.hasCartCheckoutTerms ?? matches(joinedText, CART_CHECKOUT_TERMS));
  const hasArticleDateAuthorTerms = Boolean(input.presenceOfArticleDateAuthorTerms ?? input.hasArticleDateAuthorTerms ?? hasArticleSignals(joinedText, root));
  const hasFaq = Boolean(input.presenceOfFaq ?? input.hasFaq ?? matches(joinedText, FAQ_TERMS));
  const hasHero = Boolean(input.presenceOfHero ?? input.hasHero ?? headings.length > 0);
  const hasCtaGroups = Boolean(input.presenceOfCtaGroups ?? input.hasCtaGroups ?? (numeric(counts.ctaGroups) > 0 || matches(`${buttonText} ${ctaText}`, CTA_TERMS)));
  const hasCards = Boolean(input.presenceOfCards ?? input.hasCards ?? cards >= 3);

  return {
    url,
    title,
    headings,
    visibleText,
    joinedText,
    buttonText,
    ctaText,
    forms,
    cards,
    productCards,
    hasCartCheckoutTerms,
    hasArticleDateAuthorTerms,
    hasFaq,
    hasHero,
    hasCtaGroups,
    hasCards,
    hasHeroCtaStructure: hasHero && hasCtaGroups,
    hasPricingTerms: matches(joinedText, PRICING_TERMS),
    hasProductTerms: matches(joinedText, PRODUCT_TERMS),
    hasCategoryTerms: matches(joinedText, CATEGORY_TERMS),
    hasServiceTerms: matches(joinedText, SERVICE_TERMS),
    hasLegalSupportTerms: matches(joinedText, LEGAL_SUPPORT_TERMS),
    hasDashboardTerms: matches(joinedText, DASHBOARD_TERMS),
    hasLandingTerms: matches(joinedText, LANDING_TERMS)
  };
}

function scoreArchetypes(signals) {
  return [
    scoreCheckout(signals),
    scoreDashboard(signals),
    scoreArticle(signals),
    scoreEcommerceCategory(signals),
    scoreLegalSupport(signals),
    scoreProductDetail(signals),
    scoreServiceLanding(signals),
    scoreLanding(signals),
    { archetype: 'unknown', score: 0, signals: [] }
  ];
}

function scoreLanding(signals) {
  const result = createScore('landing');
  add(result, signals.hasHeroCtaStructure, 3, 'Hero con CTA o grupo de acciones visible.');
  add(result, signals.hasLandingTerms, 2, 'Texto orientado a propuesta de valor, beneficios o conversión.');
  add(result, signals.hasCards, 1, 'Cards de beneficios/features detectadas.');
  add(result, signals.hasFaq, 1, 'FAQ u objeciones detectadas.');
  add(result, signals.forms > 0, 1, 'Formulario de captación detectado.');
  add(result, !signals.hasCartCheckoutTerms && !signals.hasArticleDateAuthorTerms, 1, 'No predominan señales de checkout ni artículo.');
  return result;
}

function scoreServiceLanding(signals) {
  const result = createScore('service_landing');
  add(result, signals.hasHeroCtaStructure, 3, 'Hero con CTA o grupo de acciones visible.');
  add(result, signals.hasServiceTerms, 3, 'Señales de servicio, solución, soporte, demo o contacto.');
  add(result, signals.hasFaq, 1, 'FAQ u objeciones detectadas.');
  add(result, signals.forms > 0, 1, 'Formulario de contacto/captación detectado.');
  add(result, signals.hasCards, 1, 'Cards de beneficios o capacidades detectadas.');
  return result;
}

function scoreProductDetail(signals) {
  const result = createScore('product_detail');
  add(result, signals.hasProductTerms, 2, 'Señales de producto, SKU, disponibilidad o características.');
  add(result, signals.hasCartCheckoutTerms, 2, 'Términos de compra, carrito o checkout detectados.');
  add(result, signals.productCards <= 1 && signals.hasPricingTerms, 1, 'Precio asociado a una vista de producto.');
  add(result, matches(signals.url, [/\/product\//, /\/p\//, /\/products\//]), 2, 'URL compatible con detalle de producto.');
  return result;
}

function scoreEcommerceCategory(signals) {
  const result = createScore('ecommerce_category');
  add(result, signals.productCards >= 3, 4, `${signals.productCards} tarjetas/listados de producto detectados.`);
  add(result, signals.hasCategoryTerms, 3, 'Señales de categoría, catálogo, filtros u ordenación.');
  add(result, signals.hasCartCheckoutTerms, 1, 'Términos de compra o carrito presentes.');
  add(result, matches(signals.url, [/\/category\//, /\/collections?\//, /\/shop\b/, /\/tienda\b/]), 2, 'URL compatible con categoría de tienda.');
  return result;
}

function scoreCheckout(signals) {
  const result = createScore('checkout_or_form_flow');
  add(result, signals.hasCartCheckoutTerms, 4, 'Términos de carrito, pago, checkout o envío detectados.');
  add(result, signals.forms > 0, 2, `${signals.forms} formulario(s) detectado(s).`);
  add(result, matches(signals.url, [/checkout/, /cart/, /payment/, /signup/, /register/, /form/]), 2, 'URL compatible con flujo transaccional o formulario.');
  return result;
}

function scoreArticle(signals) {
  const result = createScore('article_or_blog');
  add(result, signals.hasArticleDateAuthorTerms, 4, 'Señales de autor, fecha, lectura o artículo detectadas.');
  add(result, matches(signals.url, [/\/blog\//, /\/article\//, /\/news\//, /\/posts?\//]), 2, 'URL compatible con blog/artículo.');
  add(result, !signals.hasCtaGroups && signals.forms === 0, 1, 'No predominan formularios ni grupos CTA.');
  return result;
}

function scoreDashboard(signals) {
  const result = createScore('dashboard_or_app');
  add(result, signals.hasDashboardTerms, 4, 'Señales de dashboard, workspace, ajustes o aplicación.');
  add(result, matches(signals.url, [/\/app\//, /\/dashboard/, /\/admin/, /\/settings/]), 2, 'URL compatible con aplicación autenticada.');
  add(result, signals.forms > 1 && !signals.hasHeroCtaStructure, 1, 'Múltiples controles sin estructura de landing.');
  return result;
}

function scoreLegalSupport(signals) {
  const result = createScore('legal_or_support');
  add(result, signals.hasLegalSupportTerms, 4, 'Señales legales, soporte, ayuda o documentación.');
  add(result, matches(signals.url, [/privacy/, /terms/, /legal/, /support/, /help/, /docs/]), 2, 'URL compatible con legal/soporte.');
  add(result, !signals.hasHeroCtaStructure, 1, 'No hay estructura clara de conversión.');
  return result;
}

function createScore(archetype) {
  return { archetype, score: 0, signals: [] };
}

function add(result, condition, score, signal) {
  if (!condition) return;
  result.score += score;
  result.signals.push(signal);
}

function confidenceFromScore(score, signalCount) {
  if (score >= 7 && signalCount >= 2) return 'high';
  if (score >= 4 && signalCount >= 2) return 'medium';
  return 'low';
}

function analysisModeFor(archetype, confidence) {
  if (FULL_BEHAVIORAL_ARCHETYPES.has(archetype) && confidence !== 'low') return 'full_behavioral';
  if (archetype === 'unknown') return 'snapshot_only';
  return 'limited_behavioral';
}

function readHeadings(root) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll('h1, h2, h3'))
    .slice(0, 16)
    .map(element => compactWhitespace(element.textContent || ''))
    .filter(Boolean);
}

function readVisibleText(root) {
  if (!root?.innerText && !root?.textContent) return '';
  return compactWhitespace(root.innerText || root.textContent || '');
}

function countProductCards(root, joinedText, fallbackCards) {
  if (root?.querySelectorAll) {
    const selector = [
      '[class*="product"]',
      '[data-product]',
      '[itemtype*="Product"]',
      '[class*="sku"]',
      '[class*="price"]'
    ].join(',');
    const count = Array.from(root.querySelectorAll(selector)).length;
    if (count) return count;
  }

  const termHits = (joinedText.match(/\b(add to cart|añadir al carrito|comprar|precio|price|€|\$)\b/gi) || []).length;
  if (termHits >= 3) return Math.max(fallbackCards, termHits);
  return 0;
}

function hasArticleSignals(text, root) {
  if (matches(text, ARTICLE_TERMS)) return true;
  if (root?.querySelector) {
    if (root.querySelector('article, time, [rel="author"], [class*="author"], [class*="date"], [datetime]')) return true;
  }
  return /\b\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/i.test(text);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function numeric(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function matches(text, patterns) {
  return patterns.some(pattern => pattern.test(String(text || '')));
}

function compactWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const CTA_TERMS = [
  /\b(get started|start|try|book|demo|contact|buy|subscribe|sign up|learn more)\b/i,
  /\b(empezar|probar|contratar|comprar|reservar|solicitar|contactar|descargar|suscribirse|ver precios)\b/i
];

const LANDING_TERMS = [
  /\b(benefits?|features?|why|pricing|customers?|trusted|testimonials?|plans?)\b/i,
  /\b(beneficios?|características|por qué|precios|clientes|testimonios|planes|confianza)\b/i
];

const SERVICE_TERMS = [
  /\b(service|services|solution|solutions|consulting|support|care|agency|demo|contact sales)\b/i,
  /\b(servicio|servicios|solución|soluciones|consultoría|soporte|atención|cuidado|demo|contacto)\b/i
];

const PRODUCT_TERMS = [
  /\b(product|sku|model|stock|availability|specifications?|reviews?)\b/i,
  /\b(producto|referencia|modelo|stock|disponibilidad|especificaciones|reseñas|valoraciones)\b/i
];

const CATEGORY_TERMS = [
  /\b(category|collection|catalog|filter|sort by|products|shop)\b/i,
  /\b(categoría|colección|catálogo|filtrar|ordenar|productos|tienda)\b/i
];

const CART_CHECKOUT_TERMS = [
  /\b(cart|basket|checkout|payment|shipping|billing|order|add to cart|buy now)\b/i,
  /\b(carrito|cesta|pago|envío|facturación|pedido|añadir al carrito|comprar ahora)\b/i
];

const ARTICLE_TERMS = [
  /\b(article|blog|posted|published|author|by |read time|minutes read|newsletter)\b/i,
  /\b(artículo|blog|publicado|autor|por |lectura|minutos|newsletter)\b/i
];

const FAQ_TERMS = [
  /\b(faq|frequently asked questions|questions|answers)\b/i,
  /\b(preguntas frecuentes|faq|dudas|respuestas)\b/i
];

const LEGAL_SUPPORT_TERMS = [
  /\b(privacy|terms|cookies|legal|support|help center|documentation|docs|refund)\b/i,
  /\b(privacidad|términos|cookies|legal|soporte|ayuda|documentación|reembolso)\b/i
];

const DASHBOARD_TERMS = [
  /\b(dashboard|workspace|admin|settings|analytics|reports|projects|tasks|inbox|profile)\b/i,
  /\b(panel|escritorio|administración|ajustes|analítica|informes|proyectos|tareas|bandeja|perfil)\b/i
];

const PRICING_TERMS = [
  /\b(price|pricing|from \$|from €|\$\d|€\d)\b/i,
  /\b(precio|precios|desde \$|desde €|\d+\s?€)\b/i
];
