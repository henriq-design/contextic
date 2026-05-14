import { compactText, getAccessibleName, isVisibleElement } from './utils.js';

export const BEHAVIORAL_BLOCK_LABELS = {
  what: 'Qué',
  why: 'Por qué',
  why_not: 'Por qué no',
  who: 'Para quién',
  how: 'Cómo',
  where: 'Dónde actuar',
  when: 'Cuándo / Urgencia'
};

export function behavioralBlockDisplayLabel(block) {
  return BEHAVIORAL_BLOCK_LABELS[block] || block || 'Bloque';
}

export const BEHAVIORAL_BLOCKS = [
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

export function buildBehavioralMapping({ components, frictions }, root = document.body) {
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

export function buildBehavioralStructureRecommendation({ behavioralMapping, frictions }) {
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

export function createPriorityMetadata({ severityScore = 3, expectedImpact = 'medium', implementationEffort = 'medium' } = {}) {
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
  const audience = inferAudienceSignal(lowerText);
  const process = inferProcessSignal(lowerText, hasStepper);
  const ctaCandidates = extractCtaCandidates(root, components);
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
      evidence.push(`CTA principal visible en ${signals.ctaAssessment.primary.region}: “${signals.ctaAssessment.primary.label}” (${signals.ctaAssessment.primary.selector}).`);
    }
    if (signals.ctaAssessment.aligned) evidence.push(`El label del CTA parece alineado con el objetivo de página: “${signals.ctaAssessment.primary.label}”.`);
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
  else if (!signals.ctaAssessment.aligned) missingByBlock.where.push(`Validar si el CTA “${signals.ctaAssessment.primary.label}” expresa la acción esperada para el objetivo de la página.`);
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
      const label = getAccessibleName(element);
      const region = root?.__contexticRegionFor?.(element) || inferRegionFromElement(element);
      return {
        label,
        selector: describeElement(element),
        href: element.getAttribute?.('href') || element.getAttribute?.('action') || '',
        action: element.getAttribute?.('type') || element.getAttribute?.('data-action') || '',
        region,
        aboveTheFold: Number(rect.top) >= 0 && Number(rect.top) < (window.innerHeight || 900),
        visualHierarchy: inferVisualHierarchy(element, rect),
        componentType: inferCtaComponentType(element)
      };
    })
    .filter(candidate => candidate.label)
    .slice(0, 16);
}

function assessCtaClarity(candidates, lowerText) {
  const primary = candidates.find(candidate => candidate.aboveTheFold && ['hero', 'main'].includes(candidate.region) && candidate.visualHierarchy === 'primary')
    || candidates.find(candidate => ['hero', 'main'].includes(candidate.region) && candidate.visualHierarchy === 'primary')
    || candidates.find(candidate => candidate.aboveTheFold && ['hero', 'main'].includes(candidate.region));
  const aligned = primary ? isCtaLabelAligned(primary.label, lowerText) : false;
  return { primary, aligned, candidates };
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
