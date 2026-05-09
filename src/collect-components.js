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
      images: images.length
    },
    samples: {
      buttons: buttonSamples,
      unlabeledInputs: unlabeledInputs.slice(0, 8).map(describeElement),
      disabledControls: disabledControls.slice(0, 8).map(describeElement),
      genericLinks: genericLinks.slice(0, 8).map(link => compactText(link.textContent, 60)),
      imagesWithoutAlt: imagesWithoutAlt.slice(0, 8).map(image => compactText(image.currentSrc || image.src, 90))
    },
    raw: {
      buttons,
      links,
      inputs
    }
  };
}

function describeElement(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const klass = Array.from(element.classList || []).slice(0, 2).map(item => `.${item}`).join('');
  const label = getAccessibleName(element);
  return `${tag}${id}${klass}${label ? ` — ${label}` : ''}`;
}
