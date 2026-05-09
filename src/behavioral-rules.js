import { createBehavioralFinding } from './behavioral-finding.js';
import { getAccessibleName, isProbablyGenericLinkText, isVisibleElement, toPxNumber } from './utils.js';

export const BEHAVIORAL_RULES_VERSION = '0.1.0';

export const BEHAVIORAL_RULES = [
  {
    id: 'what.incomplete-value-proposition',
    block: 'what',
    affectedBlocks: ['what', 'where'],
    type: 'ambiguedad',
    typeLabel: 'Ambigüedad',
    signal: 'incomplete_hero_value_proposition',
    severity: 4,
    expectedImpact: 'high',
    implementationEffort: 'medium',
    confidence: 'medium',
    evidenceType: 'structural',
    principle: 'claridad de propuesta de valor',
    title: 'Propuesta de valor incompleta en el primer bloque',
    risk: 'La comprensión inicial puede bajar si el primer bloque ofrece una acción sin explicar suficientemente qué se ofrece, qué gana el usuario o por qué actuar.',
    recommendation: 'Completa el primer bloque con headline, texto de apoyo, beneficio explícito y CTA conectado con el valor real de la oferta.',
    systemImplication: 'Define un patrón Hero con slots obligatorios para headline, apoyo, CTA principal y beneficio o prueba contextual.',
    recommendedPattern: 'Hero con propuesta de valor completa',
    metric: 'CTR del CTA principal',
    falsePositiveNotes: 'No debe dispararse en páginas informativas sin intención clara de conversión ni cuando ya hay H1, apoyo y CTA específico.',
    detect({ root }) {
      if (!looksLikeConversionScreen(root)) return null;

      const hero = getHeroSignals(root);
      if (!hero.actions.length) return null;
      if (hero.hasHeading && hero.hasSupportText && hero.hasSpecificCta) return null;

      const missing = [];
      if (!hero.hasHeading) missing.push('headline principal');
      if (!hero.hasSupportText) missing.push('texto de apoyo');
      if (!hero.hasExplicitBenefit) missing.push('beneficio explícito');
      if (!hero.hasSpecificCta) missing.push('CTA conectado con valor');
      if (missing.length < 2) return null;

      return {
        evidence: `Primer bloque con ${hero.actions.length} acción(es) visible(s), pero faltan señales: ${missing.join(', ')}.`,
        observed: {
          actions: hero.actions.map(element => getAccessibleName(element)).filter(Boolean).slice(0, 3),
          headingCount: hero.headings.length,
          supportTextCount: hero.supportTexts.length,
          missing
        },
        hypothesis: `Podría haber ambigüedad inicial porque el primer bloque muestra acción visible sin una propuesta de valor completa.`,
        insight: `Se detecta acción visible en el primer bloque con señales incompletas de propuesta de valor.`
      };
    }
  },
  {
    id: 'where.generic-primary-cta',
    block: 'where',
    affectedBlocks: ['what', 'where'],
    type: 'baja_accionabilidad',
    typeLabel: 'Baja accionabilidad',
    signal: 'generic_primary_cta_text',
    severity: 3,
    expectedImpact: 'medium',
    implementationEffort: 'low',
    confidence: 'high',
    evidenceType: 'textual',
    principle: 'claridad de acción',
    title: 'CTA principal poco específico',
    risk: 'Un CTA genérico obliga al usuario a inferir el resultado de hacer clic y puede reducir confianza antes de actuar.',
    recommendation: 'Sustituye el texto genérico por una acción orientada a valor, usando el formato “verbo + resultado real” sin inventar beneficios no presentes en la propuesta.',
    systemImplication: 'Añade reglas de contenido para Button/LinkButton: el label debe describir destino, resultado o siguiente paso.',
    recommendedPattern: 'CTA primario orientado a valor',
    metric: 'CTR del CTA principal',
    falsePositiveNotes: 'No debe dispararse para enlaces textuales secundarios ni navegación simple que no tenga affordance de botón primario.',
    detect({ root }) {
      const genericActions = getPrimaryLikeActions(root, { includeGeneric: true }).filter(element => isGenericPrimaryCtaText(getAccessibleName(element)));
      if (!genericActions.length) return null;

      const samples = genericActions.map(element => getAccessibleName(element)).filter(Boolean).slice(0, 3);
      return {
        evidence: `CTA principal con texto genérico: ${samples.join(', ')}.`,
        observed: {
          count: genericActions.length,
          samples
        },
        hypothesis: `Podría bajar la accionabilidad porque el CTA principal no anticipa con claridad el valor o resultado del clic.`,
        insight: `Se detecta CTA visualmente principal con texto poco específico.`
      };
    }
  },
  {
    id: 'why-not.high-commitment-without-reassurance',
    block: 'why_not',
    affectedBlocks: ['why_not', 'where'],
    type: 'riesgo_percibido',
    typeLabel: 'Riesgo percibido',
    signal: 'high_commitment_cta_without_nearby_reassurance',
    severity: 4,
    expectedImpact: 'high',
    implementationEffort: 'low',
    confidence: 'medium',
    evidenceType: 'textual',
    principle: 'reducción de riesgo percibido',
    title: 'Acción de alto compromiso sin reducción de riesgo cercana',
    risk: 'Una acción que sugiere pago, contratación, registro o contacto comercial puede aumentar la duda si no aclara condiciones reales cerca del CTA.',
    recommendation: 'Añade microcopy cercano al CTA que aclare condiciones reales, siguiente paso o tratamiento de datos; no inventes gratuidad, garantías ni cancelación si no están demostradas.',
    systemImplication: 'El patrón CTA de alto compromiso debería admitir un slot de reassurance o helper text gobernado por contenido real.',
    recommendedPattern: 'CTA con microcopy de confianza',
    metric: 'CTR del CTA principal y abandono posterior al clic',
    falsePositiveNotes: 'No debe dispararse cuando ya hay microcopy cercano sobre privacidad, coste, soporte, seguridad o siguiente paso.',
    detect({ root }) {
      const actions = getPrimaryLikeActions(root).filter(element => hasHighCommitmentText(getAccessibleName(element)));
      const withoutReassurance = actions.filter(element => !hasNearbyText(root, element, REASSURANCE_KEYWORDS, 140));
      if (!withoutReassurance.length) return null;

      const samples = withoutReassurance.map(element => getAccessibleName(element)).filter(Boolean).slice(0, 3);
      return {
        evidence: `CTA(s) de alto compromiso sin microcopy de riesgo cercano: ${samples.join(', ')}.`,
        observed: {
          count: withoutReassurance.length,
          samples
        },
        hypothesis: `Podría aumentar el riesgo percibido porque el CTA pide compromiso sin una aclaración cercana de condiciones reales.`,
        insight: `Se detecta acción de alto compromiso sin señales cercanas de confianza o reducción de riesgo.`
      };
    }
  },
  {
    id: 'why-not.form-without-privacy-reassurance',
    block: 'why_not',
    affectedBlocks: ['why_not', 'how', 'where'],
    type: 'riesgo_percibido',
    typeLabel: 'Riesgo percibido',
    signal: 'personal_data_form_without_reassurance',
    severity: 3,
    expectedImpact: 'high',
    implementationEffort: 'low',
    confidence: 'medium',
    evidenceType: 'structural',
    principle: 'confianza y expectativa post-envío',
    title: 'Formulario sin microcopy de confianza',
    risk: 'Pedir datos personales sin explicar uso, privacidad o siguiente paso puede aumentar abandono y dudas antes de enviar.',
    recommendation: 'Añade microcopy junto al formulario explicando qué pasará después y cómo se tratarán los datos, siempre con condiciones reales.',
    systemImplication: 'El componente Form debería incluir slots para privacidad, uso de datos, siguiente paso y tiempo de respuesta cuando pida datos personales.',
    recommendedPattern: 'Formulario con reassurance contextual',
    metric: 'Inicio y finalización de formulario',
    falsePositiveNotes: 'No debe dispararse si el formulario ya incluye copy cercano sobre privacidad, seguridad, uso de datos o siguiente paso.',
    detect({ root }) {
      const personalFields = getPersonalDataFields(root);
      if (!personalFields.length) return null;

      const fieldsWithoutReassurance = personalFields.filter(field => !hasNearbyText(root, field, FORM_REASSURANCE_KEYWORDS, 180));
      if (!fieldsWithoutReassurance.length) return null;

      const requestedData = Array.from(new Set(personalFields.map(describeFieldIntent))).filter(Boolean);
      const hasPhoneOrMultipleData = requestedData.includes('teléfono') || requestedData.length > 1;
      return {
        severity: hasPhoneOrMultipleData ? 4 : 3,
        evidence: `Formulario pide ${requestedData.join(', ') || 'datos personales'} sin microcopy cercano de privacidad o siguiente paso.`,
        observed: {
          fieldCount: personalFields.length,
          requestedData
        },
        hypothesis: `Podría aumentar el riesgo percibido porque el formulario pide datos personales sin explicar cerca cómo se usarán o qué ocurrirá después.`,
        insight: `Se detectan campos de datos personales sin reassurance cercana.`
      };
    }
  },
  {
    id: 'where.no-primary-cta-in-hero',
    block: 'where',
    affectedBlocks: ['what', 'where'],
    type: 'baja_accionabilidad',
    typeLabel: 'Baja accionabilidad',
    signal: 'no_primary_cta_in_hero',
    severity: 5,
    expectedImpact: 'high',
    implementationEffort: 'medium',
    confidence: 'medium',
    evidenceType: 'structural',
    principle: 'accionabilidad inmediata',
    title: 'No hay CTA primario visible en el primer bloque',
    risk: 'Si una pantalla orientada a conversión no muestra una acción clara al inicio, el usuario puede entender la oferta sin saber dónde actuar.',
    recommendation: 'Añade una acción primaria visible en el primer bloque o convierte el formulario visible en el punto de acción principal si esa es la conversión real.',
    systemImplication: 'El patrón Hero de conversión debería requerir un slot de CTA principal o formulario de conversión visible.',
    recommendedPattern: 'Hero con CTA primario visible',
    metric: 'Tiempo hasta primer clic en CTA',
    falsePositiveNotes: 'No debe dispararse en páginas informativas ni cuando hay un formulario visible que actúa como conversión principal.',
    detect({ root }) {
      if (!looksLikeConversionScreen(root)) return null;
      const hero = getHeroSignals(root);
      if (hero.actions.length || hasHeroForm(root)) return null;

      return {
        evidence: 'No se detecta CTA primario ni formulario visible en el primer bloque.',
        observed: {
          headingCount: hero.headings.length,
          supportTextCount: hero.supportTexts.length,
          actionCount: hero.actions.length
        },
        hypothesis: `Podría bajar la accionabilidad inicial porque el primer bloque no ofrece una acción primaria visible.`,
        insight: `No se detecta acción principal en el primer bloque visible.`
      };
    }
  },
  {
    id: 'where.competing-primary-ctas',
    block: 'where',
    affectedBlocks: ['what', 'where'],
    type: 'baja_accionabilidad',
    typeLabel: 'Baja accionabilidad',
    signal: 'visually_equivalent_primary_ctas_nearby',
    severity: 4,
    expectedImpact: 'high',
    implementationEffort: 'medium',
    confidence: 'medium',
    evidenceType: 'visual',
    principle: 'claridad de decisión',
    title: 'CTAs primarios compitiendo por la decisión',
    risk: 'Varias acciones visualmente equivalentes y cercanas pueden obligar al usuario a elegir entre rutas antes de entender la prioridad.',
    recommendation: 'Define una acción principal por bloque de decisión y mueve las acciones secundarias a variante secundaria o a un contexto posterior.',
    systemImplication: 'Gobierna variantes Button primary/secondary/tertiary y documenta reglas de convivencia dentro de grupos de CTA.',
    recommendedPattern: 'Grupo de CTA con jerarquía visual',
    metric: 'Distribución de clics entre CTAs y conversión final',
    falsePositiveNotes: 'No debe dispararse si las acciones tienen jerarquía visual clara o si son navegación de header sin affordance equivalente de botón primario.',
    detect({ root }) {
      const competingActions = getCompetingPrimaryActions(root);
      if (competingActions.length < 2) return null;

      const samples = competingActions.map(element => getAccessibleName(element)).filter(Boolean).slice(0, 4);
      return {
        evidence: `${competingActions.length} CTAs visualmente primarios y cercanos con acciones distintas: ${samples.join(', ')}.`,
        observed: {
          count: competingActions.length,
          samples
        },
        hypothesis: `Podría haber competencia de decisión porque varios CTAs cercanos tienen peso visual equivalente.`,
        insight: `Se detectan CTAs primarios cercanos y visualmente equivalentes.`
      };
    }
  },
  {
    id: 'where.multiple-primary-actions',
    block: 'where',
    affectedBlocks: ['what', 'where'],
    type: 'baja_accionabilidad',
    typeLabel: 'Baja accionabilidad',
    signal: 'multiple_primary_like_actions_above_fold',
    severity: 'alta',
    severityScore: 4,
    expectedImpact: 'high',
    implementationEffort: 'low',
    confidence: 'media',
    evidenceType: 'structural',
    principle: 'claridad de decisión',
    title: 'Acciones primarias compitiendo por encima del primer pliegue',
    risk: 'La claridad de decisión puede bajar cuando varios elementos compiten por el mismo rol conductual.',
    recommendation: 'Mantén una única acción primaria por bloque de decisión y degrada visualmente las acciones secundarias.',
    systemImplication: 'Revisa las variantes de jerarquía de botones y documenta cuándo usar acciones primarias, secundarias y terciarias.',
    recommendedPattern: 'Grupo de acciones jerarquizado',
    metric: 'CTR del CTA principal y clicks en CTA secundarios',
    falsePositiveNotes: 'Puede ser aceptable si las acciones representan rutas equivalentes claramente diferenciadas por segmento.',
    detect({ root }) {
      const primaryLikeActions = getPrimaryLikeActions(root);
      if (primaryLikeActions.length <= 1) return null;

      return {
        evidence: `${primaryLikeActions.length} acciones visualmente prominentes en el viewport inicial.`,
        observed: {
          count: primaryLikeActions.length,
          samples: primaryLikeActions.map(element => getAccessibleName(element)).filter(Boolean).slice(0, 4)
        },
        hypothesis: `Podría haber sobrecarga de elección porque ${primaryLikeActions.length} acciones parecen competir como primarias en el primer viewport.`,
        insight: `Se detectan ${primaryLikeActions.length} acciones visualmente prominentes en el viewport inicial.`
      };
    }
  },
  {
    id: 'how.unlabeled-inputs',
    block: 'how',
    affectedBlocks: ['how', 'why_not', 'where'],
    type: 'esfuerzo_percibido',
    typeLabel: 'Esfuerzo percibido',
    signal: 'visible_inputs_without_accessible_name',
    severity: 'alta',
    severityScore: 4,
    expectedImpact: 'high',
    implementationEffort: 'low',
    confidence: 'alta',
    evidenceType: 'structural',
    principle: 'esfuerzo percibido',
    title: 'Inputs sin etiquetas claras',
    risk: 'Los usuarios necesitan expectativas explícitas antes de actuar; los placeholders por sí solos no son una guía fiable.',
    recommendation: 'Añade etiquetas persistentes y copy contextual de ayuda/error cuando el input tenga restricciones de formato.',
    systemImplication: 'Los componentes de campo de formulario deberían incluir etiqueta, ayuda, error, deshabilitado y éxito como slots gobernados.',
    recommendedPattern: 'Campo de formulario con label persistente',
    metric: 'Inicio y finalización de formulario',
    falsePositiveNotes: 'Puede ser aceptable en inputs decorativos, ocultos visualmente o controles con contexto inmediato no detectable por nombre accesible.',
    detect({ components }) {
      const count = components.samples.unlabeledInputs.length;
      if (!count) return null;

      return {
        evidence: `${count} input(s) visibles sin nombre accesible.`,
        observed: {
          count,
          samples: components.samples.unlabeledInputs.slice(0, 4)
        },
        hypothesis: `Podría aumentar el esfuerzo percibido porque ${count} campo(s) no exponen una expectativa clara mediante nombre accesible.`,
        insight: `${count} muestra(s) de input visible no tienen nombre accesible.`
      };
    }
  },
  {
    id: 'what.generic-link-labels',
    block: 'what',
    affectedBlocks: ['what', 'where'],
    type: 'ambiguedad',
    typeLabel: 'Ambigüedad',
    signal: 'generic_link_text',
    severity: 'baja',
    severityScore: 2,
    expectedImpact: 'medium',
    implementationEffort: 'low',
    confidence: 'alta',
    evidenceType: 'textual',
    principle: 'rastro de información',
    title: 'Texto de enlace genérico',
    risk: 'Las etiquetas genéricas reducen escaneabilidad, accesibilidad y confianza antes de navegar.',
    recommendation: 'Usa textos de enlace orientados al resultado que describan el destino o la acción.',
    systemImplication: 'Añade guías de contenido para enlaces y etiquetas de navegación.',
    recommendedPattern: 'Link descriptivo orientado a destino',
    metric: 'CTR de enlaces y navegación posterior',
    falsePositiveNotes: 'Puede ser aceptable cuando el enlace está dentro de una frase cuyo contexto completo describe claramente el destino.',
    detect({ components }) {
      const samples = components.samples.genericLinks.slice(0, 3);
      if (!samples.length) return null;

      return {
        evidence: `Textos genéricos: ${samples.join(', ')}.`,
        observed: {
          count: components.samples.genericLinks.length,
          samples
        },
        hypothesis: `Podría haber ambigüedad de navegación porque algunos enlaces usan etiquetas genéricas: ${samples.join(', ')}.`,
        insight: `Se detecta texto de enlace genérico como: ${samples.join(', ')}.`
      };
    }
  },
  {
    id: 'why_not.disabled-controls-without-recovery',
    block: 'why_not',
    affectedBlocks: ['why_not', 'how', 'where'],
    type: 'riesgo_percibido',
    typeLabel: 'Riesgo percibido',
    signal: 'visible_disabled_controls',
    severity: 'media',
    severityScore: 3,
    expectedImpact: 'medium',
    implementationEffort: 'low',
    confidence: 'media',
    evidenceType: 'structural',
    principle: 'guía de recuperación',
    title: 'Los controles deshabilitados podrían carecer de guía de recuperación',
    risk: 'Los controles deshabilitados sin explicación crean callejones sin salida y clics repetidos.',
    recommendation: 'Explica por qué el control está deshabilitado y qué debe hacer el usuario para desbloquearlo.',
    systemImplication: 'Define patrones de guía para estados deshabilitados en lugar de depender solo de cambios de opacidad.',
    recommendedPattern: 'Estado deshabilitado con razón visible',
    metric: 'Errores evitables, clics repetidos e inicio de formulario',
    falsePositiveNotes: 'La regla no confirma si existe una explicación cercana; por eso debe mantenerse como hipótesis de confianza media.',
    detect({ components }) {
      const count = components.samples.disabledControls.length;
      if (!count) return null;

      return {
        evidence: `${count} control(es) deshabilitados detectados.`,
        observed: {
          count,
          samples: components.samples.disabledControls.slice(0, 4)
        },
        hypothesis: `Podría faltar guía de recuperación porque ${count} control(es) visibles aparecen deshabilitados.`,
        insight: `Se detectan ${count} muestra(s) de control deshabilitado.`
      };
    }
  }
];

