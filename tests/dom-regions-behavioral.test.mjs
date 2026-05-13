import test from 'node:test';
import assert from 'node:assert/strict';

import { collectComponents } from '../src/collect-components.js';
import { detectDomRegions } from '../src/dom-regions.js';
import { buildBehavioralMapping } from '../src/behavioral-model.js';

class FakeElement {
  constructor(tag, { text = '', id = '', className = '', role = '', attributes = {}, rect = {}, style = {} } = {}, children = []) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this._text = text;
    this.attributes = { ...attributes };
    if (role) this.attributes.role = role;
    this.classList = className ? className.split(/\s+/).filter(Boolean) : [];
    this.rect = { top: 120, width: 320, height: 40, ...rect };
    this.style = {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      backgroundColor: 'transparent',
      borderTopLeftRadius: '0px',
      ...style
    };
    this.children = children;
    this.parentElement = null;
    for (const child of children) child.parentElement = this;
  }

  get textContent() {
    return [this._text, ...this.children.map(child => child.textContent)].join(' ');
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

  contains(other) {
    return other === this || this.children.some(child => child.contains(other));
  }

  matches(selector) {
    if (selector === '[hidden]') return this.hasAttribute('hidden');
    if (selector === '[aria-hidden="true"]') return this.getAttribute('aria-hidden') === 'true';
    if (selector === ':disabled') return this.hasAttribute('disabled');
    if (selector === '[aria-disabled="true"]') return this.getAttribute('aria-disabled') === 'true';
    return matchesSelector(this, selector);
  }

  querySelectorAll(selector) {
    return descendants(this).filter(element => matchesSelector(element, selector));
  }
}

globalThis.Element = FakeElement;
globalThis.window = {
  innerWidth: 1200,
  innerHeight: 900,
  getComputedStyle(element) {
    return element.style;
  }
};
globalThis.document = {
  body: null,
  getElementById() {
    return null;
  }
};

test('behavioral scope excludes global nav/footer terms from Who and When evidence', () => {
  const root = tree('body', {}, [
    tree('header', { className: 'site-header', text: 'Para empresas pymes' }, [
      tree('nav', { role: 'navigation', text: 'Empresas Pymes Privacidad Oferta limitado hasta hoy' }, [
        tree('a', { text: 'Empresas', attributes: { href: '/empresas' } }),
        tree('a', { text: 'Privacidad', attributes: { href: '/privacidad' } })
      ])
    ]),
    tree('main', { className: 'main content' }, [
      tree('section', { className: 'hero', rect: { top: 80, width: 900, height: 420 } }, [
        tree('h1', { text: 'Automatiza tu briefing de diseño', rect: { top: 110, width: 640, height: 56 } }),
        tree('p', { text: 'Convierte una página en contexto accionable y reduce trabajo manual del equipo.', rect: { top: 180, width: 640, height: 60 } }),
        tree('button', { text: 'Crear briefing', rect: { top: 260, width: 160, height: 44 }, style: { backgroundColor: '#111111', borderTopLeftRadius: '8px' } })
      ]),
      tree('section', { className: 'benefits', rect: { top: 560, width: 900, height: 260 } }, [
        tree('h2', { text: 'Beneficios claros', rect: { top: 580, width: 640, height: 44 } }),
        tree('p', { text: 'Reduce tareas repetitivas y mejora la calidad del handoff.', rect: { top: 640, width: 640, height: 48 } })
      ])
    ]),
    tree('footer', { text: 'Privacidad para empresas y pymes. Descuento limitado hasta hoy.' })
  ]);
  document.body = root;

  const scopeMap = detectDomRegions(root);
  const behavioralComponents = collectComponents(scopeMap.behavioralRoot);
  const mapping = buildBehavioralMapping({ components: behavioralComponents, frictions: [] }, scopeMap.behavioralRoot);

  const who = mapping.find(block => block.block === 'who');
  const when = mapping.find(block => block.block === 'when');
  const whyNot = mapping.find(block => block.block === 'why_not');

  assert.deepEqual(scopeMap.usedForBehavioral.sort(), ['hero', 'main', 'section'].sort());
  assert.ok(scopeMap.excludedFromBehavioral.some(item => item.region === 'header'));
  assert.ok(scopeMap.excludedFromBehavioral.some(item => item.region === 'footer'));
  assert.equal(who.present, 'no');
  assert.equal(when.present, 'no');
  assert.equal(whyNot.present, 'no');
  assert.doesNotMatch(who.evidence.join(' '), /empresas|pymes/i);
  assert.doesNotMatch(when.evidence.join(' '), /limitado|hoy/i);
});

function tree(tag, options = {}, children = []) {
  return new FakeElement(tag, options, children);
}

function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}

function matchesSelector(element, selector) {
  return selector.split(',').some(part => matchesSimpleSelector(element, part.trim()));
}

function matchesSimpleSelector(element, selector) {
  if (!selector) return false;
  if (selector === '*') return true;
  const tag = element.tagName.toLowerCase();
  if (/^[a-z0-9]+$/.test(selector)) return tag === selector;
  if (selector === '[role="button"]') return element.getAttribute('role') === 'button';
  if (selector === '[role="navigation"]') return element.getAttribute('role') === 'navigation';
  if (selector === '[role="main"]') return element.getAttribute('role') === 'main';
  if (selector === '[role="contentinfo"]') return element.getAttribute('role') === 'contentinfo';
  if (selector === '[aria-modal="true"]') return element.getAttribute('aria-modal') === 'true';
  if (selector === '[aria-live]') return element.hasAttribute('aria-live');
  if (selector === '[data-card]') return element.hasAttribute('data-card');
  if (selector === '[data-badge]') return element.hasAttribute('data-badge');
  if (selector === '[data-step]') return element.hasAttribute('data-step');
  if (selector === 'dialog[open]') return tag === 'dialog' && element.hasAttribute('open');
  if (selector === 'a[href]') return tag === 'a' && Boolean(element.getAttribute('href'));
  const inputType = selector.match(/^input\[type="([^"]+)"\]$/);
  if (inputType) return tag === 'input' && element.getAttribute('type') === inputType[1];
  const classContains = selector.match(/^\[class\*="([^"]+)"\]$/);
  if (classContains) return element.classList.some(item => item.includes(classContains[1]));
  return false;
}
