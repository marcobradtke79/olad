import { default as Feature } from 'ol/Feature';
import { default as OlMap } from 'ol/Map';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as VectorSource } from 'ol/source/Vector';
import { FieldConfig, EditOperation, EditableConfig, GeometryType, LayerConfig, ResolvedEditableConfig, ResolvedLayerConfig, ResolvedLayerHighlightConfig } from '../config/types';
import { OriginalStore } from './originals';
import { LayerStyle } from './style';
export interface LayerInfo {
    id: string;
    title: string;
    visible: boolean;
    geometryType: GeometryType;
    editable: {
        insert: boolean;
        update: boolean;
        delete: boolean;
    };
    snappable: boolean;
    /** Features currently loaded. */
    featureCount: number;
    /** Whether this is the active layer (target of inserts). */
    active: boolean;
    /** Whether all its objects are highlighted (`setHighlighted`). */
    highlighted: boolean;
    /** The projection its data is exchanged in (configured, else detected, else `EPSG:4326`). */
    dataProjection: string;
    /** Whether the user created it in the client (`editor.localLayers`); never in the change set. */
    local: boolean;
}
/** What changed about a layer (`layerchange`). */
export type LayerChangeType = 'add' | 'remove' | 'visible' | 'editable' | 'snappable' | 'highlight' | 'title' | 'schema' | 'style' | 'order';
export interface LayerManagerEvents {
    onChange(event: {
        id: string;
        type: LayerChangeType;
    }): void;
    onLoad(event: {
        id: string;
        features: Feature[];
    }): void;
    onError(event: {
        id: string;
        error: Error;
    }): void;
    onActiveChange(event: {
        id: string | null;
    }): void;
    /** Veto for loaded features by id (see `VectorLayerContext.shouldLoad`). */
    shouldLoad?(layerId: string, featureId: string | number): boolean;
}
/** User styles and drawing order as plain JSON (`exportStyles` / `importStyles`). */
export interface LayerStylesJson {
    version: 1;
    /** Drawing order, bottom first; empty when it is the configured order. */
    order: string[];
    /** The user's styles by layer id. */
    styles: Record<string, LayerStyle>;
}
/** Vector layers are drawn with `zIndex` = this + their position: above basemaps, below overlays. */
export declare const LAYER_Z_INDEX_BASE = 1;
/** Owns the vector layers: creation, runtime changes, editability rules and reprojection. */
export declare class LayerManager {
    readonly originals: OriginalStore;
    private readonly entries;
    private activeId;
    /** Layers the user created in the client (`editor.localLayers`). */
    private readonly localIds;
    /** Drawing order, bottom first. */
    private order;
    private orderCustomized;
    /** Imported styles and order for layers that do not exist yet (local layers load later). */
    private readonly pendingStyles;
    private pendingOrder;
    private readonly map;
    private readonly getProjection;
    private readonly events;
    private readonly highlightConfig;
    constructor(map: OlMap, getProjection: () => string, events: LayerManagerEvents, highlight?: ResolvedLayerHighlightConfig);
    add(config: LayerConfig): void;
    remove(id: string): void;
    /** Id of the active layer (target of inserts), or `null`. */
    getActive(): string | null;
    /** Make a layer the active one, or `null` for none. Throws for an unknown id. */
    setActive(id: string | null): void;
    has(id: string): boolean;
    /** Layer ids in drawing order, bottom first (the config order until `setOrder`). */
    ids(): string[];
    /**
     * Draw the layers in `ids` order, bottom first; ids not given keep their relative order
     * above them, unknown ids are ignored (and kept for layers added later when `keepUnknown`).
     * Emits `layerchange` with type `order`.
     */
    setOrder(ids: string[], keepUnknown?: boolean): void;
    /** Move one layer to position `index` of the drawing order (0 = bottom). */
    moveLayer(id: string, index: number): void;
    /** Back to the configured order (layers added at runtime last). */
    resetOrder(): void;
    isOrderCustomized(): boolean;
    private applyZIndex;
    /** The layer's current style: the user's, else the one read from its configured style. */
    getStyle(id: string): LayerStyle;
    /** Whether the configured style uses expressions or rules, so a user style replaces it entirely. */
    hasExpressionStyle(id: string): boolean;
    isStyleCustomized(id: string): boolean;
    /**
     * Draw the layer with `style` (validated; throws `StyleError`): its flat style, opacity, zoom
     * range and, for text layers, the text colours. Emits `layerchange` with type `style`.
     */
    setStyle(id: string, style: LayerStyle): void;
    /** Back to the configured style, opacity and zoom range. */
    resetStyle(id: string): void;
    /** User styles and order as JSON, including those kept for layers not added yet. */
    exportStyles(): LayerStylesJson;
    /**
     * Apply exported styles and order. Everything is validated first (throws `StyleError`
     * naming the path); styles and order positions of layers that do not exist yet are kept
     * and applied when they are added.
     */
    importStyles(json: unknown): void;
    /** Reset every user style and the order. */
    resetStyles(): void;
    list(): LayerInfo[];
    info(id: string): LayerInfo;
    /** Mark a layer as created in the client; `info().local` reports it. */
    setLocal(id: string, local: boolean): void;
    isLocal(id: string): boolean;
    /** Change the title shown for a layer. Emits `layerchange` with type `title`. */
    setTitle(id: string, title: string): void;
    /** Replace a layer's attribute schema. Emits `layerchange` with type `schema`. */
    setFields(id: string, fields: FieldConfig[]): void;
    getConfig(id: string): ResolvedLayerConfig;
    /**
     * The projection a layer's data is exchanged in: the configured `dataProjection`, else the
     * one detected when the layer was loaded, else `EPSG:4326`.
     */
    dataProjection(id: string): string;
    getOlLayer(id: string): VectorLayer<VectorSource<Feature>>;
    getSource(id: string): VectorSource<Feature>;
    /** Find the layer a feature belongs to. */
    layerOf(feature: Feature): string | undefined;
    setVisible(id: string, visible: boolean): void;
    /** Whether all objects of the layer are highlighted. */
    isHighlighted(id: string): boolean;
    /**
     * Highlight all objects of a layer on an overlay (config `layerHighlight`), or stop. The
     * overlay shares the layer's source and follows its visibility.
     */
    setHighlighted(id: string, highlighted: boolean): void;
    setEditable(id: string, editable: boolean | EditableConfig): void;
    setSnappable(id: string, snappable: boolean): void;
    getEditable(id: string): ResolvedEditableConfig;
    /** Whether `operation` is allowed on the layer, and for `update` / `delete` on the given feature. */
    canEdit(id: string, operation: EditOperation, feature?: Feature): boolean;
    /** Ids of layers whose features are snap targets. */
    snappableIds(): string[];
    /**
     * Move every feature from projection `from` to `to`. Untouched features are re-derived from
     * their original data-projection geometry so repeated switches do not accumulate error;
     * features for which `isModified` is true (edited, unsaved) are transformed from their
     * current geometry instead. Layers loaded per extent are cleared and reload on the next
     * render, keeping `keep` features (inserted or edited ones) across the reload.
     */
    reproject(from: string, to: string, isModified?: (feature: Feature) => boolean, keep?: (feature: Feature) => boolean): void;
    /** Remove every layer from the map without emitting events. */
    destroy(): void;
    private require;
}
