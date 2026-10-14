import { default as Feature } from 'ol/Feature';
import { default as OlMap } from 'ol/Map';
import { FieldConfig, BasemapConfig, EditOperation, SnapMode, EditableConfig, EditorConfig, LayerConfig, ResolvedEditorConfig, ResolvedLayerConfig } from './config/types';
import { HistoryState, ValidationError } from './changes/Editing';
import { Command } from './changes/commands';
import { ChangeSet } from './changes/exportChangeSet';
import { Template, TemplateChange, TemplateInfo, TemplateJson } from './templates';
import { Coordinate } from 'ol/coordinate';
import { LayerInfo, LayerChangeType, LayerStylesJson } from './layers/LayerManager';
import { OriginalGeometry } from './layers/originals';
import { SnapResult } from './snapping';
import { ExportOptions, ExportResult } from './export/exportLayers';
import { LayerStyle } from './layers/style';
import { LengthUnit } from './units';
import { ImportResult, ImportTarget } from './import/applyImport';
import { ImportFormat, ImportGroup, ImportPreview } from './import/readImport';
import { LocalLayerChange, LocalLayerDefinition, LocalLayerInfo, LocalLayersJson } from './layers/local';
import { Measurement, MeasurementExtras, MeasurementKind } from './measure/MeasurementStore';
import { InputRequest, ToolOptions } from './tools';
/** Class set on the map target element while edit mode is on. */
export declare const EDIT_MODE_CLASS = "olcad-edit-mode";
/** Events emitted by the editor. The payload type is the handler argument. */
export interface EditorEvents extends Record<string, unknown> {
    /** A basemap was activated, added or removed. */
    basemapchange: {
        id: string;
        type: 'activate' | 'add' | 'remove';
    };
    /** A basemap's asynchronous source (WMTS capabilities) failed to load. */
    basemaperror: {
        id: string;
        error: Error;
    };
    /** A layer was added or removed, or its visibility, editability, snappability, highlight, title or schema changed. */
    layerchange: {
        id: string;
        type: LayerChangeType;
    };
    /** A layer finished loading features. */
    layerload: {
        id: string;
        features: Feature[];
    };
    /** The active layer (target of inserts) changed. */
    activelayerchange: {
        id: string | null;
    };
    /** The change set changed: after every executed command, undo, redo, accept and discard. */
    change: ChangeSet;
    /** A command was rejected. Nothing was changed. */
    validationerror: ValidationError;
    /** The undo / redo stacks changed. */
    historychange: HistoryState;
    /** A command inserted a new feature (after `change`; not emitted on redo). */
    featureinsert: {
        layer: string;
        feature: Feature;
        /** Set when the feature was inserted from a template (`editor.templates`). */
        template?: string;
        /** Set when the feature was inserted by a file import (`editor.import`). */
        imported?: boolean;
    };
    /**
     * Draft objects were moved into a layer (`editor.layers.moveDrafts`): `features` are the new
     * objects in `layer` (selected), `sources` the draft objects they replace. After `change`,
     * `featureinsert` and `selectionchange`.
     */
    draftmove: {
        layer: string;
        features: Feature[];
        sources: Feature[];
    };
    /** The active tool changed (`null`: no tool) with the options in effect (`{}` for none). */
    toolchange: {
        id: string | null;
        options: ToolOptions;
    };
    /** The active tool's prompt changed (a multi-step tool moved to its next step). */
    /** `input`: what the step expects typed into the command line (`'text'`, `'value'`, `null`). */
    toolprompt: {
        id: string | null;
        text: string | null;
        input: InputRequest;
    };
    /** The selection changed. */
    selectionchange: {
        features: Feature[];
    };
    /** Snapping was switched, or its radius or modes changed. */
    snappingchange: {
        enabled: boolean;
        tolerancePx: number;
        modes: SnapMode[];
    };
    /** The pointer snapped to a location, or stopped snapping (`null`). */
    snap: SnapResult | null;
    /** Grid snap was switched, or its spacing, origin or visibility changed. */
    gridchange: {
        enabled: boolean;
        spacing: number;
        origin: [number, number];
        visible: boolean;
    };
    /** The angle lock was switched or its step changed. */
    constraintschange: {
        angle: {
            enabled: boolean;
            step: number;
        };
    };
    /** `input(text)` was called (also for headless calls), with its result. */
    input: InputResult;
    /** Loading or parsing a layer failed. */
    layererror: {
        id: string;
        error: Error;
    };
    /** The view projection is about to change. In-progress tool state must be cancelled. */
    beforeprojectionchange: {
        from: string;
        to: string;
    };
    /** The view projection changed and all features were reprojected. */
    projectionchange: {
        from: string;
        to: string;
    };
    /** Edit mode was switched on or off. */
    editmodechange: {
        editMode: boolean;
    };
    /** The straightedge angle or colour changed. */
    straightedgechange: {
        angle: number;
        color: string;
    };
    /** A reference pick for the straightedge started or ended. */
    straightedgepick: {
        picking: boolean;
    };
    /** A local layer was created, renamed, got new attributes or was removed, or local layers were imported (`id` is `null`). */
    locallayerchange: LocalLayerChange;
    /**
     * The default length unit changed: `setLength`, or a projection switch while it is `'auto'`.
     * `length` is the effective unit, `setting` the configured one.
     */
    unitschange: {
        length: LengthUnit;
        setting: 'auto' | LengthUnit;
    };
    /** Objects were imported from a file (`editor.import.apply`). */
    import: ImportResult;
    /** A template was added, renamed or removed, or templates were imported (`id` is `null`). */
    templatechange: TemplateChange;
    /** A measurement was added or removed, or all were cleared (`editor.measurements`). */
    measurechange: {
        measurements: Measurement[];
    };
    /** The measurement in progress changed (a measure tool's live value), or ended (`null`). */
    measure: {
        measurement: Measurement | null;
    };
    /** `destroy()` was called. Fired before teardown. */
    destroy: undefined;
}
export interface BasemapInfo {
    id: string;
    title: string;
    active: boolean;
}
export interface BasemapsApi {
    /** All configured basemaps in config order. */
    list(): BasemapInfo[];
    /** Id of the visible basemap, or `null` when none is configured. */
    getActive(): string | null;
    /** Show the basemap with the given id and hide the others. */
    setActive(id: string): void;
    /** Add a basemap at runtime. It becomes active when `visible` is `true`. */
    add(config: BasemapConfig): void;
    /** Remove a basemap. If it was active, the first remaining basemap becomes active. */
    remove(id: string): void;
}
export interface LayersApi {
    /** All layers in config order. */
    list(): LayerInfo[];
    /** Info for one layer. Throws for an unknown id. */
    get(id: string): LayerInfo;
    /** The resolved configuration of a layer. */
    getConfig(id: string): ResolvedLayerConfig;
    /** Id of the active layer, the target of inserts, or `null`. */
    getActive(): string | null;
    /** Id of the draft layer (config `draft`), the target of inserts while no layer is active, or `null`. */
    getDraft(): string | null;
    /** Make a layer the active one (`null` for none). Emits `activelayerchange`. Throws for an unknown id. */
    setActive(id: string | null): void;
    /** Add a vector layer at runtime. Validated like the startup config. */
    add(config: LayerConfig): void;
    remove(id: string): void;
    setVisible(id: string, visible: boolean): void;
    /** Replace the layer's editability. Same values as `layers[].editable` in the config. */
    setEditable(id: string, editable: boolean | EditableConfig): void;
    setSnappable(id: string, snappable: boolean): void;
    /**
     * Highlight all objects of the layer (config `layerHighlight`), distinct from the selection,
     * or stop. Several layers may be highlighted at once. Emits `layerchange` with type `highlight`.
     */
    setHighlighted(id: string, highlighted: boolean): void;
    isHighlighted(id: string): boolean;
    /**
     * The layer's current style (`LayerStyle`): the user's, else read from its configured flat
     * style (defaults when that uses expressions, see `hasExpressionStyle`).
     */
    getStyle(id: string): LayerStyle;
    /**
     * Draw the layer with a user style: stroke, fill, points, label, text colours, opacity, zoom
     * range. Validated (throws `StyleError` naming the path). Emits `layerchange` (`style`).
     */
    setStyle(id: string, style: LayerStyle): void;
    /** Back to the configured style. Emits `layerchange` (`style`) when it was customized. */
    resetStyle(id: string): void;
    isStyleCustomized(id: string): boolean;
    /** Whether the configured style uses expressions or rules (a user style replaces it entirely). */
    hasExpressionStyle(id: string): boolean;
    /**
     * Drawing order, bottom first: the given ids in that order, the others above them in their
     * previous order. `list()` follows it. Emits `layerchange` (`order`).
     */
    setOrder(ids: string[]): void;
    /** Move a layer to position `index` of the drawing order (0 = bottom). */
    moveLayer(id: string, index: number): void;
    /** Back to the configured order. */
    resetOrder(): void;
    isOrderCustomized(): boolean;
    /** User styles and order as plain JSON, for browser storage (`persistLayerStyles`). */
    exportStyles(): LayerStylesJson;
    /** Apply `exportStyles` output; entries for layers added later are applied when they are added. */
    importStyles(json: unknown): void;
    /** Reset every user style and the order. */
    resetStyles(): void;
    /** Whether `operation` is allowed on the layer, and for `update` / `delete` on the given feature. */
    canEdit(id: string, operation: EditOperation, feature?: Feature): boolean;
    /** Loaded features of a layer, in the view projection. */
    getFeatures(id: string): Feature[];
    /** The id of the layer a feature belongs to, if any. */
    layerOf(feature: Feature): string | undefined;
    /** The feature's geometry as loaded, in the layer's data projection. */
    getOriginalGeometry(feature: Feature): OriginalGeometry | undefined;
    /**
     * The layers a draft object can be moved to (`moveDraft`): every layer but the draft layer
     * that allows `insert` and takes the object's geometry type (a multi-part layer takes a
     * single part). Empty for a feature outside the draft layer.
     */
    draftTargets(feature: Feature): string[];
    /**
     * Move draft objects into a layer as one command (undone as one step): each object the layer
     * takes (`draftTargets`) leaves the draft layer and a copy is inserted into the layer, with
     * the layer's schema defaults under the object's own attributes, wrapped for a multi-part
     * layer; the others stay. The copies are selected, `featureinsert` fires for each and then
     * `draftmove` once. Returns the copies, or `[]` when none fits or validation rejects the
     * command.
     */
    moveDrafts(features: Feature[], layerId: string): Feature[];
    /** `moveDrafts` for one object: the copy, or `null`. */
    moveDraft(feature: Feature, layerId: string): Feature | null;
}
/** The parallel straightedge: the rotated crosshair shown in edit mode. */
export interface StraightedgeApi {
    /** X-axis angle in degrees, counter-clockwise from the screen x-axis, in [0, 360). */
    getAngle(): number;
    /** Set the angle (normalised to [0, 360)). Emits `straightedgechange` when it changes. */
    setAngle(degrees: number): void;
    /** CSS colour of the crosshair lines and pick box (`cursor.color`). */
    getColor(): string;
    /** Change the colour live, for example to a light one over a dark basemap. Emits `straightedgechange`. */
    setColor(color: string): void;
    /**
     * Start a reference pick: the pick box turns `cursor.pickColor`, and the next click on a
     * line or polygon of an editor layer aligns the straightedge with the segment nearest to the
     * click. Clicks that hit nothing keep the pick running. Requires edit mode.
     */
    pick(): void;
    cancelPick(): void;
    isPicking(): boolean;
}
/** Net changes since the last `accept` / `discard`, see docs/change-set.md. */
export interface ChangesApi {
    /** The current change set: net changes per feature as plain JSON data. */
    get(): ChangeSet;
    hasChanges(): boolean;
    /**
     * After a successful save: assign real ids to inserted features (`idMap` maps `tempId` to
     * the id the backend assigned), make the current state the new baseline, clear the history.
     */
    accept(options?: {
        idMap?: Record<string, string | number>;
    }): void;
    /** Revert every feature to the baseline and clear the history. */
    discard(): void;
}
export interface ToolsApi {
    /** Registered tool ids: `select`, `draw`, `rectangle`, `circle`, `ellipse`, `regular-polygon`, `curve`, `parallel`, `text`, `modify`, `move`, `rotate`, `scale`, `offset`, `trim`, `extend`, `mirror`, `template-copy`, `template-insert`. */
    list(): string[];
    getActive(): string | null;
    /** The options the active tool works with, for example `{ type: 'LineString' }` for `draw`. */
    getActiveOptions(): ToolOptions;
    /** The active tool's prompt (what to do next), or `null` when it has none. */
    getPrompt(): string | null;
    /**
     * Whether the active tool's step expects typed input: `'text'`, `'value'`, or `null` for steps
     * that take map clicks. `<olcad-input-bar>` focuses itself while a step asks.
     */
    getInputRequest(): InputRequest;
    /** Whether the tool's preconditions hold (edit mode, a layer to insert into, selection, editability). */
    canActivate(id: string, options?: ToolOptions): boolean;
    /**
     * Activate a tool. Returns `false` when `canActivate` is false. Throws outside edit mode.
     * `draw` takes `{ type }` to choose point, line or polygon on a layer accepting any geometry.
     */
    activate(id: string, options?: ToolOptions): boolean;
    deactivate(): void;
    /** Abort the active tool's in-progress operation (Escape). */
    cancel(): void;
    /** Finish the active tool's in-progress operation (Enter). */
    finish(): void;
    /** Backspace / Delete for the active tool; returns whether a vertex was removed or a step taken back. */
    removeLastPoint(): boolean;
}
/** Snapping of the pointer to vertices and segment midpoints of snappable layers. */
export interface SnappingApi {
    isEnabled(): boolean;
    /** Switch snapping on or off. Emits `snappingchange`. */
    setEnabled(enabled: boolean): void;
    /** Snap radius in CSS pixels. */
    getTolerance(): number;
    setTolerance(tolerancePx: number): void;
    getModes(): SnapMode[];
    /** Set the active modes (at least one). */
    setModes(modes: SnapMode[]): void;
    /** Snap a view-projection coordinate the way the pointer would be snapped. */
    snap(coordinate: number[]): SnapResult | null;
}
/**
 * Grid snap: the pointer sits on the nearest intersection of a grid aligned with the view
 * projection unless a geometry snap wins. Independent of `editor.snapping`.
 */
