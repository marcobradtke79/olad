import {
  DOCK_CHANGE_EVENT,
  OlcadPanel,
  type DockHost,
  type DockPosition,
  type DockSide,
  type PanelPlacement,
} from './OlcadPanel';

/** Placement of every named panel, keyed by the panel's `name` attribute. */
export type DockLayout = Record<string, PanelPlacement>;

export const LAYOUT_CHANGE_EVENT = 'olcad-layoutchange';

const SIDES: readonly DockSide[] = ['top', 'right', 'bottom', 'left'];
const ZONE_CLASS = 'olcad-dock__zone';

/**
 * `<olcad-dock>`: layout container with four dock zones around a centre area and a floating
 * layer above it. Children that are `<olcad-panel>` (or `<olcad-toolbar>`) are placed by their
 * `dock` attribute; every other child (typically the map element) fills the centre.
 * Attribute `storage-key` persists the layout in `localStorage`; `resetLayout()` returns every
 * panel to the placement it was authored with. Property `dropThreshold` (pixels from the edge,
 * default 40) decides when a dragged panel docks.
 */
export class OlcadDock extends HTMLElement implements DockHost {
  static get observedAttributes(): string[] {
    return ['storage-key'];
  }

  /** Distance from the dock's edge, in pixels, within which a dropped panel docks to that side. */
  dropThreshold = 40;

