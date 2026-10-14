/**
 * Tooltips for elements with a `data-tooltip` attribute: one `.olcad-tooltip` per document,
 * shown after a short delay on hover or keyboard focus, hidden on leave, click or Escape.
 * The tooltip shows the element's `aria-label` (bold) and the `data-tooltip` text when it
 * differs. Installed once per document by `installTooltips`.
 */

export const TOOLTIP_DELAY_MS = 400;
const GAP_PX = 6;

const installed = new WeakMap<Document, () => void>();

/** Install the delegated tooltip listeners on a document (once). Returns the uninstall function. */
export function installTooltips(doc: Document = document): () => void {
  const existing = installed.get(doc);
  if (existing) return existing;

  let tip: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: HTMLElement | null = null;

  const element = (): HTMLElement => {
    if (!tip) {
      tip = doc.createElement('div');
      tip.className = 'olcad-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      doc.body.append(tip);
    }
    return tip;
  };

  const hide = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    current = null;
    if (tip) tip.hidden = true;
  };

  const show = (target: HTMLElement): void => {
    const text = target.getAttribute('data-tooltip') ?? '';
    const label = target.getAttribute('aria-label') ?? '';
    if (!text && !label) return;
    const el = element();
    el.replaceChildren();
    if (label) {
      const strong = doc.createElement('strong');
      strong.className = 'olcad-tooltip__label';
      strong.textContent = label;
      el.append(strong);
    }
    if (text && text !== label) {
      const span = doc.createElement('span');
      span.className = 'olcad-tooltip__text';
      span.textContent = text;
      el.append(span);
    }
    el.hidden = false;
    position(el, target, doc);
  };

  const schedule = (target: HTMLElement): void => {
    if (target === current) return;
    hide();
    current = target;
    timer = setTimeout(() => {
      timer = null;
      if (current === target && target.isConnected) show(target);
    }, TOOLTIP_DELAY_MS);
  };

  const owner = (event: Event): HTMLElement | null =>
    (event.target as Element | null)?.closest?.('[data-tooltip]') ?? null;

  const onOver = (event: Event): void => {
    const target = owner(event);
    if (target) schedule(target);
  };
  const onOut = (event: Event): void => {
    const target = owner(event);
    const related = (event as PointerEvent).relatedTarget as Node | null;
    if (target && target === current && !(related && target.contains(related))) hide();
  };
  const onFocusIn = (event: Event): void => {
    const target = owner(event);
    if (target) schedule(target);
  };
  const onFocusOut = (event: Event): void => {
    if (owner(event) === current) hide();
  };
  const onDown = (): void => hide();
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') hide();
  };

  doc.addEventListener('pointerover', onOver);
  doc.addEventListener('pointerout', onOut);
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  doc.addEventListener('pointerdown', onDown, true);
  doc.addEventListener('keydown', onKey, true);

  const uninstall = (): void => {
    hide();
    doc.removeEventListener('pointerover', onOver);
    doc.removeEventListener('pointerout', onOut);
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('focusout', onFocusOut);
    doc.removeEventListener('pointerdown', onDown, true);
    doc.removeEventListener('keydown', onKey, true);
    tip?.remove();
    tip = null;
    installed.delete(doc);
  };
  installed.set(doc, uninstall);
  return uninstall;
}

/** Place the tooltip below the target, centred and clamped to the viewport; above when there is no room. */
function position(tip: HTMLElement, target: HTMLElement, doc: Document): void {
  const view = doc.defaultView;
  const anchor = target.getBoundingClientRect();
  const size = tip.getBoundingClientRect();
  const viewportWidth = view?.innerWidth ?? 0;
  const viewportHeight = view?.innerHeight ?? 0;
  let top = anchor.bottom + GAP_PX;
  if (
    viewportHeight &&
    top + size.height > viewportHeight &&
    anchor.top - GAP_PX - size.height >= 0
  ) {
    top = anchor.top - GAP_PX - size.height;
  }
  let left = anchor.left + anchor.width / 2 - size.width / 2;
  if (viewportWidth) left = Math.min(Math.max(GAP_PX, left), viewportWidth - size.width - GAP_PX);
  tip.style.left = `${Math.max(0, Math.round(left))}px`;
  tip.style.top = `${Math.max(0, Math.round(top))}px`;
}
