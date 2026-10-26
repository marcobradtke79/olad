import type { LengthUnit } from '../units';
import type Feature from 'ol/Feature';
import type Map from 'ol/Map';
import type { FlatStyleLike } from 'ol/style/flat';
import type proj4Type from 'proj4';

/** The proj4 library instance (default export of `proj4`). */
export type Proj4Instance = typeof proj4Type;

/**
 * Initial view of the map. Every field is optional; see `defaults.ts`.
 * Coordinates are in the view projection.
 */
export interface ViewConfig {
  /** Projection code of the map view. Must be built into OpenLayers (`EPSG:3857`, `EPSG:4326`) or declared in `projections`. */
  projection?: string;
  /** Initial centre in view projection units. */
  center?: [number, number];
  /** Initial zoom level. */
  zoom?: number;
  /** Lowest zoom level the user can reach. */
  minZoom?: number;
  /** Highest zoom level the user can reach. */
  maxZoom?: number;
  /** Initial rotation in radians, clockwise. */
  rotation?: number;
  /** Extent that constrains the view, in view projection units. */
  extent?: [number, number, number, number];
  /** Projection `center` is given in. Defaults to the view projection; `'EPSG:4326'` takes `[lon, lat]`. */
  centerProjection?: string;
  /** Fit the initial view to an extent or to layers once the map has a size; wins over `center` and `zoom`. */
  fit?: ViewFitConfig;
}

/** The initial fit of the view (`view.fit`). Exactly one of `extent` and `layers` is required. */
export interface ViewFitConfig {
  /** Extent to fit, in `projection`. */
  extent?: [number, number, number, number];
  /** Projection of `extent`. Defaults to the view projection. */
  projection?: string;
  /**
   * Fit the union of the data extents (`layers[].extent`, `overlays[].extent`) of these layers
   * and overlays, or of all of them with `true`; entries without an extent are skipped.
   */
  layers?: true | string[];
  /** Padding in pixels: top, right, bottom, left. */
  padding?: [number, number, number, number];
  /** Highest zoom level the fit may reach. */
  maxZoom?: number;
}

/** A JSON-safe subset of `RequestInit` for the library's own `fetch` calls. */
export interface FetchConfig {
  /** `credentials` mode of the request. Default: the browser's (`same-origin`). */
  credentials?: 'include' | 'same-origin' | 'omit';
  /** Request headers, for example an API key or a bearer token. */
  headers?: Record<string, string>;
}

/** A proj4 definition registered at startup. */
export interface ProjectionConfig {
  /** Projection code, for example `EPSG:25832`. */
  code: string;
  /** proj4 definition string. */
  def: string;
  /** Readable name shown by `<olcad-projection-select>`, for example `UTM 32N`. */
  title?: string;
}

interface BasemapBase {
  /** Unique identifier used by the API and the UI. */
  id: string;
  /** Human readable name. Defaults to `id`. */
  title?: string;
  /** Whether this basemap is shown at startup. If no basemap is visible, the first one is shown. */
  visible?: boolean;
  /** Attribution text or HTML. */
  attribution?: string;
  /**
   * Options of the `fetch` for the WMTS capabilities document. Tiles are loaded by the browser's
   * image pipeline and cannot carry headers; `crossOrigin: 'use-credentials'` sends cookies.
   */
  fetch?: FetchConfig;
}

/** OpenStreetMap standard tiles. */
export interface OsmBasemapConfig extends BasemapBase {
  type: 'osm';
  /** Highest zoom level the source offers. */
  maxZoom?: number;
}

/** Slippy map tiles from a URL template with `{z}`, `{x}`, `{y}` and optional `{a-c}` placeholders. */
export interface XyzBasemapConfig extends BasemapBase {
  type: 'xyz';
  /** URL template. */
  url: string;
  /** Lowest zoom level the source offers. */
  minZoom?: number;
  /** Highest zoom level the source offers. */
  maxZoom?: number;
  /** Tile size in pixels. */
  tileSize?: number;
  /** `crossOrigin` attribute for tile images. Required for canvas export of cross-origin tiles. */
  crossOrigin?: string | null;
}

