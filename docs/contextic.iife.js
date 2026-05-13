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
const COLOR_ROLES = new Set(['text', 'surface', 'brand', 'primary', 'secondary', 'accent', 'border', 'focus', 'error', 'success', 'warning', 'info', 'utility', 'unknown']);

function collectColors(root = document.body, options = {}) {
  const limit = options.limit || 16;
  const colorUsage = new Map();
  const colorSamples = new Map();
  const colorContexts = new Map();
  const cssVariables = collectCssVariables();

  for (const element of getCandidateElements(root)) {
    const style = window.getComputedStyle(element);

    for (const property of COLOR_PROPERTIES) {
      const normalized = normalizeColor(style[property]);
      if (!normalized) continue;
      const context = buildColorContext(element, property);

      // Los fondos y colores de texto suelen ser más relevantes que bordes repetidos por defecto.
      const weight = context.region === 'hidden_or_system' ? 0.25 : property === 'backgroundColor' || property === 'color' ? 2 : 1;
      incrementMap(colorUsage, normalized, weight);
      if (!colorContexts.has(normalized)) colorContexts.set(normalized, []);
      colorContexts.get(normalized).push(context);

      if (!colorSamples.has(normalized)) {
        colorSamples.set(normalized, {
          selector: readableSelector(element),
          property,
          context
        });
      }
    }
  }

  const colors = topFromMap(colorUsage, limit).map(item => {
    const sample = colorSamples.get(item.value);
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

function buildColorContext(element, property) {
  const selector = readableSelector(element);
  const region = classifyElementRegion(element);
  const componentType = inferComponentType(element);
  const visible = region !== 'hidden_or_system';
  const interactive = isInteractive(element);
  const appearsInCta = interactive && isMainAction(element);
  const validationContext = inferValidationContext(element);

  return {
    property,
    selector,
    componentType,
    region,
    visible,
    interactive,
    appearsInCta,
    validationContext
  };
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
  if (role === 'alert' || role === 'status') return 'alert';
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

function inferValidationContext(element) {
  const descriptor = elementDescriptor(element);
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  const ariaInvalid = element.getAttribute?.('aria-invalid') === 'true';
  const text = String(element.textContent || '').toLowerCase();

  if (ariaInvalid || role === 'alert' || /\b(error|invalid|danger|destructive|delete|remove|eliminar|borrar)\b/.test(descriptor + ' ' + text)) return 'error';
  if (role === 'status' || /\b(success|valid|confirmation|confirmed|completed|complete|ok|done|exito|éxito|confirmado|completado)\b/.test(descriptor + ' ' + text)) return 'success';
  if (/\b(warning|warn|alerta|aviso)\b/.test(descriptor + ' ' + text)) return 'warning';
  if (/\b(info|notice|help|ayuda)\b/.test(descriptor + ' ' + text)) return 'info';
  return 'none';
}

function elementDescriptor(element) {
  const id = element.id || '';
  const classes = Array.from(element.classList || []).join(' ');
  return `${id} ${classes}`.toLowerCase();
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

  if (hasValidationContext(relevantContexts, 'error')) return role('error', 'high', 'Used in explicit error/invalid/destructive context.');
  if (hasValidationContext(relevantContexts, 'success')) return role('success', 'high', 'Used in explicit success/valid/confirmation context.');
  if (hasValidationContext(relevantContexts, 'warning')) return role('warning', 'high', 'Used in explicit warning context.');
  if (hasValidationContext(relevantContexts, 'info')) return role('info', 'medium', 'Used in explicit informational context.');

  if (variableHints.some(name => /\b(brand|primary|main)\b/.test(name)) && isActionColor(relevantContexts)) {
    return role('primary', 'high', 'Brand/primary variable used on visible main action.');
  }
  if (variableHints.some(name => /\b(brand)\b/.test(name))) return role('brand', 'medium', 'Color is exposed through a brand CSS variable.');

  if (isActionColor(relevantContexts)) {
    return role('primary', 'medium', 'Used as background color on visible CTA button or main action.');
  }
  if (relevantContexts.some(context => context.componentType === 'brand_asset')) return role('brand', 'medium', 'Used in visible logo or brand asset context.');
  if (relevantContexts.some(context => context.property === 'outlineColor')) return role('focus', 'medium', 'Used as outline/focus color.');
  if (relevantContexts.some(context => context.property.toLowerCase().includes('border'))) return role('border', saturation < 0.25 ? 'medium' : 'low', 'Used primarily as border color.');

  if (luminance > 0.92 && count > 8) return role('surface', 'medium', 'Frequent light color used on visible elements.');
  if (luminance < 0.12 && count > 8) return role('text', 'medium', 'Frequent dark color used on visible elements.');
  if (variableHints.some(name => /\b(accent|secondary)\b/.test(name))) return role(variableHints.some(name => name.includes('secondary')) ? 'secondary' : 'accent', 'medium', 'Role inferred from CSS variable name and visible usage.');
  if (saturation > 0.35 && count > 1) return role('accent', 'low', 'Saturated visible color without semantic state evidence; kept conservative.');
  return role('unknown', 'low', 'Insufficient contextual evidence for a semantic role.');
}

function role(roleName, confidence, reason) {
  return { role: COLOR_ROLES.has(roleName) ? roleName : 'unknown', confidence, reason };
}

function hasValidationContext(contexts, type) {
  return contexts.some(context => context.validationContext === type);
}

function isActionColor(contexts) {
  return contexts.some(context => context.appearsInCta && ['backgroundColor', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].includes(context.property));
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

  if (!findings.length) {
    findings.push(createFinding({
      id: 'manual.no-high-confidence-frictions',
      type: 'manual_review',
      title: 'No hay fricciones UX de alta confianza',
      evidence: ['Contextic no detectó fricciones heurísticas relevantes con evidencia fuerte.'],
      affectedArea: 'screen',
      severity: 1,
      confidence: 'medium',
      impact: 'low',
      effort: 'low',
      priority: 'Review',
      rationale: 'Sin evidencia fuerte no se eleva ninguna recomendación a P0.'
    }));
  }

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
    affectedArea: friction.block || friction.affectedArea || 'screen',
    severity,
    confidence,
    impact,
    effort,
    priority: assignPriority({ friction, type, severity, confidence, impact }),
    rationale: buildRationale({ friction, type, severity, confidence, impact })
  });
}

function weakBlocksToReviewFindings(behavioralMapping = []) {
  return behavioralMapping
    .filter(block => block.present !== 'sí' || block.quality <= 2)
    .map(block => createFinding({
      id: `review.weak-block.${block.block}`,
      type: 'manual_review',
      title: `Weak block: ${block.label || block.block}`,
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
      rationale: 'Bloque behavioral débil sin fricción heurística fuerte; se mantiene como revisión manual, no como bloqueo crítico.'
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
    rationale: input.rationale || 'Prioridad asignada por evidencia, severidad, confianza e impacto.'
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
    return `Deuda de sistema de diseño: prioridad DS basada en severidad ${severity}, confianza ${confidence} y evidencia: ${evidence}`;
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
function generateHypotheses(findings = [], pageClassification = {}) {
  const rankedFindings = findings
    .filter(shouldCreateHypothesis)
    .sort(compareFindingsForHypotheses);
  const hypotheses = rankedFindings.slice(0, 5).map((finding, index) => findingToHypothesis(finding, pageClassification, index + 1));

  if (hypotheses.length) return hypotheses;

  return [baselineHypothesis(pageClassification)];
}

function shouldCreateHypothesis(finding) {
  if (!finding) return false;
  if (finding.type === 'design_system_debt') return true;
  return finding.priority !== 'Review' || finding.type === 'manual_review';
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

function baselineHypothesis(pageClassification) {
  const archetype = pageClassification.archetype || 'unknown';
  return {
    id: 'H1',
    title: 'Baseline manual review',
    because: 'No hay findings de alta confianza; la salida automática no debe inventar una recomendación de conversión.',
    weBelieve: `La página ${archetype} necesita una revisión de baseline antes de cambiar la experiencia.`,
    ifWe: 'Usamos el snapshot actual como baseline y validamos manualmente CTA, jerarquía, accesibilidad y eventos de analítica.',
    then: 'Podremos decidir qué hipótesis merece diseño, QA o experimento sin elevar señales débiles a prioridad crítica.',
    metrics: {
      primary: 'baseline completion rate or primary task success',
      secondary: ['primary CTA CTR', 'secondary action clicks', 'bounce rate'],
      guardrail: ['no accessibility regressions', 'no increase in rage/dead clicks']
    },
    segments: segmentsFor(pageClassification),
    confidence: 'low',
    effort: 'low',
    experimentType: 'design review'
  };
}

function hypothesisTitle(finding, isDesignSystem) {
  if (isDesignSystem) return `System hypothesis: ${finding.title}`;
  if (finding.affectedArea === 'where' || /cta/i.test(finding.title)) return `Clarify the primary CTA: ${finding.title}`;
  return `Test: ${finding.title}`;
}

function becauseText(finding) {
  return finding.evidence?.length
    ? finding.evidence.slice(0, 2).join('; ')
    : finding.rationale || 'Contextic detected a review signal without strong evidence.';
}

function beliefText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'A clearer component/token decision will improve implementation consistency and reduce future UI drift.';
  }
  if (finding.affectedArea === 'where') {
    return 'Users may hesitate or split attention when the primary action does not clearly match the page objective.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Fixing the accessibility risk will improve task completion without reducing comprehension or conversion.';
  }
  return 'Resolving this finding should improve user comprehension, confidence, or task progression.';
}

function interventionText(finding, isDesignSystem, isManual) {
  if (isDesignSystem) {
    return 'Define or consolidate the affected token/component rule, document it, and verify affected components against the rule.';
  }
  if (isManual && finding.affectedArea === 'where') {
    return 'Review the clarity of the primary CTA, validate whether it answers the page objective, and compare it against secondary actions.';
  }
  if (finding.affectedArea === 'where') {
    return 'Make the primary CTA copy, hierarchy, and placement match the main page objective while keeping secondary actions visibly secondary.';
  }
  if (finding.type === 'accessibility_risk') {
    return 'Fix the accessibility issue and run keyboard/screen-reader and regression checks on the affected component.';
  }
  return 'Create a focused variant or review pass that addresses only this finding and preserves the current design baseline.';
}

function outcomeText(finding, isDesignSystem) {
  if (isDesignSystem) {
    return 'Implementation effort and UI inconsistency should decrease without changing product or content claims.';
  }
  if (finding.affectedArea === 'where') {
    return 'Primary CTA engagement should improve while secondary clicks and bounce do not worsen.';
  }
  return 'The affected user task should become clearer or safer without harming guardrail metrics.';
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
  const hypotheses = snapshot.hypotheses || generateHypotheses(findings, pageClassification);

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
      cssVariables: colors.cssVariables || [],
      typography: typography.typeStyles || [],
      spacing: spacing.spacingScale || [],
      radius: spacing.radii || [],
      shadows: spacing.shadows || [],
      borders: spacing.borders || []
    },
    detectedComponents: buildDetectedComponents(components),
    findings,
    hypotheses,
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
  const behavioralMapping = snapshot.behavioralMapping || [];
  const report = buildContexticReport(snapshot);
  const pageClassification = report.pageClassification || {};
  const scopeMap = report.scopeMap || {};
  const findings = report.findings || [];
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification);
  const findingGroups = groupFindings(findings);
  const lowConfidenceFindings = findings.filter(finding => finding.confidence === 'low' || finding.priority === 'Review');
  const fullBehavioral = pageClassification.analysisMode === 'full_behavioral';

  return `# design-context.md — Contextic

## Capture metadata

- Source URL: ${report.meta.sourceUrl}
- Page title: ${report.screenSummary.pageTitle || 'Sin título'}
- Generated at: ${report.meta.generatedAt}
- Viewport: ${meta.viewport?.width || 'unknown'}x${meta.viewport?.height || 'unknown'}
- Evidence policy: Observed evidence comes from visible DOM/CSS and scoped regions. Inferences below are marked with confidence and should be validated before implementation.

## Page classification

- Archetype: ${pageClassification.archetype || 'unknown'}
- Confidence: ${pageClassification.confidence || 'low'}
- Analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}
- Behavioral scope: ${behavioralScopeNote(pageClassification)}
- Signals: ${(pageClassification.signals || []).join('; ') || 'No hay señales suficientes.'}
- Inference note: ${confidenceNote(pageClassification.confidence, 'Page classification is heuristic and should not be treated as ground truth.')}

## Scope map

### Regions detected
${buildScopeRegionList(scopeMap.regions)}

### Used for behavioral
${buildBehavioralScopeList(scopeMap.usedForBehavioral)}

### Excluded from behavioral
${buildScopeExclusionList(scopeMap.excludedFromBehavioral)}

## Executive summary

${buildExecutiveSummary({ findings, findingGroups, hypotheses, behavioralMapping, pageClassification })}

## Design system snapshot

### Colors detected by frequency
| Color | Count | Inferred role | Confidence | Observed use | Role reason |
|---|---:|---|---|---|---|
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

## Component inventory

| Component candidate | Instances | Variants inferred | Recommended states | Accessibility risk | Design system recommendation |
|---|---:|---|---|---|---|
${buildComponentInventoryRows(components)}

### UI patterns observed
${buildPatternList(components, behavioralMapping)}

## Behavioral assessment

${buildBehavioralAssessment({ fullBehavioral, behavioralMapping, pageClassification })}

## UX findings

${fullBehavioral
  ? buildFindingList(findingGroups.ux.filter(finding => finding.confidence !== 'low' && finding.priority !== 'Review'))
  : '- Análisis behavioral limitado o desactivado por clasificación de página. No se generan recomendaciones de conversión con la matriz actual para este arquetipo.'}

## Design system findings

${buildFindingList(findingGroups.designSystem)}

## Accessibility findings

${buildFindingList(findingGroups.accessibility)}

## Low-confidence findings

${buildFindingList(lowConfidenceFindings)}

## Hypotheses and experiments

${buildHypothesisCards(hypotheses)}

## Implementation guidance

${buildImplementationGuidance(snapshot).filter(item => fullBehavioral || !isConversionGuidance(item)).map(item => `- ${item}`).join('\n')}

## Recommended metrics

${buildRecommendedMetrics(hypotheses)}

## Handoff summary

### What works
${buildWhatWorks(behavioralMapping)}

### High-confidence risks
${buildHighConfidenceRisks(findings)}

### Manual review items
${buildManualReviewSummary(findings, behavioralMapping)}

### Design system debt
${buildDesignSystemDebtSummary(findingGroups.designSystem)}

### Top hypothesis
${buildNextExperiment(hypotheses, behavioralMapping)}
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
  const hypotheses = report.hypotheses || generateHypotheses(findings, pageClassification);
  const groups = groupFindings(findings);
  const weakBlocks = Object.values(report.behavioralMapping || {}).filter(block => block.present !== 'sí' || block.quality <= 2);
  const title = `[Contextic] Review ${pageClassification.archetype || 'unknown'} findings for ${report.screenSummary?.pageTitle || 'untitled page'}`;

  return `# ${title}

## Context
- URL: ${report.meta?.sourceUrl || 'unknown'}
- Viewport: ${formatViewport(snapshot.meta?.viewport)}
- Page archetype: ${pageClassification.archetype || 'unknown'} (${pageClassification.confidence || 'low'} confidence)
- Analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}
- Generated at: ${report.meta?.generatedAt || 'unknown'}
${pageClassification.analysisMode === 'snapshot_only' ? '- Note: analysis mode is snapshot_only; no conversion recommendations are generated by the current behavioral model.' : ''}

## Summary
- UX frictions: ${groups.ux.length}
- Weak blocks: ${weakBlocks.length}${weakBlocks.length ? ` (${weakBlocks.map(block => block.label || block.block).join(', ')})` : ''}
- DS risks: ${groups.designSystem.length}
- Manual review items: ${groups.manualReview.length + findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review').length}

## Top findings
${buildGithubTopFindings(findings)}

## Hypotheses
${buildGithubHypotheses(hypotheses)}

## Implementation notes
- Components affected: ${githubComponentsAffected(report.detectedComponents || [])}
- Tokens affected: ${githubTokensAffected(report.detectedTokens || {}, findings)}
- Accessibility checks: ${githubAccessibilityChecks(report.detectedComponents || [], groups.accessibility)}
- Behavioral scope: used ${formatList(scopeMap.usedForBehavioral)}; excluded ${formatList((scopeMap.excludedFromBehavioral || []).map(item => item.region))}

## Acceptance criteria
- [ ] Findings reviewed
- [ ] CTA hierarchy validated
- [ ] Color roles validated
- [ ] Behavioral scope reviewed
- [ ] Metrics/instrumentation confirmed

## Raw exports
- design-context.md available from Contextic
- JSON available from Contextic
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
    const confidence = color.roleConfidence || roleConfidenceFromName(color.suggestedRole);
    const reason = color.roleReason || (confidence === 'low' || confidence === 'unknown' ? 'Low confidence: insufficient contextual evidence.' : 'Role inferred from color usage.');
    return `| ${color.value} | ${color.count} | ${color.suggestedRole || 'unknown'} | ${confidence} | ${escapePipes(observedUse)} | ${escapePipes(reason)} |`;
  });

  return rows.join('\n') || '| unknown | 0 | unknown | unknown | No color evidence detected | Low confidence: no usage context. |';
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

function buildExecutiveSummary({ findings = [], findingGroups = {}, hypotheses = [], behavioralMapping = [], pageClassification = {} }) {
  const highConfidenceRisks = findings.filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority));
  const weakBlocks = getWeakBlocks(behavioralMapping);
  const topHypothesis = hypotheses[0];
  const lines = [
    `- Observed: ${findings.length} finding(s), ${findingGroups.designSystem?.length || 0} design-system debt item(s), ${findingGroups.accessibility?.length || 0} accessibility finding(s).`,
    `- Inferred: page archetype is ${pageClassification.archetype || 'unknown'} with ${pageClassification.confidence || 'low'} confidence.`,
    highConfidenceRisks.length
      ? `- High-confidence risks: ${highConfidenceRisks.map(finding => finding.title).slice(0, 3).join('; ')}.`
      : '- No se detectan fricciones UX de alta confianza.',
    weakBlocks.length
      ? `- Weak blocks for manual review: ${weakBlocks.map(block => block.label).join(', ')}.`
      : '- No weak behavioral blocks detected by current heuristics.',
    topHypothesis
      ? `- Top hypothesis: ${topHypothesis.id} ${topHypothesis.title}; primary metric: ${topHypothesis.metrics.primary}.`
      : '- No measurable hypothesis generated.'
  ];

  return lines.join('\n');
}

