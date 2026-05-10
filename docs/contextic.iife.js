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

const COLOR_PROPERTIES = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];

function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const colorSamples = new Map();
  const cssVariables = collectCssVariables();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of COLOR_PROPERTIES) {
      const normalized = normalizeColor(style[property]);
      if (!normalized) continue;

      // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
      const weight = property === 'backgroundColor' || property === 'color' ? 2 : 1;
      incrementMap(colorUsage, normalized, weight);

      if (!colorSamples.has(normalized)) {
        colorSamples.set(normalized, {
          selector: readableSelector(element),
          property
        });
      }
    }
  }

  const colors = topFromMap(colorUsage, limit).map(item => {
    const sample = colorSamples.get(item.value);
    const role = guessColorRole(item.value, item.count, sample?.property);
    return {
      ...item,
      sample,
      suggestedRole: role.role,
      roleConfidence: role.confidence
    };
  });

  return {
    colors,
    totalUniqueColors: colorUsage.size,
    cssVariables
  };
}

function readableSelector(element) {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList || []).slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName.toLowerCase()}${id}${classes}` || element.tagName.toLowerCase();
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

function guessColorRole(hex, count, property = '') {
  const { r, g, b } = hexToRgb(hex);
  const luminance = relativeLuminance(r, g, b);
  const saturation = colorSaturation(r, g, b);

  if (property.toLowerCase().includes('border') && saturation < 0.18) return { role: 'border', confidence: 'possible' };
  if (luminance > 0.92 && count > 8) return { role: 'surface', confidence: 'likely' };
  if (luminance < 0.12 && count > 8) return { role: 'text', confidence: 'likely' };
  if (r > 180 && g < 100 && b < 110) return { role: 'error', confidence: 'possible' };
  if (g > 120 && r < 140 && b < 150) return { role: 'success', confidence: 'possible' };
  if (r > 190 && g > 120 && b < 90) return { role: 'warning', confidence: 'possible' };
  if (b > 150 && r < 140 && g > 90) return { role: 'info', confidence: 'possible' };
  if (saturation > 0.35 && count > 1) return { role: 'primary', confidence: 'possible' };
  return { role: 'unknown', confidence: 'unknown' };
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


// ---- src/collect-spacing.js ----

const SPACING_PROPERTIES = [
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'rowGap', 'columnGap'
];

function collectSpacing(root = document.body, options = {}) {
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


// ---- src/collect-components.js ----

function collectComponents(root = document.body) {
  const buttons = Array.from(root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a[class*="button"], a[class*="btn"]')).filter(isVisibleElement);
  const links = Array.from(root.querySelectorAll('a[href]')).filter(isVisibleElement);
  const inputs = Array.from(root.querySelectorAll('input, textarea, select')).filter(isVisibleElement);
  const cards = Array.from(root.querySelectorAll('[class*="card"], article, [data-card]')).filter(isVisibleElement);
  const alerts = Array.from(root.querySelectorAll('[role="alert"], [aria-live], .alert, [class*="toast"], [class*="notification"]')).filter(isVisibleElement);
  const navigation = Array.from(root.querySelectorAll('nav, [role="navigation"]')).filter(isVisibleElement);
  const forms = Array.from(root.querySelectorAll('form')).filter(isVisibleElement);
  const images = Array.from(root.querySelectorAll('img')).filter(isVisibleElement);
  const badges = Array.from(root.querySelectorAll('[class*="badge"], [class*="tag"], [class*="pill"], [data-badge]')).filter(isVisibleElement);
  const dialogs = Array.from(root.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="dialog"]')).filter(isVisibleElement);
  const ctaGroups = findCtaGroups(buttons, links);

  const buttonSamples = buttons.slice(0, 8).map(element => ({
    text: getAccessibleName(element),
    selector: describeElement(element),
    disabled: element.matches(':disabled, [aria-disabled="true"]')
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
      inputs
    }
  };
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


// ---- src/behavioral-model.js ----

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
  who: ['para equipos', 'para empresas', 'para diseñadores', 'para desarrolladores', 'profesionales', 'agencias', 'pymes', 'startups', 'ecommerce', 'b2b'],
  how: ['cómo funciona', 'paso', 'empieza', 'proceso', 'en minutos', 'configura', 'instala', 'onboarding'],
  when: ['hoy', 'ahora', 'limitado', 'últimas', 'plazas', 'hasta', 'solo', 'bono', 'descuento', 'disponible']
};

function buildBehavioralMapping({ components, frictions }, root = document.body) {
  const text = getVisiblePageText(root);
  const lowerText = text.toLowerCase();
  const signals = collectBehavioralSignals(root, components, lowerText);

  return BEHAVIORAL_BLOCKS.map(block => {
    const blockFrictions = frictions.filter(friction => friction.block === block.key || friction.affectedBlocks?.includes(block.key));
    const evidence = buildBlockEvidence(block.key, signals, lowerText, components);
    const present = getPresence(evidence.length, blockFrictions.length, block.key, components);
    const quality = scoreBlockQuality(block.key, evidence.length, blockFrictions, components);
    const missing = getMissingSignals(block.key, signals, components);

    return {
      block: block.key,
      label: block.label,
      title: block.title,
      userQuestion: block.userQuestion,
      present,
      quality,
      evidence,
      missing,
      frictionType: block.frictionLabel,
      detectedFriction: blockFrictions[0]?.title || (missing[0] ? missing[0] : ''),
      severity: blockFrictions[0]?.severityScore || inferSeverityFromQuality(quality),
      recommendation: buildBlockRecommendation(block, present, missing),
      metrics: block.metrics
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
      sectionName: `${block.label} — ${block.title}`,
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
  const ctas = components.samples.buttons.map(button => button.text).filter(Boolean);
  const faqLike = headings.some(heading => /faq|preguntas frecuentes|dudas/i.test(heading));
  const hasStepper = Array.from(root.querySelectorAll('ol, [class*="step"], [class*="paso"], [data-step]')).filter(isVisibleElement).length > 0;
  const hasForm = components.counts.forms > 0 || components.counts.inputs > 0;
  const hasNavigation = components.counts.navigation > 0;
  const hasCards = components.counts.cards >= 3;

  return {
    headings,
    firstViewportHeadings,
    ctas,
    faqLike,
    hasStepper,
    hasForm,
    hasNavigation,
    hasCards,
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
    if (/para\s+(equipos|empresas|diseñadores|desarrolladores|agencias|profesionales|pymes|startups)/i.test(lowerText)) evidence.push('El contenido menciona un segmento objetivo explícito.');
  }

  if (block === 'how') {
    if (signals.hasStepper) evidence.push('Se detecta estructura de pasos o proceso.');
    if (/cómo funciona|paso|empieza|configura/i.test(lowerText)) evidence.push('El contenido anticipa funcionamiento o inicio.');
  }

  if (block === 'where') {
    if (components.counts.buttons > 0) evidence.push(`${components.counts.buttons} botón(es) o acciones detectadas.`);
    if (signals.hasForm) evidence.push('Se detecta formulario o campos de entrada.');
  }

  if (block === 'when') {
    if (/hoy|ahora|limitado|últimas|hasta|disponible/i.test(lowerText)) evidence.push('Hay señales de momento, disponibilidad o incentivo temporal.');
  }

  return evidence;
}

function getPresence(evidenceCount, frictionCount, block, components) {
  if (block === 'where' && components.counts.buttons === 0 && components.counts.links === 0) return 'no';
  if (evidenceCount >= 2 && frictionCount === 0) return 'sí';
  if (evidenceCount >= 1) return 'parcial';
  return 'no';
}

function scoreBlockQuality(block, evidenceCount, blockFrictions, components) {
  let score = evidenceCount >= 2 ? 4 : evidenceCount === 1 ? 3 : 1;
  if (block === 'where' && components.counts.buttons === 0 && components.counts.links === 0) score = 1;
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
  if (!(signals.keywordHits.who || []).length) missingByBlock.who.push('El segmento objetivo no parece estar explícito.');
  if (!signals.hasStepper && !(signals.keywordHits.how || []).length) missingByBlock.how.push('No se anticipa claramente cómo funciona o qué ocurre después.');
  if (components.counts.buttons === 0 && components.counts.links === 0) missingByBlock.where.push('No se detecta una acción clara para avanzar.');
  if (!(signals.keywordHits.when || []).length) missingByBlock.when.push('No se detecta un motivo legítimo para actuar ahora.');

  return missingByBlock[block];
}

function inferSeverityFromQuality(quality) {
  if (quality <= 1) return 4;
  if (quality === 2) return 3;
  if (quality === 3) return 2;
  return 1;
}

function buildBlockRecommendation(block, present, missing) {
  if (present === 'sí' && !missing.length) return `Mantener el bloque ${block.label} y validar su rendimiento con métricas de comportamiento.`;
  return `Refuerza ${block.label} con ${block.recommendedPatterns.slice(0, 2).join(' + ')} para resolver: ${missing[0] || block.frictionLabel}.`;
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

function getVisiblePageText(root) {
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

  if (spacing.totalUniqueSpacingValues > 18) {
    frictions.push(createFinding({
      block: 'how',
      affectedBlocks: ['how', 'where'],
      type: 'esfuerzo_percibido',
      typeLabel: 'Esfuerzo percibido',
      severity: 'media',
      severityScore: 3,
      expectedImpact: 'medium',
      implementationEffort: 'medium',
      confidence: 'media',
      evidenceType: 'structural',
      evidence: `${spacing.totalUniqueSpacingValues} valores únicos de espaciado.`,
      principle: 'fluidez visual',
      title: 'La escala de espaciado podría estar derivando',
      insight: `Se detectan ${spacing.totalUniqueSpacingValues} valores únicos de espaciado.`,
      risk: 'Demasiados valores de espaciado crean ruido visual y dificultan el mantenimiento.',
      recommendation: 'Consolida alrededor de una escala pequeña de espaciado, por ejemplo 4/8/12/16/24/32/48.',
      systemImplication: 'Mapea valores repetidos a tokens y documenta las excepciones permitidas.'
    }));
  }

  if (spacing.totalUniqueRadiusValues > 5) {
    frictions.push(createFinding({
      block: 'where',
      affectedBlocks: ['where'],
      type: 'baja_accionabilidad',
      typeLabel: 'Baja accionabilidad',
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
      block: 'where',
      affectedBlocks: ['what', 'where'],
      type: 'baja_accionabilidad',
      typeLabel: 'Baja accionabilidad',
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
  const hypothesis = finding.hypothesis || toHypothesis(finding.insight || finding.evidence);

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

function toHypothesis(signal = '') {
  if (!signal) return 'Podría existir una fricción conductual que requiere validación de producto/diseño.';
  return `Podría existir una fricción conductual asociada a esta señal: ${signal}`;
}


// ---- src/contextic-report.js ----
const TOOL_NAME = 'Contextic';
const LANGUAGE = 'es';

function buildContexticReport(snapshot = {}) {
  const colors = snapshot.colors || {};
  const typography = snapshot.typography || {};
  const spacing = snapshot.spacing || {};
  const components = snapshot.components || {};
  const behavioralMapping = snapshot.behavioralMapping || [];
  const frictions = snapshot.frictions || [];
  const behavioralRecommendation = snapshot.behavioralRecommendation || {};

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
    detectedTokens: {
      colors: colors.colors || [],
      cssVariables: colors.cssVariables || [],
      typography: typography.typeStyles || [],
      spacing: spacing.spacingScale || [],
      radius: spacing.radii || [],
      shadows: spacing.shadows || [],
      borders: spacing.borders || []
    },
    detectedComponents: buildDetectedComponents(components),
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
      evidence: ['Se detectan formularios y señales de acción Where.']
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
    value: `Bloque ${weak.label || weak.block} débil o ausente`,
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
    present: block.present,
    quality: block.quality,
    evidence: block.evidence || [],
    missing: block.missing || [],
    frictionType: block.frictionType || 'unknown',
    detectedFriction: block.detectedFriction || '',
    severity: block.severity ?? null,
    recommendation: block.recommendation || '',
    metrics: block.metrics || []
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
  const frictions = snapshot.frictions || [];
  const behavioralMapping = snapshot.behavioralMapping || [];
  const report = buildContexticReport(snapshot);

  return `# design-context.md — Contextic

