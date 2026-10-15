import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import type BaseLayer from 'ol/layer/Base';
import { get as getProjection, transformExtent } from 'ol/proj';
import { applyDefaults, resolveBasemap, validateBasemapConfig, validateConfig } from './config';
import type {
  FieldConfig,
  BasemapConfig,
  EditOperation,
  SnapMode,
  EditableConfig,
  EditorConfig,
  LayerConfig,
  ResolvedEditorConfig,
  ResolvedLayerConfig,
} from './config/types';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { Editing, type HistoryState, type ValidationError } from './changes/Editing';
import {
  composite,
  deleteFeature,
  updateGeometry,
  updateProperties,
  type Command,
} from './changes/commands';
import {
  isStale as dimensionIsStale,
  referencedPoints,
  referencesOf,
  remapReferences,
} from './dimensions/references';
import { dimensionValues, fromAngleUnit, type DimensionValues } from './dimensions/values';
import type { ChangeSet } from './changes/exportChangeSet';
import { applyEditCursor, Crosshair } from './crosshair';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { nearestSegment, normalizeAngle, screenAngle, type Segment } from './geometry/segments';
import { Emitter } from './events';
import { BASEMAP_ID_PROPERTY, createBasemapLayer } from './layers/basemaps';
import { LAYER_ID_PROPERTY } from './layers/vector';
import {
  canInsertTemplate,
  templateInsertCommand,
  TemplateStore,
  type Template,
  type TemplateChange,
  type TemplateInfo,
  type TemplateJson,
} from './templates';
import type { Coordinate } from 'ol/coordinate';
import { draftTargets, moveDraftsCommand, type DraftMoveContext } from './layers/draft';
import { LayerManager, type LayerInfo } from './layers/LayerManager';
import type { OriginalGeometry } from './layers/originals';
import { registerProjections } from './projections/register';
import { Selection } from './selection/Selection';
import { GridLayer, SnapEngine, SnapInteraction, type SnapResult } from './snapping';
import { constrainToAngleStep } from './constraints';
import { parseInput } from './input';
import { exportLayers, type ExportOptions, type ExportResult } from './export/exportLayers';
import { formatMessage } from './i18n';
import type { LayerChangeType, LayerStylesJson } from './layers/LayerManager';
import type { LayerStyle } from './layers/style';
import {
  crsLengthUnit,
  formatArea as formatAreaIn,
  formatLength as formatLengthIn,
  fromMetres,
  lengthUnitInfo,
  toMetres,
  type LengthUnit,
} from './units';
import {
  applyImport,
  importTargets,
  type ImportContext,
  type ImportResult,
  type ImportTarget,
} from './import/applyImport';
import {
  readImport,
  type ImportFormat,
  type ImportGroup,
  type ImportPreview,
} from './import/readImport';
import {
  LocalLayers,
  type LocalLayerChange,
  type LocalLayerDefinition,
  type LocalLayerInfo,
  type LocalLayersJson,
} from './layers/local';
import { offsetMetres, unitsPerMetre } from './measure';
import {
  MeasurementStore,
  type Measurement,
  type MeasurementExtras,
  type MeasurementKind,
} from './measure/MeasurementStore';
import type Select from 'ol/interaction/Select';
import {
  CircleTool,
  DimensionAngularTool,
  DimensionLinearTool,
  DimensionRadialTool,
  DimensionSurveyTool,
  EllipseTool,
  CurveTool,
  ParallelTool,
  RegularPolygonTool,
  createSelectInteraction,
  DrawTool,
  ModifyTool,
  MoveTool,
  OffsetTool,
  TrimTool,
  MirrorTool,
  MeasureTool,
  TextTool,
  TemplateCopyTool,
  TemplateInsertTool,
  ExtendTool,
  RectangleTool,
  RotateTool,
  ScaleTool,
  SelectTool,
  ToolManager,
  type InputRequest,
  type ToolOptions,
} from './tools';

/** Class set on the map target element while edit mode is on. */
export const EDIT_MODE_CLASS = 'olcad-edit-mode';

/** Events emitted by the editor. The payload type is the handler argument. */
export interface EditorEvents extends Record<string, unknown> {
  /** A basemap was activated, added or removed. */
  basemapchange: { id: string; type: 'activate' | 'add' | 'remove' };
  /** A basemap's asynchronous source (WMTS capabilities) failed to load. */
  basemaperror: { id: string; error: Error };
  /** A layer was added or removed, or its visibility, editability, snappability, highlight, title or schema changed. */
  layerchange: {
    id: string;
    type: LayerChangeType;
  };
  /**
   * The set of stale dimensions changed (a measured object moved, changed or was deleted, or a
   * dimension was updated or detached). `features` is the whole current set.
   */
  dimensionstale: { features: Feature[] };
  /** A layer finished loading features. */
  layerload: { id: string; features: Feature[] };
  /** The active layer (target of inserts) changed. */
  activelayerchange: { id: string | null };
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
  draftmove: { layer: string; features: Feature[]; sources: Feature[] };
  /** The active tool changed (`null`: no tool) with the options in effect (`{}` for none). */
  toolchange: { id: string | null; options: ToolOptions };
  /** The active tool's prompt changed (a multi-step tool moved to its next step). */
  /** `input`: what the step expects typed into the command line (`'text'`, `'value'`, `null`). */
  toolprompt: { id: string | null; text: string | null; input: InputRequest };
  /** The selection changed. */
  selectionchange: { features: Feature[] };
  /** Snapping was switched, or its radius or modes changed. */
  snappingchange: { enabled: boolean; tolerancePx: number; modes: SnapMode[] };
  /** The pointer snapped to a location, or stopped snapping (`null`). */
  snap: SnapResult | null;
  /** Grid snap was switched, or its spacing, origin or visibility changed. */
  gridchange: { enabled: boolean; spacing: number; origin: [number, number]; visible: boolean };
  /** The angle lock was switched or its step changed. */
  constraintschange: { angle: { enabled: boolean; step: number } };
  /** `input(text)` was called (also for headless calls), with its result. */
  input: InputResult;
  /** Loading or parsing a layer failed. */
  layererror: { id: string; error: Error };
  /** The view projection is about to change. In-progress tool state must be cancelled. */
  beforeprojectionchange: { from: string; to: string };
  /** The view projection changed and all features were reprojected. */
  projectionchange: { from: string; to: string };
  /** Edit mode was switched on or off. */
  editmodechange: { editMode: boolean };
  /** The straightedge angle or colour changed. */
  straightedgechange: { angle: number; color: string };
  /** A reference pick for the straightedge started or ended. */
  straightedgepick: { picking: boolean };
  /** A local layer was created, renamed, got new attributes or was removed, or local layers were imported (`id` is `null`). */
  locallayerchange: LocalLayerChange;
  /**
   * The default length unit changed: `setLength`, or a projection switch while it is `'auto'`.
   * `length` is the effective unit, `setting` the configured one.
   */
  unitschange: { length: LengthUnit; setting: 'auto' | LengthUnit };
  /** Objects were imported from a file (`editor.import.apply`). */
  import: ImportResult;
  /** A template was added, renamed or removed, or templates were imported (`id` is `null`). */
  templatechange: TemplateChange;
  /** A measurement was added or removed, or all were cleared (`editor.measurements`). */
  measurechange: { measurements: Measurement[] };
  /** The measurement in progress changed (a measure tool's live value), or ended (`null`). */
  measure: { measurement: Measurement | null };
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
  accept(options?: { idMap?: Record<string, string | number> }): void;
  /** Revert every feature to the baseline and clear the history. */
  discard(): void;
}

