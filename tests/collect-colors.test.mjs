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
      boxShadow: 'none',
      textShadow: 'none',
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
  assert.equal(black.displayRole, 'texto (text)');
  assert.equal(black.roleSource, 'base_css_property');
  assert.ok(['high', 'medium'].includes(black.roleConfidence));
  assert.match(black.roleReason, /color mapea a texto/i);
  assert.doesNotMatch(black.roleReason, /Semantic state overrides/i);
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
  assert.ok(['utility', 'text'].includes(white.suggestedRole));
  assert.notEqual(white.suggestedRole, 'warning');
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
  assert.ok(['cta_context', 'brand_context'].includes(red.roleSource));
  assert.notEqual(red.suggestedRole, 'error');
  assert.match(red.roleReason, /CTA|acción principal/i);
});

test('black in boxShadow is classified as shadow, not primary', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('button', {
        text: 'Contratar ahora',
        className: 'primary cta',
        style: { boxShadow: '0 8px 24px #000000', backgroundColor: '#e60000' }
      })
    ])
  ]);

  const black = collectColors(root).colors.find(color => color.value === '#000000');

  assert.ok(black);
  assert.equal(black.suggestedRole, 'shadow');
  assert.equal(black.displayRole, 'sombra (shadow)');
  assert.equal(black.roleSource, 'base_css_property');
  assert.notEqual(black.suggestedRole, 'primary');
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

test('black text inside warning component remains text, not warning', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('div', {
        text: 'Aviso importante',
        className: 'warning alert',
        role: 'alert',
        style: { color: '#0d0d0d', backgroundColor: '#fff4cc' }
      })
    ])
  ]);

  const black = collectColors(root).colors.find(color => color.value === '#0d0d0d');

  assert.ok(black);
  assert.equal(black.suggestedRole, 'text');
  assert.notEqual(black.suggestedRole, 'warning');
});

test('explicit warning component background is classified as warning', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('div', {
        text: 'Aviso importante',
        className: 'warning alert',
        role: 'alert',
        style: { color: '#0d0d0d', backgroundColor: '#fff4cc' }
      })
    ])
  ]);

  const warning = collectColors(root).colors.find(color => color.value === '#fff4cc');

  assert.ok(warning);
  assert.equal(warning.suggestedRole, 'warning');
  assert.equal(warning.displayRole, 'aviso (warning)');
  assert.equal(warning.roleSource, 'semantic_component');
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

test('accessibility widget colors and bmv variables are treated as system utility noise', () => {
  const rootStyle = {
    length: 2,
    0: '--bmv-primary',
    1: '--page-primary',
    getPropertyValue(name) {
      return name === '--bmv-primary' ? '#000000' : '#2255aa';
    }
  };
  document.documentElement = new FakeElement('html', { style: rootStyle });
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('a', {
        text: 'Ver catálogo',
        className: 'cta',
        attributes: { href: '/catalogo' },
        style: { backgroundColor: '#2255aa', color: '#ffffff' }
      })
    ]),
    tree('button', {
      id: 'accessibility-tab-button',
      className: 'accessibility-tab-button bmv-widget',
      attributes: { 'aria-label': 'Accessibility toolbar' },
      style: { backgroundColor: '#000000', color: '#ffffff' },
      rect: { top: 0, width: 56, height: 56 }
    })
  ]);

  const result = collectColors(root);

  assert.equal(result.colors.some(color => color.value === '#000000'), false);
  assert.ok(result.systemHiddenVisualNoise.find(color => color.value === '#000000'));
  assert.equal(result.cssVariables.find(variable => variable.name === '--bmv-primary').usageStatus, 'third-party/accessibility-widget usage');
  assert.equal(result.cssVariables.find(variable => variable.name === '--bmv-primary').systemUtility, true);
  document.documentElement = new FakeElement('html', { style: { length: 0 } });
});

test('white background samples are not explained as text color usage', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('section', {
        className: 'panel',
        style: { backgroundColor: '#ffffff' }
      })
    ])
  ]);

  const white = collectColors(root).colors.find(color => color.value === '#ffffff');

  assert.ok(white);
  assert.equal(white.sample.property, 'backgroundColor');
  assert.notEqual(white.suggestedRole, 'text');
  assert.doesNotMatch(white.roleReason, /color mapea a texto/i);
});

test('yellow text alone is not inferred as primary', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('span', {
        text: 'Destacado editorial',
        style: { color: '#ffc602' }
      })
    ])
  ]);

  const yellow = collectColors(root).colors.find(color => color.value === '#ffc602');

  assert.ok(yellow);
  assert.equal(yellow.sample.property, 'color');
  assert.notEqual(yellow.suggestedRole, 'primary');
});

test('yellow CTA background uses CTA context as observed sample', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('span', {
        text: 'Destacado editorial',
        style: { color: '#ffc602' }
      }),
      tree('a', {
        text: 'Ver catálogo',
        className: 'cta primary',
        attributes: { href: '/catalogo' },
        style: { backgroundColor: '#ffc602' }
      })
    ])
  ]);

  const yellow = collectColors(root).colors.find(color => color.value === '#ffc602');

  assert.ok(yellow);
  assert.equal(yellow.suggestedRole, 'primary');
  assert.equal(yellow.sample.property, 'backgroundColor');
  assert.equal(yellow.sample.context.appearsInCta, true);
  assert.match(yellow.roleReason, /CTA|acción principal/i);
});

test('active navigation border is not classified as success', () => {
  const root = tree('body', {}, [
    tree('nav', {}, [
      tree('li', {
        text: 'Dashboard',
        className: 'active nav-item',
        style: { borderBottomColor: '#dee2e6' }
      })
    ])
  ]);

  const grey = collectColors(root).colors.find(color => color.value === '#dee2e6');

  assert.ok(grey);
  assert.equal(grey.sample.context.stateContext, 'active_navigation');
  assert.notEqual(grey.suggestedRole, 'success');
  assert.ok(['border', 'accent', 'unknown'].includes(grey.suggestedRole));
});

test('decorative yellow circle is accent, not warning', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('div', {
        className: 'circle circle-bottom',
        style: { backgroundColor: '#ffc602' }
      })
    ])
  ]);

  const yellow = collectColors(root).colors.find(color => color.value === '#ffc602');

  assert.ok(yellow);
  assert.equal(yellow.sample.context.componentType, 'decorative');
  assert.notEqual(yellow.suggestedRole, 'warning');
  assert.equal(yellow.suggestedRole, 'accent');
});

test('white with background sample does not use text role reason', () => {
  const root = tree('body', {}, [
    tree('main', {}, [
      tree('section', {
        className: 'surface',
        style: { backgroundColor: '#ffffff', color: '#ffffff' }
      })
    ])
  ]);

  const white = collectColors(root).colors.find(color => color.value === '#ffffff');

  assert.ok(white);
  assert.equal(white.sample.property, 'backgroundColor');
  assert.notEqual(white.suggestedRole, 'text');
  assert.doesNotMatch(white.roleReason, /color mapea a texto/i);
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
  assert.match(grey.roleReason, /borde mapea a borde/i);
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