function buildBehavioralAssessment({ fullBehavioral, behavioralMapping = [], pageClassification = {} }) {
  if (!fullBehavioral) {
    return `- Behavioral analysis mode: ${pageClassification.analysisMode || 'snapshot_only'}.
- No conversion recommendations are generated for this archetype with the current behavioral model.
- Treat any behavioral notes as manual review, not optimization instruction.`;
  }

  return `### Behavioral block map
| Block | Present | Quality | Evidence type | Evidence | Manual review note | Severity |
|---|---|---:|---|---|---|---:|
${behavioralMapping.map(formatBehavioralAssessmentRow).join('\n')}

### Weak blocks
${buildWeakBlockList(behavioralMapping)}`;
}

function buildWeakBlockList(behavioralMapping = []) {
  const weak = getWeakBlocks(behavioralMapping).map(block => `- ${block.label}: ${block.missing?.[0] || block.detectedFriction || 'Needs manual validation.'}`);
  return weak.join('\n') || '- No weak blocks detected.';
}

function getWeakBlocks(behavioralMapping = []) {
  return behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2);
}

function formatBehavioralAssessmentRow(block) {
  const evidenceType = block.evidence?.length ? 'observed/inferred from scoped DOM' : 'missing evidence';
  return `| ${block.label} | ${block.present} | ${block.quality} | ${evidenceType} | ${escapePipes((block.evidence || []).slice(0, 2).join('; ') || 'Sin evidencia suficiente')} | ${escapePipes(block.detectedFriction || block.missing?.[0] || 'Sin fricción clara')} | ${block.severity} |`;
}