export interface ToolsApi {
  /** Registered tool ids: `select`, `draw`, `rectangle`, `circle`, `ellipse`, `regular-polygon`, `curve`, `parallel`, `text`, `dimension-linear`, `dimension-angular`, `dimension-radial`, `dimension-survey`, `modify`, `move`, `rotate`, `scale`, `offset`, `trim`, `extend`, `mirror`, `template-copy`, `template-insert`. */
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

/** Tools that draw into the active layer (or the draft layer) and follow a change of it. */
const LAYER_BOUND_TOOLS = [
  'draw',
  'rectangle',
  'circle',
  'ellipse',
  'regular-polygon',
  'curve',
  'parallel',
  'text',
  'dimension-linear',
  'dimension-angular',
  'dimension-radial',
  'dimension-survey',
];

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
  add(
    kind: MeasurementKind,
    coordinates: number[][],
    extras?: MeasurementExtras,
  ): Measurement | null;
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
/**
 * Dimensions in dimension layers (`layers[].dimension`): their values and the field value.
 * Dimensions are drawn with the `dimension-linear` tool and are ordinary objects otherwise.
 */
export interface DimensionsApi {
  /** Whether the feature is an object of a dimension layer. */
  isDimension(feature: Feature): boolean;
  /** GIS value, field value, shown value and status in the current view projection, or `null`. */
  values(feature: Feature): DimensionValues | null;
  /**
   * Set the field value in metres, or clear it with `null`: one `updateProperties` command.
   * `false` when the feature is not an editable dimension or validation rejects the value.
   */
  setFieldValue(feature: Feature, metres: number | null): boolean;
  /**
   * The dimension the command line edits: edit mode on, no tool running and exactly one
   * selected, updatable dimension. `null` otherwise.
   */
  inputTarget(): Feature | null;
  /** Whether a measured object of the dimension changed or is gone (derived, never stored). */
  isStale(feature: Feature): boolean;
  /** The stale dimensions of all layers, or of one layer. */
  listStale(layerId?: string): Feature[];
  /**
   * Move the dimension's definition points onto what its references point at now and update its
   * GIS value, as one command; the field value stays. `false` when a referenced object is gone,
   * the dimension is not updatable or nothing references anything.
   */
  update(feature: Feature): boolean;
  /** `update` for every resolvable stale dimension (of one layer), as one command. Returns the count. */
  updateStale(layerId?: string): number;
  /** Drop the references: the dimension keeps its points and is no longer checked. One command. */
  detach(feature: Feature): boolean;
}

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
  setFields(
    id: string,
    fields: FieldConfig[],
    options?: { renamed?: Record<string, string> },
  ): void;
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
  read(text: string, options?: { filename?: string; format?: ImportFormat }): ImportPreview;
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
export type InputResult =
  | { ok: true; text: string; coordinate: number[] }
  /** A plain number taken by the tool's current step as a value (`Tool.handleValue`). */
  | { ok: true; text: string; value: number }
  /** A length taken by the tool's current step (`Tool.handleLength`), in metres. */
  | { ok: true; text: string; length: number }
  /** Text taken by the tool's current step (`Tool.handleText`), for example a template name. */
  | { ok: true; text: string; kind: 'text' }
  /** The field value (metres, `null` = cleared) of the selected dimension (`dimensions.inputTarget`). */
  | { ok: true; text: string; fieldValue: number | null }
  | { ok: false; text: string; code: string; error: string };

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
  readonly dimensions: DimensionsApi;
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

class EditorImpl implements Editor {
  readonly map: OlMap;
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
  readonly dimensions: DimensionsApi;
  /** The last snap of the pointer, for tools that record what a point was snapped to. */
  private lastSnap: SnapResult | null = null;
  /** Dimensions whose measured objects changed (derived after every change). */
  private staleDimensions = new Set<Feature>();
  readonly import: ImportApi;
  readonly units: UnitsApi;

  private readonly editing: Editing;
  private localLayerStore!: LocalLayers;
  private readonly measurementStore = new MeasurementStore(
    () => this.getProjection(),
    {
      change: (measurements) => this.emitter.emit('measurechange', { measurements }),
      live: (measurement) => this.emitter.emit('measure', { measurement }),
    },
    () => this.lengthUnit(),
  );
  private readonly snapInteraction: SnapInteraction;
  /** Click selection while edit mode is off (`selection.inspect`); tools take over in edit mode. */
  private readonly inspectInteraction: Select;
  private readonly selectionManager: Selection;
  private readonly toolManager: ToolManager;
  private readonly emitter = new Emitter<EditorEvents>();
  private readonly templateStore = new TemplateStore((change) =>
    this.emitter.emit('templatechange', change),
  );
  private readonly ownsMap: boolean;
  private readonly basemapLayers = new Map<string, BaseLayer>();
  private readonly layerManager: LayerManager;
  private crosshair: Crosshair | null = null;
  private gridLayer: GridLayer | null = null;
  private pickHandler: ((event: MapBrowserEvent) => void) | null = null;
  private pickHoverHandler: ((event: MapBrowserEvent) => void) | null = null;
  /** Unmanaged layer showing the segment a reference pick would take. */
  private pickHighlight: VectorLayer<VectorSource<Feature>> | null = null;
  private destroyed = false;