/** OGC WMS, tiled (default) or as one image per view. */
export interface WmsBasemapConfig extends BasemapBase {
  type: 'wms';
  /** GetMap base URL. */
  url: string;
  /** WMS request parameters. `LAYERS` is required; `VERSION`, `FORMAT`, `TRANSPARENT` and others are optional. */
  params: Record<string, string | number | boolean>;
  /** Request 256px tiles (`true`, default) or one image for the whole view (`false`). */
  tiled?: boolean;
  /** Vendor hint for high-DPI requests. */
  serverType?: 'mapserver' | 'geoserver' | 'qgis' | 'carmentaserver';
  /** Projection to request from the server. Defaults to the view projection. */
  projection?: string;
  /** `crossOrigin` attribute for images. */
  crossOrigin?: string | null;
}

/** OGC WMTS configured from a GetCapabilities document. */
export interface WmtsBasemapConfig extends BasemapBase {
  type: 'wmts';
  /** URL of the WMTS GetCapabilities document. Loaded asynchronously. */
  capabilitiesUrl: string;
  /** Layer identifier from the capabilities. */
  layer: string;
  /** Tile matrix set identifier. Defaults to the first set matching the view projection. */
  matrixSet?: string;
  /** Image format, for example `image/png`. Defaults to the first format the layer offers. */
  format?: string;
  /** Style identifier. Defaults to the layer's default style. */
  style?: string;
  /** `crossOrigin` attribute for tile images. */
  crossOrigin?: string | null;
}

/** Vector tiles from a URL template. */
export interface VectorTileBasemapConfig extends BasemapBase {
  type: 'vector-tile';
  /** URL template with `{z}`, `{x}`, `{y}` placeholders. */
  url: string;
  /** Tile encoding. */
  format?: 'mvt' | 'geojson' | 'topojson';
  /** Lowest zoom level the source offers. */
  minZoom?: number;
  /** Highest zoom level the source offers. */
  maxZoom?: number;
  /** Projection of the tile grid. Defaults to `EPSG:3857`. */
  projection?: string;
  /** OpenLayers flat style for rendering the tiles. Defaults to the OpenLayers default style. */
  style?: FlatStyleLike;
}

/** One file of a GeoTIFF basemap. */
export interface GeoTiffSourceConfig {
  /** URL of a (cloud optimised) GeoTIFF. */
  url: string;
  /** Band numbers to read, 1-based. Defaults to all bands. */
  bands?: number[];
  /** Minimum source value, used for normalisation. */
  min?: number;
  /** Maximum source value, used for normalisation. */
  max?: number;
  /** Value that marks no data. */
  nodata?: number;
}

/** Cloud optimised GeoTIFF rendered with WebGL. */
export interface GeoTiffBasemapConfig extends BasemapBase {
  type: 'geotiff';
  /** One or more files. Several files are combined band-wise. */
  sources: GeoTiffSourceConfig[];
  /** Scale values to 0..1 using `min` / `max` or the data type. */
  normalize?: boolean;
  /** Convert to RGB using the file's colour interpretation. */
  convertToRGB?: boolean | 'auto';
}

export type BasemapConfig =
  | OsmBasemapConfig
  | XyzBasemapConfig
  | WmsBasemapConfig
  | WmtsBasemapConfig
  | VectorTileBasemapConfig
  | GeoTiffBasemapConfig;

interface OverlayBase {
  /** Unique identifier used by the API and the UI. Shares the id space with `layers[]`. */
  id: string;
  /** Human readable name. Defaults to `id`. */
  title?: string;
  /** Shown at startup. Defaults to `true`; overlays are independent of each other and of the basemap. */
  visible?: boolean;
  /** Attribution text or HTML. */
  attribution?: string;
  /** Layer opacity, 0 … 1. Defaults to `1`. */
  opacity?: number;
  /** Hide the overlay below this view zoom. */
  minZoom?: number;
  /** Hide the overlay above this view zoom. */
  maxZoom?: number;
  /** URL of a legend image for the layer list. WMS overlays derive one from the service when it is not set. */
  legendUrl?: string;
  /** Data extent of the overlay, for `view.fit`, `editor.overlays.fit` and the layer list's Zoom button. */
  extent?: [number, number, number, number];
  /** Projection of `extent`. Defaults to `'EPSG:4326'`. */
  extentProjection?: string;
  /** Options of the `fetch` for the WMTS capabilities document (tiles cannot carry headers). */
  fetch?: FetchConfig;
  /**
   * The server answers GetFeatureInfo for this overlay (`wms` only): a click beside the vector
   * objects queries it while edit mode is off. Default `false`.
   */
  queryable?: boolean;
  /**
   * `INFO_FORMAT` of GetFeatureInfo requests. Default `'application/json'` (GeoServer); GML and
   * XML answers are read with OpenLayers' `WMSGetFeatureInfo` format.
   */
  infoFormat?: string;
  /** Id of the group the overlay is listed under (`groups[]`; an undeclared id creates one). */
  group?: string;
}