export function evaluateBehavioralRules(context) {
  return BEHAVIORAL_RULES.flatMap(rule => {
    const detected = rule.detect(context);
    if (!detected) return [];

    const { detect, ...metadata } = rule;
    return [createBehavioralFinding({
      ...metadata,
      ruleId: rule.id,
      ruleVersion: BEHAVIORAL_RULES_VERSION,
      ...detected
    })];
  });
}

function getPrimaryLikeActions(root, { includeGeneric = false, heroOnly = false } = {}) {
  const viewportHeight = window.innerHeight || 900;
  const maxTop = heroOnly ? Math.min(viewportHeight, 620) : viewportHeight;
  const candidates = Array.from(root.querySelectorAll('button, [role="button"], input[type="submit"], a[href]'))
    .filter(isVisibleElement)
    .filter(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top < 0 || rect.top > maxTop || rect.width < 80 || rect.height < 28) return false;
      const style = window.getComputedStyle(element);
      const background = style.backgroundColor;
      const borderRadius = toPxNumber(style.borderTopLeftRadius) || 0;
      const hasBackground = background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent';
      const hasButtonText = getAccessibleName(element).length > 0;
      const isGeneric = isProbablyGenericLinkText(element.textContent);
      return hasBackground && hasButtonText && (includeGeneric || !isGeneric) && borderRadius >= 2;
    });

  return candidates.slice(0, 6);
}