  constructor(config: ResolvedEditorConfig, options: { explicitView: boolean }) {
    this.config = config;
    this.ownsMap = config.map === undefined;

    if (config.map) {
      this.map = config.map;
      // Only replace the host's view when the host configured one.
      if (options.explicitView) this.map.setView(this.createView(config.view.projection));
    } else {
      this.map = new OlMap({
        target: config.target,
        view: this.createView(config.view.projection),
        layers: [],
      });
    }

    config.basemaps.forEach((basemap, i) => this.insertBasemap(basemap.id, i));
    if (config.editMode) this.reflectEditMode(true);

    this.layerManager = new LayerManager(
      this.map,
      () => this.getProjection(),
      {
        onChange: (event) => this.emitter.emit('layerchange', event),
        onLoad: (event) => this.emitter.emit('layerload', event),
        onError: (event) => this.emitter.emit('layererror', event),
        onActiveChange: (event) => this.emitter.emit('activelayerchange', event),
        shouldLoad: (layerId, featureId) => this.editing.shouldLoad(layerId, featureId),
      },
      config.layerHighlight,
      config.locale,
    );
    this.selectionManager = new Selection(this.map, config.selection, (features) =>
      this.emitter.emit('selectionchange', { features }),
    );
    this.editing = new Editing({
      layers: this.layerManager,
      getProjection: () => this.getProjection(),
      locale: config.locale,
      messages: config.messages,
      changes: config.changes,
      // Draft objects and local layers stay in the client: they never enter the change set.
      isTracked: (layer) =>
        (!config.draft.enabled || layer !== config.draft.id) && !this.layerManager.isLocal(layer),
      events: {
        change: (changeSet) => {
          // Features removed by a command, discard or undo leave the selection.
          this.selectionManager.prune((f) => this.layerManager.layerOf(f) !== undefined);
          this.emitter.emit('change', changeSet);
        },
        validationerror: (error) => this.emitter.emit('validationerror', error),
        historychange: (state) => this.emitter.emit('historychange', state),
        featureinsert: (event) => this.emitter.emit('featureinsert', event),
      },
    });
    for (const layer of config.layers) this.layerManager.add(layer);
    if (config.draft.enabled) {
      this.layerManager.add({
        id: config.draft.id,
        title: config.draft.title,
        source: { features: [] },
        geometryType: 'Any',
        editable: true,
        snappable: true,
        text: true,
        visible: true,
        ...(config.draft.style ? { style: config.draft.style } : {}),
      });
    }
    this.toolManager = new ToolManager(
      {
        map: this.map,
        layers: this.layerManager,
        selection: this.selectionManager,
        execute: (command) => this.editing.execute(command),
        getActiveLayer: () => this.layerManager.getActive(),
        getDraftLayer: () => this.getDraftLayer(),
        hitTolerance: Math.ceil(config.cursor.pickBoxSize / 2),
        canUpdate: (feature) => this.editing.canEdit('update', feature),
        promptChanged: () =>
          this.emitter.emit('toolprompt', {
            id: this.toolManager.getActive(),
            text: this.toolManager.getPrompt(),
            input: this.toolManager.getInputRequest(),
          }),
        getStraightedgeAngle: () => this.config.cursor.angle,
        getProjection: () => this.getProjection(),
        getCurveTolerance: () => this.config.curves.tolerance,
        getLengthUnit: () => this.lengthUnit(),
        getLocale: () => config.locale,
        getSnap: () => this.lastSnap,
        formatLength: (metres) => formatLengthIn(metres, this.lengthUnit()),
        templates: this.templateStore,
        done: () => this.toolManager.deactivate(),
        measurements: this.measurementStore,
      },
      { onToolChange: (id, options) => this.emitter.emit('toolchange', { id, options }) },
    );
    const tools = [
      new SelectTool(),
      new DrawTool(),
      new RectangleTool(),
      new CircleTool(),
      new EllipseTool(),
      new RegularPolygonTool(),
      new CurveTool(),
      new ParallelTool(),
      new TextTool(),
      new DimensionLinearTool(),
      new DimensionAngularTool(),
      new DimensionRadialTool(),
      new DimensionSurveyTool(),
      new ModifyTool(),
      new MoveTool(),
      new RotateTool(),
      new ScaleTool(),
      new OffsetTool(),
      new TrimTool(),
      new ExtendTool(),
      new MirrorTool(),
      new TemplateCopyTool(),
      new TemplateInsertTool(),
      new MeasureTool('distance'),
      new MeasureTool('area'),
      new MeasureTool('angle'),
    ];
    for (const tool of tools) {
      this.toolManager.register(tool);
    }
    this.tools = {
      list: () => this.toolManager.list(),
      getActive: () => this.toolManager.getActive(),
      getActiveOptions: () => this.toolManager.getActiveOptions(),
      getPrompt: () => this.toolManager.getPrompt(),
      getInputRequest: () => this.toolManager.getInputRequest(),
      // Read-only tools (measuring) run with edit mode off too.
      canActivate: (id, options) =>
        (config.editMode || this.toolManager.isReadOnly(id)) &&
        this.toolManager.canActivate(id, options),
      activate: (id, options) => {
        if (!config.editMode && !this.toolManager.isReadOnly(id)) {
          throw new Error('Tools require edit mode');
        }
        return this.toolManager.activate(id, options);
      },
      deactivate: () => this.toolManager.deactivate(),
      cancel: () => this.toolManager.cancel(),
      finish: () => this.toolManager.finish(),
      removeLastPoint: () => this.toolManager.removeLastPoint(),
    };
    // Outside edit mode a click still selects (inspect mode), without any tool.
    this.inspectInteraction = createSelectInteraction({
      selection: this.selectionManager,
      hitTolerance: Math.ceil(config.cursor.pickBoxSize / 2),
    });
    this.updateInspect();
    this.map.addInteraction(this.inspectInteraction);
    this.map.addLayer(this.measurementStore.layer);
    this.map.addLayer(this.measurementStore.liveLayer);
    const measured = this.measurementStore;
    this.measurements = {
      list: () => measured.list(),
      get: (id) => measured.get(id),
      add: (kind, coordinates, extras) => measured.add(kind, coordinates, extras),
      remove: (id) => measured.remove(id),
      clear: () => measured.clear(),
      getLive: () => measured.getLive(),
    };
    const sel = this.selectionManager;
    this.selection = {
      get: () => sel.get(),
      set: (features) => sel.set(features),
      add: (feature) => sel.add(feature),
      remove: (feature) => sel.remove(feature),
      clear: () => sel.clear(),
    };
    const snapEngine = new SnapEngine(
      this.layerManager,
      () => config.snapping,
      () => config.grid,
    );
    this.snapInteraction = new SnapInteraction({
      engine: snapEngine,
      isActive: () =>
        (config.editMode || this.toolManager.isReadOnly()) &&
        (config.snapping.enabled || config.grid.enabled || config.constraints.angle.enabled),
      onSnap: (result) => {
        this.crosshair?.setSnap(result ? [result.pixel[0]!, result.pixel[1]!] : null, result?.mode);
        this.lastSnap = result;
        this.emitter.emit('snap', result);
      },
      getReference: () => this.toolManager.referencePoint(),
      constrain: (coordinate) => {
        const { enabled, step } = config.constraints.angle;
        if (!enabled) return null;
        const reference = this.toolManager.referencePoint();
        if (!reference) return null;
        return constrainToAngleStep(coordinate, reference, config.cursor.angle, step).coordinate;
      },
    });
    this.map.addInteraction(this.snapInteraction);
    const emitSnapping = () => this.emitter.emit('snappingchange', { ...config.snapping });
    this.snapping = {
      isEnabled: () => config.snapping.enabled,
      setEnabled: (enabled) => {
        if (config.snapping.enabled === enabled) return;
        config.snapping.enabled = enabled;
        if (!enabled) this.snapInteraction.reset();
        emitSnapping();
      },
      getTolerance: () => config.snapping.tolerancePx,
      setTolerance: (tolerancePx) => {
        if (!(tolerancePx > 0)) throw new Error('Snap tolerance must be positive');
        if (config.snapping.tolerancePx === tolerancePx) return;
        config.snapping.tolerancePx = tolerancePx;
        emitSnapping();
      },
      getModes: () => config.snapping.modes.slice(),
      setModes: (modes) => {
        if (modes.length === 0) throw new Error('At least one snap mode is required');
        config.snapping.modes = modes.slice();
        emitSnapping();
      },
      snap: (coordinate) =>
        snapEngine.snap(
          coordinate,
          this.map.getPixelFromCoordinate(coordinate),
          this.map.getView().getResolution() ?? 1,
          (c) => this.map.getPixelFromCoordinate(c),
          this.toolManager.referencePoint(),
        ),
    };
    const emitGrid = () => {
      this.gridLayer?.refresh();
      this.emitter.emit('gridchange', { ...config.grid, origin: [...config.grid.origin] });
    };
    const emitConstraints = () =>
      this.emitter.emit('constraintschange', { angle: { ...config.constraints.angle } });
    const store = this.templateStore;
    const targetContext = {
      layers: this.layerManager,
      getActiveLayer: () => this.layerManager.getActive(),
      getDraftLayer: () => this.getDraftLayer(),
      getProjection: () => this.getProjection(),
    };
    this.templates = {
      list: () => store.list(),
      get: (id) => store.get(id),
      create: (features, base, name) =>
        store.create(
          features.map((feature) => {
            const layer = this.layerManager.layerOf(feature);
            if (!layer) throw new Error('Template objects must belong to a layer');
            return { feature, layer, idProperty: this.layerManager.getConfig(layer).idProperty };
          }),
          base,
          name,
        ),
      rename: (id, name) => store.rename(id, name),
      remove: (id) => store.remove(id),
      suggestName: () => store.suggestName(),
      canInsert: (id) => {
        const template = store.get(id);
        return template !== undefined && canInsertTemplate(targetContext, template);
      },
      insert: (id, at) => {
        const template = store.get(id);
        if (!template) throw new Error(`Unknown template "${id}"`);
        const result = templateInsertCommand(targetContext, store, template, at);
        if (!result || !this.editing.execute(result.command)) return null;
        return result.features;
      },
      export: () => store.export(this.getProjection()),
      import: (json) => store.import(json, this.getProjection()),
    };
    this.constraints = {
      isAngleLocked: () => config.constraints.angle.enabled,
      setAngleLocked: (locked) => {
        if (config.constraints.angle.enabled === locked) return;
        config.constraints.angle.enabled = locked;
        if (!locked) this.snapInteraction.reset();
        emitConstraints();
      },
      getAngleStep: () => config.constraints.angle.step,
      setAngleStep: (step) => {
        if (!(step > 0 && step <= 360)) throw new Error('Angle step must be in (0, 360]');
        if (config.constraints.angle.step === step) return;
        config.constraints.angle.step = step;
        emitConstraints();
      },
    };
    this.grid = {
      isEnabled: () => config.grid.enabled,
      setEnabled: (enabled) => {
        if (config.grid.enabled === enabled) return;
        config.grid.enabled = enabled;
        if (!enabled) this.snapInteraction.reset();
        emitGrid();
      },
      getSpacing: () => config.grid.spacing,
      setSpacing: (spacing) => {
        if (!(spacing > 0)) throw new Error('Grid spacing must be positive');
        if (config.grid.spacing === spacing) return;
        config.grid.spacing = spacing;
        emitGrid();
      },
      getOrigin: () => [...config.grid.origin],
      setOrigin: (origin) => {
        if (!Number.isFinite(origin[0]) || !Number.isFinite(origin[1])) {
          throw new Error('Grid origin must be two finite numbers');
        }
        config.grid.origin = [origin[0], origin[1]];
        emitGrid();
      },
      isVisible: () => config.grid.visible,
      setVisible: (visible) => {
        if (config.grid.visible === visible) return;
        config.grid.visible = visible;
        emitGrid();
      },
    };
    // Tools add their interactions after ours; keep the snap interaction last so it handles
    // events first and the tools receive snapped coordinates.
    this.emitter.on('toolchange', () => {
      this.map.removeInteraction(this.snapInteraction);
      this.map.addInteraction(this.snapInteraction);
      this.updateInspect();
    });

    // The draw, rectangle, circle, ellipse, regular polygon and curve tools are bound to the active layer (or
    // the draft layer): follow it, keeping the options when the new layer allows them.
    this.emitter.on('activelayerchange', () => {
      const active = this.toolManager.getActive();
      if (!active || !LAYER_BOUND_TOOLS.includes(active)) return;
      const options = this.toolManager.getActiveOptions();
      if (this.toolManager.activate(active, options)) return;
      if (!this.toolManager.activate(active)) this.toolManager.deactivate();
    });

    this.changes = {
      get: () => this.editing.getChangeSet(),
      hasChanges: () => this.editing.hasChanges(),
      accept: (options) => {
        // References to new objects follow their backend ids (before the new baseline is taken).
        if (options?.idMap) this.remapDimensionReferences(options.idMap);
        this.editing.accept(options);
      },
      discard: () => this.editing.discard(),
    };

    this.basemaps = {
      list: () =>
        config.basemaps.map((b) => ({
          id: b.id,
          title: b.title,
          active: this.basemapLayers.get(b.id)?.getVisible() ?? false,
        })),
      getActive: () => this.basemaps.list().find((b) => b.active)?.id ?? null,
      setActive: (id) => {
        if (!this.basemapLayers.has(id)) throw new Error(`Unknown basemap "${id}"`);
        if (this.basemaps.getActive() === id) return;
        for (const [otherId, layer] of this.basemapLayers) layer.setVisible(otherId === id);
        this.emitter.emit('basemapchange', { id, type: 'activate' });
      },
      add: (basemapConfig) => {
        validateBasemapConfig(basemapConfig);
        if (this.basemapLayers.has(basemapConfig.id)) {
          throw new Error(`Basemap "${basemapConfig.id}" already exists`);
        }
        const resolved = resolveBasemap(basemapConfig);
        const activate = resolved.visible;
        resolved.visible = false;
        config.basemaps.push(resolved);
        this.insertBasemap(resolved.id, config.basemaps.length - 1);
        this.emitter.emit('basemapchange', { id: resolved.id, type: 'add' });
        if (activate || this.basemaps.getActive() === null) this.basemaps.setActive(resolved.id);
      },
      remove: (id) => {
        const layer = this.basemapLayers.get(id);
        if (!layer) throw new Error(`Unknown basemap "${id}"`);
        const wasActive = layer.getVisible();
        this.map.removeLayer(layer);
        this.basemapLayers.delete(id);
        config.basemaps.splice(
          config.basemaps.findIndex((b) => b.id === id),
          1,
        );
        this.emitter.emit('basemapchange', { id, type: 'remove' });
        const next = config.basemaps[0];
        if (wasActive && next) this.basemaps.setActive(next.id);
      },
    };

    this.straightedge = {
      getAngle: () => config.cursor.angle,
      setAngle: (degrees) => {
        const angle = normalizeAngle(degrees);
        if (angle === config.cursor.angle) return;
        config.cursor.angle = angle;
        this.crosshair?.setOptions({ angle });
        this.emitter.emit('straightedgechange', { angle, color: config.cursor.color });
      },
      getColor: () => config.cursor.color,
      setColor: (color) => {
        if (color === config.cursor.color) return;
        config.cursor.color = color;
        this.crosshair?.setOptions({ color });
        this.emitter.emit('straightedgechange', { angle: config.cursor.angle, color });
      },
      pick: () => this.startPick(),
      cancelPick: () => this.endPick(),
      isPicking: () => this.pickHandler !== null,
    };

    const lm = this.layerManager;
    this.layers = {
      list: () => lm.list(),
      get: (id) => lm.info(id),
      getConfig: (id) => lm.getConfig(id),
      getActive: () => lm.getActive(),
      getDraft: () => this.getDraftLayer(),
      setActive: (id) => lm.setActive(id),
      add: (layerConfig) => {
        lm.add(layerConfig);
        const resolved = lm.getConfig(layerConfig.id);
        config.layers.push(resolved);
      },
      remove: (id) => {
        this.selectionManager.prune((f) => lm.layerOf(f) !== id);
        this.editing.dropLayer(id);
        lm.remove(id);
        const index = config.layers.findIndex((l) => l.id === id);
        if (index >= 0) config.layers.splice(index, 1); // the draft layer is not in config.layers
      },
      setVisible: (id, visible) => lm.setVisible(id, visible),
      setEditable: (id, editable) => lm.setEditable(id, editable),
      setSnappable: (id, snappable) => lm.setSnappable(id, snappable),
      setHighlighted: (id, highlighted) => lm.setHighlighted(id, highlighted),
      getStyle: (id) => lm.getStyle(id),
      setStyle: (id, style) => lm.setStyle(id, style),
      resetStyle: (id) => lm.resetStyle(id),
      isStyleCustomized: (id) => lm.isStyleCustomized(id),
      hasExpressionStyle: (id) => lm.hasExpressionStyle(id),
      setOrder: (ids) => lm.setOrder(ids),
      moveLayer: (id, index) => lm.moveLayer(id, index),
      resetOrder: () => lm.resetOrder(),
      isOrderCustomized: () => lm.isOrderCustomized(),
      exportStyles: () => lm.exportStyles(),
      importStyles: (json) => lm.importStyles(json),
      resetStyles: () => lm.resetStyles(),
      isHighlighted: (id) => lm.isHighlighted(id),
      canEdit: (id, operation, feature) => lm.canEdit(id, operation, feature),
      getFeatures: (id) => lm.getSource(id).getFeatures(),
      layerOf: (feature) => lm.layerOf(feature),
      getOriginalGeometry: (feature) => lm.originals.get(feature),
      draftTargets: (feature) => draftTargets(this.draftContext(), feature),
      moveDrafts: (features, layerId) => {
        const move = moveDraftsCommand(this.draftContext(), features, layerId);
        if (!move || !this.editing.execute(move.command)) return [];
        this.selectionManager.set(move.features);
        this.emitter.emit('draftmove', {
          layer: layerId,
          features: move.features,
          sources: move.sources,
        });
        return move.features;
      },
      moveDraft: (feature, layerId) => this.layers.moveDrafts([feature], layerId)[0] ?? null,
    };

    const local = new LocalLayers({
      addLayer: (layerConfig) => this.layers.add(layerConfig),
      removeLayer: (id) => this.layers.remove(id),
      hasLayer: (id) => lm.has(id),
      getSource: (id) => lm.getSource(id),
      setTitle: (id, title) => lm.setTitle(id, title),
      setFields: (id, fields) => lm.setFields(id, fields),
      setLocal: (id, on) => lm.setLocal(id, on),
      getProjection: () => this.getProjection(),
      emit: (change) => this.emitter.emit('locallayerchange', change),
    });
    this.localLayerStore = local;
    const isDimension = (feature: Feature): boolean => {
      const layer = this.layerManager.layerOf(feature);
      return layer !== undefined && Boolean(this.layerManager.getConfig(layer).dimension);
    };
    this.dimensions = {
      isDimension,
      values: (feature) => {
        const layer = this.layerManager.layerOf(feature);
        const config =
          layer === undefined ? undefined : this.layerManager.getConfig(layer).dimension;
        return config
          ? dimensionValues(
              feature,
              config,
              this.getProjection(),
              this.staleDimensions.has(feature),
            )
          : null;
      },
      setFieldValue: (feature, metres) => {
        if (!isDimension(feature) || !this.editing.canEdit('update', feature)) return false;
        return this.editing.execute(
          updateProperties(feature, { fieldValue: metres === null ? undefined : metres }),
        );
      },
      inputTarget: () => {
        if (!this.config.editMode || this.toolManager.getActive() !== null) return null;
        const selected = this.selectionManager.get();
        if (selected.length !== 1) return null;
        const feature = selected[0]!;
        return isDimension(feature) && this.editing.canEdit('update', feature) ? feature : null;
      },
      isStale: (feature) => this.staleDimensions.has(feature),
      listStale: (layerId) =>
        [...this.staleDimensions].filter(
          (f) => layerId === undefined || this.layerManager.layerOf(f) === layerId,
        ),
      update: (feature) => {
        const command = this.dimensionUpdate(feature);
        return command !== null && this.editing.execute(command);
      },
      updateStale: (layerId) => {
        const commands = this.dimensions
          .listStale(layerId)
          .map((f) => this.dimensionUpdate(f))
          .filter((c): c is Command => c !== null);
        if (commands.length === 0) return 0;
        const command =
          commands.length === 1 ? commands[0]! : composite(commands, 'update dimensions');
        return this.editing.execute(command) ? commands.length : 0;
      },
      detach: (feature) => {
        if (!isDimension(feature) || !this.editing.canEdit('update', feature)) return false;
        if (referencesOf(feature).length === 0) return false;
        return this.editing.execute(updateProperties(feature, { refs: undefined }));
      },
    };
    this.layerManager.setDimensionStaleTest((feature) => this.staleDimensions.has(feature));
    for (const type of ['change', 'layerload', 'layerchange', 'projectionchange'] as const) {
      this.emitter.on(type, () => this.refreshStaleDimensions());
    }

    this.localLayers = {
      list: () => local.list(),
      get: (id) => local.get(id),
      has: (id) => local.has(id),
      create: (definition) => local.create(definition),
      rename: (id, title) => local.rename(id, title),
      setFields: (id, fields, options) => local.setFields(id, fields, options),
      remove: (id) => local.remove(id),
      export: () => local.export(),
      import: (json) => local.import(json),
    };

    const importContext: ImportContext = {
      listLayers: () => lm.list(),
      getConfig: (id) => lm.getConfig(id),
      canInsert: (id) => lm.canEdit(id, 'insert'),
      createLocalLayer: (definition) => local.create(definition),
      removeLocalLayer: (id) => local.remove(id),
      execute: (command) => this.editing.execute(command),
    };
    this.units = {
      getLength: () => this.lengthUnit(),
      getLengthSetting: () => this.config.units.length,
      setLength: (unit) => {
        if (unit !== 'auto' && !lengthUnitInfo(unit as LengthUnit)) {
          throw new Error(`Unknown length unit "${String(unit)}"`);
        }
        if (unit === this.config.units.length) return;
        this.config.units.length = unit;
        this.unitsChanged();
      },
      toMetres: (value, unit) => toMetres(value, unit ?? this.lengthUnit()),
      fromMetres: (metres, unit) => fromMetres(metres, unit ?? this.lengthUnit()),
      formatLength: (metres) => formatLengthIn(metres, this.lengthUnit()),
      formatArea: (squareMetres) => formatAreaIn(squareMetres, this.lengthUnit()),
    };
    this.import = {
      read: (text, options = {}) =>
        readImport(text, { ...options, viewProjection: this.getProjection() }),
      targetsFor: (group) => importTargets(importContext, group),
      apply: (preview, targets) => {
        const result = applyImport(importContext, preview, targets);
        this.emitter.emit('import', result);
        return result;
      },
    };
  }

