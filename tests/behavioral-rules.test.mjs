import test from 'node:test';
import assert from 'node:assert/strict';

import { BEHAVIORAL_RULES, evaluateBehavioralRules } from '../src/behavioral-rules.js';

class FakeElement {
  constructor({ text = '', rect = {}, style = {}, attributes = {}, labels = [] } = {}) {
    this.textContent = text;
    this.tagName = 'BUTTON';
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

test('behavioral rules expose traceable metadata', () => {
  assert.equal(BEHAVIORAL_RULES.length, 4);

  for (const rule of BEHAVIORAL_RULES) {
    assert.match(rule.id, /^[a-z_]+\.[a-z0-9-]+$/);
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

function createRoot(elements) {
  return {
    querySelectorAll() {
      return elements;
    }
  };
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
