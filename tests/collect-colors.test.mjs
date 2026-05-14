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

test('neutral text color on visible div is inferred as text', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('div', {
        text: 'Texto principal',
        style: { color: '#0d0d0d' }
      })
    ])
  ]);

  const black = collectColors(root).colors.find(color => color.value === '#0d0d0d');

  assert.ok(black);
  assert.equal(black.suggestedRole, 'text');
  assert.ok(['high', 'medium'].includes(black.roleConfidence));
  assert.match(black.roleReason, /CSS property: color maps to text/i);
});

test('white in skip link remains text or utility, never warning', () => {
  const root = tree('body', {}, [
    tree('a', {
      text: 'Saltar al contenido',
      className: 'skip-link',
      attributes: { href: '#main' },
      style: { color: '#ffffff' }
    })
  ]);

  const result = collectColors(root);
  const white = result.systemHiddenVisualNoise.find(color => color.value === '#ffffff');

  assert.ok(white);
  assert.equal(result.colors.some(color => color.value === '#ffffff'), false);
  assert.equal(white.usages[0].isSystemOrHidden, true);
});

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

test('black text in error copy remains text without color semantic override', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('p', {
        text: 'Error: campo obligatorio',
        className: 'field-error validation-message',
        role: 'alert',
        style: { color: '#0d0d0d' }
      })
    ])
  ]);

  const black = collectColors(root).colors.find(color => color.value === '#0d0d0d');

  assert.ok(black);
  assert.equal(black.suggestedRole, 'text');
  assert.notEqual(black.suggestedRole, 'error');
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

  const result = collectColors(root);
  const green = result.systemHiddenVisualNoise.find(color => color.value === '#00aa00');

  assert.ok(green);
  assert.equal(result.colors.some(color => color.value === '#00aa00'), false);
  assert.equal(green.usages[0].isSystemOrHidden, true);
});

test('color used only in hidden/system content is excluded from top visible colors', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('p', {
        text: 'Contenido visible',
        style: { color: '#111111' }
      })
    ]),
    tree('div', {
      text: 'Notificación técnica',
      className: 'toast',
      style: { backgroundColor: '#ffcc00' }
    })
  ]);

  const result = collectColors(root);

  assert.equal(result.colors.some(color => color.value === '#ffcc00'), false);
  assert.ok(result.systemHiddenVisualNoise.find(color => color.value === '#ffcc00'));
  assert.ok(result.colors.find(color => color.value === '#111111'));
});

test('css variables are annotated with visible usage status', () => {
  const rootStyle = {
    length: 2,
    0: '--visible-color',
    1: '--declared-color',
    getPropertyValue(name) {
      return name === '--visible-color' ? '#111111' : '#abcdef';
    }
  };
  document.documentElement = new FakeElement('html', { style: rootStyle });
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('p', {
        text: 'Contenido visible',
        style: { color: '#111111' }
      })
    ])
  ]);

  const result = collectColors(root);

  assert.equal(result.cssVariables.find(variable => variable.name === '--visible-color').usageStatus, 'used visible');
  assert.equal(result.cssVariables.find(variable => variable.name === '--declared-color').usageStatus, 'unknown usage');
  document.documentElement = new FakeElement('html', { style: { length: 0 } });
});

test('grey borderTopColor is classified as border', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('div', {
        className: 'panel',
        style: { borderTopColor: '#333333' }
      })
    ])
  ]);

  const grey = collectColors(root).colors.find(color => color.value === '#333333');

  assert.ok(grey);
  assert.equal(grey.suggestedRole, 'border');
  assert.match(grey.roleReason, /border color maps to border/i);
});

test('grey header text is not inferred as info without explicit informational component', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('h2', {
        text: 'Información de tarifas',
        className: 'section-info-title',
        style: { color: '#333333' }
      })
    ])
  ]);

  const grey = collectColors(root).colors.find(color => color.value === '#333333');

  assert.ok(grey);
  assert.equal(grey.suggestedRole, 'text');
  assert.notEqual(grey.suggestedRole, 'info');
});

test('dark neutral header color is not primary without CTA background evidence', () => {
  const root = tree('body', {}, [
    tree('header', {}, [
      tree('div', {
        text: 'Vodafone',
        className: 'header-shell',
        style: { backgroundColor: '#333333' }
      })
    ])
  ]);

  const grey = collectColors(root).colors.find(color => color.value === '#333333');

  assert.ok(grey);
  assert.notEqual(grey.suggestedRole, 'primary');
  assert.ok(['surface', 'unknown'].includes(grey.suggestedRole));
});

function tree(tag, options = {}, children = []) {
  return new FakeElement(tag, options, children);
}

function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}