  execute(command: Command): boolean {
    return this.editing.execute(command);
  }

  exportLayers(layerIds: string[], options: ExportOptions): ExportResult {
    const layers = layerIds.map((id) => ({
      id,
      title: this.layerManager.getConfig(id).title,
      features: this.layerManager.getSource(id).getFeatures(),
    }));
    return exportLayers(layers, options, this.getProjection());
  }

  private draftContext(): DraftMoveContext {
    return { layers: this.layerManager, getDraftLayer: () => this.getDraftLayer() };
  }

  canEdit(operation: EditOperation, feature: Feature): boolean {
    return this.editing.canEdit(operation, feature);
  }

  deleteSelection(): boolean {
    const features = this.selectionManager
      .get()
      .filter((feature) => this.editing.canEdit('delete', feature));
    if (features.length === 0) return false;
    const command =
      features.length === 1
        ? deleteFeature(features[0]!)
        : composite(features.map(deleteFeature), 'delete selection');
    return this.editing.execute(command);
  }

  undo(): boolean {
    return this.editing.undo();
  }

  redo(): boolean {
    return this.editing.redo();
  }

  input(text: string): InputResult {
    const result = this.resolveInput(text);
    this.emitter.emit('input', result);
    return result;
  }

  private resolveInput(text: string): InputResult {
    const fail = (code: string): InputResult => ({
      ok: false,
      text,
      code,
      error: formatMessage(this.config.locale, this.config.messages, code),
    });
    // A step that asks for text (a template name) takes it before it is parsed.
    if (
      this.toolsRunnable() &&
      this.toolManager.getActive() !== null &&
      this.toolManager.handleText(text)
    ) {
      return { ok: true, text, kind: 'text' };
    }
    // No tool and one selected dimension: a length is its field value, `-` clears it.
    const dimension = this.dimensions.inputTarget();
    if (dimension && text.trim() === '-') {
      return this.dimensions.setFieldValue(dimension, null)
        ? { ok: true, text, fieldValue: null }
        : fail('input-not-accepted');
    }
    // Survey dimensions: a height or a slope may be negative; a station takes `station offset`.
    if (dimension) {
      const values = this.dimensions.values(dimension);
      const number = '([+-]?\\d+(?:[.,]\\d+)?)';
      const toNumber = (raw: string) => Number(raw.replace(',', '.'));
      const single = new RegExp(`^\\s*${number}\\s*$`).exec(text);
      if (single && (values?.type === 'level' || values?.type === 'slope')) {
        const value = toNumber(single[1]!);
        return this.dimensions.setFieldValue(dimension, value)
          ? { ok: true, text, fieldValue: value }
          : fail('input-not-accepted');
      }
      const pair = new RegExp(`^\\s*${number}\\s+${number}\\s*$`).exec(text);
      if (pair && values?.type === 'station' && this.editing.canEdit('update', dimension)) {
        const station = toNumber(pair[1]!);
        const side = Math.sign(values.second?.gis ?? 1) || 1;
        return this.editing.execute(
          updateProperties(dimension, {
            fieldValue: station,
            fieldOffset: side * Math.abs(toNumber(pair[2]!)),
          }),
        )
          ? { ok: true, text, fieldValue: station }
          : fail('input-not-accepted');
      }
    }
    const parsed = parseInput(text, this.lengthUnit());
    if (!parsed) return fail('input-invalid');
    if (dimension && parsed.kind === 'length') {
      // An angular dimension takes a plain number in its layer's angle unit, stored in degrees.
      const values = this.dimensions.values(dimension);
      if (values?.unit === 'deg') {
        const layer = this.layerManager.layerOf(dimension)!;
        const angleUnit = this.layerManager.getConfig(layer).dimension!.angleUnit;
        if (parsed.unit !== null) return fail('input-not-accepted');
        const degrees = fromAngleUnit(parsed.value, angleUnit);
        return this.dimensions.setFieldValue(dimension, degrees)
          ? { ok: true, text, fieldValue: degrees }
          : fail('input-not-accepted');
      }
      return this.dimensions.setFieldValue(dimension, parsed.distance)
        ? { ok: true, text, fieldValue: parsed.distance }
        : fail('input-not-accepted');
    }
    if (!this.toolsRunnable() || this.toolManager.getActive() === null)
      return fail('input-no-tool');
    if (parsed.kind === 'length') {
      // A step that asks for a dimensionless value (sides, a factor) takes a number typed
      // without a unit; a step that asks for a length (a distance, a height) takes it in
      // metres; otherwise the length is resolved as a distance from the reference point.
      if (parsed.unit === null && this.toolManager.handleValue(parsed.value)) {
        return { ok: true, text, value: parsed.value };
      }
      if (this.toolManager.handleLength(parsed.distance)) {
        return { ok: true, text, length: parsed.distance };
      }
    }
    const projection = this.getProjection();
    const base = this.config.cursor.angle;
    let coordinate: number[];
    if (parsed.kind === 'absolute') {
      coordinate = [parsed.x, parsed.y];
    } else {
      const reference = this.toolManager.referencePoint();
      if (!reference) return fail('input-no-reference');
      if (parsed.kind === 'relative') {
        coordinate = offsetMetres(projection, reference, parsed.dx, parsed.dy);
      } else if (parsed.kind === 'polar') {
        const radians = ((base + parsed.angle) * Math.PI) / 180;
        coordinate = offsetMetres(
          projection,
          reference,
          parsed.distance * Math.cos(radians),
          parsed.distance * Math.sin(radians),
        );
      } else {
        // Direct distance entry: along the direction from the reference to the pointer
        // (angle-locked if the lock is on), else along the straightedge.
        const pointer = this.snapInteraction.getPointerCoordinate();
        let radians = (base * Math.PI) / 180;
        if (pointer && (pointer[0] !== reference[0] || pointer[1] !== reference[1])) {
          const { enabled, step } = this.config.constraints.angle;
          const target = enabled
            ? constrainToAngleStep(pointer, reference, base, step).coordinate
            : pointer;
          radians = Math.atan2(target[1]! - reference[1]!, target[0]! - reference[0]!);
        }
        coordinate = offsetMetres(
          projection,
          reference,
          parsed.distance * Math.cos(radians),
          parsed.distance * Math.sin(radians),
        );
      }
    }
    if (!this.toolManager.handleInput(coordinate)) return fail('input-not-accepted');
    return { ok: true, text, coordinate };
  }

