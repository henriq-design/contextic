import { createPriorityMetadata } from './behavioral-model.js';
import { evaluateBehavioralRules } from './behavioral-rules.js';

export function detectFrictions({ colors, spacing, components }, root = document.body) {
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
