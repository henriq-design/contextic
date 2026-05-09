import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePriority, createBehavioralFinding } from '../src/behavioral-finding.js';
import { BEHAVIORAL_RULES, evaluateBehavioralRules } from '../src/behavioral-rules.js';

class FakeElement {
  constructor({ tag = 'button', text = '', rect = {}, style = {}, attributes = {}, labels = [] } = {}) {
    this.textContent = text;
    this.tagName = tag.toUpperCase();
    this.style = {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      backgroundColor: '#111111',
      borderTopLeftRadius: '8px',
      ...style
    };
    this.rect = {
      top: 80,
      width: 140,
      height: 40,
      ...rect
    };
    this.attributes = attributes;
    this.labels = labels;
  }

  getAttribute(name) {
    return this.attributes[name] || '';
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

globalThis.Element = FakeElement;
globalThis.window = {
  innerHeight: 900,
  getComputedStyle(element) {
    return element.style;
  }
};
globalThis.document = {
  getElementById() {
    return null;
  }
};

test('calculates behavioral priority from severity, impact and effort', () => {
  assert.deepEqual(
    calculatePriority({ severity: 5, expectedImpact: 'high', implementationEffort: 'low' }),
    { priority: 'P0', priorityScore: 15, severityScore: 5 }
  );
  assert.deepEqual(
    calculatePriority({ severity: 4, expectedImpact: 'medium', implementationEffort: 'low' }),
    { priority: 'P1', priorityScore: 8, severityScore: 4 }
  );
  assert.deepEqual(
    calculatePriority({ severity: 3, expectedImpact: 'medium', implementationEffort: 'medium' }),
    { priority: 'P2', priorityScore: 3, severityScore: 3 }
  );
});

test('normalizes minimum behavioral finding fields', () => {
  const finding = createBehavioralFinding({
    id: 'where.test-rule',
    title: 'Regla de prueba',
    block: 'where',
    frictionType: 'baja_accionabilidad',
    severity: 4,
    confidence: 'media',
    evidenceType: 'structural',
    evidence: '2 acciones prominentes.',
    recommendation: 'Mantener una acción primaria.',
    systemImplication: 'Gobernar variantes de botón.',
    expectedImpact: 'high',
    implementationEffort: 'low',
    metric: 'CTR del CTA principal'
  });

  for (const field of ['id', 'title', 'block', 'frictionType', 'severity', 'confidence', 'evidenceType', 'evidence', 'recommendation', 'systemImplication', 'expectedImpact', 'implementationEffort', 'priority', 'metric']) {
    assert.notEqual(finding[field], undefined, field);
  }

  assert.equal(finding.id, 'where.test-rule');
  assert.equal(finding.ruleId, 'where.test-rule');
  assert.equal(finding.type, 'baja_accionabilidad');
  assert.equal(finding.severityScore, 4);
  assert.equal(finding.priority, 'P0');
  assert.match(finding.hypothesis, /^Podría/);
});

test('behavioral rules expose traceable metadata', () => {
  assert.equal(BEHAVIORAL_RULES.length, 10);

  for (const rule of BEHAVIORAL_RULES) {
    assert.match(rule.id, /^[a-z_-]+\.[a-z0-9-]+$/);
    assert.ok(rule.block);
    assert.ok(rule.type);
    assert.ok(rule.signal);
    assert.ok(rule.title);
    assert.ok(rule.recommendation);
    assert.ok(rule.systemImplication);
    assert.ok(rule.metric);
    assert.equal(typeof rule.detect, 'function');
  }
});

test('detects multiple primary-like actions above the fold as a hypothesis', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      new FakeElement({ text: 'Crear mi plan' }),
      new FakeElement({ text: 'Ver precios' })
    ]),
    components: emptyComponents()
  });

  const finding = findings.find(item => item.ruleId === 'where.multiple-primary-actions');
  assert.ok(finding);
  assert.equal(finding.id, 'where.multiple-primary-actions');
  assert.equal(finding.frictionType, 'baja_accionabilidad');
  assert.equal(finding.severity, 4);
  assert.equal(finding.priority, 'P0');
  assert.equal(finding.observed.count, 2);
  assert.equal(finding.evidenceType, 'structural');
  assert.match(finding.hypothesis, /^Podría/);
});