  canUndo(): boolean {
    return this.editing.canUndo();
  }

  canRedo(): boolean {
    return this.editing.canRedo();
  }

  getProjection(): string {
    return this.map.getView().getProjection().getCode();
  }

  /** The draft layer id while the layer exists. */
  private getDraftLayer(): string | null {
    const { draft } = this.config;
    return draft.enabled && this.layerManager.has(draft.id) ? draft.id : null;
  }

  setProjection(code: string): void {
    if (!getProjection(code)) throw new Error(`Unknown projection "${code}"`);
    const from = this.getProjection();
    const to = getProjection(code)!.getCode();
    if (from === to) return;
    this.emitter.emit('beforeprojectionchange', { from, to });

    const oldView = this.map.getView();
    const size = this.map.getSize();
    const extent = size ? oldView.calculateExtent(size) : undefined;
    const view = this.createView(to);
    const center = oldView.getCenter();
    if (center)
      view.setCenter(
        transformExtent([center[0]!, center[1]!, center[0]!, center[1]!], from, to).slice(0, 2) as [
          number,
          number,
        ],
      );
    this.map.setView(view);
    if (extent && size) view.fit(transformExtent(extent, from, to), { size });

    this.editing.reproject(from, to);
    this.templateStore.reproject(from, to);
    this.measurementStore.reproject(from, to);
    this.layerManager.reproject(
      from,
      to,
      (feature) => this.editing.tracker.isGeometryModified(feature),
      (feature) => this.editing.tracker.isTouched(feature),
    );
    this.config.view.projection = to;
    this.emitter.emit('projectionchange', { from, to });
    if (this.config.units.length === 'auto' && crsLengthUnit(from) !== crsLengthUnit(to)) {
      this.unitsChanged();
    }
  }