function confidenceNote(confidence = 'low', fallback = '') {
  if (confidence === 'high') return 'High confidence inference based on multiple observed signals.';
  if (confidence === 'medium') return `Medium confidence inference; validate before making product decisions. ${fallback}`;
  return `Low confidence inference; use as manual review input only. ${fallback}`;
}

function buildFindingList(findings = []) {
  if (!findings.length) return '- No se detectan hallazgos en esta categoría.';
  return findings.map(formatFinding).join('\n\n');
}

function formatFinding(finding) {
  const uncertainty = finding.confidence === 'high'
    ? ''
    : `\n- Uncertainty: ${finding.confidence === 'medium' ? 'Medium-confidence inference; validate with analytics or user evidence.' : 'Low-confidence signal; manual review only.'}`;
  return `### ${finding.priority}: ${finding.title}
- Tipo: ${finding.type}
- Área afectada: ${finding.affectedArea}
- Severidad/confianza: ${finding.severity}/5 · ${finding.confidence}
- Impacto/esfuerzo: ${translateImpact(finding.impact)} · ${translateEffort(finding.effort)}
- Evidencia: ${finding.evidence.length ? finding.evidence.map(escapePipes).join('; ') : 'Sin evidencia automática fuerte.'}
- Rationale: ${finding.rationale}${uncertainty}`;
}