/** Slippy map tiles drawn over the basemap. */
export interface XyzOverlayConfig extends OverlayBase {
  type: 'xyz';
  /** URL template with `{z}`, `{x}`, `{y}` and optional `{a-c}` placeholders. */
  url: string;
  /** Lowest zoom level the tile source offers. */
  sourceMinZoom?: number;
  /** Highest zoom level the tile source offers. */
  sourceMaxZoom?: number;
  /** Tile size in pixels. */
  tileSize?: number;
  /** `crossOrigin` attribute for tile images. */
  crossOrigin?: string | null;
}

/** OGC WMS layers drawn over the basemap, tiled (default) or as one image per view. */
export interface WmsOverlayConfig extends OverlayBase {
  type: 'wms';
  /** GetMap base URL. */
  url: string;
  /** WMS request parameters. `LAYERS` is required; `TRANSPARENT: true` keeps the basemap visible. */
  params: Record<string, string | number | boolean>;
  /** Request 256px tiles (`true`, default) or one image for the whole view (`false`). */
  tiled?: boolean;
  /** Vendor hint for high-DPI requests. */
  serverType?: 'mapserver' | 'geoserver' | 'qgis' | 'carmentaserver';
  /** Projection to request from the server. Defaults to the view projection. */
  projection?: string;
  /** `crossOrigin` attribute for images. */
  crossOrigin?: string | null;
}

/** OGC WMTS layer drawn over the basemap, configured from a GetCapabilities document. */
export interface WmtsOverlayConfig extends OverlayBase {
  type: 'wmts';
  /** URL of the WMTS GetCapabilities document. Loaded asynchronously. */
  capabilitiesUrl: string;
  /** Layer identifier from the capabilities. */
  layer: string;
  /** Tile matrix set identifier. Defaults to the first set matching the view projection. */
  matrixSet?: string;
  /** Image format. Defaults to the first format the layer offers. */
  format?: string;
  /** Style identifier. Defaults to the layer's default style. */
  style?: string;
  /** `crossOrigin` attribute for tile images. */
  crossOrigin?: string | null;
}

/** Vector tiles drawn over the basemap. */
export interface VectorTileOverlayConfig extends OverlayBase {
  type: 'vector-tile';
  /** URL template with `{z}`, `{x}`, `{y}` placeholders. */
  url: string;
  /** Tile encoding. */
  format?: 'mvt' | 'geojson' | 'topojson';
  /** Lowest zoom level the tile source offers. */
  sourceMinZoom?: number;
  /** Highest zoom level the tile source offers. */
  sourceMaxZoom?: number;
  /** Projection of the tile grid. Defaults to `EPSG:3857`. */
  projection?: string;
  /** OpenLayers flat style for rendering the tiles. */
  style?: FlatStyleLike;
}

/** Cloud optimised GeoTIFF drawn over the basemap. */
export interface GeoTiffOverlayConfig extends OverlayBase {
  type: 'geotiff';
  /** One or more files. Several files are combined band-wise. */
  sources: GeoTiffSourceConfig[];
  /** Scale values to 0..1 using `min` / `max` or the data type. */
  normalize?: boolean;
  /** Convert to RGB using the file's colour interpretation. */
  convertToRGB?: boolean | 'auto';
}

/**
 * A raster overlay: a server-rendered or tiled layer drawn between the basemap and the vector
 * layers, switched on and off independently (`editor.overlays`). Read-only: never selected,
 * snapped or edited.
 */
export type OverlayConfig =
  | XyzOverlayConfig
  | WmsOverlayConfig
  | WmtsOverlayConfig
  | VectorTileOverlayConfig
  | GeoTiffOverlayConfig;

