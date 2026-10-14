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
export declare const DOCK_POSITIONS: readonly DockPosition[];
/** The dock host interface a panel talks to while being dragged. Implemented by `<olcad-dock>`. */
export interface DockHost extends HTMLElement {
    /** Apply a stored placement (once) and move the panel into the zone matching its `dock`. */
    adopt(panel: OlcadPanel): void;
    dropZoneAt(clientX: number, clientY: number): DockSide | null;
    highlightZone(side: DockSide | null): void;
}
export declare const DOCK_CHANGE_EVENT = "olcad-dockchange";
/** Emitted (bubbling) when a flyout panel opens or closes; `detail` is `{ name, open }`. */
export declare const FLYOUT_TOGGLE_EVENT = "olcad-flyouttoggle";
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
export declare class OlcadPanel extends HTMLElement {
    static get observedAttributes(): string[];
    /** Dock position used when the element has no `dock` attribute. Subclasses override. */
    protected get defaultDock(): DockPosition;
    protected get defaultHeading(): string;
    /** Whether the panel is compact without a `compact` attribute. Toolboxes override with `true`. */
    protected get defaultCompact(): boolean;
    readonly content: HTMLElement;
    private readonly header;
    private readonly grip;
    private readonly titleEl;
    private readonly menuButton;
    private readonly menu;
    private built;
    private drag;
    private suppressEvents;
    private compactRole;
    get name(): string;
    get heading(): string;
    set heading(value: string);
    get dock(): DockPosition;
    set dock(value: DockPosition);
    get x(): number;
    set x(value: number);
    get y(): number;
    set y(value: number);
    /**
     * Whether the layout may show and hide the panel (View menu, `OlcadDock.setPanelVisible`).
     * The `no-toggle` attribute opts out, for panels whose content decides their visibility.
     */
    get toggleable(): boolean;
    get placement(): PanelPlacement;
    /**
     * Set dock position, floating coordinates and (for toggleable panels) visibility at once,
     * emitting a single `olcad-dockchange`.
     */
    set placement(placement: PanelPlacement);
    get orientation(): 'horizontal' | 'vertical';
    /** Whether the panel is a flyout: collapsed to its header when docked left or right. */
    get flyout(): boolean;
    set flyout(value: boolean);
    /** Whether a flyout shows its content. Ignored unless the panel is in flyout mode. */
    get open(): boolean;
    set open(value: boolean);
    /** Flyout behaviour applies only while docked on a side. */
    get isFlyout(): boolean;
    /** Compact: no title, the grip is the whole header. `compact="false"` opts a toolbox out. */
    get compact(): boolean;
    set compact(value: boolean);
    /** Compact rendering applies unless the panel is a flyout (whose title is the tab). */
    get isCompact(): boolean;
    /** Open or close the flyout (toggle without an argument). Opening closes the other flyouts of the zone. */
    toggleFlyout(open?: boolean): void;
    connectedCallback(): void;
    attributeChangedCallback(name: string): void;
    /** The `<olcad-dock>` this panel belongs to, if any. */
    protected dockHost(): DockHost | null;
    private build;
    /** Reflect `dock`, `x` and `y` into attributes and CSS variables. Subclasses may extend it. */
    protected applyPlacement(): void;
    /** Reflect compact mode: `data-compact`, the heading as the content's accessible name. */
    private applyCompact;
    /** Reflect flyout mode: `data-flyout` on the element, the title as an expandable tab. */
    private applyFlyout;
    private focusContent;
    private emitDockChange;
    private onPointerDown;
    private onPointerMove;
    private onPointerUp;
    private onPointerCancel;
    private cancelDrag;
    /** Keep a floating panel inside the dock after a drop. */
    private clampToHost;
    private onGripKeyDown;
    /** The button that opened the dock menu: the grip in compact mode, else the menu button. */
    private menuTrigger;
    private toggleMenu;
    private openMenu;
    private closeMenu;
    private onMenuKeyDown;
}