  /** The effective default length unit: `units.length`, or the view projection's. */
  /** An editor object by layer and id, for dimension references. */
  private findFeature(layer: string, id: string | number): Feature | null {
    return this.layerManager.has(layer)
      ? (this.layerManager.getSource(layer).getFeatureById(id) as Feature | null)
      : null;
  }

  /** The objects of every dimension layer. */
  private dimensionFeatures(): Feature[] {
    return this.layerManager
      .list()
      .filter((info) => this.layerManager.getConfig(info.id).dimension)
      .flatMap((info) => this.layerManager.getSource(info.id).getFeatures());
  }

  /**
   * Recompute which dimensions are stale (a referenced point moved by more than a millimetre,
   * or its object is gone); redraw the dimensions whose state changed and emit `dimensionstale`
   * when the set changed.
   */
  private refreshStaleDimensions(): void {
    const projection = this.getProjection();
    const find = (layer: string, id: string | number) => this.findFeature(layer, id);
    const next = new Set<Feature>();
    for (const feature of this.dimensionFeatures()) {
      if (referencesOf(feature).length === 0) continue;
      const at = (feature.getGeometry() as LineString | undefined)?.getFirstCoordinate();
      if (!at) continue;
      const tolerance = 0.001 * unitsPerMetre(projection, at);
      if (dimensionIsStale(feature, find, tolerance)) next.add(feature);
    }
    const changed = [...next].filter((f) => !this.staleDimensions.has(f));
    const cleared = [...this.staleDimensions].filter((f) => !next.has(f));
    if (changed.length === 0 && cleared.length === 0) return;
    this.staleDimensions = next;
    for (const feature of [...changed, ...cleared]) feature.changed();
    this.emitter.emit('dimensionstale', { features: [...next] });
  }