Capturado desde: ${report.meta.sourceUrl}
Título: ${report.screenSummary.pageTitle || 'Sin título'}
Generado en: ${report.meta.generatedAt}
Viewport: ${meta.viewport?.width || 'unknown'}x${meta.viewport?.height || 'unknown'}

## Design System Snapshot

### Colors detected by frequency
| Color | Count | Inferred role | Confidence | Observed use |
|---|---:|---|---|---|
${buildColorRows(colors)}

### Typography detected
| Font family | Size | Line height | Weight | Count | Probable use |
|---|---:|---:|---:|---:|---|
${buildTypographyRows(typography)}

### Spacing, radius, shadows and borders
| Token group | Recurrent values | Notes |
|---|---|---|
${buildDesignSystemTokenRows(spacing)}

### CSS variables detected
${buildCssVariableList(colors.cssVariables || [])}

## Component Inventory

| Component candidate | Instances | Variants inferred | Recommended states | Accessibility risk | Design system recommendation |
|---|---:|---|---|---|---|
${buildComponentInventoryRows(components)}

### UI patterns observed
${buildPatternList(components, behavioralMapping)}

## UX Friction Notes

${frictions.length ? frictions.map((friction, index) => formatFriction(friction, index + 1)).join('\n\n') : '- No se detectan fricciones UX heurísticas relevantes. Revisa manualmente antes de tomar decisiones de producto.'}