  private readonly zones = new Map<DockPosition | 'center', HTMLElement>();
  private readonly observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element && !node.classList.contains(ZONE_CLASS)) this.place(node);
      }
    }
  });
  private built = false;
  private readonly adopted = new WeakSet<OlcadPanel>();
  /** The placement each panel was authored with, captured before a stored layout is applied. */
  private readonly defaults = new WeakMap<OlcadPanel, PanelPlacement>();
  private applying = false;

  get storageKey(): string | null {
    return this.getAttribute('storage-key');
  }

  connectedCallback(): void {
    this.classList.add('olcad-dock');
    if (!this.built) this.build();
    // Children parsed together with the dock are upgraded after it; upgrade them now so
    // `instanceof OlcadPanel` works during placement.
    customElements.upgrade(this);
    this.addEventListener(DOCK_CHANGE_EVENT, this.onDockChange);
    for (const child of Array.from(this.children)) {
      if (!child.classList.contains(ZONE_CLASS)) this.place(child);
    }
    this.observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    this.observer.disconnect();
    this.removeEventListener(DOCK_CHANGE_EVENT, this.onDockChange);
  }

  attributeChangedCallback(): void {
    if (this.built) this.setLayout(this.storedLayout());
  }

  adopt(panel: OlcadPanel): void {
    if (!this.adopted.has(panel)) {
      this.adopted.add(panel);
      this.defaults.set(panel, panel.placement);
      const stored = panel.name ? this.storedLayout()[panel.name] : undefined;
      if (stored) {
        // Restoring is not a change: saving now would store the panels not adopted yet with
        // their authored placement and lose what was stored for them.
        this.applying = true;
        try {
          panel.placement = stored;
        } finally {
          this.applying = false;
        }
      }
    }
    this.place(panel);
  }

  /** All panels in this dock. */
  panels(): OlcadPanel[] {
    return Array.from(this.querySelectorAll('*')).filter(
      (el): el is OlcadPanel => el instanceof OlcadPanel,
    );
  }

  /** Placement of every panel that has a `name`. Serialisable. */
  getLayout(): DockLayout {
    const layout: DockLayout = {};
    for (const panel of this.panels()) if (panel.name) layout[panel.name] = panel.placement;
    return layout;
  }

  /** Apply placements by panel name. Unknown names are ignored. Saves and emits once. */
  setLayout(layout: DockLayout): void {
    this.apply((panel) => (panel.name ? layout[panel.name] : undefined));
  }

  /** The placement every named panel was authored with (its attributes when it joined the dock). */
  defaultLayout(): DockLayout {
    const layout: DockLayout = {};
    for (const panel of this.panels()) {
      const placement = this.defaults.get(panel);
      if (panel.name && placement) layout[panel.name] = placement;
    }
    return layout;
  }

  /** Named panels the layout can show and hide (not `no-toggle`), in document order. */
  listPanels(): { name: string; heading: string; hidden: boolean }[] {
    return this.panels()
      .filter((panel) => panel.name && panel.toggleable)
      .map((panel) => ({ name: panel.name, heading: panel.heading, hidden: panel.hidden }));
  }

  /** Show or hide one named panel. Saves and emits `olcad-layoutchange`. */
  setPanelVisible(name: string, visible: boolean): void {
    this.apply((panel) =>
      panel.name === name && panel.toggleable
        ? { ...panel.placement, hidden: !visible }
        : undefined,
    );
  }

  /** Show or hide every toggleable panel. Saves and emits `olcad-layoutchange` once. */
  setAllPanelsVisible(visible: boolean): void {
    this.apply((panel) =>
      panel.toggleable ? { ...panel.placement, hidden: !visible } : undefined,
    );
  }

  /** Return every panel to its authored placement, overwriting the stored layout. */
  resetLayout(): DockLayout {
    this.apply((panel) => this.defaults.get(panel));
    return this.getLayout();
  }

  /** Apply a placement per panel with a single save and a single `olcad-layoutchange`. */
  private apply(placementOf: (panel: OlcadPanel) => PanelPlacement | undefined): void {
    this.applying = true;
    try {
      for (const panel of this.panels()) {
        const placement = placementOf(panel);
        if (placement) panel.placement = placement;
      }
    } finally {
      this.applying = false;
    }
    this.saveLayout();
    this.dispatchEvent(new CustomEvent(LAYOUT_CHANGE_EVENT, { detail: this.getLayout() }));
  }

  dropZoneAt(clientX: number, clientY: number): DockSide | null {
    const rect = this.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const distances: Record<DockSide, number> = {
      left: clientX - rect.left,
      right: rect.right - clientX,
      top: clientY - rect.top,
      bottom: rect.bottom - clientY,
    };
    let best: DockSide | null = null;
    for (const side of SIDES) {
      const distance = distances[side];
      if (distance <= this.dropThreshold && (best === null || distance < distances[best])) {
        best = side;
      }
    }
    return best;
  }

  highlightZone(side: DockSide | null): void {
    if (side) this.setAttribute('data-drop', side);
    else this.removeAttribute('data-drop');
  }

  private build(): void {
    this.built = true;
    for (const name of ['top', 'left', 'center', 'right', 'bottom', 'floating'] as const) {
      const zone = document.createElement('div');
      zone.className = `${ZONE_CLASS} ${ZONE_CLASS}--${name}`;
      zone.dataset.zone = name;
      this.zones.set(name, zone);
      this.append(zone);
    }
  }

  private place(element: Element): void {
    customElements.upgrade(element);
    if (element instanceof OlcadPanel && !this.adopted.has(element)) {
      this.adopt(element);
      return;
    }
    const zoneName: DockPosition | 'center' =
      element instanceof OlcadPanel ? element.dock : 'center';
    const zone = this.zones.get(zoneName)!;
    if (element.parentElement !== zone) zone.append(element);
  }

  private onDockChange = (event: Event): void => {
    const panel = event.target;
    if (!(panel instanceof OlcadPanel)) return;
    this.place(panel);
    if (this.applying) return; // setLayout / resetLayout save and emit once at the end
    this.saveLayout();
    this.dispatchEvent(new CustomEvent(LAYOUT_CHANGE_EVENT, { detail: this.getLayout() }));
  };

  private saveLayout(): void {
    const key = this.storageKey;
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(this.getLayout()));
    } catch {
      // Storage may be unavailable (private mode, quota); the layout simply is not persisted.
    }
  }

  private storedLayout(): DockLayout {
    const key = this.storageKey;
    if (!key) return {};
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as DockLayout) : {};
    } catch {
      return {}; // unreadable or corrupt layout
    }
  }
}