  /** The command that moves a dimension onto its referenced points, or `null`. */
  private dimensionUpdate(feature: Feature): Command | null {
    const layer = this.layerManager.layerOf(feature);
    const config = layer === undefined ? undefined : this.layerManager.getConfig(layer).dimension;
    if (!config || !this.editing.canEdit('update', feature)) return null;
    if (referencesOf(feature).length === 0) return null;
    const points = referencedPoints(feature, (l, id) => this.findFeature(l, id));
    if (!points) return null;
    const geometry = new LineString(points);
    const moved = feature.clone();
    moved.setGeometry(geometry);
    const gis = dimensionValues(moved, config, this.getProjection())?.gis;
    return composite(
      [
        updateGeometry(feature, geometry),
        ...(gis === undefined || gis === null
          ? []
          : [updateProperties(feature, { gisValue: Math.round(gis * 1000) / 1000 })]),
      ],
      'update dimension',
    );
  }

  /** Replace temporary ids in dimension references by the ids the backend assigned. */
  private remapDimensionReferences(idMap: Record<string, string | number>): void {
    for (const feature of this.dimensionFeatures()) {
      const next = remapReferences(referencesOf(feature), idMap);
      if (next) feature.set('refs', next);
    }
  }

  private lengthUnit(): LengthUnit {
    const setting = this.config.units.length;
    return setting === 'auto' ? crsLengthUnit(this.getProjection()) : setting;
  }

  /** Relabel the measurements, refresh the tool prompt and announce the unit. */
  private unitsChanged(): void {
    this.measurementStore.relabel();
    if (this.toolManager.getActive() !== null) {
      this.emitter.emit('toolprompt', {
        id: this.toolManager.getActive(),
        text: this.toolManager.getPrompt(),
        input: this.toolManager.getInputRequest(),
      });
    }
    this.emitter.emit('unitschange', {
      length: this.lengthUnit(),
      setting: this.config.units.length,
    });
  }

  isEditMode(): boolean {
    return this.config.editMode;
  }

