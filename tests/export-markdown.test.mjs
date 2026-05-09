import test from 'node:test';
import assert from 'node:assert/strict';

import { createBehavioralFinding } from '../src/behavioral-finding.js';
import { buildDesignContextMarkdown, buildGitHubIssueMarkdown, buildGithubIssueExport, buildJsonExport } from '../src/export-markdown.js';

test('design context markdown leads with technical design context sections', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  assert.match(markdown, /## Design System Snapshot/);
  assert.match(markdown, /## Component Inventory/);
  assert.match(markdown, /## Implementation guidance/);
  assert.match(markdown, /## UX Friction Notes/);
});

test('behavioral notes are not the main axis above the technical snapshot', () => {
  const markdown = buildDesignContextMarkdown(createSnapshot());

  const snapshotIndex = markdown.indexOf('## Design System Snapshot');
  const componentIndex = markdown.indexOf('## Component Inventory');
  const frictionIndex = markdown.indexOf('## UX Friction Notes');
  const firstBehavioralIndex = markdown.toLowerCase().indexOf('behavioral');

  assert.ok(snapshotIndex > -1);
  assert.ok(componentIndex > snapshotIndex);
  assert.ok(frictionIndex > componentIndex);
  assert.ok(firstBehavioralIndex > snapshotIndex);
});

test('github issue export includes the required issue structure', () => {
  const markdown = buildGithubIssueExport(createSnapshot());

  assert.match(markdown, /^# UI\/UX debt detected on current page/);
  assert.match(markdown, /## Problem/);
  assert.match(markdown, /## Evidence/);
  assert.match(markdown, /## Suggested fix/);
  assert.match(markdown, /## Acceptance criteria/);
});

test('copy exports can be generated from the same snapshot', () => {
  const snapshot = createSnapshot();
  const designContext = buildDesignContextMarkdown(snapshot);
  const jsonReport = buildJsonExport(snapshot);
  const githubIssue = buildGithubIssueExport(snapshot);
  const parsedReport = JSON.parse(jsonReport);

  assert.match(designContext, /^# design-context\.md/);
  assert.equal(parsedReport.meta.sourceUrl, snapshot.meta.url);
  assert.equal(parsedReport.screenSummary.pageTitle, snapshot.meta.title);
  assert.match(githubIssue, /2 button\/CTA candidate\(s\) detected/);
  assert.match(githubIssue, /Acciones primarias compitiendo/);
});

test('GitHub issue compatibility export stays wired to the new export', () => {
  const snapshot = createSnapshot();

  assert.equal(buildGitHubIssueMarkdown(snapshot), buildGithubIssueExport(snapshot));
});

test('github issue export stays conservative when evidence is missing', () => {
  const markdown = buildGithubIssueExport({});

  assert.match(markdown, /No strong automated evidence was detected/);
  assert.doesNotMatch(markdown, /undefined|NaN/);
  assert.doesNotMatch(markdown, /0 button\/CTA candidate/);
  assert.doesNotMatch(markdown, /0 unique color/);
});

function createSnapshot() {
  const finding = createBehavioralFinding({
    id: 'where.multiple-primary-actions',
    title: 'Acciones primarias compitiendo',
    block: 'where',
    frictionType: 'baja_accionabilidad',
    severity: 4,
    confidence: 'media',
    evidenceType: 'structural',
    evidence: '2 acciones prominentes.',
    recommendation: 'Mantener una acción primaria por bloque de decisión.',
    systemImplication: 'Gobernar variantes de Button y CTA group.',
    expectedImpact: 'high',
    implementationEffort: 'low',
    metric: 'CTR del CTA principal'
  });

  return {
    meta: {
      url: 'https://example.com',
      title: 'Example page',
      generatedAt: '2026-05-09T10:00:00.000Z',
      viewport: {
        width: 1440,
        height: 900
      }
    },
    colors: {
      colors: [
        {
          value: '#111111',
          count: 12,
          suggestedRole: 'text',
          roleConfidence: 'likely',
          sample: { selector: 'body', property: 'color' }
        },
        {
          value: '#2563eb',
          count: 4,
          suggestedRole: 'primary',
          roleConfidence: 'possible',
          sample: { selector: 'button.primary', property: 'backgroundColor' }
        }
      ],
      cssVariables: [{ name: '--color-primary', value: '#2563eb' }],
      totalUniqueColors: 8
    },
    typography: {
      typeStyles: [
        { value: 'Inter, sans-serif | 16px / 24px | 400 | 0px', count: 8 },
        { value: 'Inter, sans-serif | 32px / 40px | 700 | 0px', count: 1 }
      ],
      fontFamilies: [{ value: 'Inter, sans-serif', count: 9 }],
      totalUniqueTypeStyles: 2
    },
    spacing: {
      spacingScale: [{ value: '8px', count: 6 }, { value: '16px', count: 12 }],
      radii: [{ value: '8px', count: 4 }],
      shadows: [{ value: '0 8px 24px rgba(0,0,0,.12)', count: 1 }],
      borders: [{ value: '1px solid', count: 6 }],
      totalUniqueSpacingValues: 4,
      totalUniqueRadiusValues: 1
    },
    components: {
      counts: {
        buttons: 2,
        links: 3,
        inputs: 1,
        forms: 1,
        cards: 3,
        alerts: 1,
        navigation: 1,
        images: 1,
        badges: 1,
        dialogs: 0,
        ctaGroups: 1
      },
      samples: {
        buttons: [{ text: 'Crear mi plan', selector: 'button.primary', disabled: false }],
        unlabeledInputs: ['input.email'],
        disabledControls: [],
        genericLinks: ['leer más'],
        imagesWithoutAlt: [],
        badges: ['span.badge'],
        dialogs: [],
        ctaGroups: [{ selector: 'div.actions', actions: ['Crear mi plan', 'Ver precios'] }]
      }
    },
    behavioralMapping: [
      {
        block: 'where',
        label: 'Where',
        present: 'sí',
        quality: 3,
        evidence: ['CTA detectado'],
        missing: [],
        frictionType: 'baja_accionabilidad',
        detectedFriction: 'Acciones primarias compitiendo',
        severity: 4,
        recommendation: 'Mantener una acción primaria.',
        metrics: ['CTR del CTA principal']
      }
    ],
    frictions: [finding],
    behavioralRecommendation: {
      sections: []
    }
  };
}