### Behavioral block map
| Block | Present | Quality | Evidence | Friction note | Severity |
|---|---|---:|---|---|---:|
${behavioralMapping.map(formatBehavioralMapRow).join('\n')}

## Implementation guidance

${buildImplementationGuidance(snapshot).map(item => `- ${item}`).join('\n')}

## Prioritized follow-up

| Prioridad | Cambio | Fricción resuelta | Impacto esperado | Esfuerzo | Dependencias |
|---:|---|---|---|---|---|
${buildPrioritizationRows(frictions, behavioralMapping)}

## Recommended metrics

- CTR del CTA principal.
- Scroll depth por bloque behavioral.
- Ratio de interacción con prueba social.
- Inicio de formulario.
- Finalización de formulario.
- Clicks en CTA secundarios.
- Tiempo hasta primer CTA click.
- Drop-off por sección.
- Ratio de usuarios que llegan a bloques de objeción.
- Conversión final.

## Handoff summary

### Lo que funciona
${buildWhatWorks(behavioralMapping)}

### Lo que bloquea la conversión
${buildWhatBlocks(frictions, behavioralMapping)}

### Cambios mínimos de mayor impacto
${buildMinimumChanges(frictions, behavioralMapping)}

### Siguiente experimento recomendado
${buildNextExperiment(frictions, behavioralMapping)}
`;
}

function buildJsonExport(snapshot) {
  return buildContexticJsonExport(snapshot);
}

function buildGithubIssueExport(input = {}) {
  const snapshot = looksLikeReport(input) ? {} : input;
  const report = looksLikeReport(input) ? input : buildContexticReport(snapshot);
  const evidence = buildGithubEvidence(snapshot, report);
  const problem = buildGithubProblem(snapshot, report, evidence);
  const suggestedFix = buildGithubSuggestedFix(snapshot, report, evidence);
  const acceptanceCriteria = buildGithubAcceptanceCriteria(snapshot, report, evidence);
  const implementationNotes = buildImplementationGuidance(snapshot).slice(0, 8);

  return `# UI/UX debt detected on current page

