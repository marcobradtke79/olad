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

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"]';

function isDisabled(item: HTMLElement): boolean {
  if (item instanceof HTMLButtonElement) return item.disabled;
  const input = item.querySelector('input');
  return input?.disabled ?? item.getAttribute('aria-disabled') === 'true';
}

export class OlcadMenu extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label'];
  }

  readonly button: HTMLButtonElement = document.createElement('button');
  readonly popup: HTMLElement = document.createElement('div');
  private built = false;

  get label(): string {
    return this.getAttribute('label') ?? 'Menu';
  }

  set label(value: string) {
    this.setAttribute('label', value);
  }

  get open(): boolean {
    return !this.popup.hidden;
  }

  attributeChangedCallback(): void {
    if (this.built) this.button.textContent = this.label;
  }

  connectedCallback(): void {
    this.classList.add('olcad-menu');
    if (!this.built) this.build();
  }

  /** Open the popup; focuses the first item when `focusItem` is set. */
  show(focusItem: 'first' | 'last' | false = false): void {
    this.menubar()?.closeAll(this);
    this.popup.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    if (focusItem) {
      const items = this.items();
      (focusItem === 'first' ? items[0] : items[items.length - 1])?.focus();
    }
  }

  /** Close the popup; moves focus back to the button when `refocus` is set. */
  hide(refocus = false): void {
    if (this.popup.hidden) return;
    this.popup.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    if (refocus) this.button.focus();
  }

  /** Enabled items in document order. */
  items(): HTMLElement[] {
    return Array.from(this.popup.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (item) => !isDisabled(item),
    );
  }

  private menubar(): OlcadMenubar | null {
    const parent = this.closest('olcad-menubar');
    return parent instanceof OlcadMenubar ? parent : null;
  }

  private build(): void {
    this.built = true;
    this.button.type = 'button';
    this.button.className = 'olcad-menu__button';
    this.button.textContent = this.label;
    this.button.setAttribute('role', 'menuitem');
    this.button.setAttribute('aria-haspopup', 'menu');
    this.button.setAttribute('aria-expanded', 'false');
    this.popup.className = 'olcad-menu__popup';
    this.popup.setAttribute('role', 'menu');
    this.popup.setAttribute('aria-label', this.label);
    this.popup.hidden = true;
    this.popup.append(...Array.from(this.childNodes));
    this.decorateItems();
    this.append(this.button, this.popup);

    this.button.addEventListener('click', () => {
      if (this.open) this.hide();
      else this.show();
    });
    this.button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.show('first');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.show('last');
      }
    });
    this.button.addEventListener('pointerenter', () => {
      // Menubar convention: with one menu open, hovering another switches to it.
      const bar = this.menubar();
      if (bar && bar.openMenu() && bar.openMenu() !== this) this.show();
    });
    this.popup.addEventListener('click', (event) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR);
      if (!item || !this.popup.contains(item)) return;
      if (item.getAttribute('role') === 'menuitemcheckbox') {
        this.syncChecked(item);
        return;
      }
      // Let the host's click handler run first (same event, bubbling), then close.
      queueMicrotask(() => this.hide(true));
    });
    this.popup.addEventListener('change', (event) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[role="menuitemcheckbox"]');
      if (item) this.syncChecked(item);
    });
    this.popup.addEventListener('keydown', this.onPopupKeyDown);
  }

  /** Give items added to the popup after the menu was built their roles and state. */
  refresh(): void {
    this.decorateItems();
  }

  private decorateItems(): void {
    for (const child of Array.from(this.popup.children) as HTMLElement[]) {
      if (child instanceof HTMLButtonElement) {
        child.setAttribute('role', 'menuitem');
        child.classList.add('olcad-menu__item');
        child.tabIndex = -1;
      } else if (child instanceof HTMLLabelElement && child.querySelector('input[type=checkbox]')) {
        child.setAttribute('role', 'menuitemcheckbox');
        child.classList.add('olcad-menu__item', 'olcad-menu__item--checkbox');
        child.tabIndex = -1;
        this.syncChecked(child);
      } else if (child instanceof HTMLHRElement) {
        child.setAttribute('role', 'separator');
        child.classList.add('olcad-menu__separator');
      }
    }
  }

  private syncChecked(item: HTMLElement): void {
    const input = item.querySelector<HTMLInputElement>('input[type=checkbox]');
    if (input) item.setAttribute('aria-checked', String(input.checked));
  }

  private readonly onPopupKeyDown = (event: KeyboardEvent): void => {
    const items = this.items();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        focusAt(index - 1);
        break;
      case 'Home':
        focusAt(0);
        break;
      case 'End':
        focusAt(items.length - 1);
        break;
      case 'Escape':
        this.hide(true);
        break;
      case 'Enter':
      case ' ': {
        const item = document.activeElement as HTMLElement | null;
        if (!item || !items.includes(item)) return;
        if (item.getAttribute('role') === 'menuitemcheckbox') {
          const input = item.querySelector<HTMLInputElement>('input[type=checkbox]');
          if (input) {
            input.checked = !input.checked;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          item.click();
        }
        break;
      }
      case 'Tab':
        this.hide();
        return;
      default: {
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
        const letter = event.key.toLowerCase();
        const next = [...items.slice(index + 1), ...items.slice(0, index + 1)].find((item) =>
          (item.textContent ?? '').trim().toLowerCase().startsWith(letter),
        );
        if (!next) return;
        next.focus();
      }
    }
    event.preventDefault();
  };
}

export class OlcadMenubar extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('olcad-menubar');
    this.setAttribute('role', 'menubar');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Main menu');
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusout', this.onFocusOut);
    this.ownerDocument.addEventListener('pointerdown', this.onDocumentPointerDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.onKeyDown);
    this.removeEventListener('focusout', this.onFocusOut);
    this.ownerDocument.removeEventListener('pointerdown', this.onDocumentPointerDown);
  }

  /** The `<olcad-menu>` children in order. */
  menus(): OlcadMenu[] {
    return Array.from(this.children).filter((c): c is OlcadMenu => c instanceof OlcadMenu);
  }

  /** The open menu, if any. */
  openMenu(): OlcadMenu | null {
    return this.menus().find((menu) => menu.open) ?? null;
  }

  /** Close every menu except `keep`. */
  closeAll(keep?: OlcadMenu): void {
    for (const menu of this.menus()) if (menu !== keep) menu.hide();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const menus = this.menus();
    if (menus.length === 0) return;
    const target = event.target as HTMLElement;
    const current = menus.findIndex((menu) => menu.contains(target));
    if (current === -1) return;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = menus[(current + delta + menus.length) % menus.length]!;
    const wasOpen = menus[current]!.open;
    if (wasOpen) {
      next.show('first');
    } else {
      next.button.focus();
    }
    event.preventDefault();
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && this.contains(next)) return;
    this.closeAll();
  };

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (this.contains(event.target as Node)) return;
    this.closeAll();
  };
}