/**
 * Geometry type of a layer. `'Any'` accepts every one of the other types in one layer (the
 * draft layer uses it); the draw tool then needs the type to draw (`ToolOptions.type`).
 */
export type GeometryType =
  'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'Any';

export type EditOperation = 'insert' | 'update' | 'delete';

/** Per-operation editability of a layer. Missing operations default to `false`. */
export interface EditableConfig {
  /** New features may be drawn. */
  insert?: boolean;
  /** Existing features may be changed (geometry and attributes). */
  update?: boolean;
  /** Existing features may be deleted. */
  delete?: boolean;
  /**
   * Per-feature rule, evaluated in addition to the flags for `update` and `delete`.
   * Not JSON-serialisable; set it through the API when the config comes from a server.
   */
  predicate?: (feature: Feature, operation: 'update' | 'delete') => boolean;
}

export type VectorFormat = 'geojson' | 'topojson' | 'kml' | 'gpx' | 'wkt' | 'gml' | 'wfs';

/** Host-supplied loader. Returns the raw data for the configured `format`. */
export type VectorLoader = (request: {
  /** Requested extent in `projection` units. Infinite for the `all` strategy. */
  extent: [number, number, number, number];
  /** View resolution in projection units per pixel. */
  resolution: number;
  /** Current view projection code. */
  projection: string;
}) => string | object | Promise<string | object>;

export interface VectorSourceConfig {
  /** Data format. Required unless `features` is given. */
  format?: VectorFormat;
  /** URL to fetch. For `wfs` the service base URL. */
  url?: string;
  /** Inline data: text for XML and WKT formats, text or object for JSON formats. */
  data?: string | object;
  /** Inline GeoJSON features. Implies `format: 'geojson'`. */
  features?: Record<string, unknown>[];
  /** Host-supplied loader instead of `url` / `data`. */
  loader?: VectorLoader;
  /** Projection of the data. Defaults: `EPSG:4326` for JSON, KML, GPX and WKT; the document's `srsName` for GML; the view projection for WFS. */
  dataProjection?: string;
  /** When to load: everything once (`all`) or per view extent (`bbox`). Defaults to `bbox` for `wfs` and `loader`, else `all`. */
  strategy?: 'all' | 'bbox';
  /** GML flavour for `gml` and `wfs`. Defaults to `3` (`3.2` for WFS 2.0.0). */
  gmlVersion?: '2' | '3' | '3.2';
  /** WFS feature type name, for example `ns:parcels`. Required for `wfs`. */
  typeName?: string;
  /** WFS protocol version. */
  version?: '1.0.0' | '1.1.0' | '2.0.0';
  /** WFS `outputFormat` parameter. `application/json` switches parsing to GeoJSON. */
  outputFormat?: string;
  /**
   * Extra GetFeature query parameters for `wfs`, appended verbatim (`maxFeatures`, `count`,
   * `cql_filter`, `propertyName`, `sortBy`, `viewparams`, …); a key the editor sets itself
   * (`srsName`, `outputFormat`) is overridden by it.
   */
  params?: Record<string, string | number | boolean>;
  /** Options of the `fetch` call of a `url` source, every format. */
  fetch?: FetchConfig;
  /**
   * WFS 2.0.0 paging: features per request (`count`); further pages follow with `startIndex`
   * until the server's `numberMatched` is reached or a page is short. Objects appear page by page.
   */
  pageSize?: number;
}

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'date';

/** One attribute of an object class. */
export interface FieldConfig {
  /** Property name on the feature. */
  name: string;
  type: FieldType;
  /** Label for forms. Defaults to `name`. */
  label?: string;
  /** Value must be present and not empty. */
  required?: boolean;
  /** Shown but not editable. */
  readOnly?: boolean;
  /** Value for new features. */
  default?: string | number | boolean | null;
  /** Allowed values, for `enum`. */
  values?: (string | number)[];
  /** Minimum value, for `number` and `integer`. */
  min?: number;
  /** Maximum value, for `number` and `integer`. */
  max?: number;
  /** Regular expression the value must match, for `string`. */
  pattern?: string;
}

export interface SchemaConfig {
  fields: FieldConfig[];
}