function buildHypothesisCards(hypotheses = []) {
  if (!hypotheses.length) return '- No se generaron hipótesis medibles.';
  return hypotheses.map(formatHypothesisCard).join('\n\n');
}

function formatHypothesisCard(hypothesis) {
  return `### ${hypothesis.id}: ${hypothesis.title}
- Because: ${hypothesis.because}
- We believe: ${hypothesis.weBelieve}
- If we: ${hypothesis.ifWe}
- Then: ${hypothesis.then}
- Primary metric: ${hypothesis.metrics.primary}
- Secondary metrics: ${hypothesis.metrics.secondary.join(', ')}
- Guardrails: ${hypothesis.metrics.guardrail.join(', ')}
- Segments: ${hypothesis.segments.join(', ')}
- Confidence/effort: ${hypothesis.confidence} · ${hypothesis.effort}
- Experiment type: ${hypothesis.experimentType}`;
}

function isConversionGuidance(item = '') {
  return /primary CTA|CTA principal|conversi[oó]n|decision block|bloque de decisi[oó]n/i.test(item);
}

function buildGithubTopFindings(findings = []) {
  if (!findings.length) return '- No findings were generated. Use this as a baseline/manual review task.';
  return findings.slice(0, 5).map(finding => `### ${finding.title}
- Type: ${finding.type}
- Priority: ${finding.priority}
- Evidence: ${finding.evidence?.[0] || 'No strong automatic evidence.'}
- Recommendation: ${finding.rationale || 'Review manually before changing the page.'}
- Confidence: ${finding.confidence}`).join('\n\n');
}