const HERO_SELECTOR = 'h1, h2, p, li, button, [role="button"], input[type="submit"], a[href], form, input, textarea, select';
const TEXT_SELECTOR = 'p, small, span, li, div, label';
const FORM_FIELD_SELECTOR = 'input, textarea, select';
const GENERIC_PRIMARY_CTA_TEXTS = [
  'enviar',
  'saber mas',
  'ver mas',
  'continuar',
  'haz clic aqui',
  'click aqui',
  'empezar',
  'registrarme',
  'registro',
  'submit',
  'learn more',
  'more',
  'continue',
  'start',
  'sign up'
];
const HIGH_COMMITMENT_KEYWORDS = [
  'comprar',
  'contratar',
  'pagar',
  'suscribirme',
  'suscribete',
  'registrarme',
  'reservar',
  'solicitar demo',
  'pedir presupuesto',
  'hablar con ventas',
  'contactar ventas',
  'checkout',
  'buy',
  'purchase',
  'subscribe',
  'book',
  'request demo',
  'talk to sales'
];
const REASSURANCE_KEYWORDS = [
  'gratis',
  'sin tarjeta',
  'sin compromiso',
  'cancela cuando quieras',
  'privacidad',
  'seguro',
  'seguridad',
  'garantia',
  'soporte',
  'respuesta en',
  'no compartimos tus datos',
  'free',
  'no credit card',
  'cancel anytime',
  'privacy',
  'secure',
  'support'
];
const FORM_REASSURANCE_KEYWORDS = [
  ...REASSURANCE_KEYWORDS,
  'datos',
  'spam',
  'siguiente paso',
  'te contactaremos',
  'condiciones',
  'data',
  'next step',
  'no spam'
];
const BENEFIT_KEYWORDS = [
  'ahorra',
  'reduce',
  'mejora',
  'aumenta',
  'consigue',
  'recibe',
  'crea',
  'automatiza',
  'optimiza',
  'sin esfuerzo',
  'en minutos',
  'gratis',
  'save',
  'reduce',
  'improve',
  'get',
  'create',
  'automate',
  'free'
];
const PERSONAL_FIELD_KEYWORDS = [
  ['email', ['email', 'e-mail', 'correo']],
  ['teléfono', ['telefono', 'phone', 'tel', 'movil']],
  ['empresa', ['empresa', 'company', 'organizacion', 'organization']],
  ['cargo', ['cargo', 'puesto', 'role', 'job title']],
  ['nombre', ['nombre', 'name', 'full name']]
];