/** One vector layer. One layer is one object class with one geometry type and one schema. */
export interface LayerConfig {
  /** Unique identifier used by the API, the UI and the change set. */
  id: string;
  /** Human readable name. Defaults to `id`. */
  title?: string;
  /** Shown at startup. */
  visible?: boolean;
  source: VectorSourceConfig;
  /** Layer opacity, 0 … 1. Defaults to `1`; `resetStyle` returns to it. */
  opacity?: number;
  /** Attribution text or HTML, shown while the layer is visible. */
  attribution?: string;
  /** Data extent of the layer, for `view.fit`, `editor.layers.fit` and the layer list's Zoom button. */
  extent?: [number, number, number, number];
  /** Projection of `extent`. Defaults to `'EPSG:4326'` (lon / lat, as servers publish bounding boxes). */
  extentProjection?: string;
  /** URL of a legend image, shown in the layer list details and the style dialog. */
  legendUrl?: string;
  /** Id of the group the layer is listed under (`groups[]`; an undeclared id creates one). */
  group?: string;
  /** Geometry type every feature of the layer must have. */
  geometryType: GeometryType;
  /** Property that holds the feature id when the format does not carry one. */
  idProperty?: string;
  /** `true` allows every operation, `false` (default) none, an object selects operations. */
  editable?: boolean | EditableConfig;
  /** Features can be snapped to. Defaults to `true`. */
  snappable?: boolean;
  /** OpenLayers flat style. Defaults to a simple style per geometry type. */
  style?: FlatStyleLike;
  /** Attribute schema. */
  schema?: SchemaConfig;
  /** Hide the layer below this view zoom. */
  minZoom?: number;
  /** Hide the layer above this view zoom. */
  maxZoom?: number;
  /**
   * Text layer: point features with a text property are drawn as text, sized in metres on the
   * ground and rotated by a property (tool `text`). `true` uses the defaults. Requires the
   * geometry type `Point`, `MultiPoint` or `Any`.
   */
  text?: boolean | TextConfig;
  /**
   * Dimension layer: line features are drawn as dimensions (extension lines, dimension line,
   * terminators, value) after a drawing standard preset. `true` uses the defaults. Requires the
   * geometry type `LineString` or `Any`; not combinable with `text`.
   */
  dimension?: boolean | DimensionConfig;
}

/** How a text layer stores and draws its texts. */
export interface TextConfig {
  /** Property holding the text. Default `'text'`. */
  property?: string;
  /** Property holding the text height in metres. Default `'textHeight'`. */
  heightProperty?: string;
  /** Property holding the rotation in degrees, counter-clockwise. Default `'textRotation'`. */
  rotationProperty?: string;
  /** Height in metres offered for a new text. Default `2.5`. */
  height?: number;
  /** Text colour. Default `'#111827'`. */
  color?: string;
  /** Outline colour around the letters. Default `'rgba(255, 255, 255, 0.85)'`. */
  haloColor?: string;
  /** CSS font family. Default `'sans-serif'`. */
  font?: string;
}

export type ResolvedTextConfig = Required<TextConfig>;

/** Drawing standard of a dimension layer: number format, terminators and reference scale. */
export type DimensionPreset = 'architecture' | 'surveying' | 'landscape';

/** Mark at the ends of the dimension line. */
export type DimensionTerminator = 'tick' | 'arrow' | 'dot' | 'none';

/** Unit of angular dimensions: degrees or gon (400 per full circle, surveying). */
export type DimensionAngleUnit = 'deg' | 'gon';

