(() => {
'use strict';
// ---- src/utils.js ----
const MAX_ELEMENTS = 1800;

function getCandidateElements(root = document.body, limit = MAX_ELEMENTS) {
  const elements = Array.from(root.querySelectorAll('*'));
  return elements.filter(isVisibleElement).slice(0, limit);
}

function isVisibleElement(element) {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  return true;
}

function toPxNumber(value) {
  if (!value || value === 'normal' || value === 'auto') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function compactText(text, max = 80) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function incrementMap(map, key, weight = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + weight);
}

function topFromMap(map, limit = 12) {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
    .slice(0, limit);
}

function normalizeColor(value) {
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

function isProbablyGenericLinkText(text) {
  const normalized = compactText(text, 40).toLowerCase();
  return ['click here', 'here', 'learn more', 'more', 'read more', 'ver más', 'más información', 'aquí', 'pincha aquí'].includes(normalized);
}

function getAccessibleName(element) {
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


// ---- src/behavioral-finding.js ----
const IMPACT_WEIGHTS = { low: 1, medium: 2, high: 3 };
const EFFORT_WEIGHTS = { low: 1, medium: 2, high: 3 };
const SEVERITY_SCORES = { baja: 2, media: 3, alta: 4, critica: 5 };

function calculatePriority({ severity = 3, expectedImpact = 'medium', implementationEffort = 'medium' } = {}) {
  const severityScore = normalizeSeverityScore(severity);
  const impactWeight = IMPACT_WEIGHTS[expectedImpact] || IMPACT_WEIGHTS.medium;
  const effortWeight = EFFORT_WEIGHTS[implementationEffort] || EFFORT_WEIGHTS.medium;
  const priorityScore = Math.round((severityScore * impactWeight / effortWeight) * 100) / 100;
  const priority = priorityScore >= 9 ? 'P0' : priorityScore >= 5 ? 'P1' : 'P2';

  return { priority, priorityScore, severityScore };
}

function createBehavioralFinding(input = {}) {
  const expectedImpact = input.expectedImpact || 'medium';
  const implementationEffort = input.implementationEffort || 'medium';
  const severityScore = normalizeSeverityScore(input.severityScore ?? input.severity);
  const priority = calculatePriority({ severity: severityScore, expectedImpact, implementationEffort });
  const evidence = input.evidence || '';
  const hypothesis = input.hypothesis || toHypothesis(input.insight || evidence);
  const frictionType = input.frictionType || input.type || 'ambiguedad';
  const frictionLabel = input.frictionLabel || input.typeLabel || frictionType;

  return {
    id: input.id || input.ruleId || '',
    ruleId: input.ruleId || input.id || '',
    ruleVersion: input.ruleVersion || '',
    title: input.title || 'Hallazgo behavioral',
    block: input.block || 'what',
    affectedBlocks: input.affectedBlocks || [],
    frictionType,
    frictionLabel,
    type: frictionType,
    typeLabel: frictionLabel,
    severity: severityScore,
    severityScore,
    confidence: input.confidence || 'media',
    evidenceType: input.evidenceType || 'inference',
    evidence,
    observed: input.observed || null,
    hypothesis,
    insight: input.insight || hypothesis,
    risk: input.risk || '',
    principle: input.principle || '',
    recommendation: input.recommendation || '',
    systemImplication: input.systemImplication || '',
    recommendedPattern: input.recommendedPattern || '',
    expectedImpact,
    implementationEffort,
    priority: priority.priority,
    priorityScore: priority.priorityScore,
    metric: input.metric || '',
    signal: input.signal || '',
    falsePositiveNotes: input.falsePositiveNotes || ''
  };
}

function normalizeSeverityScore(severity = 3) {
  if (typeof severity === 'number' && Number.isFinite(severity)) return Math.max(1, Math.min(5, severity));
  return SEVERITY_SCORES[severity] || 3;
}

function toHypothesis(signal = '') {
  if (!signal) return 'Podría existir una fricción conductual que requiere validación de producto/diseño.';
  return `Podría existir una fricción conductual asociada a esta señal: ${signal}`;
}


// ---- src/behavioral-rules.js ----

const BEHAVIORAL_RULES_VERSION = '0.1.0';

const BEHAVIORAL_RULES = [
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

function evaluateBehavioralRules(context) {
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


// ---- src/collect-colors.js ----

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

function collectColors(root = document.body, options = {}) {
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
  const evidence = descriptor;
  const isAlert = role === 'alert' || context.componentType === 'alert';
  const hasValidationComponent = /\b(error|invalid|danger|destructive|field-error|validation|form-error)\b/.test(descriptor);
  const hasWarningComponent = /\b(warning|caution|notice|alert)\b/.test(descriptor);
  const hasSuccessComponent = /\b(success|valid|completed|complete|confirmation|confirmed)\b/.test(descriptor);
  const hasInfoComponent = /\b(alert-info|info-alert|help|tip|tooltip|hint|notice)\b/.test(descriptor) && context.componentType !== 'link';

  if (ariaInvalid) return { role: 'error', reason: 'aria-invalid="true" is strong error evidence.' };
  if (hasValidationComponent) return { role: 'error', reason: 'Class, id or data attribute contains error/invalid/danger validation evidence.' };
  if (isAlert && /\b(error|invalid|danger|destructive|validation)\b/.test(evidence)) return { role: 'error', reason: 'Alert component carries explicit error evidence.' };

  if (hasSuccessComponent) return { role: 'success', reason: 'Class, id or data attribute contains success/valid/completed evidence.' };
  if (role === 'status' && hasSuccessComponent) return { role: 'success', reason: 'role="status" contains explicit success evidence.' };

  if (hasWarningComponent) return { role: 'warning', reason: 'Class, id or data attribute contains warning/caution/notice evidence.' };
  if (isAlert && !/\b(error|danger|destructive|invalid)\b/.test(evidence)) return { role: 'warning', reason: 'Non-destructive alert component is warning evidence.' };

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
  if (baseRole.role === 'shadow') return baseRole;

  const semanticRole = semanticRoleFromContexts(hex, relevantContexts, { saturation, luminance, baseRole: baseRole.role, variableHints });
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

function semanticRoleFromContexts(hex, contexts, metrics = {}) {
  const semanticContexts = contexts.filter(context => context.semanticContext && context.semanticContext !== 'none');
  const precedence = ['error', 'success', 'warning', 'info'];
  for (const semanticRole of precedence) {
    const match = semanticContexts.find(context => context.semanticContext === semanticRole && canSemanticStateOverrideBaseColor(hex, context, metrics));
    if (match) return { role: semanticRole, reason: match.semanticReason || 'Strong semantic context evidence found.' };
  }
  return { role: 'none', reason: '' };
}

function canSemanticStateOverrideBaseColor(hex, context, metrics = {}) {
  const property = normalizeCssProperty(context.property);
  const variableHints = metrics.variableHints || [];
  const hasExplicitSemanticToken = variableHints.some(name => /\b(error|invalid|danger|success|warning|alert|notice|info)\b/.test(name));

  if (property === 'boxshadow' || property === 'textshadow') return false;
  if (context.semanticContext === 'warning' && property === 'color' && !hasExplicitSemanticToken) return false;
  if (property === 'color' && isNeutralHex(hex) && !hasExplicitSemanticToken) return false;
  if (property === 'backgroundcolor' || property.includes('border') || property === 'outlinecolor') return true;
  return Number(metrics.saturation || 0) >= 0.28 && Number(metrics.luminance || 0) < 0.92;
}

function isActionColor(contexts) {
  return contexts.some(context => context.appearsInCta && normalizeCssProperty(context.property) === 'backgroundcolor');
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


// ---- src/collect-typography.js ----

function collectTypography(root = document.body, options = {}) {
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


// ---- src/collect-spacing.js ----

const SPACING_PROPERTIES = [
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'rowGap', 'columnGap'
];

function collectSpacing(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const spacing = new Map();
  const spacingContexts = new Map();
  const radius = new Map();
  const shadows = new Map();
  const borders = new Map();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of SPACING_PROPERTIES) {
      const px = toPxNumber(style[property]);
      if (px && px > 0 && px <= 160) {
        const value = `${px}px`;
        incrementMap(spacing, value);
        if (!spacingContexts.has(value)) spacingContexts.set(value, []);
        spacingContexts.get(value).push({
          property,
          region: classifyElementRegion(element),
          selector: readableSelector(element),
          usesCssVariable: usesCssVariable(element, property),
          alignedToFour: px % 4 === 0,
          alignedToEight: px % 8 === 0
        });
      }
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
    totalUniqueRadiusValues: radius.size,
    spacingDiagnostics: buildSpacingDiagnostics(spacing, spacingContexts)
  };
}

function sortPxItems(items) {
  return [...items].sort((a, b) => Number.parseFloat(a.value) - Number.parseFloat(b.value));
}

function buildSpacingDiagnostics(spacing, spacingContexts) {
  const entries = Array.from(spacing.entries());
  const totalUsage = entries.reduce((sum, [, count]) => sum + count, 0);
  const topFiveUsage = entries.sort((a, b) => b[1] - a[1]).slice(0, 5).reduce((sum, [, count]) => sum + count, 0);
  const values = Array.from(spacing.keys()).map(value => Number.parseFloat(value)).filter(Number.isFinite);
  const oneOffs = entries.filter(([, count]) => count === 1).length;
  const alignedToFour = values.filter(value => value % 4 === 0).length;
  const alignedToEight = values.filter(value => value % 8 === 0).length;
  const allContexts = Array.from(spacingContexts.values()).flat();
  const mainHeroReusableUsage = allContexts.filter(context => ['hero', 'main', 'section'].includes(context.region)).length;
  const systemOrFooterUsage = allContexts.filter(context => ['hidden_or_system', 'footer', 'nav'].includes(context.region)).length;
  const cssVariableUsage = allContexts.filter(context => context.usesCssVariable).length;

  return {
    uniqueValues: spacing.size,
    oneOffs,
    topFiveCoverage: totalUsage ? Math.round((topFiveUsage / totalUsage) * 100) / 100 : 0,
    alignedToFourRatio: values.length ? Math.round((alignedToFour / values.length) * 100) / 100 : 0,
    alignedToEightRatio: values.length ? Math.round((alignedToEight / values.length) * 100) / 100 : 0,
    mainHeroReusableUsage,
    systemOrFooterUsage,
    cssVariableUsage,
    totalUsage
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName?.toLowerCase?.() || 'element'}${id}${classes}`;
}

function usesCssVariable(element, property) {
  const inline = element.getAttribute?.('style') || '';
  const cssName = property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
  return inline.includes(cssName) && inline.includes('var(');
}


// ---- src/collect-components.js ----

function collectComponents(root = document.body) {
  const allButtons = componentElements(root, 'button, [role="button"], input[type="button"], input[type="submit"], a[class*="button"], a[class*="btn"]');
  const allLinks = componentElements(root, 'a[href]');
  const allInputs = componentElements(root, 'input, textarea, select');
  const allCards = componentElements(root, '[class*="card"], article, [data-card]');
  const allAlerts = componentElements(root, '[role="alert"], [aria-live], .alert, [class*="toast"], [class*="notification"]');
  const allNavigation = componentElements(root, 'nav, [role="navigation"]');
  const allForms = componentElements(root, 'form');
  const allImages = componentElements(root, 'img');
  const allBadges = componentElements(root, '[class*="badge"], [class*="tag"], [class*="pill"], [data-badge]');
  const allDialogs = componentElements(root, 'dialog[open], [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="dialog"]');
  const buttons = userFacingElements(allButtons);
  const links = userFacingElements(allLinks);
  const inputs = userFacingElements(allInputs);
  const cards = userFacingElements(allCards);
  const alerts = userFacingElements(allAlerts);
  const navigation = userFacingElements(allNavigation);
  const forms = userFacingElements(allForms);
  const images = userFacingElements(allImages);
  const badges = userFacingElements(allBadges);
  const dialogs = userFacingElements(allDialogs);
  const ctaGroups = findCtaGroups(buttons, links);

  const buttonSamples = buttons.slice(0, 8).map(element => ({
    text: getAccessibleName(element),
    selector: describeElement(element),
    disabled: element.matches(':disabled, [aria-disabled="true"]'),
    ...buildComponentContext(element)
  }));

  const unlabeledInputs = inputs.filter(input => !getAccessibleName(input));
  const disabledControls = [...buttons, ...inputs].filter(element => element.matches(':disabled, [aria-disabled="true"]'));
  const genericLinks = links.filter(link => isProbablyGenericLinkText(link.textContent));
  const imagesWithoutAlt = images.filter(image => !image.hasAttribute('alt'));

  return {
    counts: {
      buttons: buttons.length,
      links: links.length,
      inputs: inputs.length,
      forms: forms.length,
      cards: cards.length,
      alerts: alerts.length,
      navigation: navigation.length,
      images: images.length,
      badges: badges.length,
      dialogs: dialogs.length,
      ctaGroups: ctaGroups.length
    },
    systemHiddenComponents: {
      buttons: allButtons.length - buttons.length,
      links: allLinks.length - links.length,
      inputs: allInputs.length - inputs.length,
      forms: allForms.length - forms.length,
      cards: allCards.length - cards.length,
      alerts: allAlerts.length - alerts.length,
      navigation: allNavigation.length - navigation.length,
      images: allImages.length - images.length,
      badges: allBadges.length - badges.length,
      dialogs: allDialogs.length - dialogs.length
    },
    samples: {
      buttons: buttonSamples,
      unlabeledInputs: unlabeledInputs.slice(0, 8).map(describeElement),
      disabledControls: disabledControls.slice(0, 8).map(describeElement),
      genericLinks: genericLinks.slice(0, 8).map(link => compactText(link.textContent, 60)),
      imagesWithoutAlt: imagesWithoutAlt.slice(0, 8).map(image => compactText(image.currentSrc || image.src, 90)),
      badges: badges.slice(0, 8).map(describeElement),
      dialogs: dialogs.slice(0, 4).map(describeElement),
      ctaGroups: ctaGroups.slice(0, 6).map(group => ({
        selector: describeElement(group.element),
        actions: group.actions.map(action => compactText(action, 60))
      }))
    },
    raw: {
      buttons,
      links,
      inputs,
      allButtons,
      allLinks,
      allInputs
    }
  };
}

function componentElements(root, selector) {
  return Array.from(root.querySelectorAll(selector))
    .filter(isVisibleElement)
    .map(element => ({ element, context: buildComponentContext(element) }));
}

function userFacingElements(items) {
  return items.filter(item => item.context.isUserFacing).map(item => item.element);
}

function buildComponentContext(element) {
  const region = classifyElementRegion(element);
  const isVisible = isVisibleElement(element);
  const isSystemOrHidden = region === 'hidden_or_system';
  return {
    region,
    isVisible,
    isUserFacing: isVisible && !isSystemOrHidden,
    isInteractive: isInteractive(element),
    isSystemOrHidden
  };
}

function isInteractive(element) {
  const tag = element.tagName?.toLowerCase?.() || '';
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  return ['button', 'a', 'input', 'select', 'textarea'].includes(tag) || role === 'button' || Boolean(element.getAttribute?.('tabindex'));
}

function findCtaGroups(buttons, links) {
  const actionsByParent = new Map();

  for (const element of [...buttons, ...links]) {
    const parent = element.parentElement;
    if (!parent) continue;

    const label = getAccessibleName(element);
    if (!label) continue;

    const actions = actionsByParent.get(parent) || [];
    actions.push(label);
    actionsByParent.set(parent, actions);
  }

  return Array.from(actionsByParent.entries())
    .filter(([, actions]) => actions.length >= 2)
    .map(([element, actions]) => ({ element, actions }));
}

function describeElement(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const klass = Array.from(element.classList || []).slice(0, 2).map(item => `.${item}`).join('');
  const label = getAccessibleName(element);
  return `${tag}${id}${klass}${label ? ` — ${label}` : ''}`;
}


// ---- src/page-archetype-classifier.js ----
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

function pageArchetypeClassifier(input = {}, root = input.root) {
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

function shouldRunFullBehavioralAnalysis(pageClassification = {}) {
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


// ---- src/dom-regions.js ----

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
  hidden_or_system: 'hidden, skip, modal, cookie or system content excluded by default',
  unknown: 'unknown region excluded until manually reviewed'
};

function detectDomRegions(root = document.body) {
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

function classifyElementRegion(element) {
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

function isBehavioralRegion(region) {
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


// ---- src/findings-prioritization.js ----

const FINDING_TYPES = new Set([
  'conversion_risk',
  'content_gap',
  'interaction_risk',
  'accessibility_risk',
  'design_system_debt',
  'semantic_inference_risk',
  'instrumentation_gap',
  'manual_review'
]);

const CRITICAL_BLOCKER_RULES = new Set([
  'where.no-primary-cta-in-hero'
]);

function buildFindings(snapshot = {}) {
  const frictions = snapshot.frictions || [];
  const behavioralMapping = snapshot.behavioralMapping || [];
  const findings = [
    ...frictions.map(frictionToFinding),
    ...weakBlocksToReviewFindings(behavioralMapping)
  ];

  return findings.sort(compareFindings);
}

function groupFindings(findings = []) {
  return {
    ux: findings.filter(finding => ['conversion_risk', 'content_gap', 'interaction_risk', 'semantic_inference_risk', 'instrumentation_gap'].includes(finding.type)),
    designSystem: findings.filter(finding => finding.type === 'design_system_debt'),
    accessibility: findings.filter(finding => finding.type === 'accessibility_risk'),
    manualReview: findings.filter(finding => finding.type === 'manual_review')
  };
}

function frictionToFinding(friction = {}) {
  const type = inferFindingType(friction);
  const severity = normalizeSeverity(friction.severityScore ?? friction.severity);
  const confidence = normalizeConfidence(friction.confidence);
  const impact = normalizeImpact(friction.expectedImpact);
  const effort = normalizeEffort(friction.implementationEffort);

  return createFinding({
    id: friction.id || friction.ruleId || slugify(friction.title),
    type,
    title: friction.title || 'Hallazgo UX',
    evidence: normalizeEvidence(friction),
    affectedArea: type === 'design_system_debt' ? (friction.affectedArea || designSystemAffectedArea(friction)) : (friction.block || friction.affectedArea || 'screen'),
    severity,
    confidence,
    impact,
    effort,
    priority: assignPriority({ friction, type, severity, confidence, impact }),
    rationale: buildRationale({ friction, type, severity, confidence, impact }),
    recommendation: friction.recommendation || '',
    metric: friction.metric || '',
    proposedChange: friction.proposedChange || friction.recommendation || ''
  });
}

function weakBlocksToReviewFindings(behavioralMapping = []) {
  return behavioralMapping
    .filter(block => block.present === 'no' || block.quality <= 2)
    .map(block => createFinding({
      id: `review.weak-block.${block.block}`,
      type: 'manual_review',
      title: `Bloque a revisar: ${block.displayLabel || behavioralBlockDisplayLabel(block.block)} (${block.block})`,
      evidence: [
        ...(block.evidence || []).slice(0, 2),
        ...(block.missing || []).slice(0, 2)
      ].filter(Boolean),
      affectedArea: block.block || 'behavioral_block',
      severity: block.quality <= 1 ? 2 : 1,
      confidence: 'low',
      impact: 'medium',
      effort: 'medium',
      priority: 'Review',
      rationale: block.missing?.[0] || 'Bloque behavioral débil sin fricción heurística fuerte; se mantiene como revisión manual, no como bloqueo crítico.'
    }));
}

function createFinding(input = {}) {
  return {
    id: input.id || '',
    type: FINDING_TYPES.has(input.type) ? input.type : 'manual_review',
    title: input.title || 'Finding',
    evidence: Array.isArray(input.evidence) ? input.evidence : [input.evidence].filter(Boolean),
    affectedArea: input.affectedArea || 'screen',
    severity: normalizeSeverity(input.severity),
    confidence: normalizeConfidence(input.confidence),
    impact: normalizeImpact(input.impact),
    effort: normalizeEffort(input.effort),
    priority: input.priority || 'Review',
    rationale: input.rationale || 'Prioridad asignada por evidencia, severidad, confianza e impacto.',
    recommendation: input.recommendation || '',
    metric: input.metric || '',
    proposedChange: input.proposedChange || ''
  };
}

function assignPriority({ friction, type, severity, confidence, impact }) {
  if (type === 'design_system_debt') return severity >= 4 ? 'DS-P1' : 'DS-P2';
  if (confidence === 'low') return 'Review';

  if (isCriticalBlocker(friction, type, severity, confidence)) return 'P0';
  if (type === 'accessibility_risk' && severity >= 5 && confidence !== 'low') return 'P0';

  if (['conversion_risk', 'interaction_risk', 'accessibility_risk'].includes(type) && severity >= 4 && ['medium', 'high'].includes(confidence)) return 'P1';
  if (type === 'content_gap' && severity >= 4 && confidence === 'high') return 'P1';
  if (impact === 'high' && severity >= 3) return 'P2';
  if (severity >= 3) return 'P2';
  return 'P3';
}

function isCriticalBlocker(friction, type, severity, confidence) {
  const id = friction.ruleId || friction.id || '';
  const text = `${friction.title || ''} ${friction.evidence || ''} ${friction.insight || ''}`.toLowerCase();
  if (CRITICAL_BLOCKER_RULES.has(id) && severity >= 5 && confidence !== 'low') return true;
  if (type !== 'conversion_risk' && type !== 'interaction_risk') return false;
  if (severity < 5 || confidence === 'low') return false;
  return /cta.*(ausente|roto)|formulario.*(inutilizable|bloqueado)|error funcional|layout roto|navegaci[oó]n bloqueante|contraste cr[ií]tico|no hay cta/i.test(text);
}

function buildRationale({ friction, type, severity, confidence, impact }) {
  const evidence = normalizeEvidence(friction)[0] || 'evidencia heurística limitada';
  if (type === 'design_system_debt') {
    return `Deuda de sistema de diseño: prioridad DS basada en severidad ${severity}, confianza ${confidence} y evidencia técnica: ${evidence}`;
  }
  if (confidence === 'low') {
    return `Señal ambigua o de baja confianza; requiere revisión manual antes de priorizar. Evidencia: ${evidence}`;
  }
  return `Prioridad basada en severidad ${severity}, confianza ${confidence}, impacto ${impact} y evidencia: ${evidence}`;
}

function inferFindingType(friction) {
  const id = friction.ruleId || friction.id || '';
  const title = String(friction.title || '').toLowerCase();
  const type = friction.type || friction.frictionType || '';

  if (/spacing|radius|color|palette|radio|espaciado|paleta|token/.test(id + title)) return 'design_system_debt';
  if (/alt|unlabeled|label|disabled|focus|contrast|contraste|accesibilidad/.test(id + title)) return 'accessibility_risk';
  if (/where\.|cta|form|input|navigation|navegaci[oó]n|acción|accionabilidad/.test(id + title)) return 'interaction_risk';
  if (/what\.|why\.|ambiguedad|ambigüedad|copy|contenido|propuesta/.test(id + title + type)) return 'content_gap';
  if (/inference|semantic|heuristic/.test(String(friction.evidenceType || ''))) return 'semantic_inference_risk';
  return 'conversion_risk';
}

function designSystemAffectedArea(friction = {}) {
  const text = `${friction.ruleId || friction.id || ''} ${friction.title || ''}`.toLowerCase();
  if (/spacing|espaciado/.test(text)) return 'spacing scale / layout tokens';
  if (/radius|radio/.test(text)) return 'radius / component tokens';
  if (/color|paleta/.test(text)) return 'color tokens';
  return 'design system tokens';
}

function normalizeEvidence(friction) {
  const evidence = [];
  if (Array.isArray(friction.evidence)) evidence.push(...friction.evidence);
  else if (friction.evidence) evidence.push(friction.evidence);
  if (friction.observed?.samples?.length) evidence.push(`Muestras: ${friction.observed.samples.join(', ')}`);
  if (friction.hypothesis) evidence.push(friction.hypothesis);
  return evidence.filter(Boolean);
}

function normalizeSeverity(value = 3) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.min(5, value));
  const normalized = String(value || '').toLowerCase();
  return { baja: 2, media: 3, alta: 4, critica: 5, crítica: 5 }[normalized] || 3;
}

function normalizeConfidence(value = 'medium') {
  const normalized = String(value || '').toLowerCase();
  return { baja: 'low', low: 'low', media: 'medium', medium: 'medium', alta: 'high', high: 'high' }[normalized] || 'medium';
}

function normalizeImpact(value = 'medium') {
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function normalizeEffort(value = 'medium') {
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function compareFindings(a, b) {
  const priorityOrder = { P0: 0, P1: 1, 'DS-P1': 2, P2: 3, 'DS-P2': 4, P3: 5, Review: 6 };
  return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) || b.severity - a.severity;
}

function slugify(value = 'finding') {
  return String(value || 'finding').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


// ---- src/hypotheses.js ----
function generateHypotheses(findings = [], pageClassification = {}, context = {}) {
  const behavioralHypotheses = hypothesesFromBehavioralMapping(context.behavioralMapping || [], pageClassification);
  const rankedFindings = findings
    .filter(finding => shouldCreateHypothesis(finding, pageClassification))
    .sort(compareFindingsForHypotheses)
    .slice(0, Math.max(0, 5 - behavioralHypotheses.length))
    .map((finding, index) => findingToHypothesis(finding, pageClassification, behavioralHypotheses.length + index + 1));

  return [...behavioralHypotheses, ...rankedFindings].map((hypothesis, index) => ({
    ...hypothesis,
    id: `H${index + 1}`
  }));
}

function generateReviewTasks(findings = [], pageClassification = {}, context = {}) {
  const tasks = [];
  const actionableHypothesisAreas = new Set(hypothesesFromBehavioralMapping(context.behavioralMapping || [], pageClassification).map(hypothesis => hypothesis.affectedArea).filter(Boolean));

  for (const finding of findings) {
    if (!finding) continue;
    if (shouldCreateHypothesis(finding, pageClassification)) continue;
    tasks.push(findingToReviewTask(finding));
  }

  for (const block of context.behavioralMapping || []) {
    if (!['who', 'how', 'where', 'when'].includes(block.block)) continue;
    if (actionableHypothesisAreas.has(block.block)) continue;
    if (!isWeakBlock(block) && !isLightReviewSignal(block)) continue;
    tasks.push(blockToReviewTask(block));
  }

  return dedupeTasks(tasks).sort(compareReviewTasks).slice(0, 6).map((task, index) => ({ id: `R${index + 1}`, ...task }));
}

function shouldCreateHypothesis(finding, pageClassification = {}) {
  if (!finding) return false;
  if (finding.type === 'manual_review' && finding.confidence === 'low') return hasActionableExperimentInputs(finding);
  if (finding.confidence === 'low' && finding.priority === 'Review') return hasActionableExperimentInputs(finding);
  if (finding.type === 'design_system_debt') return pageClassification.analysisMode === 'design_system_audit' && hasConcreteEvidence(finding) && hasPrimaryMetric(finding);
  return hasConcreteEvidence(finding) && hasPrimaryMetric(finding) && (['medium', 'high'].includes(finding.confidence) || finding.impact === 'high');
}

function findingToHypothesis(finding, pageClassification, number) {
  const isManual = finding.priority === 'Review' || finding.confidence === 'low';
  const isDesignSystem = finding.type === 'design_system_debt';
  const metrics = metricsForFinding(finding, pageClassification);

  return {
    id: `H${number}`,
    title: hypothesisTitle(finding, isDesignSystem),
    because: becauseText(finding),
    weBelieve: beliefText(finding, isDesignSystem),
    ifWe: interventionText(finding, isDesignSystem, isManual),
    then: outcomeText(finding, isDesignSystem),
    metrics,
    segments: segmentsFor(pageClassification),
    confidence: finding.confidence || 'low',
    effort: finding.effort || 'medium',
    experimentType: experimentTypeFor(finding, isDesignSystem, isManual)
  };
}

function hypothesesFromBehavioralMapping(behavioralMapping = [], pageClassification = {}) {
  const where = behavioralMapping.find(block => block.block === 'where');
  const primary = where?.diagnostics?.ctaAssessment?.primary;
  const label = primary?.cleanLabel || primary?.label;
  if (!label) return [];
  if (!/acceso\s+a\s+mi\s+seguro/i.test(label)) return [];

  return [{
    id: 'H1',
    affectedArea: 'where',
    title: 'Validate hero CTA intent',
    because: `El CTA principal visible es "${label}".`,
    weBelieve: 'Si el objetivo de la landing es captación, el CTA puede parecer orientado a clientes existentes.',
    ifWe: 'Probamos CTA primario de contratación/simulación y movemos "Acceso a mi seguro" a secundario.',
    then: 'Debería mejorar el CTR del CTA primario y la progresión al flujo objetivo.',
    metrics: {
      primary: 'primary CTA CTR',
      secondary: ['qualified conversion rate', 'secondary CTA clicks', 'bounce'],
      guardrail: ['accessibility regressions']
    },
    segments: segmentsFor(pageClassification),
    confidence: where.confidence === 'high' ? 'high' : 'medium',
    effort: 'medium',
    experimentType: 'A/B test'
  }];
}

function hypothesisTitle(finding, isDesignSystem) {
  if (isDesignSystem) return `Hipótesis de sistema: ${finding.title}`;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) return `Clarificar el CTA principal: ${finding.title}`;
  return `Probar: ${finding.title}`;
}

function hasActionableExperimentInputs(finding) {
  return hasConcreteEvidence(finding) && hasProposedChange(finding) && hasPrimaryMetric(finding) && (['medium', 'high'].includes(finding.confidence) || finding.impact === 'high');
}

function hasConcreteEvidence(finding) {
  const evidence = finding.evidence || [];
  return evidence.some(item => /["“”]|#[\w-]+|\.|cta|bot[oó]n|label|form|input|color|px|\d/.test(String(item || '').toLowerCase()));
}

function hasProposedChange(finding) {
  const text = `${finding.proposedChange || ''} ${finding.recommendation || ''} ${finding.rationale || ''} ${finding.title || ''}`.toLowerCase();
  return /\b(probar|cambiar|mover|sustituir|añadir|eliminar|reordenar|definir|consolidar|fix|replace|test|cta primario|cta principal|primary cta)\b/.test(text);
}

function hasPrimaryMetric(finding) {
  if (finding.primaryMetric) return true;
  if (finding.metric) return true;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title || '')) return true;
  if (finding.type === 'design_system_debt') return true;
  if (finding.type === 'accessibility_risk') return true;
  return false;
}

function findingToReviewTask(finding) {
  return {
    question: reviewQuestionForFinding(finding),
    evidence: finding.evidence?.length ? finding.evidence : [finding.rationale || 'Señal de baja confianza sin evidencia suficiente para experimento.'],
    whyItMatters: reviewWhyForFinding(finding),
    howToValidate: reviewValidationForFinding(finding),
    owner: reviewOwnerForFinding(finding)
  };
}

function blockToReviewTask(block) {
  const primary = block.diagnostics?.ctaAssessment?.primary;
  const cleanLabel = primary?.cleanLabel || primary?.label;
  if (block.block === 'where' && cleanLabel) return ctaReviewTask(block, cleanLabel, primary);

  return {
    question: reviewQuestionForBlock(block),
    evidence: [...(block.evidence || []), ...(block.missing || [])].filter(Boolean),
    whyItMatters: reviewWhyForBlock(block),
    howToValidate: reviewValidationForBlock(block),
    owner: reviewOwnerForBlock(block)
  };
}

function ctaReviewTask(block, cleanLabel, primary = {}) {
  const region = primary.region || 'main';
  return {
    question: `¿El CTA principal ‘${cleanLabel}’ coincide con el objetivo real de la página?`,
    evidence: [`CTA principal visible en ${region}: “${cleanLabel}”.`],
    whyItMatters: 'Si el objetivo es contratación, captación o autogestión, el CTA debe prometer exactamente esa progresión.',
    howToValidate: 'Revisar destino del CTA, eventos de clic, objetivo de campaña y conversión posterior.',
    owner: 'product/design'
  };
}

function isWeakBlock(block = {}) {
  return block.present === 'no' || Number(block.quality || 0) <= 2;
}

function isLightReviewSignal(block = {}) {
  if (isWeakBlock(block)) return false;
  if (Number(block.quality || 0) >= 4 && block.confidence === 'high' && !(block.missing || []).length && !block.detectedFriction) return false;
  const hasConcreteNote = Boolean((block.missing || []).filter(Boolean).length || block.detectedFriction || block.diagnostics?.ctaAssessment?.primary);
  return hasConcreteNote && (Number(block.quality || 0) === 3 || block.confidence === 'medium');
}

function reviewQuestionForFinding(finding) {
  if (finding.type === 'design_system_debt') return `¿La señal de sistema "${finding.title}" requiere consolidar tokens/componentes o solo documentar excepciones?`;
  if (finding.affectedArea === 'where') return '¿La acción principal es visible, jerárquica y coherente con el objetivo real de la página?';
  if (finding.affectedArea === 'who') return '¿El usuario objetivo está suficientemente identificado sin inventar un segmento?';
  if (finding.affectedArea === 'how') return '¿La página explica qué ocurre después del CTA con suficiente precisión?';
  return `¿La señal "${finding.title}" requiere una intervención concreta o solo seguimiento manual?`;
}

function reviewWhyForFinding(finding) {
  if (finding.type === 'design_system_debt') return 'Separar deuda de sistema de diseño de fricción UX evita convertir señales técnicas en recomendaciones de conversión.';
  if (finding.affectedArea === 'where') return 'Un CTA ambiguo puede dividir intención o medir clics que no representan progresión real.';
  if (finding.affectedArea === 'who') return 'Una audiencia mal inferida puede llevar a copy demasiado específico o incorrecto.';
  if (finding.affectedArea === 'how') return 'Sin expectativa post-CTA, el usuario puede percibir más esfuerzo o riesgo.';
  return 'La señal no tiene todavía suficiente evidencia para convertirse en experimento.';
}

function reviewValidationForFinding(finding) {
  if (finding.type === 'design_system_debt') return 'Revisar valores únicos, one-offs, cobertura de top tokens, escala 4/8, uso en main/hero/componentes y variables CSS existentes.';
  if (finding.affectedArea === 'where') return 'Comprobar label, destino, jerarquía visual, eventos de clic y relación con el objetivo de negocio.';
  if (finding.affectedArea === 'who') return 'Contrastar con briefing, tráfico esperado y lenguaje real del usuario antes de ajustar copy.';
  if (finding.affectedArea === 'how') return 'Revisar flujo tras clic, alta, contratación, gestión, activación y mensajes de confirmación.';
  return 'Recoger evidencia DOM/copy/analytics adicional y definir cambio + métrica antes de proponer hipótesis.';
}

function reviewOwnerForFinding(finding) {
  if (finding.type === 'design_system_debt') return 'design-system';
  if (finding.type === 'accessibility_risk') return 'dev';
  if (finding.affectedArea === 'who' || finding.type === 'content_gap') return 'content';
  if (finding.affectedArea === 'where') return 'design';
  return 'product';
}

function reviewQuestionForBlock(block) {
  if (block.block === 'who') return '¿El target funcional detectado equivale a un público objetivo suficiente para esta landing?';
  if (block.block === 'how') return '¿La estructura de pasos explica también qué ocurre después del CTA?';
  if (block.block === 'where') return '¿Hay un CTA primario claro en hero/main y su label coincide con el objetivo de la página?';
  if (block.block === 'when') return '¿Existe un motivo temporal real para actuar ahora o solo límites de valor/cobertura?';
  return `¿El bloque ${block.displayLabel || block.block} necesita una intervención concreta?`;
}

function reviewWhyForBlock(block) {
  if (block.block === 'where') return 'Sin label/destino claro no hay base suficiente para diseñar una variante de CTA.';
  if (block.block === 'how') return 'Una estructura de pasos puede ser útil, pero no garantiza claridad sobre contratación, alta o activación.';
  if (block.block === 'who') return 'El target funcional ayuda a relevancia, pero puede no sustituir una persona o segmento comercial.';
  if (block.block === 'when') return 'La urgencia artificial puede sesgar decisiones y dañar confianza.';
  return 'Las señales parciales deben validarse antes de convertirse en hipótesis.';
}

function reviewValidationForBlock(block) {
  if (block.block === 'where') return 'Registrar CTA candidates con label, destino, región, jerarquía y eventos antes de proponer test.';
  if (block.block === 'how') return 'Validar con producto/contenido el flujo posterior al CTA: alta, contratación, gestión, activación y confirmación.';
  if (block.block === 'who') return 'Comprobar si el caso de uso detectado aparece en briefing, campañas o segmentación de tráfico.';
  if (block.block === 'when') return 'Separar límites de cobertura/precio de urgencia real basada en fechas o promoción verificable.';
  return 'Definir evidencia concreta, cambio propuesto y métrica primaria.';
}

function reviewOwnerForBlock(block) {
  if (block.block === 'who' || block.block === 'how') return 'content';
  if (block.block === 'where') return 'design';
  if (block.block === 'when') return 'product';
  return 'product';
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter(task => {
    const key = task.question;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareReviewTasks(a = {}, b = {}) {
  return reviewTaskPriority(a) - reviewTaskPriority(b);
}

function reviewTaskPriority(task = {}) {
  const text = `${task.question || ''} ${(task.evidence || []).join(' ')}`.toLowerCase();
  if (/cta principal|asegura tu m[oó]vil|objetivo real de la p[aá]gina/.test(text)) return 0;
  if (/cta|d[oó]nde actuar|jerarqu/.test(text)) return 1;
  if (/target|audiencia|para qui[eé]n/.test(text)) return 2;
  if (/proceso|despu[eé]s|c[oó]mo/.test(text)) return 3;
  return 4;
}

function becauseText(finding) {
  return finding.evidence?.length
    ? finding.evidence.slice(0, 2).join('; ')
    : finding.rationale || 'Contextic detected a review signal without strong evidence.';
}

function beliefText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'Una decisión más clara de tokens/componentes mejorará la consistencia de implementación y reducirá deriva futura de UI.';
  }
  if (finding.affectedArea === 'where') {
    return 'Los usuarios pueden dudar o dividir su atención cuando la acción principal no coincide claramente con el objetivo de la página.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Corregir el riesgo de accesibilidad mejorará la finalización de tarea sin reducir comprensión ni conversión.';
  }
  return 'La intervención propuesta debe cambiar una señal observable ligada a la métrica primaria definida.';
}

function interventionText(finding, isDesignSystem, isManual) {
  if (isDesignSystem) {
    return 'Definimos o consolidamos la regla de token/componente afectada, la documentamos y verificamos los componentes implicados contra esa regla.';
  }
  if (isManual && finding.affectedArea === 'where') {
    return 'Revisamos la claridad del CTA principal, validamos si responde al objetivo de la página y lo comparamos con acciones secundarias.';
  }
  if (finding.affectedArea === 'where') {
    return 'Alineamos copy, jerarquía y ubicación del CTA principal con el objetivo de la página, manteniendo las acciones secundarias como secundarias.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Corregimos el problema de accesibilidad y ejecutamos checks de teclado, lector de pantalla y regresión en el componente afectado.';
  }
  return 'Creamos una variante o revisión enfocada que atienda solo este hallazgo y preserve el baseline visual actual.';
}

function outcomeText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'Deberían bajar el esfuerzo de implementación y la inconsistencia UI sin cambiar claims de producto o contenido.';
  }
  if (finding.affectedArea === 'where') {
    return 'Debería mejorar la interacción con el CTA principal sin empeorar clics secundarios ni rebote.';
  }
  return 'La tarea afectada debería volverse más clara o segura sin dañar métricas de guardrail.';
}

function metricsForFinding(finding, pageClassification) {
  if (finding.type === 'design_system_debt') {
    return {
      primary: 'component/token reuse rate',
      secondary: ['number of one-off styles', 'implementation time for affected component'],
      guardrail: ['no visual regressions in affected states', 'no accessibility regressions']
    };
  }

  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) {
    return {
      primary: 'primary CTA CTR',
      secondary: ['secondary action clicks', 'conversion rate', 'bounce rate'],
      guardrail: ['no increase in form abandonment', 'no accessibility regressions']
    };
  }

  if (finding.type === 'accessibility_risk') {
    return {
      primary: 'task completion rate for affected interaction',
      secondary: ['keyboard completion rate', 'form completion rate', 'error recovery rate'],
      guardrail: ['no contrast regressions', 'no focus order regressions']
    };
  }

  return {
    primary: primaryMetricForPage(pageClassification),
    secondary: ['primary CTA CTR', 'scroll depth to affected block', 'bounce rate'],
    guardrail: ['no accessibility regressions', 'no increase in support/error events']
  };
}

function primaryMetricForPage(pageClassification) {
  if (['landing', 'service_landing'].includes(pageClassification.archetype)) return 'qualified conversion rate';
  if (pageClassification.archetype === 'article_or_blog') return 'engaged reading completion';
  if (pageClassification.archetype === 'ecommerce_category') return 'product detail click-through rate';
  return 'primary task completion rate';
}

function experimentTypeFor(finding, isDesignSystem, isManual) {
  if (isDesignSystem) return 'QA audit';
  if (isManual) return finding.confidence === 'low' ? 'design review' : 'analytics review';
  if (finding.type === 'accessibility_risk') return 'QA audit';
  if (finding.confidence === 'high' && ['conversion_risk', 'interaction_risk', 'content_gap'].includes(finding.type)) return 'A/B test';
  if (finding.confidence === 'medium') return 'usability test';
  return 'analytics review';
}

function segmentsFor(pageClassification) {
  const archetype = pageClassification.archetype || 'unknown';
  if (['landing', 'service_landing'].includes(archetype)) return ['new visitors', 'returning visitors', 'mobile users'];
  if (archetype === 'ecommerce_category') return ['category browsers', 'mobile users'];
  return ['all users', 'mobile users'];
}

function compareFindingsForHypotheses(a, b) {
  const priorityOrder = { P0: 0, P1: 1, 'DS-P1': 2, P2: 3, 'DS-P2': 4, P3: 5, Review: 6 };
  return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) || b.severity - a.severity;
}


// ---- src/behavioral-model.js ----

const BEHAVIORAL_BLOCK_LABELS = {
  what: 'Qué',
  why: 'Por qué',
  why_not: 'Por qué no',
  who: 'Para quién',
  how: 'Cómo',
  where: 'Dónde actuar',
  when: 'Cuándo / Urgencia'
};

function behavioralBlockDisplayLabel(block) {
  return BEHAVIORAL_BLOCK_LABELS[block] || block || 'Bloque';
}

const BEHAVIORAL_BLOCKS = [
  {
    key: 'what',
    label: 'What',
    title: 'Qué se ofrece',
    userQuestion: '¿Qué es esto y qué gano?',
    frictionType: 'ambiguedad',
    frictionLabel: 'Ambigüedad',
    outcome: 'Comprensión inmediata',
    objective: 'Aclarar la propuesta de valor, el resultado prometido y la acción principal.',
    recommendedPatterns: ['Hero', 'CTA primario', 'Bullets de beneficio inmediato', 'Visual demostrativo'],
    metrics: ['Comprensión en primer viewport', 'CTR del CTA principal', 'Tiempo hasta primer clic']
  },
  {
    key: 'why',
    label: 'Why',
    title: 'Por qué importa',
    userQuestion: '¿Por qué debería importarme?',
    frictionType: 'baja_motivacion',
    frictionLabel: 'Baja motivación',
    outcome: 'Valor percibido y deseo',
    objective: 'Traducir features en beneficios y reforzar el valor con evidencia real.',
    recommendedPatterns: ['Benefits list', 'Cards de beneficio', 'Antes/después', 'Prueba social contextual'],
    metrics: ['Scroll depth hasta beneficios', 'Interacción con prueba social', 'CTR posterior a beneficios']
  },
  {
    key: 'why_not',
    label: 'Why not',
    title: 'Objeciones y riesgo',
    userQuestion: '¿Qué podría salir mal?',
    frictionType: 'riesgo_percibido',
    frictionLabel: 'Riesgo percibido',
    outcome: 'Confianza',
    objective: 'Responder dudas sobre coste, privacidad, dificultad, soporte, cancelación o condiciones.',
    recommendedPatterns: ['FAQ de objeciones', 'Trust bar', 'Microcopy de riesgo junto al CTA', 'Lo que pasa después de hacer clic'],
    metrics: ['Interacción con FAQ', 'Drop-off antes de formulario', 'Conversión tras ver objeciones']
  },
  {
    key: 'who',
    label: 'Who',
    title: 'Para quién es',
    userQuestion: '¿Esto es para alguien como yo?',
    frictionType: 'falta_identificacion',
    frictionLabel: 'Falta de identificación',
    outcome: 'Relevancia personal',
    objective: 'Hacer explícito el segmento, los casos de uso y el lenguaje del usuario correcto.',
    recommendedPatterns: ['Diseñado para...', 'Casos de uso por perfil', 'Testimonios segmentados', 'Selector de perfil'],
    metrics: ['CTR por segmento', 'Interacción con casos de uso', 'Conversión por fuente de tráfico']
  },
  {
    key: 'how',
    label: 'How',
    title: 'Cómo funciona',
    userQuestion: '¿Cómo funciona o cómo empiezo?',
    frictionType: 'esfuerzo_percibido',
    frictionLabel: 'Esfuerzo percibido',
    outcome: 'Facilidad percibida',
    objective: 'Reducir carga cognitiva mostrando pasos, expectativas y siguiente estado.',
    recommendedPatterns: ['Stepper de 3 pasos', 'Timeline simple', 'Preview del flujo', 'Microcopy de duración'],
    metrics: ['Inicio de formulario', 'Finalización de formulario', 'Abandono por paso']
  },
  {
    key: 'where',
    label: 'Where',
    title: 'Dónde actuar',
    userQuestion: '¿Dónde actúo?',
    frictionType: 'baja_accionabilidad',
    frictionLabel: 'Baja accionabilidad',
    outcome: 'Conversión accesible',
    objective: 'Asegurar que la acción sea visible, contextual, accesible y jerárquicamente clara.',
    recommendedPatterns: ['CTA contextual', 'CTA sticky mobile', 'Grupo de acciones jerarquizado', 'Formulario progresivo'],
    metrics: ['CTR de CTA por bloque', 'Clicks en CTA secundarios', 'Tiempo hasta CTA click']
  },
  {
    key: 'when',
    label: 'When',
    title: 'Por qué ahora',
    userQuestion: '¿Por qué actuar ahora?',
    frictionType: 'procrastinacion',
    frictionLabel: 'Procrastinación',
    outcome: 'Acción inmediata legítima',
    objective: 'Dar un motivo verificable para actuar ahora sin caer en escasez falsa ni presión manipulativa.',
    recommendedPatterns: ['Beneficio inmediato', 'Coste de oportunidad', 'Disponibilidad real', 'Cierre con resumen de valor'],
    metrics: ['CTR del cierre', 'Conversión final', 'Retorno posterior sin convertir']
  }
];

const KEYWORD_SETS = {
  what: ['qué es', 'descubre', 'crea', 'convierte', 'gestiona', 'ahorra', 'mejora', 'optimiza', 'automatiza', 'solución'],
  why: ['beneficio', 'resultados', 'ahorra', 'reduce', 'aumenta', 'mejora', 'rápido', 'fácil', 'sin esfuerzo', 'más ventas', 'productividad'],
  why_not: ['garantía', 'seguro', 'seguridad', 'privacidad', 'cancelar', 'cancelación', 'sin permanencia', 'sin tarjeta', 'soporte', 'devolución', 'faq', 'preguntas frecuentes'],
  who: ['para equipos', 'para empresas', 'para diseñadores', 'para desarrolladores', 'para autónomos', 'para familias', 'para estudiantes', 'profesionales', 'agencias', 'pymes', 'startups', 'ecommerce', 'b2b'],
  how: ['cómo funciona', 'paso', 'empieza', 'proceso', 'en minutos', 'configura', 'instala', 'onboarding'],
  when: ['hoy', 'ahora', 'limitado', 'últimas', 'plazas', 'solo hoy', 'promoción', 'descuento']
};

function buildBehavioralMapping({ components, frictions }, root = document.body) {
  const text = getVisiblePageText(root);
  const lowerText = text.toLowerCase();
  const signals = collectBehavioralSignals(root, components, lowerText);

  return BEHAVIORAL_BLOCKS.map(block => {
    const blockFrictions = frictions.filter(friction => friction.block === block.key || friction.affectedBlocks?.includes(block.key));
    const evidence = buildBlockEvidence(block.key, signals, lowerText, components);
    const missing = getMissingSignals(block.key, signals, components);
    const present = getPresence(evidence.length, blockFrictions.length, block.key, components, missing);
    const quality = scoreBlockQuality(block.key, evidence.length, blockFrictions, components, missing);

    return {
      block: block.key,
      label: block.label,
      displayLabel: behavioralBlockDisplayLabel(block.key),
      title: block.title,
      userQuestion: block.userQuestion,
      present,
      quality,
      confidence: blockConfidenceFromEvidence(block.key, evidence, present, signals),
      evidence,
      missing,
      frictionType: block.frictionLabel,
      detectedFriction: blockFrictions[0]?.title || (missing[0] ? missing[0] : ''),
      severity: blockFrictions[0]?.severityScore || inferSeverityFromQuality(quality),
      recommendation: buildBlockRecommendation(block, present, missing),
      metrics: block.metrics,
      diagnostics: blockDiagnostics(block.key, signals)
    };
  });
}

function buildBehavioralStructureRecommendation({ behavioralMapping, frictions }) {
  const priorityByBlock = new Map();
  for (const friction of frictions) {
    if (!friction.block) continue;
    const current = priorityByBlock.get(friction.block);
    if (!current || friction.priorityScore > current.priorityScore) priorityByBlock.set(friction.block, friction);
  }

  const sections = BEHAVIORAL_BLOCKS.map(block => {
    const mapping = behavioralMapping.find(item => item.block === block.key);
    const topFriction = priorityByBlock.get(block.key);
    const priority = topFriction?.priority || inferPriorityFromMapping(mapping);

    return {
      block: block.key,
      displayLabel: behavioralBlockDisplayLabel(block.key),
      sectionName: `${behavioralBlockDisplayLabel(block.key)} (${block.key}) — ${block.title}`,
      objective: block.objective,
      userQuestionAnswered: block.userQuestion,
      primaryFrictionResolved: topFriction?.typeLabel || block.frictionLabel,
      behavioralPrinciples: inferPrinciples(block.key),
      recommendedComponents: block.recommendedPatterns,
      contentRequirements: getContentRequirements(block.key),
      copyRules: getCopyRules(block.key),
      implementationRules: getImplementationRules(block.key),
      accessibilityRules: getAccessibilityRules(block.key),
      metrics: block.metrics,
      risks: getBlockRisks(block.key),
      priority
    };
  });

  return {
    summary: 'Estructura propuesta para convertir observaciones de UI en una secuencia de decisión: comprensión, motivación, confianza, identificación, facilidad, acción y momento.',
    recommendedOrder: BEHAVIORAL_BLOCKS.map(block => block.key),
    sections
  };
}

function createPriorityMetadata({ severityScore = 3, expectedImpact = 'medium', implementationEffort = 'medium' } = {}) {
  const impactWeights = { low: 1, medium: 2, high: 3 };
  const effortWeights = { low: 1, medium: 2, high: 3 };
  const priorityScore = Math.round((severityScore * (impactWeights[expectedImpact] || 2) / (effortWeights[implementationEffort] || 2)) * 100) / 100;
  const priority = priorityScore >= 9 ? 'P0' : priorityScore >= 5 ? 'P1' : 'P2';

  return { priorityScore, priority };
}

function collectBehavioralSignals(root, components, lowerText) {
  const headings = Array.from(root.querySelectorAll('h1, h2, h3')).filter(isVisibleElement).map(element => compactText(element.textContent, 120));
  const firstViewportHeadings = Array.from(root.querySelectorAll('h1, h2')).filter(isVisibleElement).filter(element => element.getBoundingClientRect().top >= 0 && element.getBoundingClientRect().top < (window.innerHeight || 900)).map(element => compactText(element.textContent, 120));
  const ctaCandidates = extractCtaCandidates(root, components);
  const ctas = ctaCandidates.map(candidate => candidate.cleanLabel || candidate.label).filter(Boolean);
  const faqLike = headings.some(heading => /faq|preguntas frecuentes|dudas/i.test(heading));
  const hasStepper = Array.from(root.querySelectorAll('ol, [class*="step"], [class*="paso"], [data-step]')).filter(isVisibleElement).length > 0;
  const hasForm = components.counts.forms > 0 || components.counts.inputs > 0;
  const hasNavigation = components.counts.navigation > 0;
  const hasCards = components.counts.cards >= 3;
  const audience = inferAudienceSignal(lowerText);
  const process = inferProcessSignal(lowerText, hasStepper);
  const ctaAssessment = assessCtaClarity(ctaCandidates, lowerText);
  const timing = inferTimingSignal(lowerText);

  return {
    headings,
    firstViewportHeadings,
    ctas,
    faqLike,
    hasStepper,
    hasForm,
    hasNavigation,
    hasCards,
    audience,
    process,
    ctaCandidates,
    ctaAssessment,
    timing,
    keywordHits: Object.fromEntries(Object.entries(KEYWORD_SETS).map(([key, keywords]) => [key, keywords.filter(keyword => lowerText.includes(keyword))]))
  };
}

function buildBlockEvidence(block, signals, lowerText, components) {
  const evidence = [];
  const hits = signals.keywordHits[block] || [];
  if (hits.length) evidence.push(`Texto visible contiene señales: ${hits.slice(0, 4).join(', ')}`);

  if (block === 'what') {
    if (signals.firstViewportHeadings.length) evidence.push(`Heading en primer viewport: “${signals.firstViewportHeadings[0]}”`);
    if (signals.ctas.length) evidence.push(`CTA detectado: “${signals.ctas[0]}”`);
  }

  if (block === 'why') {
    if (signals.hasCards) evidence.push('Se detectan varias tarjetas que podrían funcionar como beneficios o features.');
    if (/testimonio|cliente|rating|reseña|caso de éxito|logos/i.test(lowerText)) evidence.push('Hay señales de prueba social o validación externa.');
  }

  if (block === 'why_not') {
    if (signals.faqLike) evidence.push('Se detecta sección tipo FAQ o preguntas frecuentes.');
    if (/privacidad|seguridad|garantía|sin tarjeta|cancel/i.test(lowerText)) evidence.push('Hay microcopy de confianza, seguridad o reducción de riesgo.');
  }

  if (block === 'who') {
    if (signals.audience.type === 'explicit_persona') evidence.push(`Audiencia explícita detectada: “${signals.audience.match}”.`);
    if (signals.audience.type === 'use_case_audience') evidence.push(`Target funcional detectado en caso de uso: “${signals.audience.match}”.`);
    if (signals.audience.type === 'implicit_audience') evidence.push(`Audiencia implícita por contexto de producto: “${signals.audience.match}”.`);
  }

  if (block === 'how') {
    if (signals.process.hasSteps) evidence.push('Se detecta estructura de pasos o proceso.');
    if (signals.process.hasPostCtaExpectation) evidence.push(`Se anticipa qué ocurre después del CTA: “${signals.process.postCtaMatch}”.`);
    if (/cómo funciona|paso|empieza|configura/i.test(lowerText)) evidence.push('El contenido anticipa funcionamiento o inicio.');
  }

  if (block === 'where') {
    if (signals.ctaAssessment.primary) {
      evidence.push(`CTA principal visible en ${signals.ctaAssessment.primary.region}: “${signals.ctaAssessment.primary.cleanLabel || signals.ctaAssessment.primary.label}” (${signals.ctaAssessment.primary.selector}).`);
    }
    if (signals.ctaAssessment.aligned) evidence.push(`El label del CTA parece alineado con el objetivo de página: “${signals.ctaAssessment.primary.cleanLabel || signals.ctaAssessment.primary.label}”.`);
    if (!signals.ctaAssessment.primary && components.counts.buttons > 0) evidence.push(`Solo hay conteo de acciones (${components.counts.buttons} botón(es)); falta evaluar un CTA primario claro.`);
    if (signals.hasForm) evidence.push('Se detecta formulario o campos de entrada.');
  }

  if (block === 'when') {
    if (signals.timing.urgency.length) evidence.push(`Urgencia o incentivo temporal detectado: ${signals.timing.urgency.slice(0, 3).join(', ')}.`);
    if (signals.timing.valueCeilings.length) evidence.push(`“Hasta” aparece como límite de valor/cobertura, no como urgencia: ${signals.timing.valueCeilings.slice(0, 2).join(', ')}.`);
  }

  return evidence;
}

function getPresence(evidenceCount, frictionCount, block, components, missing = []) {
  if (block === 'where' && components.counts.buttons === 0 && components.counts.links === 0) return 'no';
  if (block === 'how' && missing.length && evidenceCount >= 1) return 'parcial';
  if (evidenceCount >= 2 && frictionCount === 0) return 'sí';
  if (evidenceCount >= 1) return 'parcial';
  return 'no';
}

function scoreBlockQuality(block, evidenceCount, blockFrictions, components, missing = []) {
  let score = evidenceCount >= 2 ? 4 : evidenceCount === 1 ? 3 : 1;
  if (block === 'where' && components.counts.buttons === 0 && components.counts.links === 0) score = 1;
  if (block === 'how' && missing.length && score > 3) score = 3;
  if (blockFrictions.some(friction => friction.priority === 'P0')) score -= 2;
  else if (blockFrictions.length) score -= 1;
  return Math.max(1, Math.min(5, score));
}

function getMissingSignals(block, signals, components) {
  const missingByBlock = {
    what: [],
    why: [],
    why_not: [],
    who: [],
    how: [],
    where: [],
    when: []
  };

  if (!signals.firstViewportHeadings.length) missingByBlock.what.push('Falta una propuesta de valor clara en el primer viewport.');
  if (!signals.ctas.length) missingByBlock.what.push('Falta un CTA visible conectado con el valor.');
  if (!signals.hasCards && !(signals.keywordHits.why || []).length) missingByBlock.why.push('Faltan beneficios traducidos a resultado para el usuario.');
  if (!signals.faqLike && !(signals.keywordHits.why_not || []).length) missingByBlock.why_not.push('No se observan respuestas explícitas a riesgo, condiciones o dudas críticas.');
  if (signals.audience.type === 'missing') missingByBlock.who.push('No se detecta persona explícita ni target funcional en hero/main.');
  if (signals.audience.type === 'use_case_audience') missingByBlock.who.push('Validar si el target funcional necesita traducirse a segmento comercial o perfil de usuario.');
  if (signals.process.hasSteps && !signals.process.hasPostCtaExpectation) missingByBlock.how.push('Validar qué ocurre tras el CTA: alta, contratación, gestión, activación, tiempos y siguiente estado.');
  else if (!signals.process.hasSteps && !(signals.keywordHits.how || []).length) missingByBlock.how.push('No se anticipa claramente cómo funciona o qué ocurre después.');
  if (!signals.ctaAssessment.primary) missingByBlock.where.push(components.counts.buttons > 0 ? 'Hay acciones visibles, pero falta identificar un CTA primario claro en hero/main.' : 'No se detecta una acción clara para avanzar.');
  else if (!signals.ctaAssessment.aligned) missingByBlock.where.push(`Validar si el CTA “${signals.ctaAssessment.primary.cleanLabel || signals.ctaAssessment.primary.label}” expresa la acción esperada para el objetivo de la página.`);
  if (!signals.timing.urgency.length) missingByBlock.when.push(signals.timing.valueCeilings.length ? 'No hay urgencia temporal: las ocurrencias de “hasta” parecen límites de valor/cobertura.' : 'No se detecta un motivo legítimo para actuar ahora.');

  return missingByBlock[block];
}

function inferSeverityFromQuality(quality) {
  if (quality <= 1) return 4;
  if (quality === 2) return 3;
  if (quality === 3) return 2;
  return 1;
}

function buildBlockRecommendation(block, present, missing) {
  const label = behavioralBlockDisplayLabel(block.key);
  if (present === 'sí' && !missing.length) return `Mantener el bloque ${label} y validar su rendimiento con métricas de comportamiento.`;
  return `Refuerza ${label} con ${block.recommendedPatterns.slice(0, 2).join(' + ')} para resolver: ${missing[0] || block.frictionLabel}.`;
}

function inferPriorityFromMapping(mapping) {
  if (!mapping) return 'P2';
  if (mapping.present === 'no' && ['what', 'why_not', 'where'].includes(mapping.block)) return 'P0';
  if (mapping.present === 'no') return 'P1';
  if (mapping.quality <= 2) return 'P1';
  return 'P2';
}

function inferPrinciples(block) {
  const principles = {
    what: ['Claridad', 'Fluidez cognitiva', 'Anticipación de recompensa'],
    why: ['Valor percibido', 'Sesgo del presente', 'Prueba social si hay evidencia'],
    why_not: ['Aversión al riesgo', 'Confianza', 'Reducción de incertidumbre'],
    who: ['Identidad social', 'Relevancia personal', 'Similitud'],
    how: ['Reducción de carga cognitiva', 'Anticipación', 'Fluidez'],
    where: ['Proximidad', 'Affordance', 'Claridad de elección'],
    when: ['Coste de oportunidad', 'Sesgo del presente', 'Urgencia legítima']
  };
  return principles[block] || [];
}

function getContentRequirements(block) {
  const requirements = {
    what: ['Headline orientado a resultado', 'Subheadline con mecanismo o diferenciador', 'CTA basado en valor', 'Visual demostrativo'],
    why: ['Beneficios funcionales y emocionales', 'Evidencia real', 'Prueba social verificable si existe'],
    why_not: ['Objeciones probables', 'Condiciones claras', 'Microcopy de seguridad/cancelación/soporte si aplica'],
    who: ['Segmento explícito', 'Casos de uso', 'Lenguaje del usuario'],
    how: ['Pasos claros', 'Expectativa post-click', 'Duración o esfuerzo si está justificado'],
    where: ['CTA principal visible', 'CTAs contextuales', 'Jerarquía primaria/secundaria'],
    when: ['Beneficio inmediato', 'Coste de oportunidad', 'Escasez solo si es real']
  };
  return requirements[block] || [];
}

function getCopyRules(block) {
  const rules = {
    what: ['El CTA debe describir valor, no solo acción.', 'Evitar jerga si no ayuda a comprender la oferta.'],
    why: ['Traducir cada feature a resultado.', 'No inventar métricas, testimonios ni claims absolutos.'],
    why_not: ['Responder objeciones reales sin ocultar condiciones.', 'No usar falsa seguridad.'],
    who: ['Evitar “para todos”.', 'Usar ejemplos representativos del segmento.'],
    how: ['Usar verbos simples por paso.', 'No mezclar procesos internos con pasos del usuario.'],
    where: ['Evitar múltiples CTAs primarios compitiendo.', 'Situar la acción cerca del argumento que la justifica.'],
    when: ['No usar urgencia falsa.', 'Conectar el motivo de actuar ahora con valor real.']
  };
  return rules[block] || [];
}

function getImplementationRules(block) {
  const rules = {
    what: ['Hero con CTA primario y jerarquía semántica h1.', 'Estado focus visible en CTA.'],
    why: ['Cards reutilizables con estructura problema → resultado → evidencia.', 'Iconografía no decorativa si comunica beneficio.'],
    why_not: ['FAQ como patrón reutilizable de objeciones.', 'Microcopy de riesgo cerca del CTA o formulario.'],
    who: ['Módulo de casos de uso parametrizable por segmento.', 'Evitar hardcodear audiencias incompatibles.'],
    how: ['Stepper accesible con orden semántico.', 'Preview del siguiente estado cuando reduzca incertidumbre.'],
    where: ['Variantes claras de botón: primario, secundario, terciario.', 'Estados default, hover, focus, loading, disabled y error.'],
    when: ['Banner o cierre solo si la condición es real y trazable.', 'Evitar cuenta atrás sin fuente verificable.']
  };
  return rules[block] || [];
}

function getAccessibilityRules(block) {
  const common = ['Contraste suficiente', 'Navegación por teclado', 'Focus visible'];
  if (block === 'how') return [...common, 'Orden de lectura coherente'];
  if (block === 'where') return [...common, 'Labels descriptivos', 'Tamaño táctil suficiente'];
  if (block === 'why_not') return [...common, 'Contenido crítico no escondido en hover'];
  return common;
}

function getBlockRisks(block) {
  const risks = {
    what: ['Promesa demasiado genérica o no demostrable.'],
    why: ['Beneficios formulados como features sin impacto para el usuario.'],
    why_not: ['Ocultar condiciones o generar falsa confianza.'],
    who: ['Diluir el posicionamiento intentando hablar a todos.'],
    how: ['Explicar demasiado y aumentar carga cognitiva.'],
    where: ['Crear competencia entre acciones primarias.'],
    when: ['Caer en escasez falsa, urgencia artificial o presión manipulativa.']
  };
  return risks[block] || [];
}

function inferAudienceSignal(lowerText) {
  const explicit = lowerText.match(/\bpara\s+(aut[oó]nomos|familias|estudiantes|equipos|empresas|diseñadores|desarrolladores|agencias|profesionales|pymes|startups|clientes|particulares)\b/i);
  if (explicit) return { type: 'explicit_persona', match: compactText(explicit[0], 80) };

  const useCase = lowerText.match(/\bpara\s+(?:tus?|su?s?|vuestros?)\s+(dispositivos?|m[oó]viles?|tablets?|smartwatches?|relojes?|viajes?|hogar|negocio|familia)\b|\bpara\s+(viajar|ahorrar(?:\s+en)?|proteger|asegurar|cuidar|gestionar|contratar)\b/i);
  if (useCase) return { type: 'use_case_audience', match: compactText(useCase[0], 100) };

  const implicit = lowerText.match(/\b(m[oó]vil|tablet|smartwatch|dispositivo|seguro|viaje|fibra|tarifa|cliente)\b/i);
  if (implicit) return { type: 'implicit_audience', match: compactText(implicit[0], 80) };

  return { type: 'missing', match: '' };
}

function inferProcessSignal(lowerText, hasStepper) {
  const stepText = /\b(c[oó]mo funciona|paso\s+\d+|\d+\s*pasos?|proceso|empieza|configura|instala|onboarding)\b/i.test(lowerText);
  const postCta = lowerText.match(/\b(despu[eé]s|al hacer clic|te llamamos|recibir[aá]s|alta|contrataci[oó]n|contratar|gesti[oó]n|gestionar|activaci[oó]n|activar|siguiente paso|en minutos)\b/i);
  return {
    hasSteps: Boolean(hasStepper || stepText),
    hasPostCtaExpectation: Boolean(postCta),
    postCtaMatch: postCta ? compactText(postCta[0], 80) : ''
  };
}

function extractCtaCandidates(root, components) {
  const elements = [
    ...(components.raw?.buttons || []),
    ...(components.raw?.links || [])
  ];
  const seen = new Set();

  return elements
    .filter(element => element && isVisibleElement(element))
    .filter(element => {
      if (seen.has(element)) return false;
      seen.add(element);
      return true;
    })
    .map(element => {
      const rect = element.getBoundingClientRect?.() || {};
      const rawText = getAccessibleName(element);
      const labelParts = cleanCtaLabel(rawText, element);
      const region = root?.__contexticRegionFor?.(element) || inferRegionFromElement(element);
      return {
        label: labelParts.cleanLabel,
        cleanLabel: labelParts.cleanLabel,
        cleanLabelConfidence: labelParts.cleanLabelConfidence,
        rawText: labelParts.rawText,
        iconText: labelParts.iconText,
        visualMetadata: labelParts.visualMetadata,
        selector: describeElement(element),
        href: element.getAttribute?.('href') || element.getAttribute?.('action') || '',
        action: element.getAttribute?.('type') || element.getAttribute?.('data-action') || '',
        region,
        aboveTheFold: Number(rect.top) >= 0 && Number(rect.top) < (window.innerHeight || 900),
        visualHierarchy: inferVisualHierarchy(element, rect),
        componentType: inferCtaComponentType(element)
      };
    })
    .filter(candidate => candidate.cleanLabel || candidate.rawText)
    .slice(0, 16);
}

function assessCtaClarity(candidates, lowerText) {
  const primary = candidates.find(candidate => candidate.aboveTheFold && ['hero', 'main'].includes(candidate.region) && candidate.visualHierarchy === 'primary')
    || candidates.find(candidate => ['hero', 'main'].includes(candidate.region) && candidate.visualHierarchy === 'primary')
    || candidates.find(candidate => candidate.aboveTheFold && ['hero', 'main'].includes(candidate.region));
  const aligned = primary ? isCtaLabelAligned(primary.cleanLabel || primary.label, lowerText) : false;
  return { primary, aligned, candidates };
}

function cleanCtaLabel(rawText, element) {
  const raw = compactText(rawText, 160);
  const visualMetadata = [];
  const iconText = [];
  let clean = raw;

  clean = clean.replace(/color\s*#[0-9A-Fa-f]{6}(?=[A-ZÁÉÍÓÚÑ]|[^0-9A-Fa-f]|$)|color\s*#[0-9A-Fa-f]{3}(?=[A-ZÁÉÍÓÚÑ]|[^0-9A-Fa-f]|$)/g, match => {
    visualMetadata.push(compactText(match, 60));
    return ' ';
  });
  clean = clean.replace(/#[0-9A-Fa-f]{6}(?=[A-ZÁÉÍÓÚÑ]|[^0-9A-Fa-f]|$)|#[0-9A-Fa-f]{3}(?=[A-ZÁÉÍÓÚÑ]|[^0-9A-Fa-f]|$)/g, match => {
    visualMetadata.push(match);
    return ' ';
  });
  clean = clean.replace(/\b(flecha\s+(?:derecha|izquierda|arriba|abajo)|arrow\s+(?:right|left|up|down)|chevron\s+(?:right|left|up|down))\b/gi, match => {
    iconText.push(compactText(match, 60));
    return ' ';
  });
  clean = clean.replace(/\b(?:icon|ícono|svg|path|rect|circle)\b/gi, match => {
    visualMetadata.push(compactText(match, 40));
    return ' ';
  });
  clean = compactText(clean.replace(/\s+/g, ' '), 100);

  if (!clean && element?.getAttribute?.('title')) clean = compactText(element.getAttribute('title'), 100);
  const cleanLabelConfidence = clean && clean.length >= 3 ? 'high' : raw ? 'low' : 'none';

  return {
    cleanLabel: clean || raw,
    cleanLabelConfidence,
    rawText: raw,
    iconText,
    visualMetadata
  };
}

function isCtaLabelAligned(label, lowerText) {
  const text = String(label || '').toLowerCase();
  if (!text) return false;
  if (/\b(acceso a mi seguro|contratar|solicitar|empezar|crear|calcular|comprar|activar|gestionar|contactar|pedir|alta|asegurar)\b/i.test(text)) return true;
  if (/\bseguro|asegurar|protecci[oó]n|care|dispositivo|m[oó]vil|tablet|smartwatch\b/i.test(lowerText) && /\bseguro|asegurar|acceso|contratar|solicitar|activar|gestionar\b/i.test(text)) return true;
  return false;
}

function inferTimingSignal(lowerText) {
  const urgency = [];
  const valueCeilings = [];
  const urgencyPatterns = [
    /\b(?:solo hoy|últimos días|ultimos dias|oferta limitada|tiempo limitado|plazas limitadas)\b/gi,
    /\bpromoci[oó]n\b/gi,
    /\bdescuento\s+hasta\s+(?:el\s+)?\d{1,2}(?:\/|-|\s+de\s+)[a-z0-9]+\b/gi,
    /\bhasta\s+(?:el\s+)?\d{1,2}(?:\/|-|\s+de\s+)(?:\d{1,2}|[a-záéíóú]+)\b/gi
  ];
  const valuePatterns = [
    /\bhasta\s+\d+(?:[.,]\d+)?\s*(?:€|eur|euros|gb|g\b|mb|%|por ciento)\b/gi,
    /\bhasta\s+(?:\d+\s+)?(?:m[oó]viles?|tablets?|smartwatches?|dispositivos?|cobertura|reparaciones?|siniestros?)\b/gi
  ];

  for (const pattern of urgencyPatterns) urgency.push(...matchesFor(lowerText, pattern));
  for (const pattern of valuePatterns) valueCeilings.push(...matchesFor(lowerText, pattern));

  if (/\bahora\b/i.test(lowerText) && /\b(contrata|compra|solicita|empieza|activa)\b/i.test(lowerText)) urgency.push('ahora con acción explícita');

  return {
    urgency: Array.from(new Set(urgency)).slice(0, 6),
    valueCeilings: Array.from(new Set(valueCeilings)).slice(0, 6)
  };
}

function matchesFor(text, pattern) {
  return Array.from(text.matchAll(pattern)).map(match => compactText(match[0], 80));
}

function blockConfidenceFromEvidence(block, evidence, present, signals) {
  if (block === 'where' && !signals.ctaAssessment.primary && evidence.some(item => item.includes('Solo hay conteo'))) return 'low';
  if (block === 'who' && ['use_case_audience', 'implicit_audience'].includes(signals.audience.type)) return 'medium';
  if (block === 'when' && !signals.timing.urgency.length) return 'low';
  if (present === 'sí' && evidence.length >= 2) return 'high';
  if (present === 'parcial' || evidence.length) return 'medium';
  return 'low';
}

function blockDiagnostics(block, signals) {
  if (block === 'who') return { audienceType: signals.audience.type };
  if (block === 'how') return { process: signals.process };
  if (block === 'where') return { ctaCandidates: signals.ctaCandidates, ctaAssessment: signals.ctaAssessment };
  if (block === 'when') return { timing: signals.timing };
  return {};
}

function describeElement(element) {
  const tag = element.tagName?.toLowerCase?.() || 'element';
  const id = element.id ? `#${element.id}` : '';
  const klass = Array.from(element.classList || []).slice(0, 2).map(item => `.${item}`).join('');
  return `${tag}${id}${klass}`;
}

function inferRegionFromElement(element) {
  const text = `${element.id || ''} ${Array.from(element.classList || []).join(' ')}`.toLowerCase();
  if (/\b(hero|masthead|jumbotron)\b/.test(text)) return 'hero';
  if (/\b(main|content|page-content)\b/.test(text)) return 'main';
  if (/\b(header|nav|menu)\b/.test(text)) return 'nav';
  return 'unknown';
}

function inferVisualHierarchy(element, rect = {}) {
  const text = `${element.id || ''} ${Array.from(element.classList || []).join(' ')} ${element.getAttribute?.('role') || ''}`.toLowerCase();
  if (/\b(primary|principal|cta|button--primary|btn-primary)\b/.test(text)) return 'primary';
  const area = Number(rect.width || 0) * Number(rect.height || 0);
  if (area >= 4200) return 'primary';
  if (/\b(secondary|tertiary|link)\b/.test(text)) return 'secondary';
  return 'unknown';
}

function inferCtaComponentType(element) {
  const tag = element.tagName?.toLowerCase?.() || '';
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  if (tag === 'button' || role === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input') return 'input';
  return tag || 'unknown';
}

function getVisiblePageText(root) {
  if (root?.__contexticBehavioralScope) return root.__contexticText || '';

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return compactText(node.textContent, 100).length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const chunks = [];
  while (walker.nextNode() && chunks.length < 300) chunks.push(walker.currentNode.textContent);
  return compactText(chunks.join(' '), 12000);
}


// ---- src/detect-frictions.js ----

function detectFrictions({ colors, spacing, components }, root = document.body) {
  const frictions = evaluateBehavioralRules({ colors, spacing, components, root });

  if (shouldCreateSpacingDebtFinding(spacing)) {
    frictions.push(createFinding({
      ruleId: 'design-system.spacing-scale-drift',
      block: '',
      affectedBlocks: [],
      affectedArea: 'spacing scale / layout tokens',
      type: 'design_system_debt',
      typeLabel: 'Deuda de sistema de diseño',
      severity: 'media',
      severityScore: spacingDebtSeverity(spacing),
      expectedImpact: 'medium',
      implementationEffort: 'medium',
      confidence: 'media',
      evidenceType: 'structural',
      evidence: spacingDebtEvidence(spacing),
      principle: 'fluidez visual',
      title: 'La escala de espaciado podría estar derivando',
      insight: `Se detectan señales de posible deriva en la escala de espaciado.`,
      risk: 'Demasiados valores de espaciado crean ruido visual y dificultan el mantenimiento.',
      recommendation: 'Consolida alrededor de una escala pequeña de espaciado, por ejemplo 4/8/12/16/24/32/48.',
      systemImplication: 'Mapea valores repetidos a tokens y documenta las excepciones permitidas.'
    }));
  }

  if (spacing.totalUniqueRadiusValues > 5) {
    frictions.push(createFinding({
      ruleId: 'design-system.radius-scale-drift',
      block: '',
      affectedBlocks: [],
      affectedArea: 'radius / component tokens',
      type: 'design_system_debt',
      typeLabel: 'Deuda de sistema de diseño',
      severity: 'media',
      severityScore: 3,
      expectedImpact: 'medium',
      implementationEffort: 'medium',
      confidence: 'media',
      evidenceType: 'structural',
      evidence: `${spacing.totalUniqueRadiusValues} valores únicos de radio.`,
      principle: 'consistencia de patrones',
      title: 'Inconsistencia en radios de borde',
      insight: `Se detectan ${spacing.totalUniqueRadiusValues} valores únicos de radio.`,
      risk: 'La deriva de radios debilita la consistencia de componentes y aumenta la deuda de tokens.',
      recommendation: 'Mapea radios a tokens semánticos como radius-sm, radius-md y radius-lg.',
      systemImplication: 'Crea tokens de radio gobernados y alinea botones, inputs, tarjetas y overlays.'
    }));
  }

  if (components.samples.imagesWithoutAlt.length > 0) {
    frictions.push(createFinding({
      block: 'what',
      affectedBlocks: ['what', 'why'],
      type: 'ambiguedad',
      typeLabel: 'Ambigüedad',
      severity: 'media',
      severityScore: 3,
      expectedImpact: 'medium',
      implementationEffort: 'low',
      confidence: 'alta',
      evidenceType: 'structural',
      evidence: `${components.samples.imagesWithoutAlt.length} imagen(es) visibles sin atributo alt.`,
      principle: 'accesibilidad y comprensión',
      title: 'Imágenes sin atributo alt',
      insight: `${components.samples.imagesWithoutAlt.length} muestra(s) de imagen visible no definen texto alt.`,
      risk: 'La ausencia de alt debilita la accesibilidad y puede ocultar información relevante de producto.',
      recommendation: 'Añade texto alt significativo para imágenes informativas y alt vacío para imágenes decorativas.',
      systemImplication: 'Documenta reglas de contenido para imágenes y requisitos de CMS/componentes para gestionar alt.'
    }));
  }

  if (colors.totalUniqueColors > 28) {
    frictions.push(createFinding({
      ruleId: 'design-system.color-palette-drift',
      block: '',
      affectedBlocks: [],
      affectedArea: 'color tokens',
      type: 'design_system_debt',
      typeLabel: 'Deuda de sistema de diseño',
      severity: 'media',
      severityScore: 3,
      expectedImpact: 'medium',
      implementationEffort: 'medium',
      confidence: 'media',
      evidenceType: 'structural',
      evidence: `${colors.totalUniqueColors} valores únicos de color.`,
      principle: 'jerarquía visual',
      title: 'La paleta de color podría estar demasiado fragmentada',
      insight: `Se detectan ${colors.totalUniqueColors} valores únicos de color.`,
      risk: 'La deriva de color dificulta gobernar jerarquía, estados y theming.',
      recommendation: 'Agrupa colores casi idénticos y mapea valores recurrentes a tokens semánticos de diseño.',
      systemImplication: 'Usa tokens semánticos de color para texto, superficies, bordes, acciones, éxito, aviso y error.'
    }));
  }

  return frictions.sort((a, b) => b.priorityScore - a.priorityScore || b.severityScore - a.severityScore);
}

function createFinding(finding) {
  const severityScore = finding.severityScore || severityToScore(finding.severity);
  const expectedImpact = finding.expectedImpact || 'medium';
  const implementationEffort = finding.implementationEffort || 'medium';
  const priority = createPriorityMetadata({ severityScore, expectedImpact, implementationEffort });
  const hypothesis = finding.hypothesis || toHypothesis(finding);

  return {
    block: 'what',
    affectedBlocks: [],
    type: 'ambiguedad',
    typeLabel: 'Ambigüedad',
    confidence: 'media',
    severityScore,
    expectedImpact,
    implementationEffort,
    evidenceType: 'inference',
    evidence: '',
    hypothesis,
    insight: hypothesis,
    observed: null,
    recommendedPattern: '',
    metric: '',
    falsePositiveNotes: '',
    systemImplication: '',
    ...priority,
    ...finding,
    hypothesis,
    severityScore
  };
}

function severityToScore(severity = 'media') {
  return { baja: 2, media: 3, alta: 4, critica: 5 }[severity] || 3;
}

function toHypothesis(finding = {}) {
  const signal = finding.insight || finding.evidence || '';
  if (finding.type === 'design_system_debt') {
    return signal || 'Deuda de sistema de diseño que requiere revisión de tokens y componentes.';
  }
  if (!signal) return 'Podría existir una fricción conductual que requiere validación de producto/diseño.';
  return `Podría existir una fricción conductual asociada a esta señal: ${signal}`;
}

function shouldCreateSpacingDebtFinding(spacing = {}) {
  const diagnostics = spacing.spacingDiagnostics || {};
  const unique = diagnostics.uniqueValues ?? spacing.totalUniqueSpacingValues ?? 0;
  if (unique <= 18) return false;

  const oneOffs = diagnostics.oneOffs || 0;
  const topFiveCoverage = diagnostics.topFiveCoverage || 0;
  const alignedToFourRatio = diagnostics.alignedToFourRatio || 0;
  const mainHeroReusableUsage = diagnostics.mainHeroReusableUsage || 0;
  const systemOrFooterUsage = diagnostics.systemOrFooterUsage || 0;
  const mostlyScaled = alignedToFourRatio >= 0.85;
  const mostlyConcentrated = topFiveCoverage >= 0.72;
  const mostlySystem = systemOrFooterUsage > mainHeroReusableUsage;

  if (mostlyScaled && (mostlyConcentrated || mostlySystem)) return false;
  return unique > 24 || oneOffs >= 8 || (unique > 18 && alignedToFourRatio < 0.7 && mainHeroReusableUsage > 12);
}

function spacingDebtSeverity(spacing = {}) {
  const diagnostics = spacing.spacingDiagnostics || {};
  if ((diagnostics.uniqueValues || spacing.totalUniqueSpacingValues || 0) > 32 && (diagnostics.alignedToFourRatio || 0) < 0.65) return 4;
  return 3;
}

function spacingDebtEvidence(spacing = {}) {
  const diagnostics = spacing.spacingDiagnostics || {};
  return [
    `${diagnostics.uniqueValues ?? spacing.totalUniqueSpacingValues ?? 0} valores únicos de espaciado`,
    `${diagnostics.oneOffs ?? 0} valores one-off`,
    `${Math.round((diagnostics.topFiveCoverage || 0) * 100)}% cubierto por top 5`,
    `${Math.round((diagnostics.alignedToFourRatio || 0) * 100)}% alineado a escala 4px`,
    `${diagnostics.mainHeroReusableUsage || 0} usos en main/hero/secciones`
  ].join('; ') + '.';
}


// ---- src/contextic-report.js ----

const TOOL_NAME = 'Contextic';
const LANGUAGE = 'es';

function buildContexticReport(snapshot = {}) {
  const colors = snapshot.colors || {};
  const typography = snapshot.typography || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const scopeMap = snapshot.scopeMap || {
    regions: {},
    usedForBehavioral: [],
    excludedFromBehavioral: []
  };
  const pageClassification = snapshot.pageClassification || {
    archetype: 'unknown',
    confidence: 'low',
    signals: ['No hay clasificación de arquetipo disponible en el snapshot.'],
    analysisMode: 'snapshot_only'
  };
  const behavioralMapping = snapshot.behavioralMapping || [];
  const frictions = snapshot.frictions || [];
  const behavioralRecommendation = snapshot.behavioralRecommendation || {};
  const findings = snapshot.findings || buildFindings(snapshot);
  const hypotheses = snapshot.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = snapshot.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping });

  return {
    meta: {
      toolName: TOOL_NAME,
      version: snapshot.meta?.version || '',
      generatedAt: snapshot.meta?.generatedAt || '',
      sourceUrl: snapshot.meta?.url || snapshot.meta?.sourceUrl || '',
      language: LANGUAGE
    },
    screenSummary: {
      pageTitle: snapshot.meta?.title || '',
      detectedScreenType: inferScreenType(components, behavioralMapping),
      probableBusinessGoal: inferProbableBusinessGoal(components, behavioralMapping),
      primaryConversionAction: getPrimaryActionLabel(components),
      mainConversionRisk: getMainConversionRisk(frictions, behavioralMapping)
    },
    pageClassification,
    scopeMap,
    detectedTokens: {
      colors: colors.colors || [],
      systemHiddenVisualNoise: colors.systemHiddenVisualNoise || [],
      cssVariables: colors.cssVariables || [],
      typography: typography.typeStyles || [],
      typographySystemHiddenVisualNoise: typography.systemHiddenVisualNoise || [],
      spacing: spacing.spacingScale || [],
      radius: spacing.radii || [],
      shadows: spacing.shadows || [],
      borders: spacing.borders || []
    },
    detectedComponents: buildDetectedComponents(components),
    findings,
    hypotheses,
    reviewTasks,
    behavioralMapping: normalizeBehavioralMapping(behavioralMapping),
    uxFrictions: frictions.map(normalizeFrictionForReport),
    implementationRules: buildImplementationRules(behavioralRecommendation),
    metrics: buildMetrics(behavioralMapping, frictions, behavioralRecommendation),
    risks: buildRisks(frictions, behavioralRecommendation),
    nextExperiment: null
  };
}

function buildJsonExport(snapshot = {}) {
  return JSON.stringify(buildContexticReport(snapshot), null, 2);
}

function inferProbableBusinessGoal(components, behavioralMapping) {
  const counts = components.counts || {};
  const hasAction = Number(counts.buttons) > 0 || Number(counts.links) > 0 || Number(counts.forms) > 0;
  const hasBehavioralAction = behavioralMapping.some(block => block.block === 'where' && block.present !== 'no');
  if (!hasAction && !hasBehavioralAction) return 'unknown';

  return {
    value: 'conversión o navegación hacia una acción principal',
    evidenceType: 'inference',
    evidence: ['Inferido desde componentes interactivos visibles y estructura behavioral.']
  };
}

function inferScreenType(components, behavioralMapping) {
  const counts = components.counts || {};
  if (counts.forms > 0 && behavioralMapping.some(block => block.block === 'where' && block.present !== 'no')) {
    return {
      value: 'Landing con formulario o captación',
      evidenceType: 'inference',
      evidence: ['Se detectan formularios y señales de acción en Dónde actuar (where).']
    };
  }
  if (counts.buttons > 0) {
    return {
      value: 'Landing / pantalla transaccional',
      evidenceType: 'inference',
      evidence: [`${counts.buttons} botón(es) o acciones detectadas.`]
    };
  }
  return 'unknown';
}

function getPrimaryActionLabel(components) {
  const first = (components.samples?.buttons || []).find(button => button.text);
  return first ? first.text : 'unknown';
}

function getMainConversionRisk(frictions, behavioralMapping) {
  if (frictions[0]) {
    return {
      value: frictions[0].title,
      evidenceType: frictions[0].evidenceType || 'inference',
      evidence: [frictions[0].evidence || frictions[0].hypothesis || 'Finding priorizado por Contextic.']
    };
  }

  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  if (!weak) return 'unknown';

  return {
    value: `Bloque ${weak.displayLabel || behavioralBlockDisplayLabel(weak.block)} (${weak.block}) débil o ausente`,
    evidenceType: 'inference',
    evidence: weak.missing?.length ? weak.missing : ['Inferido desde calidad/presencia del mapa behavioral.']
  };
}

function buildDetectedComponents(components) {
  const counts = components.counts || {};
  return [
    ['Button', counts.buttons],
    ['Link', counts.links],
    ['Form field', counts.inputs],
    ['Form', counts.forms],
    ['Card', counts.cards],
    ['Alert / live region', counts.alerts],
    ['Navigation', counts.navigation],
    ['Modal / dialog', counts.dialogs],
    ['Badge', counts.badges],
    ['CTA group', counts.ctaGroups],
    ['Image', counts.images]
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => ({ name, count, evidenceType: 'structural' }));
}

function normalizeBehavioralMapping(behavioralMapping) {
  return Object.fromEntries(behavioralMapping.map(block => [block.block, {
    block: block.block,
    label: block.label,
    displayLabel: block.displayLabel || behavioralBlockDisplayLabel(block.block),
    present: block.present,
    quality: block.quality,
    confidence: block.confidence || 'unknown',
    evidence: block.evidence || [],
    missing: block.missing || [],
    frictionType: block.frictionType || 'unknown',
    detectedFriction: block.detectedFriction || '',
    severity: block.severity ?? null,
    recommendation: block.recommendation || '',
    metrics: block.metrics || [],
    diagnostics: block.diagnostics || {}
  }]));
}

function normalizeFrictionForReport(friction) {
  return {
    id: friction.id || friction.ruleId || '',
    ruleId: friction.ruleId || friction.id || '',
    title: friction.title || '',
    block: friction.block || 'unknown',
    frictionType: friction.frictionType || friction.type || 'unknown',
    severity: friction.severity ?? friction.severityScore ?? null,
    confidence: friction.confidence || 'unknown',
    evidenceType: friction.evidenceType || 'inference',
    evidence: friction.evidence || '',
    observed: friction.observed || null,
    hypothesis: friction.hypothesis || '',
    recommendation: friction.recommendation || '',
    systemImplication: friction.systemImplication || '',
    expectedImpact: friction.expectedImpact || 'unknown',
    implementationEffort: friction.implementationEffort || 'unknown',
    priority: friction.priority || 'unknown',
    priorityScore: friction.priorityScore ?? null,
    metric: friction.metric || '',
    risk: friction.risk || '',
    recommendedPattern: friction.recommendedPattern || ''
  };
}

function buildImplementationRules(behavioralRecommendation) {
  return (behavioralRecommendation.sections || []).map(section => ({
    block: section.block,
    priority: section.priority || 'unknown',
    rules: section.implementationRules || [],
    accessibilityRules: section.accessibilityRules || [],
    recommendedComponents: section.recommendedComponents || []
  }));
}

function buildMetrics(behavioralMapping, frictions, behavioralRecommendation) {
  const metrics = new Set();
  for (const block of behavioralMapping) for (const metric of block.metrics || []) metrics.add(metric);
  for (const friction of frictions) if (friction.metric) metrics.add(friction.metric);
  for (const section of behavioralRecommendation.sections || []) for (const metric of section.metrics || []) metrics.add(metric);
  return Array.from(metrics);
}

function buildRisks(frictions, behavioralRecommendation) {
  const risks = [];
  for (const friction of frictions) {
    if (friction.risk) risks.push({ source: friction.id || friction.ruleId || friction.title, risk: friction.risk });
  }
  for (const section of behavioralRecommendation.sections || []) {
    for (const risk of section.risks || []) risks.push({ source: section.block || 'behavioral_structure', risk });
  }
  return risks;
}


// ---- src/export-markdown.js ----

function buildDesignContextMarkdown(snapshot) {
  const meta = snapshot.meta || {};
  const colors = snapshot.colors || {};
  const typography = snapshot.typography || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const behavioralMapping = snapshot.behavioralMapping || [];
  const report = buildContexticReport(snapshot);
  const pageClassification = report.pageClassification || {};
  const scopeMap = report.scopeMap || {};
  const findings = report.findings || [];
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = report.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping });
  const findingGroups = groupFindings(findings);
  const lowConfidenceFindings = findings.filter(finding => finding.confidence === 'low' || finding.priority === 'Review');
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';

  return `# design-context.md — Contextic

## Metadatos de captura

- URL fuente: ${report.meta.sourceUrl}
- Título de página: ${report.screenSummary.pageTitle || 'Sin título'}
- Generado en: ${report.meta.generatedAt}
- Viewport: ${meta.viewport?.width || 'unknown'}x${meta.viewport?.height || 'unknown'}
- Política de evidencia: la evidencia observada viene del DOM/CSS visible y regiones acotadas. Las inferencias se marcan con confianza y deben validarse antes de implementar.

## Clasificación de página

- Arquetipo: ${pageClassification.archetype || 'unknown'}
- Confianza: ${pageClassification.confidence || 'low'}
- Modo de análisis: ${pageClassification.analysisMode || 'snapshot_only'}
- Alcance behavioral: ${behavioralScopeNote(pageClassification)}
- Señales: ${(pageClassification.signals || []).join('; ') || 'No hay señales suficientes.'}
- Nota de inferencia: ${confidenceNote(pageClassification.confidence, 'La clasificación de página es heurística y no debe tratarse como verdad absoluta.')}

## Mapa de alcance

### Regiones detectadas
${buildScopeRegionList(scopeMap.regions)}

### Usado para behavioral
${buildBehavioralScopeList(scopeMap.usedForBehavioral)}

### Excluido de behavioral
${buildScopeExclusionList(scopeMap.excludedFromBehavioral)}

## Resumen ejecutivo

${buildExecutiveSummary({ findings, findingGroups, hypotheses, reviewTasks, behavioralMapping, pageClassification })}

## Snapshot de sistema de diseño

### Colores detectados por frecuencia
| Color | Recuento | Rol inferido | Confianza | Uso observado | Razón del rol |
|---|---:|---|---|---|---|
${buildColorRows(colors)}

### Tipografía detectada
| Familia | Tamaño | Interlínea | Peso | Recuento | Uso probable |
|---|---:|---:|---:|---:|---|
${buildTypographyRows(typography)}

### Espaciado, radios, sombras y bordes
| Grupo de tokens | Valores recurrentes | Notas |
|---|---|---|
${buildDesignSystemTokenRows(spacing)}

### Variables CSS detectadas
${buildCssVariableList(colors.cssVariables || [])}

### Ruido visual de sistema/oculto
${buildSystemHiddenVisualNoise({ colors, typography, components })}

## Inventario de componentes

| Candidato de componente | Instancias | Variantes inferidas | Estados recomendados | Riesgo accesibilidad | Recomendación DS |
|---|---:|---|---|---|---|
${buildComponentInventoryRows(components)}

### Patrones UI observados
${buildPatternList(components, behavioralMapping)}

## Evaluación behavioral

${buildBehavioralAssessment({ fullBehavioral, behavioralMapping, pageClassification })}

## Hallazgos UX

${fullBehavioral
  ? buildFindingList(findingGroups.ux.filter(finding => finding.confidence !== 'low' && finding.priority !== 'Review'))
  : '- Análisis behavioral limitado o desactivado por clasificación de página. No se generan recomendaciones de conversión con la matriz actual para este arquetipo.'}

## Hallazgos de sistema de diseño

${buildFindingList(findingGroups.designSystem)}

## Hallazgos de accesibilidad

${buildFindingList(findingGroups.accessibility)}

## Hallazgos de baja confianza

${buildFindingList(lowConfidenceFindings)}

## Tareas de revisión

${buildReviewTasks(reviewTasks)}

## Hipótesis y experimentos

${buildHypothesisCards(hypotheses)}

## Guía de implementación

${buildImplementationGuidance(snapshot).filter(item => fullBehavioral || !isConversionGuidance(item)).map(item => `- ${item}`).join('\n')}

## Métricas recomendadas

${buildRecommendedMetrics(hypotheses, pageClassification)}

## Handoff summary

### Qué funciona
${buildWhatWorks(behavioralMapping)}

### Riesgos de alta confianza
${buildHighConfidenceRisks(findings)}

### Elementos de revisión manual
${buildManualReviewSummary(reviewTasks)}

### Tarea principal de revisión
${buildTopReviewTask(reviewTasks)}

### Deuda de sistema de diseño
${buildDesignSystemDebtSummary(findingGroups.designSystem)}

${buildTopHypothesisSection(hypotheses, behavioralMapping)}
`;
}

function buildJsonExport(snapshot) {
  return JSON.stringify(buildContexticReport(snapshot), null, 2);
}

function buildGithubIssueExport(input = {}) {
  const snapshot = looksLikeReport(input) ? {} : input;
  const report = looksLikeReport(input) ? input : buildContexticReport(snapshot);
  const pageClassification = report.pageClassification || {};
  const scopeMap = report.scopeMap || {};
  const findings = report.findings || [];
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification, { behavioralMapping: Object.values(report.behavioralMapping || {}) });
  const reviewTasks = report.reviewTasks || generateReviewTasks(findings, pageClassification, { behavioralMapping: Object.values(report.behavioralMapping || {}) });
  const groups = groupFindings(findings);
  const weakBlocks = Object.values(report.behavioralMapping || {}).filter(block => block.present === 'no' || block.quality <= 2);
  const title = `[Contextic] Revisar hallazgos ${pageClassification.archetype || 'unknown'} para ${report.screenSummary?.pageTitle || 'página sin título'}`;

return `# ${title}

## Contexto
- URL: ${report.meta?.sourceUrl || 'unknown'}
- Viewport: ${formatViewport(snapshot.meta?.viewport)}
- Arquetipo de página: ${pageClassification.archetype || 'unknown'} (${pageClassification.confidence || 'low'} confianza)
- Modo de análisis: ${pageClassification.analysisMode || 'snapshot_only'}
- Generado en: ${report.meta?.generatedAt || 'unknown'}
${pageClassification.analysisMode === 'snapshot_only' ? '- Nota: el modo de análisis es snapshot_only; no se generan recomendaciones de conversión con el modelo behavioral actual.' : ''}

## Resumen
- Fricciones UX: ${groups.ux.length}
- Bloques a revisar: ${weakBlocks.length}${weakBlocks.length ? ` (${weakBlocks.map(block => blockLabel(block)).join(', ')})` : ''}
- Riesgos DS: ${groups.designSystem.length}
- Elementos de revisión manual: ${groups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length}

## Hallazgos principales
${buildGithubTopFindings(findings)}

## Hipótesis
${buildGithubHypotheses(hypotheses)}

## Tareas de revisión
${buildGithubReviewTasks(reviewTasks)}

## Notas de implementación
- Componentes afectados: ${githubComponentsAffected(report.detectedComponents || [])}
- Tokens afectados: ${githubTokensAffected(report.detectedTokens || {}, findings)}
- Checks de accesibilidad: ${githubAccessibilityChecks(report.detectedComponents || [], groups.accessibility)}
- Alcance behavioral: usado ${formatList(scopeMap.usedForBehavioral)}; excluido ${formatList((scopeMap.excludedFromBehavioral || []).map(item => item.region))}

## Criterios de aceptación
- [ ] Hallazgos revisados
- [ ] Jerarquía de CTA validada
- [ ] Roles de color validados
- [ ] Alcance behavioral revisado
- [ ] Métricas/instrumentación confirmadas

## Exports raw
- design-context.md disponible desde Contextic
- JSON disponible desde Contextic
`;
}

function buildGitHubIssueMarkdown(snapshot) {
  return buildGithubIssueExport(snapshot);
}

function buildTokensSnapshot(snapshot) {
  const { colors, typography, spacing, behavioralMapping, frictions } = snapshot;
  return {
    generadoEn: snapshot.meta.generatedAt,
    fuente: snapshot.meta.url,
    colores: colors.colors.map(color => ({
      valor: color.value,
      recuento: color.count,
      rolSugerido: color.suggestedRole
    })),
    tipografia: typography.typeStyles.map(item => ({ valor: item.value, recuento: item.count })),
    espaciado: spacing.spacingScale.map(item => ({ valor: item.value, recuento: item.count })),
    radios: spacing.radii.map(item => ({ valor: item.value, recuento: item.count })),
    sombras: spacing.shadows.map(item => ({ valor: item.value, recuento: item.count })),
    bordes: spacing.borders.map(item => ({ valor: item.value, recuento: item.count })),
    behavioral: {
      bloques: behavioralMapping.map(block => ({
        bloque: block.block,
        displayLabel: block.displayLabel || behavioralBlockDisplayLabel(block.block),
        presente: block.present,
        calidad: block.quality,
        confianza: block.confidence || 'unknown',
        evidencia: block.evidence,
        faltante: block.missing,
        friccion: block.detectedFriction,
        severidad: block.severity
      })),
      fricciones: frictions.map(friction => ({
        regla: friction.ruleId || '',
        prioridad: friction.priority,
        score: friction.priorityScore,
        bloque: friction.block,
        tipo: friction.type,
        severidad: friction.severityScore,
        confianza: friction.confidence,
        hipotesis: friction.hypothesis || '',
        evidencia: friction.evidence,
        recomendacion: friction.recommendation,
        metrica: friction.metric || ''
      }))
    }
  };
}

function buildColorRows(colors = {}) {
  const rows = (colors.colors || []).slice(0, 12).map(color => {
    const observedUse = color.sample ? `${color.sample.property} en ${color.sample.selector}` : 'desconocido';
    const confidence = color.roleConfidence || roleConfidenceFromName(color.suggestedRole);
    const reason = color.roleReason || (confidence === 'low' || confidence === 'unknown' ? 'Confianza baja: evidencia contextual insuficiente.' : 'Rol inferido desde el uso del color.');
    return `| ${color.value} | ${color.count} | ${color.suggestedRole || 'unknown'} | ${confidence} | ${escapePipes(observedUse)} | ${escapePipes(translateRoleReason(reason))} |`;
  });

  return rows.join('\n') || '| unknown | 0 | unknown | unknown | Sin evidencia de color detectada | Confianza baja: sin contexto de uso. |';
}

function buildTypographyRows(typography = {}) {
  const rows = (typography.typeStyles || []).slice(0, 10).map(style => {
    const parsed = parseTypeStyle(style.value);
    return `| ${escapePipes(parsed.fontFamily)} | ${parsed.fontSize} | ${parsed.lineHeight} | ${parsed.weight} | ${style.count} | ${inferTypographyUse(parsed)} |`;
  });

  return rows.join('\n') || '| unknown | unknown | unknown | unknown | 0 | Sin evidencia tipográfica detectada |';
}

function buildDesignSystemTokenRows(spacing = {}) {
  const spacingValues = formatTokenValues(spacing.spacingScale, 10);
  const radiusValues = formatTokenValues(spacing.radii, 8);
  const shadowValues = formatTokenValues(spacing.shadows, 4);
  const borderValues = formatTokenValues(spacing.borders, 6);

  return [
    `| Espaciado | ${spacingValues} | ${spacing.totalUniqueSpacingValues ? `${spacing.totalUniqueSpacingValues} valores únicos de espaciado detectados.` : 'unknown'} |`,
    `| Radios | ${radiusValues} | ${spacing.totalUniqueRadiusValues ? `${spacing.totalUniqueRadiusValues} valores únicos de radio detectados.` : 'unknown'} |`,
    `| Sombras | ${shadowValues} | Mantener la elevación existente antes de añadir sombras nuevas. |`,
    `| Bordes | ${borderValues} | Reutilizar anchos/estilos de borde detectados antes de añadir nuevos. |`
  ].join('\n');
}

function buildCssVariableList(cssVariables = []) {
  if (!cssVariables.length) return '- No se detectaron variables CSS en los estilos computados de root.';

  return [
    '| Variable | Valor | Uso |',
    '|---|---|---|',
    ...cssVariables.slice(0, 16).map(variable => `| ${escapePipes(variable.name)} | ${escapePipes(variable.value)} | ${escapePipes(translateUsageStatus(variable.usageStatus || 'unknown usage'))} |`)
  ].join('\n');
}

function buildSystemHiddenVisualNoise({ colors = {}, typography = {}, components = {} } = {}) {
  const lines = [];
  const noisyColors = colors.systemHiddenVisualNoise || [];
  const noisyType = typography.systemHiddenVisualNoise || [];
  const noisyComponents = Object.entries(components.systemHiddenComponents || {}).filter(([, value]) => count(value) > 0);

  if (noisyColors.length) lines.push(`- Colores usados sobre todo en contextos de sistema/ocultos: ${noisyColors.slice(0, 5).map(item => `${item.value} (${item.count})`).join(', ')}.`);
  if (noisyType.length) lines.push(`- Estilos tipográficos usados sobre todo en contextos de sistema/ocultos: ${noisyType.slice(0, 3).map(item => `${item.value} (${item.count})`).join(', ')}.`);
  if (noisyComponents.length) lines.push(`- Componentes excluidos del inventario principal: ${noisyComponents.map(([name, value]) => `${name} ${value}`).join(', ')}.`);

  return lines.join('\n') || '- Ningún ruido visual de sistema/oculto domina el snapshot visible.';
}

function buildComponentInventoryRows(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  const componentRows = [
    componentInventoryRow('Button', count(counts.buttons), inferButtonVariants(samples), interactiveStates('button'), buttonAccessibilityRisk(components), recommendComponent(count(counts.buttons), buttonAccessibilityRisk(components), 2)),
    componentInventoryRow('Link', count(counts.links), inferLinkVariants(samples), interactiveStates('link'), linkAccessibilityRisk(components), recommendComponent(count(counts.links), linkAccessibilityRisk(components), 4)),
    componentInventoryRow('Form field', count(counts.inputs), inferFormFieldVariants(components), interactiveStates('formField'), formFieldAccessibilityRisk(components), recommendComponent(count(counts.inputs), formFieldAccessibilityRisk(components), 2)),
    componentInventoryRow('Card', count(counts.cards), count(counts.cards) ? 'variantes de layout/contenido desconocidas' : 'no detectado', 'default', 'unknown', recommendComponent(count(counts.cards), 'unknown', 3)),
    componentInventoryRow('Alert', count(counts.alerts), count(counts.alerts) ? 'candidato a mensaje de estado' : 'no detectado', 'default, error, success, warning, info', count(counts.alerts) ? 'verificar role y live region' : 'unknown', recommendComponent(count(counts.alerts), 'unknown', 2)),
    componentInventoryRow('Badge', count(counts.badges), count(counts.badges) ? 'candidato a label/estado' : 'no detectado', 'default', 'verificar contraste en tamaños pequeños', recommendComponent(count(counts.badges), 'verificar contraste en tamaños pequeños', 3)),
    componentInventoryRow('Navigation', count(counts.navigation), count(counts.navigation) ? 'candidato a landmark/navegación' : 'no detectado', 'default, hover, focus, current', count(counts.navigation) ? 'verificar landmarks, estado actual y orden de foco' : 'unknown', recommendComponent(count(counts.navigation), 'unknown', 1)),
    componentInventoryRow('Modal/Dialog', count(counts.dialogs), count(counts.dialogs) ? 'candidato a diálogo' : 'no detectado', 'default, focus-trapped, closing, loading, error', count(counts.dialogs) ? 'verificar focus trap, escape y aria-modal' : 'unknown', recommendComponent(count(counts.dialogs), 'verificar focus trap, escape y aria-modal', 1)),
    componentInventoryRow('Form', count(counts.forms), count(counts.forms) ? 'candidato a flujo de envío' : 'no detectado', 'default, validating, loading, disabled, error, success', formAccessibilityRisk(components), recommendComponent(count(counts.forms), formAccessibilityRisk(components), 1)),
    componentInventoryRow('CTA group', count(counts.ctaGroups), inferCtaGroupVariants(components), interactiveStates('button'), ctaGroupAccessibilityRisk(components), recommendComponent(count(counts.ctaGroups), ctaGroupAccessibilityRisk(components), 1))
  ];

  return componentRows.join('\n');
}

function componentInventoryRow(name, instances, variants, states, risk, recommendation) {
  return `| ${name} | ${instances} | ${escapePipes(variants)} | ${escapePipes(states)} | ${escapePipes(risk)} | ${recommendation} |`;
}

function buildImplementationGuidance(snapshot = {}) {
  const colors = snapshot.colors || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const typography = snapshot.typography || {};
  const dominantSpacing = (spacing.spacingScale || []).slice(0, 5).map(item => item.value).join(', ');
  const dominantRadius = (spacing.radii || [])[0]?.value;
  const recurrentColors = recommendedColorSummary(colors.colors || []);
  const fontFamilies = (typography.fontFamilies || []).slice(0, 3).map(item => item.value).join(', ');
  const guidance = [];

  if (dominantSpacing) guidance.push(`[detectado] Mantener el ritmo de espaciado detectado: ${dominantSpacing}. Usar estos valores antes de introducir espaciado nuevo.`);
  else guidance.push('[guía] Definir una escala pequeña de espaciado antes de añadir valores nuevos de layout.');

  if (recurrentColors) guidance.push(`[detectado] Reutilizar colores detectados antes de añadir nuevos: ${recurrentColors}. Mapear cualquier gris o color de estado nuevo a un token nombrado.`);
  else guidance.push('[guía] No introducir grises ni colores de estado nuevos sin mapearlos a tokens semánticos.');

  if (dominantRadius) guidance.push(`[detectado] No crear radios nuevos salvo necesidad clara; ${dominantRadius} es el radio detectado más frecuente.`);
  else guidance.push('[guía] Elegir un radio por defecto para botones/cards antes de añadir variantes.');

  if (fontFamilies) guidance.push(`[detectado] Mantener primero los cambios tipográficos dentro de las familias detectadas: ${fontFamilies}.`);
  guidance.push('[guía] Mantener un solo CTA primario por bloque de decisión; las acciones secundarias deben leerse como secundarias.');
  guidance.push('[guía] Definir estados interactivos para controles reutilizables: default, hover, focus, loading, disabled, error y success.');
  guidance.push('[guía] No depender del placeholder como única etiqueta de formulario.');
  guidance.push('[guía] Respetar la jerarquía de headings y evitar saltos de nivel semántico al cambiar copy/layout.');
  guidance.push('[guía] Mantener contraste suficiente en texto, bordes, anillos de foco y colores de estado.');

  if (count(components.counts?.inputs) && (components.samples?.unlabeledInputs || []).length) {
    guidance.push(`[detectado] Añadir labels explícitos o nombres accesibles para ${(components.samples.unlabeledInputs || []).length} campo(s) de formulario detectados sin label.`);
  }

  if (count(components.counts?.buttons) > 1) {
    guidance.push(`[detectado] Revisar ${components.counts.buttons} botones/acciones detectados para validar jerarquía primaria vs secundaria.`);
  }

  return guidance;
}

function recommendedColorSummary(colors = []) {
  const allowedRoles = ['text', 'primary', 'brand', 'border', 'surface'];
  const byRole = new Map();

  for (const color of colors) {
    const roleName = color.suggestedRole || 'unknown';
    if (!allowedRoles.includes(roleName)) continue;
    if (color.roleConfidence === 'low') continue;
    if (isUtilityOrSystemColor(color)) continue;
    if (!byRole.has(roleName)) byRole.set(roleName, []);
    byRole.get(roleName).push(color.value);
  }

  const orderedRoles = ['text', 'primary', 'brand', 'border', 'surface'];
  return orderedRoles
    .map(roleName => {
      const values = Array.from(new Set(byRole.get(roleName) || [])).slice(0, roleName === 'text' || roleName === 'border' ? 2 : 1);
      return values.length ? `${roleName}: ${values.join(', ')}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

function isUtilityOrSystemColor(color = {}) {
  const sample = color.sample?.context || color.sample || {};
  const usages = color.usages || [];
  return sample.isSystemOrHidden || sample.region === 'hidden_or_system' || usages.every(usage => usage.isSystemOrHidden || usage.region === 'hidden_or_system');
}

function behavioralScopeNote(pageClassification = {}) {
  if (pageClassification.analysisMode === 'full_behavioral') {
    return 'La matriz behavioral completa se aplica porque la página parece una landing o service landing con confianza suficiente.';
  }
  if (pageClassification.analysisMode === 'limited_behavioral') {
    return 'La matriz behavioral de conversión queda desactivada; se entrega snapshot, inventario, riesgos de accesibilidad y notas de revisión manual.';
  }
  return 'Sin señales suficientes para aplicar análisis behavioral; se entrega snapshot técnico y revisión manual.';
}

function buildScopeRegionList(regions = {}) {
  const rows = Object.entries(regions)
    .filter(([, countValue]) => count(countValue) > 0)
    .map(([region, countValue]) => `- ${region}: ${countValue}`);

  return rows.join('\n') || '- No hay mapa de regiones disponible.';
}

function buildBehavioralScopeList(regions = []) {
  if (!regions.length) return '- Ninguna región quedó habilitada para scoring behavioral.';
  return regions.map(region => `- ${region}`).join('\n');
}

function buildScopeExclusionList(exclusions = []) {
  if (!exclusions.length) return '- No se excluyeron regiones por heurística.';
  return exclusions.map(item => `- ${item.region}: ${item.reason}`).join('\n');
}

function buildExecutiveSummary({ findings = [], findingGroups = {}, hypotheses = [], reviewTasks = [], behavioralMapping = [], pageClassification = {} }) {
  const highConfidenceRisks = findings.filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority));
  const blockCategories = categorizeBehavioralBlocks(behavioralMapping);
  const topProductHypothesis = hypotheses.find(hypothesis => !isSystemHypothesis(hypothesis));
  const topSystemHypothesis = hypotheses.find(isSystemHypothesis);
  const lines = [
    `- Observado: ${findings.length} hallazgo(s), ${findingGroups.designSystem?.length || 0} deuda(s) de sistema de diseño, ${findingGroups.accessibility?.length || 0} hallazgo(s) de accesibilidad.`,
    `- Inferido: arquetipo ${pageClassification.archetype || 'unknown'} con confianza ${pageClassification.confidence || 'low'}.`,
    highConfidenceRisks.length
      ? `- Riesgos UX de alta confianza: ${highConfidenceRisks.map(finding => finding.title).slice(0, 3).join('; ')}.`
      : '- No se detectan fricciones UX de alta confianza.',
    `- Bloques débiles: ${blockCategories.bloques_debiles.length}${blockCategories.bloques_debiles.length ? ` (${blockCategories.bloques_debiles.map(block => blockLabel(block)).join(', ')})` : ''}.`,
    `- Señales de revisión ligera: ${blockCategories.señales_revision_ligera.length ? blockCategories.señales_revision_ligera.map(block => block.displayLabel || behavioralBlockDisplayLabel(block.block)).join(', ') : '0'}.`,
    topProductHypothesis
      ? `- Hipótesis principal: ${topProductHypothesis.id} ${topProductHypothesis.title}; métrica primaria: ${topProductHypothesis.metrics.primary}.`
      : topSystemHypothesis && pageClassification.analysisMode === 'design_system_audit'
        ? `- Hipótesis principal de sistema: ${topSystemHypothesis.id} ${topSystemHypothesis.title}; métrica primaria: ${topSystemHypothesis.metrics.primary}.`
      : '- No se generó hipótesis accionable con evidencia, cambio propuesto y métrica clara.',
    reviewTasks[0]
      ? `- Tarea principal de revisión: ${reviewTasks[0].question}`
      : '- No se generó tarea de revisión.'
  ];

  return lines.join('\n');
}

function buildBehavioralAssessment({ fullBehavioral, behavioralMapping = [], pageClassification = {} }) {
  if (!fullBehavioral) {
    return `- Modo de análisis behavioral: ${pageClassification.analysisMode || 'snapshot_only'}.
- No se generan recomendaciones de conversión para este arquetipo con el modelo behavioral actual.
- Tratar cualquier nota behavioral como revisión manual, no como instrucción de optimización.`;
  }

  return `### Mapa de bloques behavioral
| Bloque | Key interna | Presencia | Calidad | Confianza | Evidencia específica | Nota de revisión manual | Severidad |
|---|---|---|---:|---|---|---|---:|
${behavioralMapping.map(formatBehavioralAssessmentRow).join('\n')}

### Bloques a revisar
${buildWeakBlockList(behavioralMapping)}`;
}

function buildWeakBlockList(behavioralMapping = []) {
  const weak = getWeakBlocks(behavioralMapping).map(block => `- ${blockLabel(block)}: ${block.missing?.[0] || block.detectedFriction || 'Validar manualmente con evidencia de producto.'}`);
  return weak.join('\n') || '- No se detectan bloques débiles.';
}

function getWeakBlocks(behavioralMapping = []) {
  return behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2);
}

function blockLabel(block = {}) {
  return `${block.displayLabel || behavioralBlockDisplayLabel(block.block)}${block.block ? ` (${block.block})` : ''}`;
}

function formatBehavioralAssessmentRow(block) {
  return `| ${blockLabel(block)} | ${block.block || ''} | ${block.present} | ${block.quality} | ${block.confidence || 'unknown'} | ${escapePipes((block.evidence || []).slice(0, 3).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing?.[0] || 'Sin fricción clara')} | ${block.severity} |`;
}

function confidenceNote(confidence = 'low', fallback = '') {
  if (confidence === 'high') return 'Inferencia de alta confianza basada en múltiples señales observadas.';
  if (confidence === 'medium') return `Inferencia de confianza media; validar antes de tomar decisiones de producto. ${fallback}`;
  return `Inferencia de baja confianza; usar solo como input de revisión manual. ${fallback}`;
}

function buildFindingList(findings = []) {
  if (!findings.length) return '- No se detectan hallazgos en esta categoría.';
  return findings.map(formatFinding).join('\n\n');
}

function formatFinding(finding) {
  const uncertainty = finding.confidence === 'high'
    ? ''
    : `\n- Incertidumbre: ${finding.confidence === 'medium' ? 'Inferencia de confianza media; validar con analítica o evidencia de usuarios.' : 'Señal de baja confianza; solo revisión manual.'}`;
  return `### ${finding.priority}: ${finding.title}
- Tipo: ${finding.type}
- Área afectada: ${finding.affectedArea}
- Severidad/confianza: ${finding.severity}/5 · ${finding.confidence}
- Impacto/esfuerzo: ${translateImpact(finding.impact)} · ${translateEffort(finding.effort)}
- Evidencia: ${finding.evidence.length ? finding.evidence.map(escapePipes).join('; ') : 'Sin evidencia automática fuerte.'}
- Razonamiento: ${finding.rationale}${uncertainty}`;
}

function buildHypothesisCards(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis accionables. Revisa las tareas de validación si existen.';
  return hypotheses.map(formatHypothesisCard).join('\n\n');
}

function formatHypothesisCard(hypothesis) {
  return `### ${hypothesis.id}: ${hypothesis.title}
- Porque: ${hypothesis.because}
- Creemos que: ${hypothesis.weBelieve}
- Si hacemos: ${hypothesis.ifWe}
- Entonces: ${hypothesis.then}
- Métrica primaria: ${hypothesis.metrics.primary}
- Métricas secundarias: ${hypothesis.metrics.secondary.join(', ')}
- Controles de seguridad: ${hypothesis.metrics.guardrail.join(', ')}
- Segmentos: ${hypothesis.segments.join(', ')}
- Confianza/esfuerzo: ${hypothesis.confidence} · ${hypothesis.effort}
- Tipo de experimento: ${hypothesis.experimentType}`;
}

function buildReviewTasks(tasks = []) {
  if (!tasks.length) return '- No hay tareas de revisión prioritarias con la evidencia actual.';
  return tasks.map(task => `### ${task.id}: ${task.question}
- Pregunta: ${task.question}
- Evidencia: ${(task.evidence || []).map(escapePipes).join('; ') || 'Sin evidencia automática fuerte.'}
- Por qué importa: ${task.whyItMatters}
- Cómo validarlo: ${task.howToValidate}
- Responsable: ${task.owner}`).join('\n\n');
}

function isConversionGuidance(item = '') {
  return /primary CTA|CTA principal|conversi[oó]n|decision block|bloque de decisi[oó]n/i.test(item);
}

function buildGithubTopFindings(findings = []) {
  if (!findings.length) return '- No se generaron hallazgos. Úsalo como baseline o tarea de revisión manual.';
  return findings.slice(0, 5).map(finding => `### ${finding.title}
- Tipo: ${finding.type}
- Prioridad: ${finding.priority}
- Evidencia: ${finding.evidence?.[0] || 'Sin evidencia automática fuerte.'}
- Recomendación: ${finding.rationale || 'Revisar manualmente antes de cambiar la página.'}
- Confianza: ${finding.confidence}`).join('\n\n');
}

function buildGithubHypotheses(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis.';
  return hypotheses.map(hypothesis => `### ${hypothesis.id}: ${hypothesis.title}
- Si hacemos: ${hypothesis.ifWe}
- Entonces: ${hypothesis.then}
- Métrica primaria: ${hypothesis.metrics.primary}
- Controles de seguridad: ${hypothesis.metrics.guardrail.join(', ')}`).join('\n\n');
}

function buildGithubReviewTasks(tasks = []) {
  if (!tasks.length) return '- No se generaron tareas de revisión.';
  return tasks.slice(0, 5).map(task => `### ${task.id}: ${task.question}
- Evidencia: ${(task.evidence || [])[0] || 'Sin evidencia automática fuerte.'}
- Cómo validarlo: ${task.howToValidate}
- Responsable: ${task.owner}`).join('\n\n');
}

function githubComponentsAffected(components = []) {
  const names = components
    .filter(component => Number(component.count) > 0)
    .map(component => `${component.name} (${component.count})`)
    .slice(0, 6);
  return names.join(', ') || 'none detected';
}

function githubTokensAffected(tokens = {}, findings = []) {
  const hasDesignDebt = findings.some(finding => finding.type === 'design_system_debt');
  const colorRolesNeedReview = (tokens.colors || []).filter(color => color.roleConfidence === 'low' || color.suggestedRole === 'unknown').slice(0, 3);
  const notes = [];

  if (hasDesignDebt) {
    if ((tokens.spacing || []).length) notes.push(`spacing (${tokens.spacing.length} detected)`);
    if ((tokens.radius || []).length) notes.push(`radius (${tokens.radius.length} detected)`);
    if ((tokens.colors || []).length) notes.push(`colors (${tokens.colors.length} detected)`);
  }
  if (colorRolesNeedReview.length) notes.push(`color roles to validate: ${colorRolesNeedReview.map(color => color.value).join(', ')}`);

  return notes.join('; ') || 'none beyond normal design-system review';
}

function githubAccessibilityChecks(components = [], accessibilityFindings = []) {
  const checks = [];
  if (accessibilityFindings.length) checks.push(`${accessibilityFindings.length} accessibility finding(s)`);
  if (components.some(component => component.name === 'Form field')) checks.push('form labels/help/error states');
  if (components.some(component => component.name === 'Button' || component.name === 'Link')) checks.push('keyboard focus and accessible names');
  checks.push('contrast and focus visible');
  return Array.from(new Set(checks)).join(', ');
}

function formatViewport(viewport = {}) {
  if (!viewport.width && !viewport.height) return 'unknown';
  return `${viewport.width || 'unknown'}x${viewport.height || 'unknown'}`;
}

function formatList(items = []) {
  return items.length ? items.join(', ') : 'none';
}

function buildGithubEvidence(snapshot = {}, report = {}) {
  const evidence = [];
  const colors = snapshot.colors || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const counts = components.counts || {};
  const samples = components.samples || {};
  const frictions = snapshot.frictions || report.uxFrictions || [];
  const reportTokens = report.detectedTokens || {};

  if (Number.isFinite(colors.totalUniqueColors)) evidence.push(`${colors.totalUniqueColors} valor(es) únicos de color detectados.`);
  else if ((reportTokens.colors || []).length) evidence.push(`${reportTokens.colors.length} token(s) de color reportados.`);
  if (Number.isFinite(spacing.totalUniqueSpacingValues)) evidence.push(`${spacing.totalUniqueSpacingValues} valor(es) únicos de espaciado detectados.`);
  else if ((reportTokens.spacing || []).length) evidence.push(`${reportTokens.spacing.length} token(s) de espaciado reportados.`);
  if (Number.isFinite(spacing.totalUniqueRadiusValues)) evidence.push(`${spacing.totalUniqueRadiusValues} valor(es) únicos de radio detectados.`);
  else if ((reportTokens.radius || []).length) evidence.push(`${reportTokens.radius.length} token(s) de radio reportados.`);
  if (Number.isFinite(counts.buttons)) evidence.push(`${counts.buttons} candidato(s) botón/CTA detectados.`);
  else if (getDetectedComponentCount(report, 'Button')) evidence.push(`${getDetectedComponentCount(report, 'Button')} candidato(s) botón/CTA detectados.`);
  if (Number.isFinite(counts.ctaGroups) && counts.ctaGroups > 0) evidence.push(`${counts.ctaGroups} grupo(s) CTA detectados.`);
  if ((samples.unlabeledInputs || []).length) evidence.push(`${samples.unlabeledInputs.length} campo(s) de formulario sin label accesible claro.`);
  if ((samples.genericLinks || []).length) evidence.push(`${samples.genericLinks.length} label(s) genéricos de enlace detectados.`);
  if (frictions.length) evidence.push(`${frictions.length} nota(s) de fricción UX detectadas; nota principal: ${frictions[0].title}.`);

  return evidence;
}

function buildGithubProblem(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.title) return `${frictions[0].title}. Debe revisarse como deuda UI/UX antes de añadir nuevos cambios de interfaz.`;
  if (evidence.length) return 'La página actual muestra señales observables de UI/sistema de diseño que conviene revisar antes de continuar la implementación.';
  return 'Contextic no detectó evidencia observable suficiente para un defecto específico. Usa este issue como checklist conservadora de revisión manual UI.';
}

function buildGithubSuggestedFix(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.recommendation) return frictions[0].recommendation;
  if (evidence.length) return 'Normalizar la UI alrededor de los tokens detectados, clarificar estados de componentes reutilizables y resolver riesgos de accesibilidad con evidencia directa DOM/CSS.';
  return 'Revisar la pantalla manualmente, capturar evidencia concreta y acotar una corrección pequeña de consistencia UI en vez de rediseñar desde supuestos.';
}

function buildGithubAcceptanceCriteria(snapshot, report, evidence) {
  const criteria = ['La evidencia usada para el fix queda listada en las notas de implementación o en la descripción de la PR.'];
  const components = snapshot.components || {};

  if (count(components.counts?.buttons) > 0 || getDetectedComponentCount(report, 'Button') > 0) criteria.push('Las acciones primarias y secundarias son distinguibles visualmente y solo aparece un CTA primario por bloque de decisión.');
  if (count(components.counts?.inputs) > 0 || getDetectedComponentCount(report, 'Form field') > 0) criteria.push('Los campos de formulario tienen labels visibles o nombres accesibles, además de texto de error/ayuda cuando aplique.');
  if (evidence.some(item => item.includes('color'))) criteria.push('Los colores nuevos o modificados están mapeados a tokens semánticos existentes o nombrados explícitamente.');
  if (evidence.some(item => item.includes('espaciado') || item.includes('radio'))) criteria.push('Los cambios de espaciado y radio reutilizan la escala detectada salvo excepción documentada.');

  criteria.push('Los componentes interactivos definen estados default, hover, focus, loading, disabled, error y success cuando aplique.');
  criteria.push('Contraste y jerarquía de headings revisados antes del merge.');

  return criteria;
}

function looksLikeReport(input) {
  return Boolean(input?.meta?.toolName && input?.detectedTokens && input?.detectedComponents);
}

function getDetectedComponentCount(report = {}, name) {
  const match = (report.detectedComponents || []).find(component => component.name === name);
  return count(match?.count);
}

function parseTypeStyle(value = '') {
  const parts = String(value).split('|').map(part => part.trim());
  const sizeLine = parts[1] || '';
  const sizeMatch = sizeLine.match(/^([^/]+)(?:\/(.+))?$/);

  return {
    fontFamily: parts[0] || 'unknown',
    fontSize: sizeMatch?.[1]?.trim() || 'unknown',
    lineHeight: sizeMatch?.[2]?.trim() || 'unknown',
    weight: parts[2] || 'unknown',
    letterSpacing: parts[3] || 'unknown'
  };
}

function inferTypographyUse(style) {
  const size = Number.parseFloat(style.fontSize);
  const weight = Number.parseInt(style.weight, 10);

  if (Number.isFinite(size) && size >= 32) return 'display/hero heading';
  if (Number.isFinite(size) && size >= 20) return 'heading';
  if (Number.isFinite(weight) && weight >= 650) return 'énfasis o heading';
  if (Number.isFinite(size) && size <= 13) return 'caption/texto de apoyo';
  if (Number.isFinite(size)) return 'texto base';
  return 'unknown';
}

function formatTokenValues(items = [], limit = 8) {
  const values = items.slice(0, limit).map(item => `${item.value} (${item.count})`);
  return values.join(', ') || 'unknown';
}

function roleConfidenceFromName(role) {
  if (!role || role === 'unknown' || role === 'sin mapear') return 'unknown';
  if (String(role).includes('candidato') || String(role).includes('possible')) return 'low';
  return 'medium';
}

function translateRoleReason(reason = '') {
  return String(reason)
    .replace('Role inferred from color usage.', 'Rol inferido desde el uso del color.')
    .replace('Low confidence: insufficient contextual evidence.', 'Confianza baja: evidencia contextual insuficiente.')
    .replace('Low confidence: no usage context.', 'Confianza baja: sin contexto de uso.')
    .replace('Only observed in hidden/system or utility contexts.', 'Solo observado en contextos ocultos, de sistema o utilidad.')
    .replace('CSS property color maps to text role.', 'La propiedad CSS color se mapea a rol text.')
    .replace('CSS border property maps to border role.', 'La propiedad CSS de borde se mapea a rol border.')
    .replace('CSS outlineColor maps to focus role.', 'La propiedad CSS outlineColor se mapea a rol focus.')
    .replace('CSS boxShadow maps to shadow role.', 'La propiedad CSS boxShadow se mapea a rol shadow.')
    .replace('CTA background color maps to brand action role.', 'El color de fondo de CTA se mapea a rol de acción de marca.')
    .replace('Brand variable/name hint plus CTA background usage.', 'Pista de variable/nombre de marca junto a uso como fondo de CTA.')
    .replace('Neutral or white background maps to surface.', 'Un fondo neutro o blanco se mapea a surface.')
    .replace('Saturated background without CTA evidence maps to accent.', 'Un fondo saturado sin evidencia de CTA se mapea a accent.')
    .replace('Insufficient CSS property evidence for a semantic role.', 'Evidencia insuficiente de propiedad CSS para un rol semántico.');
}

function translateUsageStatus(status = '') {
  return String(status)
    .replace('unknown usage', 'uso desconocido')
    .replace('visible usage', 'uso visible')
    .replace('hidden/system usage', 'uso oculto/sistema');
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function inferButtonVariants(samples = {}) {
  const buttons = samples.buttons || [];
  const variants = [];
  if (buttons.length) variants.push('candidato primario desde acciones visibles');
  if (buttons.some(button => button.disabled)) variants.push('disabled');
  return variants.join(', ') || 'no detectado';
}

function inferLinkVariants(samples = {}) {
  const variants = ['default'];
  if ((samples.genericLinks || []).length) variants.push('riesgo de label genérico');
  return variants.join(', ');
}

function inferFormFieldVariants(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  if (!count(counts.inputs)) return 'no detectado';
  const variants = ['candidato texto/input'];
  if ((samples.unlabeledInputs || []).length) variants.push('sin label');
  if ((samples.disabledControls || []).length) variants.push('disabled');
  return variants.join(', ');
}

function inferCtaGroupVariants(components = {}) {
  const groups = components.samples?.ctaGroups || [];
  if (!groups.length) return 'no detectado';
  return groups.map(group => `${group.actions.length} acción(es)`).join(', ');
}

function interactiveStates(type) {
  if (type === 'link') return 'default, hover, focus, visited, disabled si aplica';
  if (type === 'formField') return 'default, focus, filled, disabled, error, success, loading';
  return 'default, hover, focus, loading, disabled, error, success';
}

function buttonAccessibilityRisk(components = {}) {
  const disabled = components.samples?.disabledControls || [];
  if (disabled.length) return `${disabled.length} control(es) disabled; verificar recuperación/microcopy`;
  return count(components.counts?.buttons) ? 'verificar foco visible y nombres accesibles' : 'unknown';
}

function linkAccessibilityRisk(components = {}) {
  const genericLinks = components.samples?.genericLinks || [];
  if (genericLinks.length) return `${genericLinks.length} label(s) genéricos de enlace`;
  return count(components.counts?.links) ? 'verificar foco visible y labels descriptivos' : 'unknown';
}

function formFieldAccessibilityRisk(components = {}) {
  const unlabeled = components.samples?.unlabeledInputs || [];
  if (unlabeled.length) return `${unlabeled.length} campo(s) sin label claro`;
  return count(components.counts?.inputs) ? 'verificar labels, texto de ayuda y estado de error' : 'unknown';
}

function formAccessibilityRisk(components = {}) {
  if (!count(components.counts?.forms)) return 'unknown';
  if ((components.samples?.unlabeledInputs || []).length) return 'contiene candidatos de campo sin label';
  return 'verificar envío, loading, success, error y microcopy de privacidad';
}

function ctaGroupAccessibilityRisk(components = {}) {
  if (!count(components.counts?.ctaGroups)) return 'unknown';
  return 'verificar jerarquía primaria/secundaria y orden de foco por teclado';
}

function recommendComponent(instances, risk, promotionThreshold) {
  if (instances <= 0) return 'keep_local';
  if (risk && risk !== 'unknown' && !risk.startsWith('verify focus visible') && !risk.startsWith('verificar foco visible')) return 'needs_review';
  if (instances >= promotionThreshold) return 'promote_to_core_component';
  return 'keep_local';
}

function formatFriction(friction, index) {
  return `### Fricción #${index}: ${friction.title}
- Prioridad: ${friction.priority} · score ${friction.priorityScore}
- Tipo: ${friction.typeLabel || friction.type}
- Bloque afectado: ${friction.block || 'sin bloque'}
- Hipótesis: ${friction.hypothesis || friction.insight || 'Hallazgo heurístico que requiere validación de producto/diseño.'}
- Evidencia observada: ${friction.evidence || friction.insight}
- Tipo de evidencia: ${friction.evidenceType || 'inference'}
- Causa probable: ${friction.insight}
- Impacto en conversión: ${friction.risk}
- Principio behavioral afectado: ${friction.principle || 'revisión heurística'}
- Severidad: ${friction.severityScore} / 5
- Confianza del diagnóstico: ${friction.confidence || 'media'}
- Recomendación: ${friction.recommendation}
- Patrón UI recomendado: ${friction.recommendedPattern || friction.systemImplication || 'Revisar patrón correspondiente en sistema de diseño.'}
- Implicación de sistema de diseño: ${friction.systemImplication || 'Revisar patrón correspondiente en sistema de diseño.'}
- Métrica asociada: ${friction.metric || 'Conversión final'}
- Complejidad de implementación: ${translateEffort(friction.implementationEffort)}`;
}

function formatRecommendedSection(section) {
  return `#### ${section.sectionName}
- Objetivo: ${section.objective}
- Pregunta que responde: ${section.userQuestionAnswered}
- Fricción que resuelve: ${section.primaryFrictionResolved}
- Principios behavioral: ${section.behavioralPrinciples.join(', ')}
- Componentes recomendados: ${section.recommendedComponents.join(', ')}
- Contenido necesario: ${section.contentRequirements.join('; ')}
- Copy guidance: ${section.copyRules.join('; ')}
- Reglas de implementación: ${section.implementationRules.join('; ')}
- Accesibilidad: ${section.accessibilityRules.join('; ')}
- Riesgos: ${section.risks.join('; ')}
- Métrica asociada: ${section.metrics[0] || 'Conversión final'}
- Prioridad: ${section.priority}`;
}

function buildTokenRows(colors, typography, spacing) {
  const rows = [];
  const primaryColor = colors.colors[0];
  const secondaryColor = colors.colors[1];
  const type = typography.typeStyles[0];
  const space = spacing.spacingScale[0];
  const radius = spacing.radii[0];
  const shadow = spacing.shadows[0];
  const border = spacing.borders[0];

  rows.push(`| Color primario | ${primaryColor?.value || 'No detectado'} | ${primaryColor?.suggestedRole || 'CTA / énfasis'} | ${colors.totalUniqueColors <= 12 ? 'Alta' : colors.totalUniqueColors <= 28 ? 'Media' : 'Baja'} | ${colors.totalUniqueColors > 28 ? 'Deriva de color' : 'Sin riesgo alto'} |`);
  rows.push(`| Color secundario | ${secondaryColor?.value || 'No detectado'} | Superficie / apoyo | Media | Validar contraste |`);
  rows.push(`| Tipografía | ${type?.value || 'No detectada'} | Headings / body | ${typography.totalUniqueTypeStyles <= 8 ? 'Alta' : 'Media'} | Revisar jerarquía |`);
  rows.push(`| Espaciado | ${space?.value || 'No detectado'} | Secciones / cards | ${spacing.totalUniqueSpacingValues <= 18 ? 'Media' : 'Baja'} | ${spacing.totalUniqueSpacingValues > 18 ? 'Escala fragmentada' : 'Sin riesgo alto'} |`);
  rows.push(`| Radius | ${radius?.value || 'No detectado'} | Cards / buttons | ${spacing.totalUniqueRadiusValues <= 5 ? 'Media' : 'Baja'} | ${spacing.totalUniqueRadiusValues > 5 ? 'Inconsistencia de componentes' : 'Sin riesgo alto'} |`);
  rows.push(`| Sombra | ${shadow?.value || 'No detectada'} | Elevación | Media | Validar uso semántico |`);
  rows.push(`| Borde | ${border?.value || 'No detectado'} | Separación / estados | Media | Validar contraste |`);
  return rows.join('\n');
}

function buildPatternList(components, behavioralMapping) {
  const patterns = [];
  const counts = components.counts || {};
  const hasWhat = behavioralMapping.find(block => block.block === 'what')?.present;
  const hasWhyNot = behavioralMapping.find(block => block.block === 'why_not')?.present;
  if (hasWhat && hasWhat !== 'no') patterns.push('- Hero');
  if (counts.navigation) patterns.push('- Header / navegación');
  if (counts.buttons) patterns.push('- CTA primario / grupo de acciones');
  if (counts.cards >= 3) patterns.push('- Cards de beneficios o features');
  if (counts.forms) patterns.push('- Formulario');
  if (hasWhyNot && hasWhyNot !== 'no') patterns.push('- FAQ / confianza / reducción de riesgo');
  return patterns.join('\n') || '- No se detectan patrones UI suficientes por heurística.';
}

function formatReportValue(value) {
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value || 'unknown';
}

function inferScreenType(components, behavioralMapping) {
  if (components.counts.forms > 0 && behavioralMapping.some(block => block.block === 'where' && block.present !== 'no')) return 'Landing con formulario o captación';
  if (components.counts.buttons > 0) return 'Landing / pantalla transaccional';
  return 'Pantalla informativa';
}

function inferMaturity(behavioralMapping) {
  const average = behavioralMapping.reduce((sum, block) => sum + block.quality, 0) / Math.max(behavioralMapping.length, 1);
  if (average >= 4) return 'Alta';
  if (average >= 2.8) return 'Media';
  return 'Baja';
}

function getPrimaryActionLabel(components) {
  const first = components.samples.buttons.find(button => button.text);
  return first ? `“${first.text}”` : 'No detectada por heurística';
}

function getMainConversionRisk(frictions, behavioralMapping) {
  if (frictions[0]) return frictions[0].title;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Bloque ${blockLabel(weak)} débil o ausente` : 'No detectado por heurística';
}

function buildStrategicReading(frictions, behavioralMapping) {
  const weakBlocks = behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).map(blockLabel);
  const top = frictions[0];
  if (top) {
    return `La pantalla parece necesitar refuerzo en ${weakBlocks.slice(0, 3).join(', ') || 'su estructura behavioral'}. El principal riesgo detectado es “${top.title}”, que afecta a ${top.typeLabel || top.type}. Trata esta salida como hipótesis basada en DOM/CSS visible y valida con datos reales de comportamiento.`;
  }
  return `La pantalla no muestra fricciones heurísticas fuertes, pero hay que validar manualmente la claridad de Qué (what), Por qué no (why_not) y Dónde actuar (where). Esta lectura separa observación técnica de recomendación para evitar conclusiones no evidenciadas.`;
}

function buildWhatWorks(behavioralMapping) {
  const strong = uniqueLines(behavioralMapping
    .filter(block => block.present === 'sí' && block.quality >= 4)
    .map(block => `- ${blockLabel(block)}: ${block.evidence[0] || 'bloque presente con señales suficientes'}`));
  return strong.join('\n') || '- No hay suficientes señales fuertes; conviene validar manualmente.';
}

function buildNextExperiment(hypotheses, behavioralMapping) {
  const top = hypotheses[0];
  if (top) return `${top.id}: ${top.title}. ${top.ifWe} Medir ${top.metrics.primary}; guardrails: ${top.metrics.guardrail.join(', ')}. Tipo: ${top.experimentType}.`;
  return 'No hay hipótesis accionable con evidencia, cambio propuesto y métrica clara.';
}

function buildTopHypothesisSection(hypotheses, behavioralMapping) {
  if (!hypotheses.length) return '';
  const productHypothesis = hypotheses.find(hypothesis => !isSystemHypothesis(hypothesis));
  if (productHypothesis) {
    return `### Hipótesis principal
${formatNextExperiment(productHypothesis)}`;
  }
  const systemHypothesis = hypotheses.find(isSystemHypothesis);
  if (!systemHypothesis) return '';
  return `### Hipótesis principal de sistema
${formatNextExperiment(systemHypothesis)}`;
}

function buildTopReviewTask(tasks = []) {
  const top = tasks[0];
  if (!top) return '- No hay tareas de revisión.';
  return `- Pregunta: ${top.question}
- Evidencia: ${(top.evidence || []).map(escapePipes).join('; ') || 'Sin evidencia automática fuerte.'}
- Por qué importa: ${top.whyItMatters}
- Cómo validarlo: ${top.howToValidate}
- Responsable: ${top.owner}`;
}

function buildHighConfidenceRisks(findings = []) {
  const risks = findings
    .filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority) && finding.type !== 'design_system_debt')
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidencia: ${finding.evidence[0] || 'no disponible'}`);
  return risks.join('\n') || '- No se detectan fricciones UX de alta confianza.';
}

function buildManualReviewSummary(reviewTasks = []) {
  const items = uniqueReviewTasks(reviewTasks).map(task => `- [${reviewTaskTag(task)}] ${reviewTaskSummary(task)}`);
  return items.join('\n') || '- No hay señales de revisión ligera con la evidencia actual.';
}

function buildDesignSystemDebtSummary(findings = []) {
  return findings
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidencia: ${finding.evidence[0] || 'no disponible'}`)
    .join('\n') || '- No se detectó deuda de sistema de diseño.';
}

function buildRecommendedMetrics(hypotheses = [], pageClassification = {}) {
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';
  const primary = new Set();
  const secondary = new Set();
  const guardrail = new Set();

  for (const hypothesis of hypotheses) {
    if (hypothesis.metrics?.primary) primary.add(hypothesis.metrics.primary);
    for (const metric of hypothesis.metrics?.secondary || []) secondary.add(metric);
    for (const metric of hypothesis.metrics?.guardrail || []) guardrail.add(metric);
  }
  for (const metric of primary) secondary.delete(metric);

  return [
    '### Primaria',
    ...(primary.size ? Array.from(primary).map(metric => `- ${metric}`) : ['- tasa de completitud de la tarea principal']),
    '',
    '### Secundarias',
    ...(secondary.size
      ? Array.from(secondary).map(metric => `- ${metric}`)
      : fullBehavioral
        ? ['- CTR del CTA principal', '- tasa de rebote']
        : ['- tasa de finalización de tarea', '- incidencias de accesibilidad abiertas']),
    '',
    '### Controles de seguridad',
    ...(guardrail.size ? Array.from(guardrail).map(metric => `- ${metric}`) : ['- sin regresiones de accesibilidad'])
  ].join('\n');
}

function uniqueReviewTasks(tasks = []) {
  const seen = new Set();
  return tasks.filter(task => {
    const key = `${reviewTaskTag(task)}:${reviewTaskSummary(task)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reviewTaskTag(task = {}) {
  const text = `${task.question || ''} ${(task.evidence || []).join(' ')}`.toLowerCase();
  if (/target|audiencia|perfil|dispositivo|para qui[eé]n/.test(text)) return 'Para quién / who';
  if (/proceso|pasos|despu[eé]s|cta|alta|contrataci[oó]n|gesti[oó]n|activaci[oó]n/.test(text) && !/cta principal|label|jerarqu/i.test(text)) return 'Cómo / how';
  if (/cta principal|label|jerarqu|objetivo de negocio|dónde actuar/.test(text)) return 'Dónde actuar / where';
  if (/urgencia|temporal|hasta|cobertura/.test(text)) return 'Cuándo / when';
  return 'Revisión';
}

function reviewTaskSummary(task = {}) {
  const question = task.question || '';
  const tag = reviewTaskTag(task);
  if (tag === 'Para quién / who') return 'Validar si el target funcional por dispositivo es suficiente o necesita perfil explícito.';
  if (tag === 'Cómo / how') return 'Validar si el proceso explica qué ocurre después del CTA.';
  if (tag === 'Dónde actuar / where') return 'Validar si el CTA principal responde al objetivo de negocio.';
  if (tag === 'Cuándo / when') return 'Validar si existe urgencia real o solo límites de valor/cobertura.';
  return question || 'Validar la señal antes de proponer cambios.';
}

function categorizeBehavioralBlocks(behavioralMapping = []) {
  return {
    bloques_debiles: behavioralMapping.filter(isWeakBehavioralBlock),
    señales_revision_ligera: behavioralMapping.filter(isLightBehavioralReviewSignal),
    bloques_fuertes: behavioralMapping.filter(block => !isWeakBehavioralBlock(block) && !isLightBehavioralReviewSignal(block))
  };
}

function isWeakBehavioralBlock(block = {}) {
  return block.present === 'no' || Number(block.quality || 0) <= 2;
}

function isLightBehavioralReviewSignal(block = {}) {
  if (isWeakBehavioralBlock(block)) return false;
  if (Number(block.quality || 0) >= 4 && block.confidence === 'high' && !(block.missing || []).length && !block.detectedFriction) return false;
  const hasConcreteNote = Boolean((block.missing || []).filter(Boolean).length || block.detectedFriction || block.diagnostics?.ctaAssessment?.primary);
  return hasConcreteNote && (Number(block.quality || 0) === 3 || block.confidence === 'medium');
}

function isSystemHypothesis(hypothesis = {}) {
  return /^(system hypothesis|hipótesis de sistema):/i.test(hypothesis.title || '') || hypothesis.experimentType === 'QA audit';
}

function formatNextExperiment(hypothesis = {}) {
  return `${hypothesis.id}: ${hypothesis.title}. ${hypothesis.ifWe} Medir ${hypothesis.metrics.primary}; guardrails: ${hypothesis.metrics.guardrail.join(', ')}. Tipo: ${hypothesis.experimentType}.`;
}

function uniqueLines(lines = []) {
  return Array.from(new Set(lines.filter(Boolean)));
}

function translateImpact(value) {
  return { low: 'Bajo', medium: 'Medio', high: 'Alto' }[value] || 'Medio';
}

function translateEffort(value) {
  return { low: 'Baja', medium: 'Media', high: 'Alta' }[value] || 'Media';
}

function escapePipes(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}


// ---- src/index.js ----

const PANEL_ID = 'contextic-panel';
const CONTEXTIC_LOGO_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAABmJLR0QA/wD/AP+gvaeTAAAOt0lEQVRYha1Yd0DT1/a/2SSEJEBCwkxYYcvee0ZEHCgqglp/arX6KxW1te+9VuvoE7WtCvrqQK3UugNFZchGVkCGEJAlMmQjCRAgkvn+CC8ECKh97/Nfzj3n3E/Oufd8zz2QQ29FYC5KY0JivjhEM7MGi0MskfQPDYyMckQiMVZV1UBbF62CXkL/4wGf91vQ1SaYmKDSrRalIhbnp90vTmca0C1pdAsoFNoxNJTSUIMjaHguX23j4gWDwf4yG94Ydz6hkdyndu6+EAhEqcHUBO/qP7/VpRp//UuSGl5dcam7vaUiNz399jVbTz+P4HANEvkvEGqpq55PqLMwe9PncUq1JRLxjbM/eC1f6+QTtHDVwNjMwNhMKJh+WV50J/E0UgXpHrTSytEd+ikBq68onkNI0NvNH+Mamlkq1X72MHmZq6dSNnIgkChn3xBn35Chvres3IyMO9ctHd1cAkLJugYfZCN4z39VUwHzOHBELhpO+0MHT7Bycl+ozRnsL3z6MPLzuMWyOQ+qangzWyf3oJXv+VPZD5ML05nT/Cl1ElkFo7qYSX1FSXNr85wIdRdmr9+2R6l2xr2bQWs3fyQbOWBwuJ2Hn52H3+jIcE1JftKpf0ikUgs7JwsHV0Nzm3nHv7IwS8vNZ5bQ9FD/xPCAobmS+zU+yunrfhNt/zeluw72dL2qreSNcuAwBJZA0NLRp+jTCJokRR2CJilg9caA1RvHRoYbq1nP01NuJ5xSVcPpGdL1jUyxeMKb5oZX1RX6RG2IvA4N3EtCdLSt3/XVwi2zH93G4vEeweHz5CKh8N6vP/W2Vq1d4+noRCcQsFNT7zPSK+7eK9TQorgELPcIDscRNBaLH/fdYF9nx7vB3pGBPqlU2tHc0N3eMkuoek/k2s3/Z2xpu9DydNyO2B8T0AvSf/3M9w7m6IMHI1EohKKcxWqKjb3I5U7A4HBrZw+3gDALB2co9APXTSIR//bTsZmUTXPejfb3GJorqc69na9x6poL2bBy062NEH//++aFJm5uFikpP3yx50Jzy9u68ud15c/xmiRXf4Zr4AoSRXcxQlAobNPer2du2bsMpg5axdrJY6FeVVGOGoFgam2vKBQJhQ8u//Niwh4kEi6RSKRS6bzzjsOprlnj+eZNf3t7HwBgmj/V/qr+eTqzoapMKBAQKTpIlMrCvRBI1Ayhtstn/RjhGlqUhUo1JfkkHQN9I9M5wtICI633gUEOAICCwrqt28709Y5gsCo6Opqz3hHw0FDnvr6RpqZuuXCcO9JUW1mUzuzpaEMgkESyDhQKVfQMBwAIJ8ZH33YYWdgojSQEBoVC59/25pcvdkTN3McU5vPBAc6t5OxbydkmJroXEvbRTWfyAoVCT53aIZWC1NQSRXORUChLJVoVa+3k4RKwnG7jIIsxHADAKXxm7eyx2KEjkrWHervnCfu62mk0PwAAh8PLz6+TCe3tTT77jGFirK2oKeMkFoseP2YtdM6fnHhRlP2iKJusa+AaEOrsz4ADAAYKM8PCIpSyAQDQbRyTz58M37JbUSicnpaFOi2tTCgUAQCCgx3/9a9YpR5gMOiZ07vHx6cKC+vlQiQSbmqqZ26mb2aub2amLxCIDh+++vSPJLhoanKkvUXpbZeBok+TiiXtr+qNLZfJhVg8obGhk0Ylt7X2yCR1de08Hl9NTXlXBINDT57Y7uUdFxTk4O5h6epqYWKkA4PPOT3Jv3+7IfI4zNTemSyV2Lh4LkYIAIDF4bMfJbv6h8qvEn9qsuNVTUiIk7fPMoq2BmdkvLNzcPq9wNtH+UEEACCRiKzMF/fuf2dra0zUxC08l0RNHBKJgGnjcd6+DE2ytlIvMpD1qOyK4lHOsPzg6xmaMG/fp5to0WhkG2vDDRv9oqL8MaoqVOqibVBn58DAICcw0AEAwOPx59VSGSws9GHqaJWIz/ZC5t69eYBAIHRbR+a1BAABVFMLAAAMBrdycj97IrG/p8/RkY5AwDGYpdgAAHJyq42NdOh0vZ6ed15e+2/fzh0c4GKwKhSKujzwCAQcamnn/DE9lBpePfbE+eri3MQjcf3dHQAAdSL54NlroxDTVWuOPWIWi0WSpT08fcIKDLQHAGRkVkgkEg6Hdys5O2rTjzHRpxTVYNti/0ZcMl9yoNAYt8AVKDQ69UZiS101SVuPoEmk0S0tHL2yn724fPE2CoUwMqIgEPO7UADA3XsFBIKal5c1AODkyT+GhkYBAM7OZkeObNm/PwIGm80P5ElVxyd1mQAAqVTKrizJTbkLg0F9V65f5uYNhcJ4o9ySrLS6smfB/tZRm/2NjXXk+llZVcnJ2bdufYNAwLu7hwIDv5bJy8oSSCS8omeBQARJr51f9D4eb9tbi54+6mpr9g2LcPFnIFXQIqGwpjS/KJ2powmNjPTR0SXev1fQ1tZ37ep+LbI6ACAtrfzQocsy8/jTO9dFeCs6TE0t+a8IyTAyNFD2LK2uoniZq7fPighZa9bexC7OSGVXFOPxKpevxNkuM5Ipi8WSmpq2/LzavLxakViSk31aXo243InVq7//HxCa2UkkYleWlGY/AQC4+DPs3H0RSBR/arK2JL80+zGZANZF+oQEO+JwGLnJm45+bYoGGo0CAExOvt+x46fq6rb5hIRCQWlmWiu7eoLHw6qp4dSJGiSyobkVlW6ptGFYCM5gf0XBs/qKIirdysVvuZGFNQCg500bKy+DXVHkaE9dvtwlMNAOi52t6Z1dg7FfXmpq6gIAzCEkFEwnHjkgnBjAYFCxsRFqODRvnH86/i4KhejpHaGZ2Th4B9m5+6BVsR+kJZVIXje+ZOVlDg/0OngF2Lv74jVJYrG4qbayqiinrb7SxdkkNNQFj8eWlTbcuZs/PS2UGc4hxExK0MIM79u3et26YzFbgr7YHT42PhkTHf/4yfEJHr/oeX1JSUNp2SttIxsn70ArZw8EAvlBZu/5Uy9LC1j5GfzJCTsPPyffEBJFVyiYbmXXvqoqa6hicd8NKurPEhodGf7pwLbc3DPq6lgudyI+/m59fYeVlYG5BXXnjlC5gVgsycurOX36/jvutEdQmBdjlcbHlbGhvresvIyKvEwNLYq9p5+9Z4A6UQsAMNjb3VpX3dPROtzfx5/gzRLKfnQbK3p94uRnchelZY27dv5ibKR9+NtNspo2kw6pNCjom893hzU3daf+WWZk6RiweqNiL7AE7lw6U1vNkggEoqkJI3NrR+8gaxdPxTfTbFVtZVfFfeGjaKymhvHwsIqI8Lp48c+zZx9s384ID3eHwaAsVrO2tubGDX4AgAMHIh88KLr963EYmugXHmnr5gNHKPlqytHZ0mi6eafR2pi+5zm9+RnM3688uHpO24CmbWCsoUUGiik7tntjgC/96NGt8u/w0SO3PL2sQkKcAACNjZ1XrqS3tvbGxASWlTWGhbmGhbnKtxGLJTk51V9+eVFVDWfr7uu3cj1Fn7aQzdv21rNff854UID5z9tDIhJy2DXcFvbY6xZeZ5tgVGEcI5FIi56zN2w4cSFhH41K5vOnS0rZ330fLVu1sqIlJOxrbes9f46Zk1NNIKhSqWRr65ldYTCohoaav7/t0aNbmY+Kb8YfwJMMPRir5o2LSrMfkxxcMQovISgcQbR3JdrP/jdY9J6Z4UvTy8q4/2c4OJgePnyNzxd0dQ9qauB8fed0kpqauBHOuJ4OkUTEnzvHTGEWC8ViKpWsooL85ZeH27eHmpnpu7pZbNkShIRN30i8WvAkZZI3hiNoquEJvDHuncTT5jv344zoS+R0NmW15UWlqVfSHp+Y4PGPHf/96VPW0aNbY2ICFbWlUumKFd9duxanp0eUSqU1Na+fZb0oKKyzsDCorGwuLbmg2JWeP8fMGlKfGugdKC9Q1yBCYTA+DB6YnAFDopYgNBshij7tZWVlfXX9ijAXOl2vsrJlZGT8/v1CGo0if22xWM3NTV1btwUDACAQiI6OprePzdatwez6DoFQ9OvlJ42NXRhVFT1dolAo/kd8qu0PiQaM1bSVkQgSBaqhZb33sMrcIcRSEQIACIXCqycP06kIDFqFbq63dUtwXV17YmLa2Njk9u2M4GCHAwd+ZTCcV650m+dl/frjSUkH0GhUVlZVWlppR0e/sbHuqMNqo4gtS2//AUIAAIlEnHrjUlE68+Zv33h5zjwFm5q6kpIySsteTU68z8k5Q6HMmS7W1r6+dSv7/Pm9csnw8FjUrku2Ccyls6MUsymbIQiBWjq4UukWiWevjY5wHBxM4XAYiURgMJynpgQSiSQ1pSTtz7LJqff6eiQMBgUAuHA+Zc1aTwMDLbmTtrYeFqATbZ0/lQ0AAJLKalX6GRe85xc+ZbLLM9dHeERt8sNi0YyQb2/cPGRgoNXZNZiZUfn0Sbm2DjEwyD75Vk56+knFJ/pXB69B9yYgVNX+AiEYt7eLamoxb8YLAIDBEcaWyxx8QuvZb3+Ov5GXU4lEInbtWgEAIBCwzs5m0dGB+vqkmzeyOjoGamtfj41NEQhYPF61u3vod7aE4rnUbHQJQH7LLL+TGG/j4ukfvmGxx5BELG6sLmflZaLEQ+sifQID7NXVZzqQqKgff/55T3PL25xnVYVFdaoYFTUchrDjOEnZ5PSjCKXXdovF4ow7Sa3s2vW7vpI9uxbD1ATvZVlhWe4Topo4dIUrFovOzKi8fv2gbFUqldbWtm/e/CPJzc/91GXwiRNSGWDRe+KgUKiZrZOOAS3l+qWO1kY9I9OF8zIZEEiUvrGZR3C4tol9UxunIP/lYF/f0CBHCoCmJg6JROTn10JwZvy+nuHuDi0Xr79AaM61l0qlVc9zsx8m020dgyOiCR8qYgAAkVDY3sRua6jp63wNpke5o2Oxp5K4w4Px+7db7/3GNGrXf0VIBolYXFWcW/D4oZ6hiRdjFZWufLCvFFKJBAKFTvHGvt26CkAgdnFHDddGfxqhh/X9ShckUklDDaupioXDq1NNzVFojFI1peDyxqrYL4FsKLBlD4as80ETOf4NS5cryP5VLrUAAAAASUVORK5CYII=';

function runContextic() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const snapshot = createSnapshot();
  renderPanel(snapshot);
}

function createSnapshot() {
  const root = document.body;
  const colors = collectColors(root);
  const typography = collectTypography(root);
  const spacing = collectSpacing(root);
  const components = collectComponents(root);
  const scopeMap = detectDomRegions(root);
  const pageClassification = pageArchetypeClassifier({
    url: window.location.href,
    title: document.title,
    components
  }, scopeMap.behavioralRoot);
  const fullBehavioral = shouldRunFullBehavioralAnalysis(pageClassification);
  const behavioralComponents = fullBehavioral ? collectComponents(scopeMap.behavioralRoot) : components;
  const frictions = fullBehavioral ? detectFrictions({ colors, typography, spacing, components: behavioralComponents }, scopeMap.behavioralRoot) : [];
  const behavioralMapping = fullBehavioral ? buildBehavioralMapping({ components: behavioralComponents, frictions }, scopeMap.behavioralRoot) : [];
  const behavioralRecommendation = fullBehavioral ? buildBehavioralStructureRecommendation({ behavioralMapping, frictions }) : { sections: [] };
  const findings = buildFindings({ frictions, behavioralMapping });
  const hypotheses = generateHypotheses(findings, pageClassification, { behavioralMapping });
  const reviewTasks = generateReviewTasks(findings, pageClassification, { behavioralMapping });

  return {
    meta: {
      url: window.location.href,
      title: document.title,
      generatedAt: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    },
    colors,
    typography,
    spacing,
    components,
    scopeMap: {
      regions: scopeMap.regions,
      usedForBehavioral: scopeMap.usedForBehavioral,
      excludedFromBehavioral: scopeMap.excludedFromBehavioral
    },
    pageClassification,
    frictions,
    findings,
    hypotheses,
    reviewTasks,
    behavioralMapping,
    behavioralRecommendation
  };
}

function renderPanel(snapshot) {
  const host = document.createElement('aside');
  host.id = PANEL_ID;
  host.setAttribute('aria-label', 'Panel de Contextic');
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const designContext = buildDesignContextMarkdown(snapshot);
  const jsonReport = buildJsonExport(snapshot);
  const githubIssue = buildGithubIssueExport(snapshot);

  const style = document.createElement('style');
  style.textContent = `
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        inset: 14px 14px 14px auto;
        width: min(448px, calc(100vw - 28px));
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #151515;
        -webkit-font-smoothing: antialiased;
      }
      * { box-sizing: border-box; }
      button:focus-visible,
      [tabindex]:focus-visible {
        outline: 3px solid #0e7c66;
        outline-offset: 2px;
      }
      .panel {
        height: 100%;
        background: #f6f8f7;
        border: 1px solid #d7ded8;
        border-radius: 10px;
        box-shadow: 0 28px 90px rgba(22, 34, 28, 0.26);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .panel-header {
        padding: 18px;
        border-bottom: 1px solid #d7ded8;
        background: #ffffff;
        display: flex;
        gap: 14px;
        align-items: center;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 0;
      }
      .brand-mark {
        flex: 0 0 auto;
        display: block;
        width: 38px;
        height: 38px;
        border-radius: 9px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }
      .kicker {
        margin: 0 0 2px;
        color: #075f4d;
        font-size: 11px;
        font-weight: 850;
        line-height: 16px;
        text-transform: uppercase;
      }
      h2,
      h3 {
        margin: 0;
      }
      h2 {
        color: #151515;
        font-size: 18px;
        line-height: 24px;
        font-weight: 850;
      }
      .subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #5f6761;
      }
      .close {
        border: 0;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        background: #eef4f0;
        color: #151515;
        cursor: pointer;
        font: inherit;
        font-size: 18px;
        line-height: 18px;
        transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms cubic-bezier(0.2, 0, 0, 1);
      }
      .body {
        overflow: auto;
        padding: 14px;
      }
      .hero-summary {
        display: grid;
        grid-template-columns: 116px minmax(0, 1fr);
        gap: 12px;
        align-items: stretch;
        margin-bottom: 12px;
      }
      .score {
        display: grid;
        place-items: center;
        min-height: 104px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        background: #151515;
        color: #ffffff;
        text-align: center;
      }
      .score strong {
        display: block;
        font-size: 38px;
        line-height: 42px;
        font-weight: 900;
      }
      .score span {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, .76);
        font-size: 11px;
        font-weight: 750;
        line-height: 16px;
        text-transform: uppercase;
      }
      .summary-copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 104px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 14px;
        background: #ffffff;
      }
      .summary-copy strong {
        color: #151515;
        font-size: 15px;
        line-height: 21px;
      }
      .summary-copy p {
        margin: 6px 0 0;
        color: #5f6761;
        font-size: 12px;
        line-height: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .metric {
        min-height: 72px;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 11px 12px;
        background: #ffffff;
      }
      .metric strong {
        display: block;
        color: #151515;
        font-size: 24px;
        line-height: 28px;
        font-weight: 850;
        font-variant-numeric: tabular-nums;
      }
      .metric span {
        display: block;
        margin-top: 3px;
        font-size: 11px;
        line-height: 16px;
        color: #5f6761;
      }
      .section {
        border-top: 1px solid #d7ded8;
        padding: 16px 0 0;
        margin-top: 16px;
      }
      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        color: #151515;
        font-size: 12px;
        font-weight: 850;
        line-height: 18px;
        text-transform: uppercase;
      }
      .section-title span {
        color: #7a837b;
        font-weight: 750;
      }
      .swatches {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }
      .swatch {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        min-width: 0;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 8px;
        background: #ffffff;
      }
      .swatch-chip {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        border: 1px solid rgba(0,0,0,.12);
      }
      .swatch-code {
        display: block;
        overflow: hidden;
        color: #151515;
        font-size: 12px;
        font-weight: 800;
        line-height: 16px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .swatch-role {
        display: block;
        overflow: hidden;
        color: #7a837b;
        font-size: 11px;
        line-height: 15px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .component-line,
      .mapping-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        border: 1px solid #d7ded8;
        border-radius: 8px;
        padding: 10px 11px;
        background: #ffffff;
        color: #151515;
        font-size: 12px;
        line-height: 17px;
      }
      .mapping-list {
        display: grid;
        gap: 7px;
      }
      .mapping-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }
      .mapping-copy {
        min-width: 0;
      }
      .mapping-copy strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        background: #eef4f0;
        color: #075f4d;
        font-size: 11px;
        font-weight: 850;
        line-height: 16px;
        white-space: nowrap;
      }
      .friction {
        border: 1px solid #d7ded8;
        border-left: 5px solid #0e7c66;
        background: #ffffff;
        padding: 11px 12px;
        border-radius: 8px;
        margin-bottom: 7px;
      }
      .friction.severity-alta,
      .friction.severity-critica {
        border-left-color: #c94d3f;
      }
      .friction.severity-media {
        border-left-color: #d99b2b;
      }
      .friction strong {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        color: #151515;
        font-size: 13px;
        line-height: 18px;
      }
      .friction p {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #5f6761;
      }
      .top-findings {
        display: grid;
        gap: 7px;
      }
      .finding-type {
        color: #075f4d;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .02em;
        text-transform: uppercase;
      }
      .actions {
        display: grid;
        gap: 8px;
        padding: 12px 14px 14px;
        border-top: 1px solid #d7ded8;
        background: #ffffff;
      }
      .secondary-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      button.copy {
        width: 100%;
        border: 0;
        border-radius: 8px;
        padding: 12px 12px;
        background: #151515;
        color: white;
        font: inherit;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
        transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), background-color 120ms cubic-bezier(0.2, 0, 0, 1);
      }
      button.copy:active,
      .close:active {
        transform: scale(0.96);
      }
      button.copy.secondary {
        background: #eef4f0;
        color: #151515;
      }
      .notice {
        font-size: 11px;
        line-height: 16px;
        color: #7a837b;
        margin: 0;
      }
      @media (max-width: 520px) {
        :host {
          inset: 10px;
          width: auto;
        }
        .hero-summary {
          grid-template-columns: 1fr;
        }
        .score {
          min-height: 86px;
        }
        .swatches,
        .secondary-actions {
          grid-template-columns: 1fr;
        }
      }
  `;

  const closeButton = element('button', {
    class: 'close',
    type: 'button',
    'aria-label': 'Cerrar panel'
  }, ['×']);

  const weakBlocksCount = snapshot.behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).length;
  const classification = snapshot.pageClassification || {};
  const findings = snapshot.findings || [];
  const findingGroups = groupFindings(findings);
  const uxFrictionCount = findingGroups.ux.filter(finding => finding.confidence === 'high' && finding.priority !== 'Review').length;
  const manualReviewCount = findingGroups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length;
  const dsRiskCount = findingGroups.designSystem.length;
  const summaryText = uxFrictionCount > 0
    ? `${uxFrictionCount} fricción(es) UX de alta confianza.`
    : weakBlocksCount > 0
      ? 'No se detectan fricciones UX de alta confianza. Hay bloques que conviene revisar.'
      : classification.analysisMode === 'full_behavioral'
        ? 'No se detectan fricciones UX de alta confianza.'
        : 'Análisis behavioral limitado por arquetipo de página.';
  const componentSummary = `Botones ${snapshot.components.counts.buttons} · Inputs ${snapshot.components.counts.inputs} · Enlaces ${snapshot.components.counts.links} · Tarjetas ${snapshot.components.counts.cards}`;

  const heroSummary = element('div', { class: 'hero-summary' }, [
    element('div', { class: 'score' }, [
      element('div', {}, [
        element('strong', {}, [String(snapshot.frictions.length)]),
        element('span', {}, ['Señales raw'])
      ])
    ]),
    element('div', { class: 'summary-copy' }, [
      element('strong', {}, [summaryText]),
      element('p', {}, [`${snapshot.meta.title || 'Pantalla actual'} · ${snapshot.meta.viewport.width}×${snapshot.meta.viewport.height}`])
    ])
  ]);

  const grid = element('div', { class: 'grid' }, [
    metric('Fricciones UX', uxFrictionCount),
    metric('Bloques a revisar', weakBlocksCount),
    metric('Riesgos DS', dsRiskCount),
    metric('Revisión manual', manualReviewCount)
  ]);

  const swatches = element('div', { class: 'swatches' });
  for (const color of snapshot.colors.colors.slice(0, 8)) {
    swatches.appendChild(element('div', { class: 'swatch' }, [
      element('span', { class: 'swatch-chip', style: { background: color.value } }),
      element('span', {}, [
        element('span', { class: 'swatch-code' }, [color.value]),
        element('span', { class: 'swatch-role', title: color.roleReason || '' }, [`${displayColorRole(color)} · ${color.count}`])
      ])
    ]));
  }
  if (!swatches.childElementCount) {
    swatches.appendChild(element('p', { class: 'notice' }, ['No se detectan colores.']));
  }

  const mappingRows = snapshot.behavioralMapping.map(block => element('div', { class: 'mapping-row' }, [
    element('div', { class: 'mapping-copy' }, [
      element('strong', {}, [block.displayLabel || behavioralBlockDisplayLabel(block.block)]),
      element('div', { class: 'mapping-meta' }, [
        element('span', { class: 'pill' }, [presenceLabel(block.present)]),
        element('span', { class: 'pill' }, [`calidad ${block.quality}/5`]),
        element('span', { class: 'pill' }, [confidenceLabel(block.confidence || blockConfidence(block))])
      ])
    ]),
    element('span', { class: 'pill' }, [block.title || 'bloque'])
  ]));

  const topFindingNodes = topFindingsByType(findingGroups, findings).map(item => element('div', { class: `friction ${severityClass(item.finding.severity)}` }, [
    element('strong', {}, [
      element('span', {}, [
        element('span', { class: 'finding-type' }, [item.type]),
        ' ',
        item.finding.title
      ]),
      element('span', { class: 'pill' }, [item.finding.priority])
    ]),
    element('p', {}, [`${confidenceLabel(item.finding.confidence)} · ${item.finding.rationale}`])
  ]));

  const body = element('div', { class: 'body' }, [
    heroSummary,
    grid,
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [
        'Colores principales',
        element('span', {}, [`${snapshot.colors.colors.length} muestras`])
      ]),
      swatches
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Componentes']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [componentSummary]),
        element('span', { class: 'pill' }, [`${snapshot.components.counts.ctaGroups} grupos CTA`])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Clasificación']),
      element('div', { class: 'component-line' }, [
        element('span', {}, [`${classification.archetype || 'unknown'} · ${classification.confidence || 'low'}`]),
        element('span', { class: 'pill' }, [classification.analysisMode || 'snapshot_only'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, [classification.analysisMode === 'full_behavioral' ? 'Mapa behavioral' : 'Revisión manual']),
      ...(classification.analysisMode === 'full_behavioral'
        ? (mappingRows.length ? [element('div', { class: 'mapping-list' }, mappingRows)] : [element('p', { class: 'notice' }, ['No hay mapa behavioral disponible.'])])
        : [element('p', { class: 'notice' }, ['No se generan recomendaciones de conversión con la matriz behavioral actual para este arquetipo.'])])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Lente conductual']),
      ...(classification.analysisMode === 'full_behavioral' ? [
        element('p', { class: 'notice' }, [uxFrictionCount ? 'Hay fricciones UX de alta confianza; revisar tarjetas de hipótesis antes de actuar.' : 'No se detectan fricciones UX de alta confianza. Los bloques a revisar son revisión, no bloqueo crítico.'])
      ] : [
        element('p', { class: 'notice' }, ['Salida acotada a snapshot, inventario, accesibilidad y notas manuales.'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Hallazgos principales']),
      ...(topFindingNodes.length ? [element('div', { class: 'top-findings' }, topFindingNodes)] : [
        element('p', { class: 'notice' }, ['No hay hallazgos priorizados. Revisa el markdown para baseline y notas manuales.'])
      ])
    ])
  ]);

  const copyButtons = [
    element('button', { class: 'copy primary', type: 'button', 'data-copy': 'design' }, ['Copiar design-context.md']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'json' }, ['Copiar JSON']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'issue' }, ['Copiar issue GitHub'])
  ];

  const copyStatus = element('p', { class: 'notice', 'data-copy-status': '' }, [
    'Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.'
  ]);

  const panel = element('div', { class: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'contextic-title' }, [
    element('header', { class: 'panel-header' }, [
      element('div', { class: 'brand' }, [
        element('img', { class: 'brand-mark', src: CONTEXTIC_LOGO_SRC, alt: 'Contextic', width: '38', height: '38', draggable: 'false' }),
        element('div', {}, [
          element('p', { class: 'kicker' }, ['Contexto de diseño']),
          element('h2', { id: 'contextic-title' }, ['Contextic']),
          element('p', { class: 'subtitle' }, ['Evidencia, confianza e hipótesis listas para handoff.'])
        ])
      ]),
      closeButton
    ]),
    body,
    element('div', { class: 'actions' }, [
      copyButtons[0],
      element('div', { class: 'secondary-actions' }, [copyButtons[1], copyButtons[2]]),
      copyStatus
    ])
  ]);

  shadow.append(style, panel);

  const removePanel = () => host.remove();
  closeButton.addEventListener('click', removePanel);
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      removePanel();
    }
  });
  closeButton.focus({ preventScroll: true });
  copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-copy');
      const payload = key === 'design' ? designContext : key === 'json' ? jsonReport : githubIssue;
      const copied = await copyToClipboard(payload);
      const previous = button.textContent;
      button.textContent = copied ? 'Copiado' : 'No se pudo copiar';
      copyStatus.textContent = copied ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.';
      setTimeout(() => { button.textContent = previous; }, 1200);
    });
  });
}

function metric(label, value) {
  return element('div', { class: 'metric' }, [
    element('strong', {}, [String(value)]),
    element('span', {}, [label])
  ]);
}

function presenceLabel(value = '') {
  if (value === 'sí') return 'presente';
  if (value === 'parcial') return 'parcial';
  if (value === 'no') return 'ausente';
  return value || 'desconocido';
}

function confidenceLabel(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high' || normalized === 'alta') return 'confianza alta';
  if (normalized === 'medium' || normalized === 'media') return 'confianza media';
  if (normalized === 'low' || normalized === 'baja') return 'confianza baja';
  return 'confianza desconocida';
}

function blockConfidence(block = {}) {
  if (block.present === 'sí' && block.quality >= 4 && (block.evidence || []).length >= 2) return 'high';
  if (block.present === 'parcial' || (block.evidence || []).length) return 'medium';
  return 'low';
}

function topFindingsByType(groups = {}, findings = []) {
  const buckets = [
    ['UX', groups.ux || []],
    ['DS', groups.designSystem || []],
    ['Accesibilidad', groups.accessibility || []],
    ['Revisión', [...(groups.manualReview || []), ...findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review')]]
  ];
  const items = [];

  for (const [type, findings] of buckets) {
    const finding = findings[0];
    if (finding) items.push({ type, finding });
    if (items.length >= 3) break;
  }

  return items;
}

function displayColorRole(color = {}) {
  const role = color.suggestedRole || 'unknown';
  const confidence = color.roleConfidence || 'low';
  if (confidence === 'low') {
    if (role === 'error' || role === 'success') return 'unknown';
    if (role !== 'unknown') return `${role}?`;
  }
  return role;
}

function severityClass(severity = '') {
  const normalized = String(severity).toLowerCase();
  if (normalized.includes('cr')) return 'severity-critica';
  if (normalized.includes('alt')) return 'severity-alta';
  if (normalized.includes('med')) return 'severity-media';
  return 'severity-baja';
}

function element(tagName, attributes = {}, children = []) {
  const node = document.createElement(tagName);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    if (name === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else {
      node.setAttribute(name, String(value));
    }
  }

  for (const child of children) {
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

async function copyToClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Sigue con fallback manual.
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy') === true;
  textarea.remove();
  return copied;
}

runContextic();

})();