function looksLikeConversionScreen(root) {
  if (getPrimaryLikeActions(root, { includeGeneric: true }).length > 0) return true;
  if (hasHeroForm(root)) return true;
  return getVisibleElements(root, 'form, input[type="email"], input[type="tel"]').some(isInHero);
}

function getHeroSignals(root) {
  const headings = getVisibleElements(root, 'h1, h2').filter(isInHero);
  const supportTexts = getVisibleElements(root, 'p, li').filter(isInHero).filter(element => getText(element).length >= 40);
  const actions = getPrimaryLikeActions(root, { includeGeneric: true, heroOnly: true });
  const heroText = getVisibleElements(root, HERO_SELECTOR).filter(isInHero).map(getText).join(' ');
  const actionLabels = actions.map(element => getAccessibleName(element)).filter(Boolean);

  return {
    headings,
    supportTexts,
    actions,
    hasHeading: headings.some(element => getText(element).length >= 8),
    hasSupportText: supportTexts.length > 0,
    hasExplicitBenefit: containsAny(heroText, BENEFIT_KEYWORDS),
    hasSpecificCta: actionLabels.some(label => !isGenericPrimaryCtaText(label))
  };
}

function hasHeroForm(root) {
  return getVisibleElements(root, 'form').some(isInHero);
}