/** How a dimension layer draws its dimensions. Sizes are paper millimetres at `referenceScale`. */
export interface DimensionConfig {
  /**
   * Drawing standard: `'architecture'` (DIN 1356-1: cm below 1 m, mm as superscript, ticks),
   * `'surveying'` (m with cm, arrows) or `'landscape'` (m with cm, dots). Default `'surveying'`.
   */
  preset?: DimensionPreset;
  /** Plan scale denominator the paper sizes refer to. Default per preset: 100, 500 or 250. */
  referenceScale?: number;
  /** Text height in paper millimetres. Default `2.5`. */
  textSize?: number;
  /** End mark of the dimension line. Default per preset: `'tick'`, `'arrow'` or `'dot'`. */
  terminator?: DimensionTerminator;
  /** Largest difference between field and GIS value in metres before a dimension deviates. Default `0.05`. */
  tolerance?: number;
  /** How a value without a field measurement is shown: `'plain'` (told apart by `computedColor`) or in `'brackets'`. Default `'plain'`. */
  showComputed?: 'brackets' | 'plain';
  /** Line colour, and text colour of field values. Default `'#111827'`. */
  color?: string;
  /** Text colour of values computed from the map (no field value). Default `'#6b7280'`. */
  computedColor?: string;
  /** Text colour of values whose field value deviates from the GIS value beyond `tolerance`. Default `'#dc2626'`. */
  deviationColor?: string;
  /** CSS font family. Default `'sans-serif'`. */
  font?: string;
  /** Unit in which angles are shown and typed. Default per preset: `'gon'` for surveying, else `'deg'`. */
  angleUnit?: DimensionAngleUnit;
  /** Largest difference between field and GIS angle, in `angleUnit`, before it deviates. Default `0.1`. */
  angleTolerance?: number;
  /**
   * Associative dimensions: when a referenced object changes, the dimension follows it in the
   * same command (one undo step) instead of turning stale. Default `false`.
   */
  associative?: boolean;
}

export type ResolvedDimensionConfig = Required<DimensionConfig>;

/**
 * Configuration object for `createEditor`.
 * Everything in it is plain JSON-compatible data except the escape hatches
 * `target`, `map`, `proj4`, `source.loader` and `editable.predicate`.
 */
export interface EditorConfig {
  /** Element or element id to create the map in. Exactly one of `target` and `map` is required. */
  target?: string | HTMLElement;
  /** Existing OpenLayers map to attach to. Exactly one of `target` and `map` is required. */
  map?: Map;
  /** Initial view. When attaching to an existing map, omitting `view` keeps the host's view. */
  view?: ViewConfig;
  /** proj4 definitions to register. Requires `proj4` (or a global `proj4`). */
  projections?: ProjectionConfig[];
  /** The proj4 library, needed when `projections` is set. Falls back to `globalThis.proj4`. */
  proj4?: Proj4Instance;
  /** Background maps. Switchable at runtime through `editor.basemaps`. */
  basemaps?: BasemapConfig[];
  /** Vector layers. Changeable at runtime through `editor.layers`. */
  layers?: LayerConfig[];
  /** Raster overlays between the basemap and the vector layers. Changeable at runtime through `editor.overlays`. */
  overlays?: OverlayConfig[];
  /** Groups the layer list shows layers and overlays under (`layers[].group`, `overlays[].group`). */
  groups?: GroupConfig[];
  /** Start in edit mode. Switchable at runtime with `editor.setEditMode`. Default `false`. */
  editMode?: boolean;
  /** Edit-mode cursor: CAD crosshair with a pick box. */
  cursor?: CursorConfig;
  /** Change set export options. */
  changes?: ChangesConfig;
  /** Language of validation messages. Default `'en'`. */
  locale?: 'en' | 'de';
  /** Host overrides for validation messages by code, `{param}` placeholders allowed. */
  messages?: Record<string, string>;
  /** Highlight style of selected features. */
  selection?: SelectionConfig;
  /** Style of highlighted layers (`editor.layers.setHighlighted`). */
  layerHighlight?: LayerHighlightConfig;
  /** Snapping of the pointer to existing geometry. */
  snapping?: SnappingConfig;
  /** Snapping of the pointer to a grid aligned with the view projection. */
  grid?: GridConfig;
  /** Linearization of arcs and circles. */
  curves?: CurvesConfig;
  /** Length units for typed input and displayed lengths and areas. */
  units?: UnitsConfig;
  /** Drawing constraints. */
  constraints?: ConstraintsConfig;
  /** The draft layer: target of inserts while no layer is active. */
  draft?: DraftConfig;
}

/**
 * A group of layers and overlays, listed together and switched on and off together. Members name
 * it in `layers[].group` / `overlays[].group`; declaring it sets its title, order and start state.
 */
export interface GroupConfig {
  /** Unique identifier, named by the members' `group`. */
  id: string;
  /** Human readable name. Defaults to `id`. */
  title?: string;
  /** The layer list starts with the group closed. Default `false`. */
  collapsed?: boolean;
}

