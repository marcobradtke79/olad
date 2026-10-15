import { installTooltips } from '../tooltip';

export type DockSide = 'top' | 'right' | 'bottom' | 'left';
export type DockPosition = DockSide | 'floating';

/**
 * Where a panel sits. `x` / `y` are pixels from the dock's top-left corner and apply when
 * floating. `hidden` is only present (`true`) for a hidden panel that can be toggled.
 */
export interface PanelPlacement {
  dock: DockPosition;
  x: number;
  y: number;
  hidden?: boolean;
}

export const DOCK_POSITIONS: readonly DockPosition[] = [
  'top',
  'right',
  'bottom',
  'left',
  'floating',
];

/** The dock host interface a panel talks to while being dragged. Implemented by `<olcad-dock>`. */
export interface DockHost extends HTMLElement {
  /** Apply a stored placement (once) and move the panel into the zone matching its `dock`. */
  adopt(panel: OlcadPanel): void;
  dropZoneAt(clientX: number, clientY: number): DockSide | null;
  highlightZone(side: DockSide | null): void;
}

export const DOCK_CHANGE_EVENT = 'olcad-dockchange';
/** Emitted (bubbling) when a flyout panel opens or closes; `detail` is `{ name, open }`. */
export const FLYOUT_TOGGLE_EVENT = 'olcad-flyouttoggle';

const DRAG_THRESHOLD_PX = 4;
const KEYBOARD_STEP_PX = 10;
const LABELS: Record<DockPosition, string> = {
  top: 'Dock top',
  right: 'Dock right',
  bottom: 'Dock bottom',
  left: 'Dock left',
  floating: 'Float',
};

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  previous: PanelPlacement;
  moved: boolean;
}

/**
 * `<olcad-panel>`: a dockable, floating container for any content. Attributes:
 * `name` (key for layout persistence), `heading`, `dock` (`top | right | bottom | left | floating`),
 * `x`, `y` (floating position in pixels), `flyout` (docked left or right, the panel collapses to
 * its header and shows its content as an overlay while `open`), `compact` (no title, the grip
 * alone is the header and opens the dock menu on click; toolboxes default to it). The panel
 * wraps its children in `.olcad-panel__content` and adds a header with a drag grip and a dock
 * menu. Place it inside `<olcad-dock>`; outside a dock it still renders but cannot be dropped
 * on a zone.
 */