## Problem
${problem}

## Evidence
${evidence.length ? evidence.map(item => `- ${item}`).join('\n') : '- No strong automated evidence was detected. Treat this issue as a conservative manual UI review task.'}

## Suggested fix
${suggestedFix}

## Acceptance criteria
${acceptanceCriteria.map(item => `- [ ] ${item}`).join('\n')}

## Notes for implementation
${implementationNotes.map(item => `- ${item}`).join('\n')}
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
        presente: block.present,
        calidad: block.quality,
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
    const observedUse = color.sample ? `${color.sample.property} on ${color.sample.selector}` : 'unknown';
    return `| ${color.value} | ${color.count} | ${color.suggestedRole || 'unknown'} | ${color.roleConfidence || roleConfidenceFromName(color.suggestedRole)} | ${escapePipes(observedUse)} |`;
  });

  return rows.join('\n') || '| unknown | 0 | unknown | unknown | No color evidence detected |';
}

function buildTypographyRows(typography = {}) {
  const rows = (typography.typeStyles || []).slice(0, 10).map(style => {
    const parsed = parseTypeStyle(style.value);
    return `| ${escapePipes(parsed.fontFamily)} | ${parsed.fontSize} | ${parsed.lineHeight} | ${parsed.weight} | ${style.count} | ${inferTypographyUse(parsed)} |`;
  });

  return rows.join('\n') || '| unknown | unknown | unknown | unknown | 0 | No typography evidence detected |';
}

function buildDesignSystemTokenRows(spacing = {}) {
  const spacingValues = formatTokenValues(spacing.spacingScale, 10);
  const radiusValues = formatTokenValues(spacing.radii, 8);
  const shadowValues = formatTokenValues(spacing.shadows, 4);
  const borderValues = formatTokenValues(spacing.borders, 6);

  return [
    `| Spacing | ${spacingValues} | ${spacing.totalUniqueSpacingValues ? `${spacing.totalUniqueSpacingValues} unique spacing values detected.` : 'unknown'} |`,
    `| Radius | ${radiusValues} | ${spacing.totalUniqueRadiusValues ? `${spacing.totalUniqueRadiusValues} unique radius values detected.` : 'unknown'} |`,
    `| Shadows | ${shadowValues} | Preserve existing elevation before adding new shadows. |`,
    `| Borders | ${borderValues} | Reuse detected border widths/styles before adding new ones. |`
  ].join('\n');
}

function buildCssVariableList(cssVariables = []) {
  if (!cssVariables.length) return '- No CSS variables detected in computed root styles.';

  return [
    '| Variable | Value |',
    '|---|---|',
    ...cssVariables.slice(0, 16).map(variable => `| ${escapePipes(variable.name)} | ${escapePipes(variable.value)} |`)
  ].join('\n');
}

