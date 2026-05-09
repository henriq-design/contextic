import { getAccessibleName, isProbablyGenericLinkText, isVisibleElement, toPxNumber } from './utils.js';

export const BEHAVIORAL_RULES_VERSION = '0.1.0';

export const BEHAVIORAL_RULES = [
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
    return [{
      ...metadata,
      ruleId: rule.id,
      ruleVersion: BEHAVIORAL_RULES_VERSION,
      ...detected
    }];
  });
}

function getPrimaryLikeActions(root) {
  const viewportHeight = window.innerHeight || 900;
  const candidates = Array.from(root.querySelectorAll('button, [role="button"], input[type="submit"], a[href]'))
    .filter(isVisibleElement)
    .filter(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top < 0 || rect.top > viewportHeight || rect.width < 80 || rect.height < 28) return false;
      const style = window.getComputedStyle(element);
      const background = style.backgroundColor;
      const borderRadius = toPxNumber(style.borderTopLeftRadius) || 0;
      const hasBackground = background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent';
      const hasButtonText = getAccessibleName(element).length > 0;
      const isGeneric = isProbablyGenericLinkText(element.textContent);
      return hasBackground && hasButtonText && !isGeneric && borderRadius >= 2;
    });

  return candidates.slice(0, 6);
}