export interface GridApi {
    isEnabled(): boolean;
    /** Switch grid snap on or off. Emits `gridchange`. */
    setEnabled(enabled: boolean): void;
    /** Grid spacing in view-projection units. */
    getSpacing(): number;
    /** Set the spacing (positive). Emits `gridchange`. */
    setSpacing(spacing: number): void;
    /** A grid intersection, in view-projection units. */
    getOrigin(): [number, number];
    setOrigin(origin: [number, number]): void;
    /** Whether the grid is drawn as dots in edit mode. */
    isVisible(): boolean;
    setVisible(visible: boolean): void;
}
/**
 * Named templates: copies of objects relative to a base point, kept for the session and
 * inserted anywhere (tools `template-copy` and `template-insert`). Plain JSON exchange through
 * `export` / `import`, so a host can persist them.
 */
/**
 * Measurements of the session: distances, areas and angles with their values in metres,
 * square metres and degrees, drawn with labels on an overlay until removed. Never part of a
 * layer or the change set. The measure tools add to it; hosts can measure through it too.
 */
export interface MeasurementsApi {
    list(): Measurement[];
    get(id: string): Measurement | undefined;
    /**
     * Measure: `coordinates` in the view projection (the points of a distance, the corners of an
     * area, first point, vertex and second point of an angle). Emits `measurechange`. Returns the
     * measurement, or `null` with too few points.
     */
    add(kind: MeasurementKind, coordinates: number[][], extras?: MeasurementExtras): Measurement | null;
    /** Remove one. Emits `measurechange`; `false` for an unknown id. */
    remove(id: string): boolean;
    /** Remove all. Emits `measurechange` when there were any. */
    clear(): void;
    /** The measurement in progress of a measure tool, or `null`. */
    getLive(): Measurement | null;
}
export interface TemplatesApi {
    list(): TemplateInfo[];
    /** The template with its stored geometries (view projection); do not modify them. */
    get(id: string): Template | undefined;
    /**
     * Store copies of features (each must belong to a layer) relative to `base`; attributes are
     * copied without the layer's id property. Without a name, `suggestName()` is used. Emits
     * `templatechange` (`add`). Returns the id.
     */
    create(features: Feature[], base: Coordinate, name?: string): string;
    /** Emits `templatechange` (`rename`). Throws for an unknown id or an empty name. */
    rename(id: string, name: string): void;
    /** Emits `templatechange` (`remove`). Throws for an unknown id. */
    remove(id: string): void;
    /** The next free default name (`Template 1`, `Template 2` ...). */
    suggestName(): string;
    /** Whether at least one object of the template has a layer to go to (source, active, draft). */
    canInsert(id: string): boolean;
    /**
     * Insert a copy with its base point at `at` (view projection) as one composite command; each
     * object goes to its source layer, else the active layer, else the draft layer. Returns the
     * new features, or `null` when nothing fits or validation rejects it.
     */
    insert(id: string, at: Coordinate): Feature[] | null;
    /** All templates as plain JSON (GeoJSON geometries in EPSG:4326). */
    export(): TemplateJson[];
    /** Add templates from `export` output; throws `TemplateImportError` naming the path. Emits `templatechange` (`import`). */
    import(json: unknown): string[];
}
/**
 * Layers the user creates in the client (`editor.localLayers`): one geometry type and a schema
 * each, fully editable, never in the change set. Kept in memory; `export` / `import` exchange
 * plain JSON for browser storage (`persistLocalLayers` in the UI package).
 */
