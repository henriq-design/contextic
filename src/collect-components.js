import { compactText, getAccessibleName, getCandidateElements, isProbablyGenericLinkText, isVisibleElement } from './utils.js';
import { classifyElementRegion } from './dom-regions.js';

export function collectComponents(root = document.body) {
  const allButtons = componentElements(root, 'button, [role="button"], input[type="button"], input[type="submit"], a[class*="button"], a[class*="btn"]');
  const allLinks = componentElements(root, 'a[href]');
  const allInputs = componentElements(root, 'input, textarea, select');
  const allCards = componentElements(root, '[class*="card"], article, [data-card]');
  const allAlerts = componentElements(root, '[role="alert"], [aria-live], .alert, [class*="toast"], [class*="notification"]');
  const allNavigation = componentElements(root, 'nav, [role="navigation"]');
  const allForms = componentElements(root, 'form');
  const allImages = componentElements(root, 'img');
  const allBadges = componentElements(root, '[class*="badge"], [class*="tag"], [class*="pill"], [data-badge]');
  const allDialogs = componentElements(root, 'dialog[open], [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="dialog"]');
  const buttons = userFacingElements(allButtons);
  const links = userFacingElements(allLinks);
  const inputs = userFacingElements(allInputs);
  const cards = userFacingElements(allCards);
  const alerts = userFacingElements(allAlerts);
  const navigation = userFacingElements(allNavigation);
  const forms = userFacingElements(allForms);
  const images = userFacingElements(allImages);
  const badges = userFacingElements(allBadges);
  const dialogs = userFacingElements(allDialogs);
  const ctaGroups = findCtaGroups(buttons, links);
  const systemUtilityWidgets = detectSystemUtilityWidgets(root);

  const buttonSamples = buttons.slice(0, 8).map(element => ({
    text: getAccessibleName(element),
    selector: describeElement(element),
    disabled: element.matches(':disabled, [aria-disabled="true"]'),
    ...buildComponentContext(element)
  }));

  const unlabeledInputs = inputs.filter(input => !getAccessibleName(input));
  const disabledControls = [...buttons, ...inputs].filter(element => element.matches(':disabled, [aria-disabled="true"]'));
  const genericLinks = links.filter(link => isProbablyGenericLinkText(link.textContent));
  const imagesWithoutAlt = images.filter(image => !image.hasAttribute('alt'));

  return {
    counts: {
      buttons: buttons.length,
      links: links.length,
      inputs: inputs.length,
      forms: forms.length,
      cards: cards.length,
      alerts: alerts.length,
      navigation: navigation.length,
      images: images.length,
      badges: badges.length,
      dialogs: dialogs.length,
      ctaGroups: ctaGroups.length
    },
    systemHiddenComponents: {
      buttons: allButtons.length - buttons.length,
      links: allLinks.length - links.length,
      inputs: allInputs.length - inputs.length,
      forms: allForms.length - forms.length,
      cards: allCards.length - cards.length,
      alerts: allAlerts.length - alerts.length,
      navigation: allNavigation.length - navigation.length,
      images: allImages.length - images.length,
      badges: allBadges.length - badges.length,
      dialogs: allDialogs.length - dialogs.length
    },
    systemUtilityWidgets,
    samples: {
      buttons: buttonSamples,
      unlabeledInputs: unlabeledInputs.slice(0, 8).map(describeElement),
      disabledControls: disabledControls.slice(0, 8).map(describeElement),
      genericLinks: genericLinks.slice(0, 8).map(link => compactText(link.textContent, 60)),
      imagesWithoutAlt: imagesWithoutAlt.slice(0, 8).map(image => compactText(image.currentSrc || image.src, 90)),
      badges: badges.slice(0, 8).map(describeElement),
      dialogs: dialogs.slice(0, 4).map(describeElement),
      ctaGroups: ctaGroups.slice(0, 6).map(group => ({
        selector: describeElement(group.element),
        actions: group.actions.map(action => compactText(action, 60))
      }))
    },
    raw: {
      buttons,
      links,
      inputs,
      allButtons,
      allLinks,
      allInputs
    }
  };
}

function detectSystemUtilityWidgets(root) {
  const seen = new Set();
  const widgets = [];

  for (const item of componentElements(root, 'button, [role="button"], [class*="accessibility"], [class*="accessi"], [class*="a11y"], [class*="bmv"], [class*="widget"], [class*="toolbar"], [class*="assistive"], [id*="accessibility"], [id*="bmv"]')) {
    if (!item.context.isSystemOrHidden) continue;
    const element = systemUtilityRoot(item.element);
    if (seen.has(element)) continue;
    seen.add(element);
    widgets.push({
      type: /accessibility|accessi|a11y|bmv|assistive/i.test(describeElement(element)) ? 'accessibility_widget' : 'system_utility',
      selector: describeElement(element),
      region: item.context.region
    });
  }

  return widgets.slice(0, 8);
}

function systemUtilityRoot(element) {
  let current = element;
  while (current?.parentElement) {
    const parentDescription = describeElement(current.parentElement);
    if (!/accessibility|accessi|a11y|bmv|widget|plugin|floating|toolbar|overlay|assistive/i.test(parentDescription)) break;
    current = current.parentElement;
  }
  return current;
}

function componentElements(root, selector) {
  return Array.from(root.querySelectorAll(selector))
    .filter(isVisibleElement)
    .map(element => ({ element, context: buildComponentContext(element) }));
}

function userFacingElements(items) {
  return items.filter(item => item.context.isUserFacing).map(item => item.element);
}

function buildComponentContext(element) {
  const region = classifyElementRegion(element);
  const isVisible = isVisibleElement(element);
  const isSystemOrHidden = region === 'hidden_or_system';
  return {
    region,
    isVisible,
    isUserFacing: isVisible && !isSystemOrHidden,
    isInteractive: isInteractive(element),
    isSystemOrHidden
  };
}

function isInteractive(element) {
  const tag = element.tagName?.toLowerCase?.() || '';
  const role = String(element.getAttribute?.('role') || '').toLowerCase();
  return ['button', 'a', 'input', 'select', 'textarea'].includes(tag) || role === 'button' || Boolean(element.getAttribute?.('tabindex'));
}

function findCtaGroups(buttons, links) {
  const actionsByParent = new Map();

  for (const element of [...buttons, ...links]) {
    const parent = element.parentElement;
    if (!parent) continue;

    const label = getAccessibleName(element);
    if (!label) continue;

    const actions = actionsByParent.get(parent) || [];
    actions.push(label);
    actionsByParent.set(parent, actions);
  }

  return Array.from(actionsByParent.entries())
    .filter(([, actions]) => actions.length >= 2)
    .map(([element, actions]) => ({ element, actions }));
}

function describeElement(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const klass = Array.from(element.classList || []).slice(0, 2).map(item => `.${item}`).join('');
  const label = getAccessibleName(element);
  return `${tag}${id}${klass}${label ? ` — ${label}` : ''}`;
}