export class OlcadPanel extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['dock', 'x', 'y', 'heading', 'flyout', 'open', 'compact'];
  }

  /** Dock position used when the element has no `dock` attribute. Subclasses override. */
  protected get defaultDock(): DockPosition {
    return 'floating';
  }

  protected get defaultHeading(): string {
    return 'Panel';
  }

  /** Whether the panel is compact without a `compact` attribute. Toolboxes override with `true`. */
  protected get defaultCompact(): boolean {
    return false;
  }

  readonly content: HTMLElement = document.createElement('div');
  private readonly header: HTMLElement = document.createElement('div');
  private readonly grip: HTMLButtonElement = document.createElement('button');
  private readonly titleEl: HTMLElement = document.createElement('span');
  private readonly menuButton: HTMLButtonElement = document.createElement('button');
  private readonly menu: HTMLElement = document.createElement('div');
  private built = false;
  private drag: DragState | null = null;
  private suppressEvents = false;
  private compactRole = false;

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  /** Reflects to the attribute, so frameworks that set properties (React 19, Vue) work. */
  set name(value: string) {
    this.setAttribute('name', value);
  }

  get heading(): string {
    return this.getAttribute('heading') ?? this.defaultHeading;
  }

  set heading(value: string) {
    this.setAttribute('heading', value);
  }

  get dock(): DockPosition {
    const value = this.getAttribute('dock');
    return DOCK_POSITIONS.includes(value as DockPosition)
      ? (value as DockPosition)
      : this.defaultDock;
  }

  set dock(value: DockPosition) {
    this.setAttribute('dock', value);
  }

  get x(): number {
    return Number(this.getAttribute('x')) || 0;
  }

  set x(value: number) {
    this.setAttribute('x', String(Math.round(value)));
  }

  get y(): number {
    return Number(this.getAttribute('y')) || 0;
  }

  set y(value: number) {
    this.setAttribute('y', String(Math.round(value)));
  }

  /**
   * Whether the layout may show and hide the panel (View menu, `OlcadDock.setPanelVisible`).
   * The `no-toggle` attribute opts out, for panels whose content decides their visibility.
   */
  get toggleable(): boolean {
    return !this.hasAttribute('no-toggle');
  }

  get placement(): PanelPlacement {
    const placement: PanelPlacement = { dock: this.dock, x: this.x, y: this.y };
    if (this.toggleable && this.hidden) placement.hidden = true;
    return placement;
  }

  /**
   * Set dock position, floating coordinates and (for toggleable panels) visibility at once,
   * emitting a single `olcad-dockchange`.
   */
  set placement(placement: PanelPlacement) {
    this.suppressEvents = true;
    if (this.toggleable) this.hidden = placement.hidden === true;
    this.x = placement.x;
    this.y = placement.y;
    this.suppressEvents = false;
    this.dock = placement.dock;
    this.applyPlacement();
    this.emitDockChange();
  }

  get orientation(): 'horizontal' | 'vertical' {
    const dock = this.dock;
    return dock === 'left' || dock === 'right' ? 'vertical' : 'horizontal';
  }

  /** Whether the panel is a flyout: collapsed to its header when docked left or right. */
  get flyout(): boolean {
    return this.hasAttribute('flyout');
  }

  set flyout(value: boolean) {
    this.toggleAttribute('flyout', value);
  }

  /** Whether a flyout shows its content. Ignored unless the panel is in flyout mode. */
  get open(): boolean {
    return this.hasAttribute('open');
  }

  set open(value: boolean) {
    this.toggleAttribute('open', value);
  }

  /** Flyout behaviour applies only while docked on a side. */
  get isFlyout(): boolean {
    return this.flyout && this.orientation === 'vertical';
  }

  /** Compact: no title, the grip is the whole header. `compact="false"` opts a toolbox out. */
  get compact(): boolean {
    const value = this.getAttribute('compact');
    return value === null ? this.defaultCompact : value !== 'false';
  }

  set compact(value: boolean) {
    this.setAttribute('compact', String(value));
  }

  /** Compact rendering applies unless the panel is a flyout (whose title is the tab). */
  get isCompact(): boolean {
    return this.compact && !this.isFlyout;
  }

  /** Open or close the flyout (toggle without an argument). Opening closes the other flyouts of the zone. */
  toggleFlyout(open: boolean = !this.open): void {
    if (open) {
      for (const other of this.parentElement?.querySelectorAll<OlcadPanel>(
        '.olcad-panel[data-flyout][open]',
      ) ?? []) {
        if (other !== this) other.open = false;
      }
    }
    this.open = open;
  }

  connectedCallback(): void {
    this.classList.add('olcad-panel');
    if (!this.built) this.build();
    this.applyPlacement();
    installTooltips(this.ownerDocument);
    // When the panel is upgraded after its dock (elements defined after parsing), the dock could
    // not recognise it during its own placement pass. Ask it now unless we already sit in a zone.
    const host = this.dockHost();
    if (host && this.parentElement?.dataset.zone !== this.dock) host.adopt(this);
  }

  attributeChangedCallback(name: string): void {
    if (!this.built) return;
    if (name === 'heading') {
      this.titleEl.textContent = this.heading;
      this.grip.setAttribute('aria-label', `Move ${this.heading}`);
      this.applyCompact();
      return;
    }
    if (name === 'flyout' || name === 'compact') {
      this.applyFlyout();
      this.applyCompact();
      return;
    }
    if (name === 'open') {
      this.applyFlyout();
      this.dispatchEvent(
        new CustomEvent(FLYOUT_TOGGLE_EVENT, {
          bubbles: true,
          composed: true,
          detail: { name: this.name, open: this.open },
        }),
      );
      return;
    }
    this.applyPlacement();
    if (!this.suppressEvents) this.emitDockChange();
  }

  /** The `<olcad-dock>` this panel belongs to, if any. */
  protected dockHost(): DockHost | null {
    const host = this.closest('olcad-dock');
    return host && 'adopt' in host ? (host as DockHost) : null;
  }

  private build(): void {
    this.built = true;
    this.content.className = 'olcad-panel__content';
    this.content.append(...Array.from(this.childNodes));

    this.header.className = 'olcad-panel__header';
    this.grip.type = 'button';
    this.grip.className = 'olcad-panel__grip';
    this.grip.setAttribute('aria-label', `Move ${this.heading}`);
    this.grip.setAttribute('data-tooltip', 'Drag to move, arrow keys to nudge');
    this.grip.innerHTML = '<span aria-hidden="true">⠿</span>';
    this.titleEl.className = 'olcad-panel__title';
    this.titleEl.textContent = this.heading;
    this.menuButton.type = 'button';
    this.menuButton.className = 'olcad-panel__menu-button';
    this.menuButton.setAttribute('aria-haspopup', 'menu');
    this.menuButton.setAttribute('aria-expanded', 'false');
    this.menuButton.setAttribute('aria-label', 'Dock position');
    this.menuButton.innerHTML = '<span aria-hidden="true">▾</span>';
    this.menu.className = 'olcad-panel__menu';
    this.menu.setAttribute('role', 'menu');
    this.menu.hidden = true;
    for (const position of DOCK_POSITIONS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'olcad-panel__menu-item';
      item.setAttribute('role', 'menuitemradio');
      item.dataset.dock = position;
      item.textContent = LABELS[position];
      item.addEventListener('click', () => {
        this.dock = position;
        this.closeMenu();
        this.menuTrigger().focus();
      });
      this.menu.append(item);
    }
    this.header.append(this.grip, this.titleEl, this.menuButton, this.menu);
    this.append(this.header, this.content);
    this.content.id ||= `olcad-panel-content-${Math.random().toString(36).slice(2, 8)}`;

    // Flyout: the title is the tab.
    this.titleEl.addEventListener('click', () => {
      if (this.isFlyout) this.toggleFlyout();
    });
    this.titleEl.addEventListener('keydown', (event) => {
      if (!this.isFlyout || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      this.toggleFlyout();
      if (this.open) this.focusContent();
    });
    this.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !this.isFlyout || !this.open) return;
      event.preventDefault();
      event.stopPropagation();
      this.toggleFlyout(false);
      this.titleEl.focus();
    });

    this.grip.addEventListener('pointerdown', this.onPointerDown);
    this.grip.addEventListener('pointermove', this.onPointerMove);
    this.grip.addEventListener('pointerup', this.onPointerUp);
    this.grip.addEventListener('pointercancel', this.onPointerCancel);
    this.grip.addEventListener('keydown', this.onGripKeyDown);
    this.grip.addEventListener('contextmenu', (event) => {
      if (!this.isCompact) return;
      event.preventDefault();
      this.toggleMenu();
    });
    this.menuButton.addEventListener('click', () => this.toggleMenu());
    this.menu.addEventListener('keydown', this.onMenuKeyDown);
    this.addEventListener('focusout', (event) => {
      if (!this.contains(event.relatedTarget as Node | null)) this.closeMenu();
    });
  }

  /** Reflect `dock`, `x` and `y` into attributes and CSS variables. Subclasses may extend it. */
  protected applyPlacement(): void {
    const dock = this.dock;
    this.setAttribute('data-dock', dock);
    this.setAttribute('orientation', this.orientation);
    this.style.setProperty('--olcad-panel-x', `${this.x}px`);
    this.style.setProperty('--olcad-panel-y', `${this.y}px`);
    for (const item of this.menu.querySelectorAll<HTMLElement>('[data-dock]')) {
      item.setAttribute('aria-checked', String(item.dataset.dock === dock));
    }
    this.applyFlyout();
    this.applyCompact();
  }

  /** Reflect compact mode: `data-compact`, the heading as the content's accessible name. */
  private applyCompact(): void {
    const compact = this.isCompact;
    this.toggleAttribute('data-compact', compact);
    this.grip.setAttribute(
      'data-tooltip',
      compact
        ? `${this.heading}: drag to move, click for the dock position`
        : 'Drag to move, arrow keys to nudge',
    );
    if (compact) {
      this.content.setAttribute('aria-label', this.heading);
      if (!this.content.hasAttribute('role')) {
        this.content.setAttribute('role', 'group');
        this.compactRole = true;
      }
    } else if (this.compactRole) {
      this.content.removeAttribute('role');
      this.content.removeAttribute('aria-label');
      this.compactRole = false;
    }
  }

  /** Reflect flyout mode: `data-flyout` on the element, the title as an expandable tab. */
  private applyFlyout(): void {
    const flyout = this.isFlyout;
    this.toggleAttribute('data-flyout', flyout);
    if (flyout) {
      this.titleEl.setAttribute('role', 'button');
      this.titleEl.tabIndex = 0;
      this.titleEl.setAttribute('aria-expanded', String(this.open));
      this.titleEl.setAttribute('aria-controls', this.content.id);
      this.titleEl.title = this.open ? `Hide ${this.heading}` : `Show ${this.heading}`;
    } else {
      this.titleEl.removeAttribute('role');
      this.titleEl.removeAttribute('tabindex');
      this.titleEl.removeAttribute('aria-expanded');
      this.titleEl.removeAttribute('aria-controls');
      this.titleEl.removeAttribute('title');
    }
  }

  private focusContent(): void {
    const target = this.content.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    );
    target?.focus();
  }

  private emitDockChange(): void {
    this.dispatchEvent(
      new CustomEvent(DOCK_CHANGE_EVENT, {
        bubbles: true,
        composed: true,
        detail: { name: this.name, ...this.placement },
      }),
    );
  }

  // Dragging

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.getBoundingClientRect();
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      previous: this.placement,
      moved: false,
    };
    this.grip.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX
    ) {
      return;
    }
    drag.moved = true;
    this.classList.add('olcad-panel--dragging');
    const host = this.dockHost();
    const origin = (host ?? this.offsetParent ?? document.body).getBoundingClientRect();
    this.suppressEvents = true;
    this.x = event.clientX - drag.offsetX - origin.left;
    this.y = event.clientY - drag.offsetY - origin.top;
    if (this.dock !== 'floating') this.dock = 'floating';
    this.suppressEvents = false;
    this.applyPlacement();
    this.emitDockChange();
    host?.highlightZone(host.dropZoneAt(event.clientX, event.clientY));
  };

  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    this.classList.remove('olcad-panel--dragging');
    if (!drag.moved) {
      if (this.isCompact) this.toggleMenu();
      return;
    }
    const host = this.dockHost();
    const zone = host?.dropZoneAt(event.clientX, event.clientY) ?? null;
    host?.highlightZone(null);
    if (zone) {
      this.dock = zone;
    } else {
      this.clampToHost(host);
    }
  };

  private onPointerCancel = (): void => {
    this.cancelDrag();
  };

  private cancelDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.classList.remove('olcad-panel--dragging');
    this.dockHost()?.highlightZone(null);
    if (drag.moved) this.placement = drag.previous;
  }

  /** Keep a floating panel inside the dock after a drop. */
  private clampToHost(host: DockHost | null): void {
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return; // not laid out
    const rect = this.getBoundingClientRect();
    const maxX = Math.max(0, bounds.width - rect.width);
    const maxY = Math.max(0, bounds.height - rect.height);
    const x = Math.min(Math.max(0, this.x), maxX);
    const y = Math.min(Math.max(0, this.y), maxY);
    if (x !== this.x || y !== this.y) this.placement = { dock: 'floating', x, y };
  }

  // Keyboard

  private onGripKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.drag) {
      this.cancelDrag();
      event.preventDefault();
      return;
    }
    if (
      this.isCompact &&
      (event.key === 'Enter' || event.key === ' ' || event.key === 'ContextMenu')
    ) {
      event.preventDefault();
      this.toggleMenu();
      return;
    }
    const step = event.shiftKey ? KEYBOARD_STEP_PX * 5 : KEYBOARD_STEP_PX;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    if (this.dock !== 'floating') return;
    this.placement = { dock: 'floating', x: this.x + move[0], y: this.y + move[1] };
    this.clampToHost(this.dockHost());
  };

  /** The button that opened the dock menu: the grip in compact mode, else the menu button. */
  private menuTrigger(): HTMLButtonElement {
    return this.isCompact ? this.grip : this.menuButton;
  }

  private toggleMenu(): void {
    if (this.menu.hidden) this.openMenu();
    else this.closeMenu();
  }

  private openMenu(): void {
    this.menu.hidden = false;
    this.menuButton.setAttribute('aria-expanded', 'true');
    const current =
      this.menu.querySelector<HTMLElement>('[aria-checked="true"]') ??
      this.menu.querySelector<HTMLElement>('[data-dock]');
    current?.focus();
  }

  private closeMenu(): void {
    if (this.menu.hidden) return;
    this.menu.hidden = true;
    this.menuButton.setAttribute('aria-expanded', 'false');
  }

  private onMenuKeyDown = (event: KeyboardEvent): void => {
    const items = Array.from(this.menu.querySelectorAll<HTMLElement>('[data-dock]'));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'Escape':
        this.closeMenu();
        this.menuTrigger().focus();
        break;
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
      default:
        return;
    }
    event.preventDefault();
  };
}