function buildComponentInventoryRows(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  const componentRows = [
    componentInventoryRow('Button', count(counts.buttons), inferButtonVariants(samples), interactiveStates('button'), buttonAccessibilityRisk(components), recommendComponent(count(counts.buttons), buttonAccessibilityRisk(components), 2)),
    componentInventoryRow('Link', count(counts.links), inferLinkVariants(samples), interactiveStates('link'), linkAccessibilityRisk(components), recommendComponent(count(counts.links), linkAccessibilityRisk(components), 4)),
    componentInventoryRow('Form field', count(counts.inputs), inferFormFieldVariants(components), interactiveStates('formField'), formFieldAccessibilityRisk(components), recommendComponent(count(counts.inputs), formFieldAccessibilityRisk(components), 2)),
    componentInventoryRow('Card', count(counts.cards), count(counts.cards) ? 'layout/content variants unknown' : 'none detected', 'default', 'unknown', recommendComponent(count(counts.cards), 'unknown', 3)),
    componentInventoryRow('Alert', count(counts.alerts), count(counts.alerts) ? 'status messaging candidate' : 'none detected', 'default, error, success, warning, info', count(counts.alerts) ? 'verify role and live region behavior' : 'unknown', recommendComponent(count(counts.alerts), 'unknown', 2)),
    componentInventoryRow('Badge', count(counts.badges), count(counts.badges) ? 'label/status candidate' : 'none detected', 'default', 'verify contrast at small sizes', recommendComponent(count(counts.badges), 'verify contrast at small sizes', 3)),
    componentInventoryRow('Navigation', count(counts.navigation), count(counts.navigation) ? 'landmark/navigation candidate' : 'none detected', 'default, hover, focus, current', count(counts.navigation) ? 'verify landmarks, current state and focus order' : 'unknown', recommendComponent(count(counts.navigation), 'unknown', 1)),
    componentInventoryRow('Modal/Dialog', count(counts.dialogs), count(counts.dialogs) ? 'dialog candidate' : 'none detected', 'default, focus-trapped, closing, loading, error', count(counts.dialogs) ? 'verify focus trap, escape behavior and aria-modal' : 'unknown', recommendComponent(count(counts.dialogs), 'verify focus trap, escape behavior and aria-modal', 1)),
    componentInventoryRow('Form', count(counts.forms), count(counts.forms) ? 'submission flow candidate' : 'none detected', 'default, validating, loading, disabled, error, success', formAccessibilityRisk(components), recommendComponent(count(counts.forms), formAccessibilityRisk(components), 1)),
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
  const recurrentColors = (colors.colors || []).slice(0, 6).map(color => `${color.value} (${color.suggestedRole || 'unknown'})`).join(', ');
  const fontFamilies = (typography.fontFamilies || []).slice(0, 3).map(item => item.value).join(', ');
  const guidance = [];

  if (dominantSpacing) guidance.push(`[detected] Preserve the detected spacing rhythm: ${dominantSpacing}. Use these values before introducing new spacing.`);
  else guidance.push('[guidance] Define a small spacing scale before adding new layout values.');

  if (recurrentColors) guidance.push(`[detected] Reuse detected colors before adding new ones: ${recurrentColors}. Map any new grey or state color to a named token.`);
  else guidance.push('[guidance] Do not introduce new greys or state colors without mapping them to semantic tokens.');

  if (dominantRadius) guidance.push(`[detected] Do not create new radii unless needed; ${dominantRadius} is the most frequent detected radius.`);
  else guidance.push('[guidance] Choose one default radius for buttons/cards before adding variants.');

  if (fontFamilies) guidance.push(`[detected] Keep typography changes within the detected families first: ${fontFamilies}.`);
  guidance.push('[guidance] Maintain one primary CTA per decision block; secondary actions should look secondary.');
  guidance.push('[guidance] Define interactive states for reusable controls: default, hover, focus, loading, disabled, error and success.');
  guidance.push('[guidance] Do not rely on placeholder text as the only form label.');
  guidance.push('[guidance] Respect heading hierarchy and avoid skipping semantic heading levels when changing copy/layout.');
  guidance.push('[guidance] Maintain sufficient contrast for text, borders, focus rings and status colors.');

  if (count(components.counts?.inputs) && (components.samples?.unlabeledInputs || []).length) {
    guidance.push(`[detected] Add explicit labels or accessible names for ${(components.samples.unlabeledInputs || []).length} detected unlabeled form field(s).`);
  }

  if (count(components.counts?.buttons) > 1) {
    guidance.push(`[detected] Review ${components.counts.buttons} detected buttons/actions for primary vs secondary hierarchy.`);
  }

  return guidance;
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

  if (Number.isFinite(colors.totalUniqueColors)) evidence.push(`${colors.totalUniqueColors} unique color value(s) detected.`);
  else if ((reportTokens.colors || []).length) evidence.push(`${reportTokens.colors.length} reported color token(s) detected.`);
  if (Number.isFinite(spacing.totalUniqueSpacingValues)) evidence.push(`${spacing.totalUniqueSpacingValues} unique spacing value(s) detected.`);
  else if ((reportTokens.spacing || []).length) evidence.push(`${reportTokens.spacing.length} reported spacing token(s) detected.`);
  if (Number.isFinite(spacing.totalUniqueRadiusValues)) evidence.push(`${spacing.totalUniqueRadiusValues} unique radius value(s) detected.`);
  else if ((reportTokens.radius || []).length) evidence.push(`${reportTokens.radius.length} reported radius token(s) detected.`);
  if (Number.isFinite(counts.buttons)) evidence.push(`${counts.buttons} button/CTA candidate(s) detected.`);
  else if (getDetectedComponentCount(report, 'Button')) evidence.push(`${getDetectedComponentCount(report, 'Button')} button/CTA candidate(s) detected.`);
  if (Number.isFinite(counts.ctaGroups) && counts.ctaGroups > 0) evidence.push(`${counts.ctaGroups} CTA group candidate(s) detected.`);
  if ((samples.unlabeledInputs || []).length) evidence.push(`${samples.unlabeledInputs.length} form field(s) without a clear accessible label.`);
  if ((samples.genericLinks || []).length) evidence.push(`${samples.genericLinks.length} generic link label(s) detected.`);
  if (frictions.length) evidence.push(`${frictions.length} UX friction note(s) detected; top note: ${frictions[0].title}.`);

  return evidence;
}

function buildGithubProblem(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.title) return `${frictions[0].title}. This should be reviewed as UI/UX debt before new interface changes are layered on top.`;
  if (evidence.length) return 'The current page shows observable UI/design-system signals that should be reviewed before implementation work continues.';
  return 'Contextic did not detect enough observable evidence for a specific defect. Use this issue as a conservative manual UI review checklist.';
}

