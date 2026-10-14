import { IconName } from '../icons';
/**
 * Turn a button into an icon button: the icon as its only content, `label` as the accessible
 * name (`aria-label`) and `description` (or the label) as the tooltip text. Any `title` is
 * removed so the native tooltip does not double the styled one.
 */
export declare function setIconButton(button: HTMLElement, name: IconName, label: string, description?: string): void;
/** A visually hidden span (for label text that screen readers should still get). */
export declare function hiddenText(text: string, doc?: Document): HTMLSpanElement;
