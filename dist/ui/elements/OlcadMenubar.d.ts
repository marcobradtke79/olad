/**
 * `<olcad-menubar>` and `<olcad-menu>`: an accessible menu bar for host applications.
 *
 * ```html
 * <olcad-menubar aria-label="Main menu">
 *   <olcad-menu label="File">
 *     <button type="button">Save</button>
 *     <label><input type="checkbox" /> Simulate failure</label>
 *     <hr />
 *     <button type="button">Reset</button>
 *   </olcad-menu>
 * </olcad-menubar>
 * ```
 *
 * The host's own buttons, checkbox labels and separators become the items; the element adds
 * the roles, the popup and the keyboard behaviour. Light DOM, no framework.
 */
export declare class OlcadMenu extends HTMLElement {
    static get observedAttributes(): string[];
    readonly button: HTMLButtonElement;
    readonly popup: HTMLElement;
    private built;
    get label(): string;
    set label(value: string);
    get open(): boolean;
    attributeChangedCallback(): void;
    connectedCallback(): void;
    /** Open the popup; focuses the first item when `focusItem` is set. */
    show(focusItem?: 'first' | 'last' | false): void;
    /** Close the popup; moves focus back to the button when `refocus` is set. */
    hide(refocus?: boolean): void;
    /** Enabled items in document order. */
    items(): HTMLElement[];
    private menubar;
    private build;
    /** Give items added to the popup after the menu was built their roles and state. */
    refresh(): void;
    private decorateItems;
    private syncChecked;
    private readonly onPopupKeyDown;
}
export declare class OlcadMenubar extends HTMLElement {
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** The `<olcad-menu>` children in order. */
    menus(): OlcadMenu[];
    /** The open menu, if any. */
    openMenu(): OlcadMenu | null;
    /** Close every menu except `keep`. */
    closeAll(keep?: OlcadMenu): void;
    private readonly onKeyDown;
    private readonly onFocusOut;
    private readonly onDocumentPointerDown;
}
