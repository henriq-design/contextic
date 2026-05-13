import { compactText, isVisibleElement } from './utils.js';

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
  who: ['para equipos', 'para empresas', 'para diseñadores', 'para desarrolladores', 'profesionales', 'agencias', 'pymes', 'startups', 'ecommerce', 'b2b'],
  how: ['cómo funciona', 'paso', 'empieza', 'proceso', 'en minutos', 'configura', 'instala', 'onboarding'],
  when: ['hoy', 'ahora', 'limitado', 'últimas', 'plazas', 'hasta', 'solo', 'bono', 'descuento', 'disponible']
};

export function buildBehavioralMapping({ components, frictions }, root = document.body) {
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