function buildGithubSuggestedFix(snapshot, report, evidence) {
  const frictions = snapshot.frictions || report.uxFrictions || [];
  if (frictions[0]?.recommendation) return frictions[0].recommendation;
  if (evidence.length) return 'Normalize the UI around the detected tokens, clarify reusable component states and resolve any accessibility risks with direct DOM/CSS evidence.';
  return 'Review the screen manually, capture concrete evidence, then scope a small UI consistency fix instead of redesigning from assumptions.';
}

function buildGithubAcceptanceCriteria(snapshot, report, evidence) {
  const criteria = ['Evidence used for the fix is listed in the implementation notes or PR description.'];
  const components = snapshot.components || {};

  if (count(components.counts?.buttons) > 0 || getDetectedComponentCount(report, 'Button') > 0) criteria.push('Primary and secondary actions are visually distinguishable and only one primary CTA appears per decision block.');
  if (count(components.counts?.inputs) > 0 || getDetectedComponentCount(report, 'Form field') > 0) criteria.push('Form fields have visible labels or accessible names plus error/help text where relevant.');
  if (evidence.some(item => item.includes('color'))) criteria.push('New or changed colors are mapped to existing or explicitly named semantic tokens.');
  if (evidence.some(item => item.includes('spacing') || item.includes('radius'))) criteria.push('Spacing and radius changes reuse the detected scale unless a documented exception is needed.');

  criteria.push('Interactive components define default, hover, focus, loading, disabled, error and success states when applicable.');
  criteria.push('Contrast and heading hierarchy are checked before merge.');

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
  if (Number.isFinite(weight) && weight >= 650) return 'emphasis or heading';
  if (Number.isFinite(size) && size <= 13) return 'caption/supporting text';
  if (Number.isFinite(size)) return 'body text';
  return 'unknown';
}

function formatTokenValues(items = [], limit = 8) {
  const values = items.slice(0, limit).map(item => `${item.value} (${item.count})`);
  return values.join(', ') || 'unknown';
}

