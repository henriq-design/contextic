import test from 'node:test';
import assert from 'node:assert/strict';

import { collectColors } from '../src/collect-colors.js';

class FakeElement {
  constructor(tag, { text = '', id = '', className = '', role = '', attributes = {}, style = {}, rect = {} } = {}, children = []) {
    this.tagName = tag.toUpperCase();
    this.textContent = text;
    this.id = id;
    this.classList = className ? className.split(/\s+/).filter(Boolean) : [];
    this.attributes = { ...attributes };
    if (role) this.attributes.role = role;
    this.style = {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      color: 'transparent',
      backgroundColor: 'transparent',
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
      outlineColor: 'transparent',
      ...style
    };
    this.rect = { top: 100, width: 160, height: 44, ...rect };
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
    if (selector === '[hidden]') return this.hasAttribute('hidden');
    if (selector === '[aria-hidden="true"]') return this.getAttribute('aria-hidden') === 'true';
    return false;
  }

  querySelectorAll(selector) {
    if (selector !== '*') return [];
    return descendants(this);
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
  documentElement: new FakeElement('html', { style: { length: 0 } }),
  getElementById() {
    return null;
  }
};

test('red Vodafone-like color on visible CTA is primary or brand, not error', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('button', {
        text: 'Contratar ahora',
        className: 'primary cta',
        style: { backgroundColor: '#e60000', color: '#ffffff' }
      })
    ])
  ]);

  const red = collectColors(root).colors.find(color => color.value === '#e60000');

  assert.ok(red);
  assert.ok(['primary', 'brand'].includes(red.suggestedRole));
  assert.notEqual(red.suggestedRole, 'error');
  assert.match(red.roleReason, /CTA|main action/i);
});

test('red in validation message is classified as error', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('p', {
        text: 'El email no es válido',
        className: 'field-error validation-message',
        role: 'alert',
        style: { color: '#e60000' }
      })
    ])
  ]);

  const red = collectColors(root).colors.find(color => color.value === '#e60000');

  assert.ok(red);
  assert.equal(red.suggestedRole, 'error');
  assert.equal(red.roleConfidence, 'high');
  assert.match(red.roleReason, /error|invalid|destructive/i);
});

test('green in skip link is utility, not success', () => {
  const root = tree('body', {}, [
    tree('a', {
      text: 'Saltar al contenido',
      className: 'skip-link',
      attributes: { href: '#main' },
      style: { color: '#00aa00' }
    })
  ]);

  const green = collectColors(root).colors.find(color => color.value === '#00aa00');

  assert.ok(green);
  assert.ok(['utility', 'unknown'].includes(green.suggestedRole));
  assert.notEqual(green.suggestedRole, 'success');
  assert.match(green.roleReason, /hidden\/system|utility/i);
});

function tree(tag, options = {}, children = []) {
  return new FakeElement(tag, options, children);
}

function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}
