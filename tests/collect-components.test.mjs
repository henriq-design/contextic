import test from 'node:test';
import assert from 'node:assert/strict';

import { collectComponents } from '../src/collect-components.js';

class FakeElement {
  constructor(tag, { text = '', id = '', className = '', role = '', attributes = {}, rect = {}, style = {} } = {}, children = []) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this._text = text;
    this.attributes = { ...attributes };
    if (role) this.attributes.role = role;
    this.classList = className ? className.split(/\s+/).filter(Boolean) : [];
    this.rect = { top: 100, width: 240, height: 80, ...rect };
    this.style = { display: 'block', visibility: 'visible', opacity: '1', ...style };
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

  matches(selector) {
    if (selector === ':disabled, [aria-disabled="true"]') return this.hasAttribute('disabled') || this.getAttribute('aria-disabled') === 'true';
    if (selector === '[hidden]') return this.hasAttribute('hidden');
    if (selector === '[aria-hidden="true"]') return this.getAttribute('aria-hidden') === 'true';
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
  getElementById() {
    return null;
  }
};

test('hidden/system modal does not count as active modal in primary component inventory', () => {
  const root = tree('body', {}, [
    tree('main', { className: 'main' }, [
      tree('button', { text: 'Contratar', rect: { width: 160, height: 44 } })
    ]),
    tree('div', {
      text: 'Modal técnico',
      className: 'modal',
      role: 'dialog',
      rect: { width: 320, height: 160 }
    })
  ]);

  const components = collectComponents(root);

  assert.equal(components.counts.dialogs, 0);
  assert.equal(components.systemHiddenComponents.dialogs, 1);
  assert.equal(components.counts.buttons, 1);
  assert.equal(components.samples.buttons[0].isUserFacing, true);
});

test('accessibility widget is excluded from primary component inventory and CTA groups', () => {
  const root = tree('body', {}, [
    tree('main', { className: 'main' }, [
      tree('a', { text: 'Ver catálogo', attributes: { href: '/catalogo' }, rect: { width: 160, height: 44 } }),
      tree('a', { text: 'Recursos docentes', attributes: { href: '/recursos' }, rect: { width: 160, height: 44 } })
    ]),
    tree('div', { className: 'bmv-widget accessibility-widget floating-toolbar', rect: { top: 0, width: 80, height: 120 } }, [
      tree('button', {
        id: 'accessibility-tab-button',
        text: 'Accesibilidad',
        className: 'accessibility-tab-button',
        rect: { top: 0, width: 56, height: 56 }
      }),
      tree('button', {
        text: 'Contraste',
        className: 'bmv-button',
        rect: { top: 56, width: 56, height: 56 }
      })
    ])
  ]);

  const components = collectComponents(root);

  assert.equal(components.counts.buttons, 0);
  assert.equal(components.counts.links, 2);
  assert.equal(components.counts.ctaGroups, 1);
  assert.equal(components.systemHiddenComponents.buttons, 2);
  assert.equal(components.systemUtilityWidgets.length, 1);
  assert.equal(components.systemUtilityWidgets[0].type, 'accessibility_widget');
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
  const tag = element.tagName.toLowerCase();
  if (/^[a-z0-9]+$/.test(selector)) return tag === selector;
  if (selector === '[role="button"]') return element.getAttribute('role') === 'button';
  if (selector === '[role="dialog"]') return element.getAttribute('role') === 'dialog';
  if (selector === '[role="navigation"]') return element.getAttribute('role') === 'navigation';
  if (selector === '[aria-modal="true"]') return element.getAttribute('aria-modal') === 'true';
  if (selector === '[aria-live]') return element.hasAttribute('aria-live');
  if (selector === '[data-card]') return element.hasAttribute('data-card');
  if (selector === '[data-badge]') return element.hasAttribute('data-badge');
  if (selector === 'dialog[open]') return tag === 'dialog' && element.hasAttribute('open');
  if (selector === 'a[href]') return tag === 'a' && Boolean(element.getAttribute('href'));
  const inputType = selector.match(/^input\[type="([^"]+)"\]$/);
  if (inputType) return tag === 'input' && element.getAttribute('type') === inputType[1];
  const classContains = selector.match(/^\[class\*="([^"]+)"\]$/);
  if (classContains) return element.classList.some(item => item.includes(classContains[1]));
  const idContains = selector.match(/^\[id\*="([^"]+)"\]$/);
  if (idContains) return element.id.includes(idContains[1]);
  const classSelector = selector.match(/^\.([a-z0-9_-]+)$/i);
  if (classSelector) return element.classList.includes(classSelector[1]);
  return false;
}
