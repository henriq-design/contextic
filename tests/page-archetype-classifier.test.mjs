import test from 'node:test';
import assert from 'node:assert/strict';

import { pageArchetypeClassifier, shouldRunFullBehavioralAnalysis } from '../src/page-archetype-classifier.js';

test('classifies a Vodafone Care style landing as full behavioral', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://www.vodafone.es/c/vodafone-care/',
    title: 'Vodafone Care',
    headings: ['Vodafone Care', 'Todo el soporte para cuidar de tu servicio', 'Preguntas frecuentes'],
    visibleText: 'Vodafone Care es un servicio de soporte y cuidado para clientes. Solicitar información Contactar Ver beneficios Preguntas frecuentes',
    components: {
      counts: { buttons: 2, forms: 1, cards: 4, ctaGroups: 1 },
      samples: { buttons: [{ text: 'Solicitar información' }], ctaGroups: [{ actions: ['Solicitar información', 'Ver beneficios'] }] }
    },
    presenceOfHero: true,
    presenceOfFaq: true
  });

  assert.equal(classification.archetype, 'service_landing');
  assert.equal(classification.confidence, 'high');
  assert.equal(classification.analysisMode, 'full_behavioral');
  assert.equal(shouldRunFullBehavioralAnalysis(classification), true);
});

test('classifies an ecommerce category without enabling behavioral conversion recommendations', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://shop.example.com/collections/phones',
    title: 'Teléfonos móviles',
    headings: ['Teléfonos móviles', 'Filtrar por marca'],
    visibleText: 'Productos Ordenar Filtrar Añadir al carrito Precio 299€ Precio 399€ Precio 499€',
    numberOfProductCards: 12,
    presenceOfCartCheckoutTerms: true,
    components: {
      counts: { buttons: 8, cards: 12, ctaGroups: 0, forms: 0 },
      samples: { buttons: [{ text: 'Añadir al carrito' }] }
    }
  });

  assert.equal(classification.archetype, 'ecommerce_category');
  assert.equal(classification.analysisMode, 'limited_behavioral');
  assert.equal(shouldRunFullBehavioralAnalysis(classification), false);
});

test('classifies an article/blog page without full behavioral analysis', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://example.com/blog/design-systems',
    title: 'Cómo ordenar un sistema de diseño',
    headings: ['Cómo ordenar un sistema de diseño'],
    visibleText: 'Publicado por Ana Pérez el 12 mayo 2026. Tiempo de lectura 6 minutos. Artículo sobre componentes.',
    presenceOfArticleDateAuthorTerms: true,
    components: {
      counts: { buttons: 0, cards: 0, ctaGroups: 0, forms: 0 },
      samples: { buttons: [] }
    }
  });

  assert.equal(classification.archetype, 'article_or_blog');
  assert.equal(classification.analysisMode, 'limited_behavioral');
});

test('keeps weak evidence as unknown snapshot only', () => {
  const classification = pageArchetypeClassifier({
    url: 'https://example.com/random',
    title: 'Untitled',
    headings: ['Hello'],
    visibleText: 'Small amount of content.',
    components: {
      counts: { buttons: 0, cards: 0, ctaGroups: 0, forms: 0 },
      samples: { buttons: [] }
    }
  });

  assert.equal(classification.archetype, 'unknown');
  assert.equal(classification.confidence, 'low');
  assert.equal(classification.analysisMode, 'snapshot_only');
});
