import { compactText, getAccessibleName, getCandidateElements, isProbablyGenericLinkText, isVisibleElement } from './utils.js';

export function collectComponents(root = document.body) {
  const buttons = Array.from(root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a[class*="button"], a[class*="btn"]')).filter(isVisibleElement);
  const links = Array.from(root.querySelectorAll('a[href]')).filter(isVisibleElement);
  const inputs = Array.from(root.querySelectorAll('input, textarea, select')).filter(isVisibleElement);
  const cards = Array.from(root.querySelectorAll('[class*="card"], article, [data-card]')).filter(isVisibleElement);
  const alerts = Array.from(root.querySelectorAll('[role="alert"], [aria-live], .alert, [class*="toast"], [class*="notification"]')).filter(isVisibleElement);
  const navigation = Array.from(root.querySelectorAll('nav, [role="navigation"]')).filter(isVisibleElement);
  const forms = Array.from(root.querySelectorAll('form')).filter(isVisibleElement);
  const images = Array.from(root.querySelectorAll('img')).filter(isVisibleElement);
  const badges = Array.from(root.querySelectorAll('[class*="badge"], [class*="tag"], [class*="pill"], [data-badge]')).filter(isVisibleElement);
  const dialogs = Array.from(root.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="dialog"]')).filter(isVisibleElement);
  const ctaGroups = findCtaGroups(buttons, links);

  const buttonSamples = buttons.slice(0, 8).map(element => ({
    text: getAccessibleName(element),
    selector: describeElement(element),
    disabled: element.matches(':disabled, [aria-disabled="true"]')
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
      inputs
    }
  };
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