export interface LocalLayersApi {
    list(): LocalLayerInfo[];
    /** Throws for an unknown id. */
    get(id: string): LocalLayerInfo;
    has(id: string): boolean;
    /** Create a layer and return its id (`local-<n>`). Throws `ConfigError` naming the path. Emits `locallayerchange` (`create`) after `layerchange` (`add`). */
    create(definition: LocalLayerDefinition): string;
    /** Change the title. Emits `layerchange` (`title`) and `locallayerchange` (`rename`). */
    rename(id: string, title: string): void;
    /**
     * Replace the attributes. `renamed` maps old to new field names so values move along; values
     * of removed fields are deleted from the objects (outside the undo history). Emits
     * `layerchange` (`schema`) and `locallayerchange` (`schema`).
     */
    setFields(id: string, fields: FieldConfig[], options?: {
        renamed?: Record<string, string>;
    }): void;
    /** Remove the layer and its objects. Emits `layerchange` (`remove`) and `locallayerchange` (`remove`). */
    remove(id: string): void;
    /** All local layers with their objects as plain JSON (GeoJSON in EPSG:4326). */
    export(): LocalLayersJson;
    /** Add layers from `export` output (same ids replace local layers); objects get fresh ids. Throws `LocalLayerImportError` naming the path. Emits `locallayerchange` (`import`). */
    import(json: unknown): void;
}
/**
 * Import of GeoJSON, TopoJSON, KML, GML and GPX files (`editor.import`): `read` shows what a file
 * holds as groups of one geometry type, `apply` inserts them into new local layers or existing
 * layers as one command.
 */