  setEditMode(editMode: boolean): void {
    if (this.config.editMode === editMode) return;
    this.config.editMode = editMode;
    if (!editMode) {
      this.endPick();
      // A read-only tool (measuring) keeps running while viewing.
      if (!this.toolManager.isReadOnly()) this.toolManager.deactivate();
      this.snapInteraction.reset();
    }
    this.updateInspect();
    this.reflectEditMode(editMode);
    this.emitter.emit('editmodechange', { editMode });
  }

  /** Tools may take input: in edit mode, or a read-only tool is active. */
  private toolsRunnable(): boolean {
    return this.config.editMode || this.toolManager.isReadOnly();
  }

  /** The inspect click selection runs outside edit mode while no read-only tool takes the clicks. */
  private updateInspect(): void {
    this.inspectInteraction.setActive(
      !this.config.editMode && this.config.selection.inspect && !this.toolManager.isReadOnly(),
    );
  }

  /** Crosshair overlay and hidden native cursor on the viewport; class `olcad-edit-mode` on the target. */
  private reflectEditMode(on: boolean): void {
    const viewport = this.map.getViewport();
    const { cursor } = this.config;
    if (viewport && on && cursor.crosshair) {
      this.crosshair ??= new Crosshair(viewport, cursor);
      applyEditCursor(viewport, true);
    } else if (viewport && !on) {
      this.crosshair?.destroy();
      this.crosshair = null;
      applyEditCursor(viewport, false);
    }
    // The grid dots show in edit mode only (the layer itself checks `grid.visible` per frame).
    if (on) {
      this.gridLayer ??= new GridLayer(() => this.config.grid, cursor.color);
      this.gridLayer.attach(this.map);
    } else {
      this.gridLayer?.attach(null);
    }
    this.map.getTargetElement()?.classList.toggle(EDIT_MODE_CLASS, on);
  }

  /** The segment of the editor-layer feature under `pixel` that a reference pick would take. */
  private segmentAtPixel(pixel: number[], coordinate: number[]): Segment | undefined {
    // Walk every feature under the pointer (top-most first) and take the first one that has
    // segments, so a point feature nearby does not hide the line or polygon behind it.
    return this.map.forEachFeatureAtPixel(
      pixel,
      (f) => {
        const geometry = f instanceof Feature ? f.getGeometry() : undefined;
        return geometry ? nearestSegment(geometry, coordinate) : undefined;
      },
      {
        // Lines are thin: be generous so the pick does not need a precise click.
        hitTolerance: Math.max(8, Math.ceil(this.config.cursor.pickBoxSize / 2)),
        layerFilter: (layer) => layer.get(LAYER_ID_PROPERTY) !== undefined,
      },
    );
  }

  private startPick(): void {
    if (!this.config.editMode) throw new Error('Straightedge reference pick requires edit mode');
    if (this.pickHandler) return;
    const highlight = this.ensurePickHighlight();
    this.pickHandler = (event) => {
      const segment = this.segmentAtPixel(event.pixel, event.coordinate);
      if (!segment) return; // nothing hit, or a point: keep picking
      const angle = screenAngle(
        this.map.getPixelFromCoordinate(segment[0]),
        this.map.getPixelFromCoordinate(segment[1]),
      );
      this.endPick();
      this.straightedge.setAngle(angle);
    };
    this.pickHoverHandler = (event) => {
      const segment = this.segmentAtPixel(event.pixel, event.coordinate);
      const source = highlight.getSource()!;
      source.clear(true);
      if (segment) source.addFeature(new Feature(new LineString([segment[0], segment[1]])));
    };
    this.map.on('singleclick', this.pickHandler);
    this.map.on('pointermove', this.pickHoverHandler);
    this.toolManager.suspend(true);
    this.crosshair?.setPicking(true);
    this.emitter.emit('straightedgepick', { picking: true });
  }

  private ensurePickHighlight(): VectorLayer<VectorSource<Feature>> {
    if (!this.pickHighlight) {
      this.pickHighlight = new VectorLayer({
        source: new VectorSource<Feature>(),
        style: new Style({ stroke: new Stroke({ color: this.config.cursor.pickColor, width: 4 }) }),
        zIndex: 1000,
      });
      // Unmanaged: rendered with the map but not part of the map's layer collection.
      this.pickHighlight.setMap(this.map);
    }
    return this.pickHighlight;
  }

  private endPick(): void {
    if (!this.pickHandler) return;
    this.map.un('singleclick', this.pickHandler);
    this.pickHandler = null;
    if (this.pickHoverHandler) {
      this.map.un('pointermove', this.pickHoverHandler);
      this.pickHoverHandler = null;
    }
    this.pickHighlight?.getSource()?.clear(true);
    this.toolManager.suspend(false);
    this.crosshair?.setPicking(false);
    this.emitter.emit('straightedgepick', { picking: false });
  }

  on: Editor['on'] = (type, listener) => this.emitter.on(type, listener);
  off: Editor['off'] = (type, listener) => this.emitter.off(type, listener);

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emitter.emit('destroy', undefined);
    this.endPick();
    this.map.removeInteraction(this.snapInteraction);
    this.map.removeInteraction(this.inspectInteraction);
    this.pickHighlight?.setMap(null);
    this.pickHighlight = null;
    this.toolManager.deactivate();
    this.selectionManager.destroy();
    this.templateStore.clear();
    this.localLayerStore.clear();
    this.map.removeLayer(this.measurementStore.layer);
    this.map.removeLayer(this.measurementStore.liveLayer);
    this.emitter.clear();
    this.reflectEditMode(false);
    this.layerManager.destroy();
    for (const layer of this.basemapLayers.values()) this.map.removeLayer(layer);
    this.basemapLayers.clear();
    if (this.ownsMap) {
      this.map.setTarget(undefined);
      this.map.dispose();
    }
  }

  private createView(projection: string): View {
    const { view } = this.config;
    return new View({
      projection,
      center: view.center,
      zoom: view.zoom,
      minZoom: view.minZoom,
      maxZoom: view.maxZoom,
      rotation: view.rotation,
      extent: view.extent,
    });
  }

  private insertBasemap(id: string, index: number): void {
    const basemap = this.config.basemaps.find((b) => b.id === id)!;
    const layer = createBasemapLayer(basemap, {
      getProjection: () => this.getProjection(),
      onError: (basemapId, error) => this.emitter.emit('basemaperror', { id: basemapId, error }),
    });
    layer.set(BASEMAP_ID_PROPERTY, id);
    this.basemapLayers.set(id, layer);
    this.map.getLayers().insertAt(index, layer);
  }
}

/**
 * Create an editor. Pass `target` to let the editor create the map, or `map` to attach
 * to an existing OpenLayers map. Throws `ConfigError` for an invalid configuration.
 */
export function createEditor(config: EditorConfig): Editor {
  validateConfig(config);
  const resolved = applyDefaults(config);
  registerProjections(resolved.projections, resolved.proj4);
  return new EditorImpl(resolved, { explicitView: config.view !== undefined });
}