function isGenericPrimaryCtaText(text) {
  return GENERIC_PRIMARY_CTA_TEXTS.includes(normalizeText(text));
}

function hasHighCommitmentText(text) {
  return containsAny(text, HIGH_COMMITMENT_KEYWORDS);
}

function getPersonalDataFields(root) {
  return getVisibleElements(root, FORM_FIELD_SELECTOR).filter(element => describeFieldIntent(element));
}

function describeFieldIntent(element) {
  const text = [
    element.getAttribute('type'),
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label'),
    getAccessibleName(element)
  ].join(' ');
  const normalized = normalizeText(text);
  const match = PERSONAL_FIELD_KEYWORDS.find(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)));
  return match ? match[0] : '';
}

function hasNearbyText(root, element, keywords, maxDistance = 140) {
  const target = element.getBoundingClientRect();
  return getVisibleElements(root, TEXT_SELECTOR)
    .filter(item => item !== element)
    .some(item => {
      if (!containsAny(getText(item), keywords)) return false;
      const rect = item.getBoundingClientRect();
      const verticalDistance = Math.max(0, Math.max(rect.top - (target.top + target.height), target.top - (rect.top + rect.height)));
      return verticalDistance <= maxDistance;
    });
}

function getCompetingPrimaryActions(root) {
  const actions = getPrimaryLikeActions(root, { includeGeneric: true, heroOnly: true })
    .filter(element => !isHeaderLike(element));
  const groups = [];

  for (const action of actions) {
    const group = actions.filter(other => action !== other && areNearby(action, other, 96) && areVisuallyEquivalent(action, other));
    if (group.length) groups.push(action, ...group);
  }

  const unique = Array.from(new Set(groups));
  const labels = new Set(unique.map(element => normalizeText(getAccessibleName(element))).filter(Boolean));
  return labels.size >= 2 ? unique : [];
}

