/**
 * Tooltips for elements with a `data-tooltip` attribute: one `.olcad-tooltip` per document,
 * shown after a short delay on hover or keyboard focus, hidden on leave, click or Escape.
 * The tooltip shows the element's `aria-label` (bold) and the `data-tooltip` text when it
 * differs. Installed once per document by `installTooltips`.
 */
export declare const TOOLTIP_DELAY_MS = 400;
/** Install the delegated tooltip listeners on a document (once). Returns the uninstall function. */
export declare function installTooltips(doc?: Document): () => void;