export type ResolvedGroupConfig = Required<GroupConfig>;

/**
 * The draft layer takes new objects while no layer is active. It accepts every geometry type,
 * has no attribute schema and is local: its features are never part of the change set and
 * `accept` / `discard` leave them alone.
 */
export interface DraftConfig {
  /** Create the draft layer. Default `true`. */
  enabled?: boolean;
  /** Layer id; must not collide with `layers[].id`. Default `'draft'`. */
  id?: string;
  /** Human readable name. Default `'Draft'`. */
  title?: string;
  /** OpenLayers flat style. Default: amber circles, dashed strokes and a light fill. */
  style?: FlatStyleLike;
}

export type ResolvedDraftConfig = Required<Omit<DraftConfig, 'style'>> & Pick<DraftConfig, 'style'>;

export type SnapMode = 'vertex' | 'midpoint' | 'perpendicular' | 'tangent';

export interface SnappingConfig {
  /** Whether snapping is on. Default `true`. Toggle at runtime with `editor.snapping.setEnabled`. */
  enabled?: boolean;
  /** Snap radius in CSS pixels. Default `12`. */
  tolerancePx?: number;
  /** Active snap modes. Default `['vertex', 'midpoint', 'perpendicular']`. */
  modes?: SnapMode[];
}

export type ResolvedSnappingConfig = Required<SnappingConfig>;

export interface GridConfig {
  /** Whether grid snap is on. Default `false`. Toggle at runtime with `editor.grid.setEnabled`. */
  enabled?: boolean;
  /** Distance between grid lines in view-projection units (metres in a projected CRS). Default `10`. */
  spacing?: number;
  /** A grid intersection, in view-projection units. Default `[0, 0]`. */
  origin?: [number, number];
  /** Draw the grid intersections as dots while edit mode is on. Default `true`. */
  visible?: boolean;
}

export type ResolvedGridConfig = Required<GridConfig>;

export interface CurvesConfig {
  /**
   * Largest distance in metres between a stored chord and the true arc when circles and arcs
   * are linearized, measured at the shape's centre. Default `0.01`.
   */
  tolerance?: number;
}

export type ResolvedCurvesConfig = Required<CurvesConfig>;

export interface UnitsConfig {
  /**
   * Default length unit: lengths typed without a unit are in it, lengths and areas are shown
   * in its system. `'auto'` takes the unit of the view projection (`m`, `ft` or `us-ft`;
   * metres for geographic CRS). Default `'auto'`. Change at runtime with `editor.units.setLength`.
   */
  length?: 'auto' | LengthUnit;
}

export type ResolvedUnitsConfig = Required<UnitsConfig>;

export interface AngleConstraintConfig {
  /** Whether the angle lock is on. Default `false`. Toggle at runtime with `editor.constraints.setAngleLocked`. */
  enabled?: boolean;
  /** Allowed directions are multiples of this step in degrees from the straightedge angle. Default `90`. */
  step?: number;
}

export interface ConstraintsConfig {
  /** Angle lock while drawing lines and polygons. */
  angle?: AngleConstraintConfig;
}

export interface ResolvedConstraintsConfig {
  angle: Required<AngleConstraintConfig>;
}

/**
 * The highlight drawn over selected features on a layer above everything else: a halo under
 * the main stroke, a light fill, square grips on every vertex and a ringed circle for points.
 * The feature's own style stays untouched.
 */
export interface SelectionConfig {
  /** Stroke colour of selected features. Default `'#22d3ee'`. */
  strokeColor?: string;
  /** Stroke width in pixels. Default `3`. */
  strokeWidth?: number;
  /** Fill colour of selected polygons and points. Default `'rgba(34, 211, 238, 0.15)'`. */
  fillColor?: string;
  /** Radius in pixels of selected points. Default `8`. */
  pointRadius?: number;
  /** Colour of the halo around the stroke and the point ring. Default `'rgba(255, 255, 255, 0.6)'`. */
  haloColor?: string;
  /** Width of the halo in pixels on each side of the stroke; `0` draws none. Default `3`. */
  haloWidth?: number;
  /** Side length in pixels of the square grips on every vertex; `0` draws none. Default `6`. */
  vertexSize?: number;
  /**
   * Clicking a feature while edit mode is off selects it (Shift+click toggles, a click on empty
   * map clears), so its attributes can be viewed without a tool. Default `true`.
   */
  inspect?: boolean;
}