export interface ImportApi {
    /** Read a file's text into a preview; throws `ImportError` with a readable message. */
    read(text: string, options?: {
        filename?: string;
        format?: ImportFormat;
    }): ImportPreview;
    /** Layers that can take every object of the group (insert allowed, fitting geometry type). */
    targetsFor(group: ImportGroup): string[];
    /**
     * Insert the groups: `targets[group.key]` is `{ type: 'new', title? }` (default, a local
     * layer), `{ type: 'layer', id }` or `{ type: 'skip' }`. One undo step. Emits `import`.
     */
    apply(preview: ImportPreview, targets?: Record<string, ImportTarget>): ImportResult;
}
/**
 * Length units (`editor.units`): the default unit of typed lengths and of displayed lengths and
 * areas. Values in the API, the data and the change set stay in metres.
 */
export interface UnitsApi {
    /** The effective default unit: the configured one, or the view projection's for `'auto'`. */
    getLength(): LengthUnit;
    /** The configured setting (`units.length`): `'auto'` or a unit. */
    getLengthSetting(): 'auto' | LengthUnit;
    /** Change the setting. Emits `unitschange` when the setting or the effective unit changes. */
    setLength(unit: 'auto' | LengthUnit): void;
    /** `value` in `unit` (default: the effective unit) as metres. */
    toMetres(value: number, unit?: LengthUnit): number;
    /** `metres` in `unit` (default: the effective unit). */
    fromMetres(metres: number, unit?: LengthUnit): number;
    /** A length in metres formatted in the effective unit's system (`12.50 m`, `41.01 ft`). */
    formatLength(metres: number): string;
    /** An area in square metres formatted in the effective unit's system (`m²`, `ha` / `ft²`, `ac`). */
    formatArea(squareMetres: number): string;
}
/** Result of `editor.input(text)`. */
export type InputResult = {
    ok: true;
    text: string;
    coordinate: number[];
}
/** A plain number taken by the tool's current step as a value (`Tool.handleValue`). */
 | {
    ok: true;
    text: string;
    value: number;
}
/** A length taken by the tool's current step (`Tool.handleLength`), in metres. */
 | {
    ok: true;
    text: string;
    length: number;
}
/** Text taken by the tool's current step (`Tool.handleText`), for example a template name. */
 | {
    ok: true;
    text: string;
    kind: 'text';
} | {
    ok: false;
    text: string;
    code: string;
    error: string;
};
/**
 * Drawing constraints. The angle lock restricts the direction from the last fixed vertex of a
 * line or polygon in progress to multiples of a step from the straightedge angle.
 */