function roleConfidenceFromName(role) {
  if (!role || role === 'unknown' || role === 'sin mapear') return 'unknown';
  if (String(role).includes('candidato') || String(role).includes('possible')) return 'possible';
  return 'likely';
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function inferButtonVariants(samples = {}) {
  const buttons = samples.buttons || [];
  const variants = [];
  if (buttons.length) variants.push('primary candidate from visible actions');
  if (buttons.some(button => button.disabled)) variants.push('disabled');
  return variants.join(', ') || 'none detected';
}

function inferLinkVariants(samples = {}) {
  const variants = ['default'];
  if ((samples.genericLinks || []).length) variants.push('generic-label risk');
  return variants.join(', ');
}

function inferFormFieldVariants(components = {}) {
  const counts = components.counts || {};
  const samples = components.samples || {};
  if (!count(counts.inputs)) return 'none detected';
  const variants = ['text/input candidate'];
  if ((samples.unlabeledInputs || []).length) variants.push('unlabeled');
  if ((samples.disabledControls || []).length) variants.push('disabled');
  return variants.join(', ');
}

function inferCtaGroupVariants(components = {}) {
  const groups = components.samples?.ctaGroups || [];
  if (!groups.length) return 'none detected';
  return groups.map(group => `${group.actions.length} action(s)`).join(', ');
}

function interactiveStates(type) {
  if (type === 'link') return 'default, hover, focus, visited, disabled if applicable';
  if (type === 'formField') return 'default, focus, filled, disabled, error, success, loading';
  return 'default, hover, focus, loading, disabled, error, success';
}

function buttonAccessibilityRisk(components = {}) {
  const disabled = components.samples?.disabledControls || [];
  if (disabled.length) return `${disabled.length} disabled control(s); verify recovery/microcopy`;
  return count(components.counts?.buttons) ? 'verify focus visible and accessible names' : 'unknown';
}

function linkAccessibilityRisk(components = {}) {
  const genericLinks = components.samples?.genericLinks || [];
  if (genericLinks.length) return `${genericLinks.length} generic link label(s)`;
  return count(components.counts?.links) ? 'verify focus visible and descriptive labels' : 'unknown';
}

function formFieldAccessibilityRisk(components = {}) {
  const unlabeled = components.samples?.unlabeledInputs || [];
  if (unlabeled.length) return `${unlabeled.length} field(s) without clear label`;
  return count(components.counts?.inputs) ? 'verify labels, help text and error state' : 'unknown';
}

function formAccessibilityRisk(components = {}) {
  if (!count(components.counts?.forms)) return 'unknown';
  if ((components.samples?.unlabeledInputs || []).length) return 'contains unlabeled field candidates';
  return 'verify submit, loading, success, error and privacy microcopy';
}

function ctaGroupAccessibilityRisk(components = {}) {
  if (!count(components.counts?.ctaGroups)) return 'unknown';
  return 'verify primary/secondary hierarchy and keyboard focus order';
}

function recommendComponent(instances, risk, promotionThreshold) {
  if (instances <= 0) return 'keep_local';
  if (risk && risk !== 'unknown' && !risk.startsWith('verify focus visible')) return 'needs_review';
  if (instances >= promotionThreshold) return 'promote_to_core_component';
  return 'keep_local';
}

function formatBehavioralMapRow(block) {
  return `| ${block.label} | ${block.present} | ${block.quality} | ${escapePipes(block.evidence.slice(0, 2).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing[0] || 'Sin fricción clara')} | ${block.severity} |`;
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
  if (behavioralMapping.find(block => block.block === 'what')?.present !== 'no') patterns.push('- Hero');
  if (components.counts.navigation) patterns.push('- Header / navegación');
  if (components.counts.buttons) patterns.push('- CTA primario / grupo de acciones');
  if (components.counts.cards >= 3) patterns.push('- Cards de beneficios o features');
  if (components.counts.forms) patterns.push('- Formulario');
  if (behavioralMapping.find(block => block.block === 'why_not')?.present !== 'no') patterns.push('- FAQ / confianza / reducción de riesgo');
  return patterns.join('\n') || '- No se detectan patrones UI suficientes por heurística.';
}

function buildPrioritizationRows(frictions, behavioralMapping) {
  const rows = frictions.slice(0, 6).map(friction => `| ${friction.priority} | ${escapePipes(friction.recommendation)} | ${friction.typeLabel || friction.type} | ${translateImpact(friction.expectedImpact)} | ${translateEffort(friction.implementationEffort)} | ${escapePipes(friction.systemImplication || 'Revisión de sistema de diseño')} |`);
  if (rows.length) return rows.join('\n');

  return behavioralMapping
    .filter(block => block.present !== 'sí')
    .slice(0, 4)
    .map(block => `| ${block.block === 'what' || block.block === 'where' ? 'P0' : 'P1'} | Reforzar ${block.label} | ${escapePipes(block.frictionType)} | Medio | Medio | Contenido + patrón UI |`)
    .join('\n') || '| P2 | Revisión manual | Validación heurística | Bajo | Bajo | Ninguna |';
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
  return weak ? `Bloque ${weak.label} débil o ausente` : 'No detectado por heurística';
}

function buildStrategicReading(frictions, behavioralMapping) {
  const weakBlocks = behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).map(block => block.label);
  const top = frictions[0];
  if (top) {
    return `La pantalla parece necesitar refuerzo en ${weakBlocks.slice(0, 3).join(', ') || 'su estructura behavioral'}. El principal riesgo detectado es “${top.title}”, que afecta a ${top.typeLabel || top.type}. Trata esta salida como hipótesis basada en DOM/CSS visible y valida con datos reales de comportamiento.`;
  }
  return `La pantalla no muestra fricciones heurísticas fuertes, pero hay que validar manualmente la claridad de What, Why not y Where. Esta lectura separa observación técnica de recomendación para evitar conclusiones no evidenciadas.`;
}

function buildWhatWorks(behavioralMapping) {
  const strong = behavioralMapping.filter(block => block.present === 'sí' && block.quality >= 4).map(block => `- ${block.label}: ${block.evidence[0] || 'bloque presente con señales suficientes'}`);
  return strong.join('\n') || '- No hay suficientes señales fuertes; conviene validar manualmente.';
}

function buildWhatBlocks(frictions, behavioralMapping) {
  const top = frictions.slice(0, 3).map(friction => `- ${friction.priority}: ${friction.title}`);
  if (top.length) return top.join('\n');
  const weak = behavioralMapping.filter(block => block.present === 'no' || block.quality <= 2).map(block => `- ${block.label}: ${block.missing[0] || 'bloque débil'}`);
  return weak.join('\n') || '- No se detectan bloqueos heurísticos relevantes.';
}

function buildMinimumChanges(frictions, behavioralMapping) {
  const top = frictions.filter(friction => friction.priority === 'P0' || friction.priority === 'P1').slice(0, 3).map(friction => `- ${friction.recommendation}`);
  if (top.length) return top.join('\n');
  return behavioralMapping.filter(block => block.present !== 'sí').slice(0, 3).map(block => `- ${block.recommendation}`).join('\n') || '- Mantener estructura y medir antes de rediseñar.';
}

