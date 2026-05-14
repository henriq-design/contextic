import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildBehavioralMapping } from '../src/behavioral-model.js';
import { buildJsonExport } from '../src/contextic-report.js';
import { buildFindings } from '../src/findings-prioritization.js';

class FakeElement {
  constructor(tag, { text = '', id = '', className = '', attributes = {}, rect = {}, children = [] } = {}) {
    this.tagName = tag.toUpperCase();
    this.textContent = text;
    this.id = id;
    this.classList = className ? className.split(/\s+/).filter(Boolean) : [];
    this.attributes = { ...attributes };
    this.rect = { top: 120, width: 180, height: 44, ...rect };
    this.children = children;
    this.parentElement = null;
    for (const child of children) child.parentElement = this;
  }

  getAttribute(name) {
    return this.attributes[name] || '';
  }

  hasAttribute(name) {
    return Object.hasOwn(this.attributes, name);
  }

  getBoundingClientRect() {
    return this.rect;
  }

  matches(selector) {
    if (selector === ':disabled, [aria-disabled="true"]') return this.hasAttribute('disabled') || this.getAttribute('aria-disabled') === 'true';
    return false;
  }

  querySelectorAll(selector) {
    const elements = descendants(this);
    if (selector === 'h1, h2, h3') return elements.filter(element => ['H1', 'H2', 'H3'].includes(element.tagName));
    if (selector === 'h1, h2') return elements.filter(element => ['H1', 'H2'].includes(element.tagName));
    if (selector === 'ol, [class*="step"], [class*="paso"], [data-step]') {
      return elements.filter(element => element.tagName === 'OL' || /step|paso/.test(element.classList.join(' ')) || element.hasAttribute('data-step'));
    }
    return [];
  }
}

globalThis.Element = FakeElement;
globalThis.window = {
  innerHeight: 900,
  getComputedStyle() {
    return { display: 'block', visibility: 'visible', opacity: '1' };
  }
};

test('Vodafone-like page scores Who as partial from functional device audience', () => {
  const { root, components } = vodafoneFixture('Seguro para tus dispositivos. Móvil, tablet y smartwatch protegidos hasta 3 dispositivos.');
  const mapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const who = mapping.find(block => block.block === 'who');

  assert.equal(who.displayLabel, 'Para quién');
  assert.notEqual(who.present, 'no');
  assert.equal(who.confidence, 'medium');
  assert.equal(who.diagnostics.audienceType, 'use_case_audience');
  assert.match(who.evidence.join(' '), /Target funcional/);
});

test('Vodafone-like Where includes Acceso a mi seguro CTA details', () => {
  const { root, components } = vodafoneFixture();
  const mapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const where = mapping.find(block => block.block === 'where');

  assert.equal(where.displayLabel, 'Dónde actuar');
  assert.match(where.evidence.join(' '), /Acceso a mi seguro/);
  assert.equal(where.diagnostics.ctaAssessment.primary.label, 'Acceso a mi seguro');
  assert.equal(where.diagnostics.ctaAssessment.primary.aboveTheFold, true);
  assert.equal(where.diagnostics.ctaAssessment.primary.visualHierarchy, 'primary');
});