test('does not count generic links as competing primary actions', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      new FakeElement({ text: 'Crear mi plan' }),
      new FakeElement({ text: 'Learn more' })
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'where.multiple-primary-actions'), false);
});

test('detects form effort and recovery signals from component samples', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([]),
    components: {
      samples: {
        unlabeledInputs: ['input.email', 'input.phone'],
        disabledControls: ['button.submit'],
        genericLinks: [],
        imagesWithoutAlt: []
      }
    }
  });

  assert.ok(findings.find(item => item.ruleId === 'how.unlabeled-inputs'));
  assert.ok(findings.find(item => item.ruleId === 'why_not.disabled-controls-without-recovery'));
});

test('detects generic link labels as textual ambiguity evidence', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([]),
    components: {
      samples: {
        unlabeledInputs: [],
        disabledControls: [],
        genericLinks: ['leer más', 'aquí', 'more'],
        imagesWithoutAlt: []
      }
    }
  });

  const finding = findings.find(item => item.ruleId === 'what.generic-link-labels');
  assert.ok(finding);
  assert.equal(finding.evidenceType, 'textual');
  assert.equal(finding.observed.count, 3);
  assert.deepEqual(finding.observed.samples, ['leer más', 'aquí', 'more']);
});

test('generic primary CTA creates a finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      heading('Convierte visitas en briefings accionables'),
      paragraph('Analiza una página real y prepara contexto técnico para diseño y desarrollo.'),
      button('Enviar')
    ]),
    components: emptyComponents()
  });

  const finding = findings.find(item => item.ruleId === 'where.generic-primary-cta');
  assert.ok(finding);
  assert.equal(finding.evidenceType, 'textual');
  assert.equal(finding.priority, 'P1');
});

test('generic non-primary link does not create a primary CTA false positive', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      link('Saber más', { style: { backgroundColor: 'transparent', borderTopLeftRadius: '0px' } })
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'where.generic-primary-cta'), false);
});

test('high commitment CTA without reassurance creates why-not finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      button('Comprar ahora')
    ]),
    components: emptyComponents()
  });

  assert.ok(findings.find(item => item.ruleId === 'why-not.high-commitment-without-reassurance'));
});

test('high commitment CTA with nearby reassurance does not create why-not finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      button('Comprar ahora'),
      paragraph('Pago seguro y soporte incluido.', { rect: { top: 132, width: 320, height: 24 } })
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'why-not.high-commitment-without-reassurance'), false);
});

test('personal data form without privacy reassurance creates finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      form(),
      input({ attributes: { type: 'email', name: 'email', placeholder: 'Email' }, rect: { top: 160, width: 260, height: 40 } }),
      input({ attributes: { type: 'tel', name: 'phone', placeholder: 'Teléfono' }, rect: { top: 212, width: 260, height: 40 } })
    ]),
    components: emptyComponents()
  });

  const finding = findings.find(item => item.ruleId === 'why-not.form-without-privacy-reassurance');
  assert.ok(finding);
  assert.equal(finding.severity, 4);
});

test('personal data form with nearby privacy reassurance does not create finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      form(),
      input({ attributes: { type: 'email', name: 'email', placeholder: 'Email' }, rect: { top: 160, width: 260, height: 40 } }),
      paragraph('No compartimos tus datos y solo los usaremos para responderte.', { rect: { top: 212, width: 360, height: 36 } })
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'why-not.form-without-privacy-reassurance'), false);
});

test('conversion hero without CTA creates no-primary-cta finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      heading('Crea briefings técnicos desde cualquier página'),
      paragraph('Ahorra tiempo convirtiendo pantallas reales en contexto para diseño y desarrollo.'),
      input({ attributes: { type: 'email', name: 'email' }, rect: { top: 220, width: 260, height: 40 } })
    ]),
    components: emptyComponents()
  });

  assert.ok(findings.find(item => item.ruleId === 'where.no-primary-cta-in-hero'));
});