function buildGithubHypotheses(hypotheses = []) {
  if (!hypotheses.length) return '- No hypotheses generated.';
  return hypotheses.map(hypothesis => `### ${hypothesis.id}: ${hypothesis.title}
- If we: ${hypothesis.ifWe}
- Then: ${hypothesis.then}
- Primary metric: ${hypothesis.metrics.primary}
- Guardrails: ${hypothesis.metrics.guardrail.join(', ')}`).join('\n\n');
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
  if (String(role).includes('candidato') || String(role).includes('possible')) return 'low';
  return 'medium';
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

function buildNextExperiment(hypotheses, behavioralMapping) {
  const top = hypotheses[0];
  if (top) return `${top.id}: ${top.title}. ${top.ifWe} Medir ${top.metrics.primary}; guardrails: ${top.metrics.guardrail.join(', ')}. Tipo: ${top.experimentType}.`;
  const weak = behavioralMapping.find(block => block.present === 'no' || block.quality <= 2);
  return weak ? `Use the current page as baseline and validate ${weak.label} before changing the experience.` : 'Use the current page as baseline and validate the next measurable question before changing the experience.';
}

function buildHighConfidenceRisks(findings = []) {
  const risks = findings
    .filter(finding => finding.confidence === 'high' && ['P0', 'P1'].includes(finding.priority) && finding.type !== 'design_system_debt')
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidence: ${finding.evidence[0] || 'not available'}`);
  return risks.join('\n') || '- No se detectan fricciones UX de alta confianza.';
}

function buildManualReviewSummary(findings = [], behavioralMapping = []) {
  const reviewFindings = findings
    .filter(finding => finding.priority === 'Review' || finding.confidence === 'low')
    .map(finding => `- ${finding.title}: ${finding.rationale}`);
  const weakBlocks = getWeakBlocks(behavioralMapping)
    .map(block => `- Weak block ${block.label}: ${block.missing?.[0] || 'needs manual review'}`);
  return [...reviewFindings, ...weakBlocks].join('\n') || '- No manual review items detected beyond normal QA.';
}

function buildDesignSystemDebtSummary(findings = []) {
  return findings
    .map(finding => `- ${finding.priority}: ${finding.title}. Evidence: ${finding.evidence[0] || 'not available'}`)
    .join('\n') || '- No design system debt findings detected.';
}

function buildRecommendedMetrics(hypotheses = []) {
  const primary = new Set();
  const secondary = new Set();
  const guardrail = new Set();

  for (const hypothesis of hypotheses) {
    if (hypothesis.metrics?.primary) primary.add(hypothesis.metrics.primary);
    for (const metric of hypothesis.metrics?.secondary || []) secondary.add(metric);
    for (const metric of hypothesis.metrics?.guardrail || []) guardrail.add(metric);
  }

  return [
    '### Primary',
    ...(primary.size ? Array.from(primary).map(metric => `- ${metric}`) : ['- primary task completion rate']),
    '',
    '### Secondary',
    ...(secondary.size ? Array.from(secondary).map(metric => `- ${metric}`) : ['- primary CTA CTR', '- bounce rate']),
    '',
    '### Guardrails',
    ...(guardrail.size ? Array.from(guardrail).map(metric => `- ${metric}`) : ['- no accessibility regressions'])
  ].join('\n');
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
  const hypotheses = generateHypotheses(findings, pageClassification);

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
        display: inline-grid;
        flex: 0 0 auto;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: #151515;
        color: #ffffff;
        font-size: 17px;
        font-weight: 850;
        line-height: 20px;
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

  const weakBlocksCount = snapshot.behavioralMapping.filter(block => block.present !== 'sí' || block.quality <= 2).length;
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
    metric('UX frictions', uxFrictionCount),
    metric('Weak blocks', weakBlocksCount),
    metric('DS risks', dsRiskCount),
    metric('Manual review', manualReviewCount)
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
      element('strong', {}, [block.label]),
      element('div', { class: 'mapping-meta' }, [
        element('span', { class: 'pill' }, [presenceLabel(block.present)]),
        element('span', { class: 'pill' }, [`score ${block.quality}/5`]),
        element('span', { class: 'pill' }, [blockConfidence(block)])
      ])
    ]),
    element('span', { class: 'pill' }, [block.block])
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
    element('p', {}, [`${item.finding.confidence} confidence · ${item.finding.rationale}`])
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
        element('span', { class: 'pill' }, [`${snapshot.components.counts.ctaGroups} CTA groups`])
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
        element('p', { class: 'notice' }, [uxFrictionCount ? 'Hay fricciones UX de alta confianza; revisar hypothesis cards antes de actuar.' : 'No se detectan fricciones UX de alta confianza. Los weak blocks son revisión, no bloqueo crítico.'])
      ] : [
        element('p', { class: 'notice' }, ['Salida acotada a snapshot, inventario, accesibilidad y notas manuales.'])
      ])
    ]),
    element('section', { class: 'section' }, [
      element('h3', { class: 'section-title' }, ['Top findings']),
      ...(topFindingNodes.length ? [element('div', { class: 'top-findings' }, topFindingNodes)] : [
        element('p', { class: 'notice' }, ['No hay findings priorizados. Revisa el markdown para baseline y notas manuales.'])
      ])
    ])
  ]);

  const copyButtons = [
    element('button', { class: 'copy primary', type: 'button', 'data-copy': 'design' }, ['Copiar design-context.md']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'json' }, ['Copiar JSON']),
    element('button', { class: 'copy secondary', type: 'button', 'data-copy': 'issue' }, ['Copiar GitHub Issue'])
  ];

  const copyStatus = element('p', { class: 'notice', 'data-copy-status': '' }, [
    'Salida heurística. Úsala como apoyo de revisión de producto/diseño, no como verdad absoluta.'
  ]);

  const panel = element('div', { class: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'contextic-title' }, [
    element('header', { class: 'panel-header' }, [
      element('div', { class: 'brand' }, [
        element('span', { class: 'brand-mark' }, ['C']),
        element('div', {}, [
          element('p', { class: 'kicker' }, ['Design context']),
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
  if (value === 'sí') return 'present';
  if (value === 'parcial') return 'partial';
  if (value === 'no') return 'missing';
  return value || 'unknown';
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
    ['Accessibility', groups.accessibility || []],
    ['Review', [...(groups.manualReview || []), ...findings.filter(finding => finding.confidence === 'low' && finding.type !== 'manual_review')]]
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