test('CTA label cleaning removes color metadata and decorative icon text', () => {
  const { root, components } = vodafoneFixture('Seguro móvil Vodafone Care.', 'color #E60000Flecha derecha Asegura tu móvil');
  const mapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const where = mapping.find(block => block.block === 'where');
  const primary = where.diagnostics.ctaAssessment.primary;

  assert.equal(primary.cleanLabel, 'Asegura tu móvil');
  assert.equal(primary.label, 'Asegura tu móvil');
  assert.equal(primary.rawText, 'color #E60000Flecha derecha Asegura tu móvil');
  assert.deepEqual(primary.iconText, ['Flecha derecha']);
  assert.match(where.evidence.join(' '), /Asegura tu móvil/);
  assert.doesNotMatch(where.evidence.join(' '), /#E60000|Flecha derecha/);
});

test('When does not score as strong urgency only because hasta describes value ceiling', () => {
  const { root, components } = vodafoneFixture('Seguro para tus dispositivos con cobertura hasta 3 dispositivos y hasta 1000 euros.');
  const mapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const when = mapping.find(block => block.block === 'when');

  assert.ok(when.quality < 4);
  assert.equal(when.confidence, 'low');
  assert.deepEqual(when.diagnostics.timing.urgency, []);
  assert.ok(when.diagnostics.timing.valueCeilings.length >= 1);
});

test('How with step structure is partial review detail, not automatic weak block finding', () => {
  const { root, components } = vodafoneFixture('Cómo funciona el seguro para tus dispositivos. Paso 1 revisa tu cobertura. Paso 2 accede a tu seguro.');
  const mapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const how = mapping.find(block => block.block === 'how');
  const findings = buildFindings({ behavioralMapping: mapping, frictions: [] });

  assert.equal(how.present, 'parcial');
  assert.ok(how.quality >= 3);
  assert.match(how.missing.join(' '), /alta|contratación|gestión|activación|siguiente estado/i);
  assert.equal(findings.some(finding => finding.id === 'review.weak-block.how'), false);
});

test('JSON keeps internal keys and adds Spanish displayLabel', () => {
  const { root, components } = vodafoneFixture();
  const behavioralMapping = buildBehavioralMapping({ components, frictions: [] }, root);
  const report = JSON.parse(buildJsonExport({
    meta: { title: 'Vodafone Care', url: 'https://www.vodafone.es/c/vodafone-care/', generatedAt: '2026-05-14T10:00:00.000Z' },
    components,
    behavioralMapping,
    frictions: [],
    behavioralRecommendation: { sections: [] }
  }));

  assert.ok(report.behavioralMapping.who);
  assert.equal(report.behavioralMapping.who.block, 'who');
  assert.equal(report.behavioralMapping.who.displayLabel, 'Para quién');
  assert.equal(report.behavioralMapping.where.displayLabel, 'Dónde actuar');
});

test('interface source uses Spanish behavioral labels instead of visible English block labels', async () => {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /element\('strong', \{\}, \[block\.label\]\)/);
  assert.doesNotMatch(source, /'Weak blocks'|'Top findings'|'Manual review'/);
  assert.match(source, /behavioralBlockDisplayLabel/);
  assert.match(source, /Bloques a revisar/);
  assert.match(source, /Hallazgos principales/);
});

function vodafoneFixture(text = 'Seguro para tus dispositivos. Protege tu móvil, tablet y smartwatch hasta 3 dispositivos.', ctaText = 'Acceso a mi seguro') {
  const heading = tree('h1', { text: 'Vodafone Care', rect: { top: 40, width: 420, height: 56 } });
  const cta = tree('a', {
    text: ctaText,
    className: 'primary cta',
    attributes: { href: '/c/vodafone-care/seguro/' },
    rect: { top: 220, width: 260, height: 52 }
  });
  const steps = tree('ol', { className: 'steps', rect: { top: 520, width: 600, height: 180 } });
  const main = tree('main', { text, className: 'main hero', children: [heading, cta, steps] });
  const root = tree('body', { text, children: [main] });
  root.__contexticBehavioralScope = true;
  root.__contexticText = `${heading.textContent} ${text} ${cta.textContent} Cómo funciona Paso 1 Paso 2`;
  root.__contexticRegionFor = element => element === cta || element === heading || element === main ? 'main' : 'section';

  return {
    root,
    components: {
      counts: { buttons: 1, links: 1, forms: 0, inputs: 0, navigation: 0, cards: 0 },
      samples: { buttons: [{ text: cta.textContent, selector: 'a.primary.cta' }] },
      raw: { buttons: [cta], links: [cta] }
    }
  };
}

function tree(tag, options = {}) {
  return new FakeElement(tag, options);
}

function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}