test('conversion hero with clear CTA does not create no-primary-cta finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      heading('Crea briefings técnicos desde cualquier página'),
      paragraph('Ahorra tiempo convirtiendo pantallas reales en contexto para diseño y desarrollo.'),
      button('Crear mi briefing')
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'where.no-primary-cta-in-hero'), false);
});

test('visually equivalent competing primary CTAs create finding', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      heading('Automatiza tu briefing de diseño'),
      paragraph('Ahorra tiempo con contexto accionable para equipos de producto.'),
      button('Comprar ahora', { rect: { top: 220, width: 160, height: 44 } }),
      button('Solicitar demo', { rect: { top: 220, width: 160, height: 44 } })
    ]),
    components: emptyComponents()
  });

  assert.ok(findings.find(item => item.ruleId === 'where.competing-primary-ctas'));
});

test('clear primary and secondary CTA hierarchy avoids competing CTA false positive', () => {
  const findings = evaluateBehavioralRules({
    root: createRoot([
      heading('Automatiza tu briefing de diseño'),
      paragraph('Ahorra tiempo con contexto accionable para equipos de producto.'),
      button('Comprar ahora', { rect: { top: 220, width: 160, height: 44 } }),
      button('Ver cómo funciona', {
        rect: { top: 220, width: 160, height: 44 },
        style: { backgroundColor: '#ffffff', borderTopLeftRadius: '8px' }
      })
    ]),
    components: emptyComponents()
  });

  assert.equal(findings.some(item => item.ruleId === 'where.competing-primary-ctas'), false);
});

function createRoot(elements) {
  return {
    querySelectorAll(selector) {
      return elements.filter(element => matchesSelector(element, selector));
    }
  };
}

function matchesSelector(element, selector) {
  return selector.split(',').some(part => matchesSimpleSelector(element, part.trim()));
}

function matchesSimpleSelector(element, selector) {
  const tag = element.tagName.toLowerCase();
  if (!selector) return false;
  if (/^[a-z0-9]+$/.test(selector)) return tag === selector;
  if (selector === '[role="button"]') return element.getAttribute('role') === 'button';
  if (selector === 'a[href]') return tag === 'a' && Boolean(element.getAttribute('href'));
  const inputType = selector.match(/^input\[type="([^"]+)"\]$/);
  if (inputType) return tag === 'input' && element.getAttribute('type') === inputType[1];
  return false;
}

function heading(text, options = {}) {
  return new FakeElement({ tag: 'h1', text, rect: { top: 80, width: 520, height: 52 }, style: { backgroundColor: 'transparent', borderTopLeftRadius: '0px' }, ...options });
}

function paragraph(text, options = {}) {
  return new FakeElement({ tag: 'p', text, rect: { top: 150, width: 520, height: 48 }, style: { backgroundColor: 'transparent', borderTopLeftRadius: '0px' }, ...options });
}

function button(text, options = {}) {
  return new FakeElement({ tag: 'button', text, ...options });
}

function link(text, options = {}) {
  return new FakeElement({ tag: 'a', text, ...options, attributes: { href: '#', ...(options.attributes || {}) } });
}

function form(options = {}) {
  return new FakeElement({ tag: 'form', text: '', rect: { top: 140, width: 320, height: 180 }, style: { backgroundColor: 'transparent', borderTopLeftRadius: '0px' }, ...options });
}

function input(options = {}) {
  return new FakeElement({ tag: 'input', text: '', rect: { top: 160, width: 260, height: 40 }, style: { backgroundColor: '#ffffff', borderTopLeftRadius: '6px' }, ...options });
}

function emptyComponents() {
  return {
    samples: {
      unlabeledInputs: [],
      disabledControls: [],
      genericLinks: [],
      imagesWithoutAlt: []
    }
  };
}