export interface ConstraintsApi {
    isAngleLocked(): boolean;
    /** Switch the angle lock on or off. Emits `constraintschange`. */
    setAngleLocked(locked: boolean): void;
    /** Step in degrees between allowed directions. */
    getAngleStep(): number;
    /** Set the step (between 0 exclusive and 360). Emits `constraintschange`. */
    setAngleStep(step: number): void;
}
export interface SelectionApi {
    get(): Feature[];
    set(features: Feature[]): void;
    add(feature: Feature): void;
    remove(feature: Feature): void;
    clear(): void;
}
export interface Editor {
    /** The OpenLayers map, either created by the editor or supplied through `config.map`. */
    readonly map: OlMap;
    /** Validated configuration with defaults applied. */
    readonly config: ResolvedEditorConfig;
    readonly basemaps: BasemapsApi;
    readonly layers: LayersApi;
    readonly straightedge: StraightedgeApi;
    readonly changes: ChangesApi;
    readonly tools: ToolsApi;
    readonly selection: SelectionApi;
    readonly snapping: SnappingApi;
    readonly grid: GridApi;
    readonly constraints: ConstraintsApi;
    readonly templates: TemplatesApi;
    readonly measurements: MeasurementsApi;
    readonly localLayers: LocalLayersApi;
    readonly import: ImportApi;
    readonly units: UnitsApi;
    /**
     * Whether `operation` may be applied to `feature`: the layer's `editable` rules, except that
     * a feature inserted and not yet accepted may always be updated and deleted.
     */
    canEdit(operation: EditOperation, feature: Feature): boolean;
    /** Delete the selected features whose layers allow it, as one command. Returns `false` when none. */
    deleteSelection(): boolean;
    /**
     * Write the current objects of the layers into one file's text (GeoJSON, KML, GML 3.2 or
     * GPX), unsaved edits included. Nothing is downloaded or sent; the UI's export dialog does
     * that. Throws for no or unknown layers.
     */
    exportLayers(layerIds: string[], options: ExportOptions): ExportResult;
    /**
     * Validate and apply a command (see `insertFeature`, `updateGeometry`, `updateProperties`,
     * `deleteFeature`, `composite`). Returns `false` and emits `validationerror` when rejected.
     */
    execute(command: Command): boolean;
    undo(): boolean;
    redo(): boolean;
    /**
     * Numeric input for the active tool: `x,y` (view-projection units), `@dx,dy` (metres),
     * `@distance<angle` (metres, degrees from the straightedge angle) or a single length in
     * metres along the pointer direction. Resolves the point and hands it to the active tool.
     * Emits `input`.
     */
    input(text: string): InputResult;
    canUndo(): boolean;
    canRedo(): boolean;
    /** Current view projection code. */
    getProjection(): string;
    /** Switch the view projection. Reprojects every loaded feature; emits `beforeprojectionchange` and `projectionchange`. */
    setProjection(code: string): void;
    /** Whether the editor is in edit mode. */
    isEditMode(): boolean;
    /** Switch edit mode on or off. Emits `editmodechange` when the value changes. */
    setEditMode(editMode: boolean): void;
    on<K extends keyof EditorEvents>(type: K, listener: (event: EditorEvents[K]) => void): () => void;
    off<K extends keyof EditorEvents>(type: K, listener: (event: EditorEvents[K]) => void): void;
    /** Remove every interaction, layer, listener and DOM node the editor created. */
    destroy(): void;
}
/**
 * Create an editor. Pass `target` to let the editor create the map, or `map` to attach
 * to an existing OpenLayers map. Throws `ConfigError` for an invalid configuration.
 */
export declare function createEditor(config: EditorConfig): Editor;