function buildNextExperiment(frictions, behavioralMapping) {
  const top = frictions[0];
  if (top) return `Probar una variante que resuelva “${top.title}” y medir ${getMetricForBlock(top.block, behavioralMapping)} frente a la versión actual.`;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Probar una variante que refuerce ${weak.label} y medir ${weak.metrics[0] || 'conversión final'}.` : 'Mantener la versión actual y usar el briefing como baseline para futuras iteraciones.';
}

function getMetricForBlock(block, behavioralMapping) {
  return behavioralMapping.find(item => item.block === block)?.metrics[0] || 'conversión final';
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
  const frictions = detectFrictions({ colors, typography, spacing, components }, root);
  const behavioralMapping = buildBehavioralMapping({ components, frictions }, root);
  const behavioralRecommendation = buildBehavioralStructureRecommendation({ behavioralMapping, frictions });

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
    frictions,
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

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        inset: 16px 16px 16px auto;
        width: min(460px, calc(100vw - 32px));
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
      }
      * { box-sizing: border-box; }
      .panel {
        height: 100%;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 16px;
        box-shadow: 0 24px 80px rgba(17, 24, 39, 0.24);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
        align-items: start;
        justify-content: space-between;
      }
      h2 {
        margin: 0;
        font-size: 16px;
        line-height: 24px;
        font-weight: 750;
      }
      .subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #4b5563;
      }
      .close {
        border: 0;
        border-radius: 8px;
        padding: 8px 10px;
        background: #f3f4f6;
        cursor: pointer;
        font: inherit;
      }
      .body {
        overflow: auto;
        padding: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 16px;
      }
      .metric {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        background: #f9fafb;
      }
      .metric strong {
        display: block;
        font-size: 20px;
        line-height: 28px;
      }
      .metric span {
        font-size: 12px;
        color: #4b5563;
      }
      h3 {
        margin: 18px 0 8px;
        font-size: 13px;
        line-height: 18px;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #374151;
      }
      .swatches {
        display: grid;
        gap: 8px;
      }
      .swatch {
        display: grid;
        grid-template-columns: 28px 1fr auto;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .swatch-chip {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid rgba(0,0,0,.12);
      }
      .friction {
        border-left: 4px solid #111827;
        background: #f9fafb;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .friction strong {
        display: block;
        font-size: 13px;
        line-height: 18px;
      }
      .friction p {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #4b5563;
      }
      .actions {
        display: grid;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
      }
      button.copy {
        width: 100%;
        border: 0;
        border-radius: 12px;
        padding: 11px 12px;
        background: #111827;
        color: white;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      button.copy.secondary {
        background: #f3f4f6;
        color: #111827;
      }
      .notice {
        font-size: 11px;
        line-height: 16px;
        color: #6b7280;
        margin: 0;
      }
    </style>
    <div class="panel" role="dialog" aria-modal="false">
      <header>
        <div>
          <h2>Contextic</h2>
          <p class="subtitle">Contexto técnico de diseño listo para IA y handoff.</p>
        </div>
        <button class="close" type="button" aria-label="Cerrar panel">×</button>
      </header>
      <div class="body">
        <div class="grid">
          ${metric('Colores', snapshot.colors.totalUniqueColors)}
          ${metric('Estilos tipográficos', snapshot.typography.totalUniqueTypeStyles)}
          ${metric('Valores de espaciado', snapshot.spacing.totalUniqueSpacingValues)}
          ${metric('Fricciones', snapshot.frictions.length)}
          ${metric('Bloques débiles', snapshot.behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).length)}
        </div>

        <h3>Colores principales</h3>
        <div class="swatches">
          ${snapshot.colors.colors.slice(0, 8).map(color => `
            <div class="swatch">
              <span class="swatch-chip" style="background:${color.value}"></span>
              <span>${color.value}</span>
              <span>${color.count}</span>
            </div>
          `).join('') || '<p class="notice">No se detectan colores.</p>'}
        </div>

        <h3>Conteo de componentes</h3>
        <p class="notice">Botones ${snapshot.components.counts.buttons} · Inputs ${snapshot.components.counts.inputs} · Enlaces ${snapshot.components.counts.links} · Tarjetas ${snapshot.components.counts.cards}</p>

        <h3>Mapa behavioral</h3>
        <p class="notice">${snapshot.behavioralMapping.map(block => `${block.label}: ${block.present} (${block.quality}/5)`).join(' · ')}</p>

        <h3>Lente conductual</h3>
        ${snapshot.frictions.slice(0, 5).map(friction => `
          <div class="friction">
            <strong>${escapeHtml(friction.title)} · ${escapeHtml(friction.severity)}</strong>
            <p>${escapeHtml(friction.principle || 'revisión heurística')} · ${escapeHtml(friction.recommendation)}</p>
          </div>
        `).join('') || '<p class="notice">No se detectan fricciones heurísticas relevantes. Se recomienda revisión manual.</p>'}
      </div>
      <div class="actions">
        <button class="copy" type="button" data-copy="design">Copiar design-context.md</button>
        <button class="copy secondary" type="button" data-copy="json">Copiar JSON</button>
        <button class="copy secondary" type="button" data-copy="issue">Copiar GitHub Issue</button>
        <p class="notice" data-copy-status>Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.</p>
      </div>
    </div>
  `;

  shadow.querySelector('.close').addEventListener('click', () => host.remove());
  shadow.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-copy');
      const payload = key === 'design' ? designContext : key === 'json' ? jsonReport : githubIssue;
      const copied = await copyToClipboard(payload);
      const status = shadow.querySelector('[data-copy-status]');
      const previous = button.textContent;
      button.textContent = copied ? 'Copiado' : 'No se pudo copiar';
      if (status) status.textContent = copied ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.';
      setTimeout(() => { button.textContent = previous; }, 1200);
    });
  });
}

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
