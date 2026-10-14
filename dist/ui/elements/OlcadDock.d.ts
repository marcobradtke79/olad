import { OlcadPanel, DockHost, DockSide, PanelPlacement } from './OlcadPanel';
/** Placement of every named panel, keyed by the panel's `name` attribute. */
export type DockLayout = Record<string, PanelPlacement>;
export declare const LAYOUT_CHANGE_EVENT = "olcad-layoutchange";
/**
 * `<olcad-dock>`: layout container with four dock zones around a centre area and a floating
 * layer above it. Children that are `<olcad-panel>` (or `<olcad-toolbar>`) are placed by their
 * `dock` attribute; every other child (typically the map element) fills the centre.
 * Attribute `storage-key` persists the layout in `localStorage`; `resetLayout()` returns every
 * panel to the placement it was authored with. Property `dropThreshold` (pixels from the edge,
 * default 40) decides when a dragged panel docks.
 */
export declare class OlcadDock extends HTMLElement implements DockHost {
    static get observedAttributes(): string[];
    /** Distance from the dock's edge, in pixels, within which a dropped panel docks to that side. */
    dropThreshold: number;
    private readonly zones;
    private readonly observer;
    private built;
    private readonly adopted;
    /** The placement each panel was authored with, captured before a stored layout is applied. */
    private readonly defaults;
    private applying;
    get storageKey(): string | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    adopt(panel: OlcadPanel): void;
    /** All panels in this dock. */
    panels(): OlcadPanel[];
    /** Placement of every panel that has a `name`. Serialisable. */
    getLayout(): DockLayout;
    /** Apply placements by panel name. Unknown names are ignored. Saves and emits once. */
    setLayout(layout: DockLayout): void;
    /** The placement every named panel was authored with (its attributes when it joined the dock). */
    defaultLayout(): DockLayout;
    /** Named panels the layout can show and hide (not `no-toggle`), in document order. */
    listPanels(): {
        name: string;
        heading: string;
        hidden: boolean;
    }[];
    /** Show or hide one named panel. Saves and emits `olcad-layoutchange`. */
    setPanelVisible(name: string, visible: boolean): void;
    /** Show or hide every toggleable panel. Saves and emits `olcad-layoutchange` once. */
    setAllPanelsVisible(visible: boolean): void;
    /** Return every panel to its authored placement, overwriting the stored layout. */
    resetLayout(): DockLayout;
    /** Apply a placement per panel with a single save and a single `olcad-layoutchange`. */
    private apply;
    dropZoneAt(clientX: number, clientY: number): DockSide | null;
    highlightZone(side: DockSide | null): void;
    private build;
    private place;
    private onDockChange;
    private saveLayout;
    private storedLayout;
}