function areNearby(a, b, maxDistance) {
  const first = a.getBoundingClientRect();
  const second = b.getBoundingClientRect();
  const verticalDistance = Math.max(0, Math.max(second.top - (first.top + first.height), first.top - (second.top + second.height)));
  return verticalDistance <= maxDistance;
}

function areVisuallyEquivalent(a, b) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  const aStyle = window.getComputedStyle(a);
  const bStyle = window.getComputedStyle(b);
  const sizeRatio = Math.min(aRect.width, bRect.width) / Math.max(aRect.width, bRect.width);
  return sizeRatio >= 0.75 && aStyle.backgroundColor === bStyle.backgroundColor && Math.abs((toPxNumber(aStyle.borderTopLeftRadius) || 0) - (toPxNumber(bStyle.borderTopLeftRadius) || 0)) <= 2;
}

function isHeaderLike(element) {
  const rect = element.getBoundingClientRect();
  return rect.top < 72 && rect.height <= 44;
}

function getVisibleElements(root, selector) {
  return Array.from(root.querySelectorAll(selector)).filter(isVisibleElement);
}

function isInHero(element) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.top <= Math.min(window.innerHeight || 900, 620);
}

function containsAny(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some(keyword => normalized.includes(normalizeText(keyword)));
}

function getText(element) {
  return getAccessibleName(element) || element.textContent || '';
}

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