export type ResolvedSelectionConfig = Required<SelectionConfig>;

/**
 * The style of a highlighted layer (`editor.layers.setHighlighted`): every object of the layer
 * drawn on an overlay above the editor layers and below the selection, in a colour distinct
 * from the selection. The objects keep their own style underneath.
 */
export interface LayerHighlightConfig {
  /** Stroke colour of highlighted objects. Default `'#f59e0b'`. */
  strokeColor?: string;
  /** Stroke width in pixels. Default `3`. */
  strokeWidth?: number;
  /** Fill colour of highlighted polygons and points. Default `'rgba(245, 158, 11, 0.2)'`. */
  fillColor?: string;
  /** Radius in pixels of highlighted points. Default `7`. */
  pointRadius?: number;
}

export type ResolvedLayerHighlightConfig = Required<LayerHighlightConfig>;

export interface ChangesConfig {
  /** Force one output CRS for every change. Default: each layer's data projection. */
  crs?: string;
  /** Decimal places for exported coordinates. Default: full precision. */
  precision?: number;
  /** Export complete geometry and properties on updates instead of changed parts only. Default `false`. */
  fullFeatures?: boolean;
}

export interface CursorConfig {
  /** Show the crosshair overlay in edit mode and hide the native cursor over the map. Default `true`. */
  crosshair?: boolean;
  /** Side length of the pick box at the crosshair centre, in CSS pixels. Default `8`. */
  pickBoxSize?: number;
  /** CSS colour of the crosshair lines and pick box. Default `'#1f2933'`. */
  color?: string;
  /** Pick box colour while a reference geometry is being picked. Default `'#facc15'`. */
  pickColor?: string;
  /** Initial straightedge angle in degrees, counter-clockwise from the screen x-axis. Default `0`. */
  angle?: number;
}

export type ResolvedBasemapConfig = BasemapConfig & { title: string; visible: boolean };

export type ResolvedOverlayConfig = OverlayConfig & {
  title: string;
  visible: boolean;
  opacity: number;
  queryable: boolean;
};

export interface ResolvedEditableConfig {
  insert: boolean;
  update: boolean;
  delete: boolean;
  predicate?: EditableConfig['predicate'];
}

export type ResolvedLayerConfig = Omit<
  LayerConfig,
  'title' | 'visible' | 'editable' | 'snappable' | 'text' | 'dimension'
> & {
  title: string;
  visible: boolean;
  editable: ResolvedEditableConfig;
  snappable: boolean;
  source: VectorSourceConfig & { strategy: 'all' | 'bbox' };
  /** Present for text layers only. */
  text?: ResolvedTextConfig;
  /** Present for dimension layers only. */
  dimension?: ResolvedDimensionConfig;
};

/** `EditorConfig` after validation and defaults, as exposed on `editor.config`. */
export interface ResolvedEditorConfig {
  target?: string | HTMLElement;
  map?: Map;
  view: Required<Pick<ViewConfig, 'projection' | 'center' | 'zoom'>> &
    Omit<ViewConfig, 'projection' | 'center' | 'zoom'>;
  projections: ProjectionConfig[];
  proj4?: Proj4Instance;
  basemaps: ResolvedBasemapConfig[];
  layers: ResolvedLayerConfig[];
  overlays: ResolvedOverlayConfig[];
  groups: ResolvedGroupConfig[];
  editMode: boolean;
  cursor: Required<CursorConfig>;
  changes: ResolvedChangesConfig;
  locale: 'en' | 'de';
  messages: Record<string, string>;
  selection: ResolvedSelectionConfig;
  layerHighlight: ResolvedLayerHighlightConfig;
  snapping: ResolvedSnappingConfig;
  grid: ResolvedGridConfig;
  curves: ResolvedCurvesConfig;
  units: ResolvedUnitsConfig;
  constraints: ResolvedConstraintsConfig;
  draft: ResolvedDraftConfig;
}

export interface ResolvedChangesConfig {
  crs?: string;
  precision?: number;
  fullFeatures: boolean;
}
