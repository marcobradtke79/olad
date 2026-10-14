import { icon, type IconName } from '../icons';
import { installTooltips } from '../tooltip';

/**
 * Turn a button into an icon button: the icon as its only content, `label` as the accessible
 * name (`aria-label`) and `description` (or the label) as the tooltip text. Any `title` is
 * removed so the native tooltip does not double the styled one.
 */
export function setIconButton(
  button: HTMLElement,
  name: IconName,
  label: string,
  description?: string,
): void {
  button.replaceChildren(icon(name, button.ownerDocument));
  button.classList.add('olcad-icon-button');
  button.setAttribute('aria-label', label);
  button.setAttribute('data-tooltip', description ?? label);
  button.removeAttribute('title');
  installTooltips(button.ownerDocument);
}

/** A visually hidden span (for label text that screen readers should still get). */
export function hiddenText(text: string, doc: Document = document): HTMLSpanElement {
  const span = doc.createElement('span');
  span.className = 'olcad-visually-hidden';
  span.textContent = text;
  return span;
}
