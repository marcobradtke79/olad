import { get as getProjection } from 'ol/proj';
import type {
  BasemapConfig,
  DiscoverConfig,
  EditorConfig,
  LayerConfig,
  OverlayConfig,
} from './types';
import { isLengthUnit, LENGTH_UNITS } from '../units';

/** Thrown by `createEditor` when the configuration is invalid. `path` names the offending option. */
export class ConfigError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`Invalid config at ${path}: ${message}`);
    this.name = 'ConfigError';
    this.path = path;
  }
}

type Checker = (value: unknown, path: string) => void;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNumberTuple = (v: unknown, length: number): boolean =>
  Array.isArray(v) &&
  v.length === length &&
  v.every((n) => typeof n === 'number' && Number.isFinite(n));

function checkKeys(value: Record<string, unknown>, path: string, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new ConfigError(`${path}.${key}`, `unknown option. Allowed: ${allowed.join(', ')}`);
    }
  }
}

function optional(check: Checker): Checker {
  return (value, path) => {
    if (value !== undefined) check(value, path);
  };
}

const string: Checker = (v, p) => {
  if (typeof v !== 'string' || v.length === 0)
    throw new ConfigError(p, 'expected a non-empty string');
};
const number: Checker = (v, p) => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new ConfigError(p, 'expected a finite number');
};
const boolean: Checker = (v, p) => {
  if (typeof v !== 'boolean') throw new ConfigError(p, 'expected a boolean');
};
const func: Checker = (v, p) => {
  if (typeof v !== 'function') throw new ConfigError(p, 'expected a function');
};
const object: Checker = (v, p) => {
  if (!isObject(v)) throw new ConfigError(p, 'expected an object');
};
const oneOf =
  (values: readonly unknown[]): Checker =>
  (v, p) => {
    if (!values.includes(v)) throw new ConfigError(p, `expected one of ${values.join(', ')}`);
  };
const arrayOf =
  (check: Checker): Checker =>
  (v, p) => {
    if (!Array.isArray(v)) throw new ConfigError(p, 'expected an array');
    v.forEach((item, i) => check(item, `${p}[${i}]`));
  };
const nullableString: Checker = (v, p) => {
  if (v !== null && typeof v !== 'string') throw new ConfigError(p, 'expected a string or null');
};
const styleLike: Checker = (v, p) => {
  if (!isObject(v) && !(Array.isArray(v) && v.every(isObject))) {
    throw new ConfigError(p, 'expected a flat style object or an array of them');
  }
};

/** Projection codes declared in `config.projections` count as known before proj4 registers them. */
type Context = { declaredProjections: Set<string> };

function checkProjectionCode(ctx: Context): Checker {
  return (v, p) => {
    string(v, p);
    if (!ctx.declaredProjections.has(v as string) && !getProjection(v as string)) {
      throw new ConfigError(
        p,
        `unknown projection "${v}". Declare it under "projections" or use EPSG:3857 / EPSG:4326`,
      );
    }
  };
}

// ---------------------------------------------------------------------------
// view

const VIEW_KEYS = [
  'projection',
  'center',
  'zoom',
  'minZoom',
  'maxZoom',
  'rotation',
  'extent',
  'centerProjection',
  'fit',
] as const;
const FIT_KEYS = ['extent', 'projection', 'layers', 'padding', 'maxZoom'] as const;

function checkFit(fit: unknown, path: string, ctx: Context): void {
  object(fit, path);
  const f = fit as Record<string, unknown>;
  checkKeys(f, path, FIT_KEYS);
  if ((f.extent === undefined) === (f.layers === undefined)) {
    throw new ConfigError(path, 'exactly one of "extent" or "layers" is required');
  }
  if (f.extent !== undefined && !isNumberTuple(f.extent, 4)) {
    throw new ConfigError(`${path}.extent`, 'expected [minX, minY, maxX, maxY]');
  }
  optional(checkProjectionCode(ctx))(f.projection, `${path}.projection`);
  if (f.layers !== undefined && f.layers !== true) {
    arrayOf(string)(f.layers, `${path}.layers`);
  }
  if (f.padding !== undefined && !isNumberTuple(f.padding, 4)) {
    throw new ConfigError(`${path}.padding`, 'expected [top, right, bottom, left]');
  }
  optional(number)(f.maxZoom, `${path}.maxZoom`);
}

/** `extent` (four finite numbers) and `extentProjection` of a layer or overlay. */
function checkExtentFields(o: Record<string, unknown>, path: string, ctx: Context): void {
  if (o.extent !== undefined && !isNumberTuple(o.extent, 4)) {
    throw new ConfigError(`${path}.extent`, 'expected [minX, minY, maxX, maxY]');
  }
  optional(checkProjectionCode(ctx))(o.extentProjection, `${path}.extentProjection`);
}

function checkView(view: unknown, path: string, ctx: Context): void {
  object(view, path);
  const v = view as Record<string, unknown>;
  checkKeys(v, path, VIEW_KEYS);
  optional(checkProjectionCode(ctx))(v.projection, `${path}.projection`);
  if (v.center !== undefined && !isNumberTuple(v.center, 2)) {
    throw new ConfigError(`${path}.center`, 'expected [x, y]');
  }
  if (v.extent !== undefined && !isNumberTuple(v.extent, 4)) {
    throw new ConfigError(`${path}.extent`, 'expected [minX, minY, maxX, maxY]');
  }
  optional(number)(v.zoom, `${path}.zoom`);
  optional(number)(v.minZoom, `${path}.minZoom`);
  optional(number)(v.maxZoom, `${path}.maxZoom`);
  optional(number)(v.rotation, `${path}.rotation`);
  if (typeof v.minZoom === 'number' && typeof v.maxZoom === 'number' && v.minZoom > v.maxZoom) {
    throw new ConfigError(`${path}.minZoom`, 'must not be greater than maxZoom');
  }
  optional(checkProjectionCode(ctx))(v.centerProjection, `${path}.centerProjection`);
  if (v.fit !== undefined) checkFit(v.fit, `${path}.fit`, ctx);
}

// ---------------------------------------------------------------------------
// projections

const PROJECTION_KEYS = ['code', 'def', 'title'] as const;

function checkProjection(projection: unknown, path: string): void {
  object(projection, path);
  const p = projection as Record<string, unknown>;
  checkKeys(p, path, PROJECTION_KEYS);
  string(p.code, `${path}.code`);
  string(p.def, `${path}.def`);
  if (p.title !== undefined) string(p.title, `${path}.title`);
}

// ---------------------------------------------------------------------------
// basemaps and overlays

const FETCH_KEYS = ['credentials', 'headers'] as const;

function checkFetch(value: unknown, path: string): void {
  object(value, path);
  const f = value as Record<string, unknown>;
  checkKeys(f, path, FETCH_KEYS);
  optional(oneOf(['include', 'same-origin', 'omit']))(f.credentials, `${path}.credentials`);
  if (f.headers !== undefined) {
    object(f.headers, `${path}.headers`);
    for (const [key, header] of Object.entries(f.headers as Record<string, unknown>)) {
      if (typeof header !== 'string') {
        throw new ConfigError(`${path}.headers.${key}`, 'expected a string');
      }
    }
  }
}

const BASEMAP_COMMON_KEYS = ['id', 'type', 'title', 'visible', 'attribution', 'fetch'] as const;
const OVERLAY_COMMON_KEYS = [
  'id',
  'type',
  'title',
  'visible',
  'attribution',
  'opacity',
  'minZoom',
  'maxZoom',
  'legendUrl',
  'extent',
  'extentProjection',
  'fetch',
  'queryable',
  'infoFormat',
  'group',
] as const;
const BASEMAP_TYPES = ['osm', 'xyz', 'wms', 'wmts', 'vector-tile', 'geotiff'] as const;
const OVERLAY_TYPES = ['xyz', 'wms', 'wmts', 'vector-tile', 'geotiff'] as const;
/**
 * Names of the tile grid's zoom range: `minZoom` / `maxZoom` on basemaps, `sourceMinZoom` /
 * `sourceMaxZoom` on overlays (whose `minZoom` / `maxZoom` are the display range, like layers).
 */
type ZoomKeys = readonly [min: string, max: string];
const BASEMAP_ZOOM_KEYS: ZoomKeys = ['minZoom', 'maxZoom'];
const OVERLAY_ZOOM_KEYS: ZoomKeys = ['sourceMinZoom', 'sourceMaxZoom'];

/** The source options of one raster type, or `undefined` for an unknown type. */
function rasterSourceKeys(type: string, zoom: ZoomKeys): readonly string[] | undefined {
  switch (type) {
    case 'osm':
      return [zoom[1]];
    case 'xyz':
      return ['url', zoom[0], zoom[1], 'tileSize', 'crossOrigin'];
    case 'wms':
      return ['url', 'params', 'tiled', 'serverType', 'projection', 'crossOrigin'];
    case 'wmts':
      return ['capabilitiesUrl', 'layer', 'matrixSet', 'format', 'style', 'crossOrigin'];
    case 'vector-tile':
      return ['url', 'format', zoom[0], zoom[1], 'projection', 'style'];
    case 'geotiff':
      return ['sources', 'normalize', 'convertToRGB'];
    default:
      return undefined;
  }
}
const GEOTIFF_SOURCE_KEYS = ['url', 'bands', 'min', 'max', 'nodata'] as const;

function checkGeoTiffSource(source: unknown, path: string): void {
  object(source, path);
  const s = source as Record<string, unknown>;
  checkKeys(s, path, GEOTIFF_SOURCE_KEYS);
  string(s.url, `${path}.url`);
  optional(arrayOf(number))(s.bands, `${path}.bands`);
  optional(number)(s.min, `${path}.min`);
  optional(number)(s.max, `${path}.max`);
  optional(number)(s.nodata, `${path}.nodata`);
}

/** The source options basemaps and overlays of raster `type` share (keys already checked). */
function checkRasterSource(
  r: Record<string, unknown>,
  path: string,
  ctx: Context,
  type: string,
  zoom: ZoomKeys,
): void {
  optional(number)(r[zoom[0]], `${path}.${zoom[0]}`);
  optional(number)(r[zoom[1]], `${path}.${zoom[1]}`);
  optional(nullableString)(r.crossOrigin, `${path}.crossOrigin`);
  optional(checkProjectionCode(ctx))(r.projection, `${path}.projection`);
  switch (type) {
    case 'xyz':
      string(r.url, `${path}.url`);
      optional(number)(r.tileSize, `${path}.tileSize`);
      break;
    case 'wms': {
      string(r.url, `${path}.url`);
      object(r.params, `${path}.params`);
      const params = r.params as Record<string, unknown>;
      for (const [key, value] of Object.entries(params)) {
        if (!['string', 'number', 'boolean'].includes(typeof value)) {
          throw new ConfigError(`${path}.params.${key}`, 'expected a string, number or boolean');
        }
      }
      if (!Object.keys(params).some((k) => k.toUpperCase() === 'LAYERS')) {
        throw new ConfigError(`${path}.params`, 'LAYERS is required');
      }
      optional(boolean)(r.tiled, `${path}.tiled`);
      optional(oneOf(['mapserver', 'geoserver', 'qgis', 'carmentaserver']))(
        r.serverType,
        `${path}.serverType`,
      );
      break;
    }
    case 'wmts':
      string(r.capabilitiesUrl, `${path}.capabilitiesUrl`);
      string(r.layer, `${path}.layer`);
      optional(string)(r.matrixSet, `${path}.matrixSet`);
      optional(string)(r.format, `${path}.format`);
      optional(string)(r.style, `${path}.style`);
      break;
    case 'vector-tile':
      string(r.url, `${path}.url`);
      optional(oneOf(['mvt', 'geojson', 'topojson']))(r.format, `${path}.format`);
      optional(styleLike)(r.style, `${path}.style`);
      break;
    case 'geotiff':
      arrayOf(checkGeoTiffSource)(r.sources, `${path}.sources`);
      if ((r.sources as unknown[]).length === 0) {
        throw new ConfigError(`${path}.sources`, 'at least one source is required');
      }
      optional(boolean)(r.normalize, `${path}.normalize`);
      if (
        r.convertToRGB !== undefined &&
        typeof r.convertToRGB !== 'boolean' &&
        r.convertToRGB !== 'auto'
      ) {
        throw new ConfigError(`${path}.convertToRGB`, "expected a boolean or 'auto'");
      }
      break;
  }
}

function checkBasemap(basemap: unknown, path: string, ctx: Context): void {
  object(basemap, path);
  const b = basemap as Record<string, unknown>;
  string(b.id, `${path}.id`);
  const type = typeof b.type === 'string' ? b.type : '';
  const sourceKeys = (BASEMAP_TYPES as readonly string[]).includes(type)
    ? rasterSourceKeys(type, BASEMAP_ZOOM_KEYS)
    : undefined;
  if (!sourceKeys) {
    throw new ConfigError(`${path}.type`, `expected one of ${BASEMAP_TYPES.join(', ')}`);
  }
  checkKeys(b, path, [...BASEMAP_COMMON_KEYS, ...sourceKeys]);
  optional(string)(b.title, `${path}.title`);
  optional(boolean)(b.visible, `${path}.visible`);
  optional(string)(b.attribution, `${path}.attribution`);
  optional(checkFetch)(b.fetch, `${path}.fetch`);
  checkRasterSource(b, path, ctx, type, BASEMAP_ZOOM_KEYS);
}

const unitInterval: Checker = (v, p) => {
  number(v, p);
  if ((v as number) < 0 || (v as number) > 1)
    throw new ConfigError(p, 'expected a number from 0 to 1');
};

function checkOverlay(overlay: unknown, path: string, ctx: Context): void {
  object(overlay, path);
  const o = overlay as Record<string, unknown>;
  string(o.id, `${path}.id`);
  const type = typeof o.type === 'string' ? o.type : '';
  const sourceKeys = (OVERLAY_TYPES as readonly string[]).includes(type)
    ? rasterSourceKeys(type, OVERLAY_ZOOM_KEYS)
    : undefined;
  if (!sourceKeys) {
    throw new ConfigError(`${path}.type`, `expected one of ${OVERLAY_TYPES.join(', ')}`);
  }
  checkKeys(o, path, [...OVERLAY_COMMON_KEYS, ...sourceKeys]);
  optional(string)(o.title, `${path}.title`);
  optional(boolean)(o.visible, `${path}.visible`);
  optional(string)(o.attribution, `${path}.attribution`);
  optional(unitInterval)(o.opacity, `${path}.opacity`);
  optional(number)(o.minZoom, `${path}.minZoom`);
  optional(number)(o.maxZoom, `${path}.maxZoom`);
  if (typeof o.minZoom === 'number' && typeof o.maxZoom === 'number' && o.minZoom > o.maxZoom) {
    throw new ConfigError(`${path}.maxZoom`, 'must not be less than minZoom');
  }
  optional(string)(o.legendUrl, `${path}.legendUrl`);
  checkExtentFields(o, path, ctx);
  optional(checkFetch)(o.fetch, `${path}.fetch`);
  optional(boolean)(o.queryable, `${path}.queryable`);
  optional(string)(o.infoFormat, `${path}.infoFormat`);
  optional(groupId)(o.group, `${path}.group`);
  checkRasterSource(o, path, ctx, type, OVERLAY_ZOOM_KEYS);
}

// ---------------------------------------------------------------------------
// layers

const GEOMETRY_TYPES = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'Any',
] as const;
const VECTOR_FORMATS = ['geojson', 'topojson', 'kml', 'gpx', 'wkt', 'gml', 'wfs'] as const;
const SOURCE_KEYS = [
  'format',
  'url',
  'data',
  'features',
  'loader',
  'dataProjection',
  'strategy',
  'gmlVersion',
  'typeName',
  'version',
  'outputFormat',
  'params',
  'fetch',
  'pageSize',
] as const;
const EDITABLE_KEYS = ['insert', 'update', 'delete', 'predicate'] as const;
const FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'enum', 'date'] as const;
const FIELD_KEYS = [
  'name',
  'type',
  'label',
  'required',
  'readOnly',
  'default',
  'values',
  'min',
  'max',
  'pattern',
] as const;
const SCHEMA_KEYS = ['fields'] as const;
const LAYER_KEYS = [
  'id',
  'title',
  'visible',
  'source',
  'geometryType',
  'idProperty',
  'editable',
  'snappable',
  'style',
  'schema',
  'minZoom',
  'maxZoom',
  'opacity',
  'attribution',
  'extent',
  'extentProjection',
  'legendUrl',
  'group',
  'text',
  'dimension',
] as const;

const TEXT_KEYS = [
  'property',
  'heightProperty',
  'rotationProperty',
  'height',
  'color',
  'haloColor',
  'font',
] as const;
const TEXT_GEOMETRY_TYPES = ['Point', 'MultiPoint', 'Any'];

function checkText(text: unknown, path: string): void {
  if (typeof text === 'boolean') return;
  object(text, path);
  const t = text as Record<string, unknown>;
  checkKeys(t, path, TEXT_KEYS);
  for (const key of [
    'property',
    'heightProperty',
    'rotationProperty',
    'color',
    'haloColor',
    'font',
  ]) {
    optional(string)(t[key], `${path}.${key}`);
  }
  if (t.height !== undefined) {
    number(t.height, `${path}.height`);
    if (!((t.height as number) > 0))
      throw new ConfigError(`${path}.height`, 'must be greater than 0');
  }
}

const DIMENSION_KEYS = [
  'preset',
  'referenceScale',
  'textSize',
  'terminator',
  'tolerance',
  'showComputed',
  'color',
  'computedColor',
  'deviationColor',
  'font',
  'angleUnit',
  'angleTolerance',
  'associative',
] as const;
const DIMENSION_GEOMETRY_TYPES = ['LineString', 'Any'];

function checkDimension(dimension: unknown, path: string): void {
  if (typeof dimension === 'boolean') return;
  object(dimension, path);
  const d = dimension as Record<string, unknown>;
  checkKeys(d, path, DIMENSION_KEYS);
  optional(oneOf(['architecture', 'surveying', 'landscape']))(d.preset, `${path}.preset`);
  optional(oneOf(['tick', 'arrow', 'dot', 'none']))(d.terminator, `${path}.terminator`);
  optional(oneOf(['brackets', 'plain']))(d.showComputed, `${path}.showComputed`);
  optional(oneOf(['deg', 'gon']))(d.angleUnit, `${path}.angleUnit`);
  optional(boolean)(d.associative, `${path}.associative`);
  for (const key of ['color', 'computedColor', 'deviationColor', 'font']) {
    optional(string)(d[key], `${path}.${key}`);
  }
  for (const key of ['referenceScale', 'textSize']) {
    if (d[key] === undefined) continue;
    number(d[key], `${path}.${key}`);
    if (!((d[key] as number) > 0))
      throw new ConfigError(`${path}.${key}`, 'must be greater than 0');
  }
  for (const key of ['tolerance', 'angleTolerance']) {
    if (d[key] === undefined) continue;
    number(d[key], `${path}.${key}`);
    if (!((d[key] as number) >= 0)) throw new ConfigError(`${path}.${key}`, 'must not be negative');
  }
}

function checkSource(source: unknown, path: string, ctx: Context): void {
  object(source, path);
  const s = source as Record<string, unknown>;
  checkKeys(s, path, SOURCE_KEYS);
  optional(oneOf(VECTOR_FORMATS))(s.format, `${path}.format`);
  const inputs = ['url', 'data', 'features', 'loader'].filter((k) => s[k] !== undefined);
  if (inputs.length !== 1) {
    throw new ConfigError(path, 'exactly one of url, data, features or loader is required');
  }
  if (s.format === undefined && s.features === undefined) {
    throw new ConfigError(`${path}.format`, 'required unless "features" is given');
  }
  if (s.features !== undefined && s.format !== undefined && s.format !== 'geojson') {
    throw new ConfigError(
      `${path}.format`,
      '"features" are GeoJSON; format must be geojson or omitted',
    );
  }
  optional(string)(s.url, `${path}.url`);
  if (s.data !== undefined && typeof s.data !== 'string' && !isObject(s.data)) {
    throw new ConfigError(`${path}.data`, 'expected a string or an object');
  }
  optional(arrayOf(object))(s.features, `${path}.features`);
  optional(func)(s.loader, `${path}.loader`);
  optional(checkProjectionCode(ctx))(s.dataProjection, `${path}.dataProjection`);
  optional(oneOf(['all', 'bbox']))(s.strategy, `${path}.strategy`);
  optional(oneOf(['2', '3', '3.2']))(s.gmlVersion, `${path}.gmlVersion`);
  optional(string)(s.typeName, `${path}.typeName`);
  optional(oneOf(['1.0.0', '1.1.0', '2.0.0']))(s.version, `${path}.version`);
  optional(string)(s.outputFormat, `${path}.outputFormat`);
  if (s.format === 'wfs') {
    if (s.url === undefined && s.loader === undefined) {
      throw new ConfigError(`${path}.url`, 'required for format wfs');
    }
    string(s.typeName, `${path}.typeName`);
  }
  if (s.params !== undefined) {
    if (s.format !== 'wfs') throw new ConfigError(`${path}.params`, 'needs format wfs');
    object(s.params, `${path}.params`);
    for (const [key, value] of Object.entries(s.params as Record<string, unknown>)) {
      if (!['string', 'number', 'boolean'].includes(typeof value)) {
        throw new ConfigError(`${path}.params.${key}`, 'expected a string, number or boolean');
      }
    }
  }
  optional(checkFetch)(s.fetch, `${path}.fetch`);
  if (s.pageSize !== undefined) {
    if (!Number.isInteger(s.pageSize) || (s.pageSize as number) < 1) {
      throw new ConfigError(`${path}.pageSize`, 'expected a positive integer');
    }
    if (s.format !== 'wfs' || s.version !== '2.0.0') {
      throw new ConfigError(`${path}.pageSize`, 'needs format wfs and version 2.0.0');
    }
  }
}

function checkEditable(editable: unknown, path: string): void {
  if (typeof editable === 'boolean') return;
  object(editable, path);
  const e = editable as Record<string, unknown>;
  checkKeys(e, path, EDITABLE_KEYS);
  optional(boolean)(e.insert, `${path}.insert`);
  optional(boolean)(e.update, `${path}.update`);
  optional(boolean)(e.delete, `${path}.delete`);
  optional(func)(e.predicate, `${path}.predicate`);
}

function checkField(field: unknown, path: string, seen: Set<string>): void {
  object(field, path);
  const f = field as Record<string, unknown>;
  checkKeys(f, path, FIELD_KEYS);
  string(f.name, `${path}.name`);
  if (seen.has(f.name as string))
    throw new ConfigError(`${path}.name`, `duplicate field "${f.name}"`);
  seen.add(f.name as string);
  oneOf(FIELD_TYPES)(f.type, `${path}.type`);
  optional(string)(f.label, `${path}.label`);
  optional(boolean)(f.required, `${path}.required`);
  optional(boolean)(f.readOnly, `${path}.readOnly`);
  if (
    f.default !== undefined &&
    f.default !== null &&
    !['string', 'number', 'boolean'].includes(typeof f.default)
  ) {
    throw new ConfigError(`${path}.default`, 'expected a string, number, boolean or null');
  }
  if (f.type === 'enum') {
    if (!Array.isArray(f.values) || f.values.length === 0) {
      throw new ConfigError(`${path}.values`, 'required for type enum');
    }
    f.values.forEach((v, i) => {
      if (typeof v !== 'string' && typeof v !== 'number') {
        throw new ConfigError(`${path}.values[${i}]`, 'expected a string or number');
      }
    });
  } else if (f.values !== undefined) {
    throw new ConfigError(`${path}.values`, 'only allowed for type enum');
  }
  optional(number)(f.min, `${path}.min`);
  optional(number)(f.max, `${path}.max`);
  if (typeof f.min === 'number' && typeof f.max === 'number' && f.min > f.max) {
    throw new ConfigError(`${path}.min`, 'must not be greater than max');
  }
  if (f.pattern !== undefined) {
    string(f.pattern, `${path}.pattern`);
    try {
      new RegExp(f.pattern as string);
    } catch {
      throw new ConfigError(`${path}.pattern`, 'not a valid regular expression');
    }
  }
}

function checkSchema(schema: unknown, path: string): void {
  object(schema, path);
  const s = schema as Record<string, unknown>;
  checkKeys(s, path, SCHEMA_KEYS);
  if (!Array.isArray(s.fields)) throw new ConfigError(`${path}.fields`, 'expected an array');
  const seen = new Set<string>();
  s.fields.forEach((f, i) => checkField(f, `${path}.fields[${i}]`, seen));
}

function checkLayer(layer: unknown, path: string, ctx: Context): void {
  object(layer, path);
  const l = layer as Record<string, unknown>;
  checkKeys(l, path, LAYER_KEYS);
  string(l.id, `${path}.id`);
  optional(string)(l.title, `${path}.title`);
  optional(boolean)(l.visible, `${path}.visible`);
  checkSource(l.source, `${path}.source`, ctx);
  oneOf(GEOMETRY_TYPES)(l.geometryType, `${path}.geometryType`);
  optional(string)(l.idProperty, `${path}.idProperty`);
  optional(checkEditable)(l.editable, `${path}.editable`);
  optional(boolean)(l.snappable, `${path}.snappable`);
  optional(styleLike)(l.style, `${path}.style`);
  optional(checkSchema)(l.schema, `${path}.schema`);
  optional(number)(l.minZoom, `${path}.minZoom`);
  optional(number)(l.maxZoom, `${path}.maxZoom`);
  optional(unitInterval)(l.opacity, `${path}.opacity`);
  optional(string)(l.attribution, `${path}.attribution`);
  checkExtentFields(l, path, ctx);
  optional(string)(l.legendUrl, `${path}.legendUrl`);
  optional(groupId)(l.group, `${path}.group`);
  optional(checkText)(l.text, `${path}.text`);
  if (
    l.text !== undefined &&
    l.text !== false &&
    !TEXT_GEOMETRY_TYPES.includes(l.geometryType as string)
  ) {
    throw new ConfigError(`${path}.text`, 'needs geometryType Point, MultiPoint or Any');
  }
  optional(checkDimension)(l.dimension, `${path}.dimension`);
  if (l.dimension !== undefined && l.dimension !== false) {
    if (!DIMENSION_GEOMETRY_TYPES.includes(l.geometryType as string)) {
      throw new ConfigError(`${path}.dimension`, 'needs geometryType LineString or Any');
    }
    if (l.text !== undefined && l.text !== false) {
      throw new ConfigError(`${path}.dimension`, 'a layer cannot be a text and a dimension layer');
    }
  }
}

// ---------------------------------------------------------------------------
// groups

const GROUP_KEYS = ['id', 'title', 'collapsed'] as const;

/** A group id: a non-empty string. */
function groupId(value: unknown, path: string): void {
  string(value, path);
  if ((value as string).length === 0) throw new ConfigError(path, 'expected a non-empty string');
}

function checkGroup(group: unknown, path: string): void {
  object(group, path);
  const g = group as Record<string, unknown>;
  checkKeys(g, path, GROUP_KEYS);
  groupId(g.id, `${path}.id`);
  optional(string)(g.title, `${path}.title`);
  optional(boolean)(g.collapsed, `${path}.collapsed`);
}

// ---------------------------------------------------------------------------
// discover

const DISCOVER_COMMON_KEYS = ['type', 'url', 'version', 'include', 'exclude', 'defaults', 'fetch'];
const DISCOVER_KEYS: Record<string, readonly string[]> = {
  wfs: [...DISCOVER_COMMON_KEYS, 'outputFormat'],
  wms: [...DISCOVER_COMMON_KEYS, 'as'],
};
const WFS_DISCOVER_DEFAULT_KEYS = [
  'visible',
  'editable',
  'snappable',
  'style',
  'minZoom',
  'maxZoom',
  'group',
] as const;
const WMS_DISCOVER_DEFAULT_KEYS = [
  'visible',
  'opacity',
  'minZoom',
  'maxZoom',
  'tiled',
  'serverType',
  'crossOrigin',
  'params',
  'attribution',
  'group',
] as const;

function checkDiscover(value: unknown, path: string): void {
  object(value, path);
  const d = value as Record<string, unknown>;
  const type = typeof d.type === 'string' ? d.type : '';
  const keys = DISCOVER_KEYS[type];
  if (!keys) throw new ConfigError(`${path}.type`, `expected one of wfs, wms`);
  checkKeys(d, path, keys);
  string(d.url, `${path}.url`);
  optional(arrayOf(string))(d.include, `${path}.include`);
  optional(arrayOf(string))(d.exclude, `${path}.exclude`);
  optional(checkFetch)(d.fetch, `${path}.fetch`);
  const defaultsPath = `${path}.defaults`;
  if (d.defaults !== undefined) object(d.defaults, defaultsPath);
  const defaults = (d.defaults ?? {}) as Record<string, unknown>;
  optional(boolean)(defaults.visible, `${defaultsPath}.visible`);
  optional(number)(defaults.minZoom, `${defaultsPath}.minZoom`);
  optional(number)(defaults.maxZoom, `${defaultsPath}.maxZoom`);
  optional(groupId)(defaults.group, `${defaultsPath}.group`);
  if (type === 'wfs') {
    optional(oneOf(['1.0.0', '1.1.0', '2.0.0']))(d.version, `${path}.version`);
    optional(string)(d.outputFormat, `${path}.outputFormat`);
    checkKeys(defaults, defaultsPath, WFS_DISCOVER_DEFAULT_KEYS);
    optional(checkEditable)(defaults.editable, `${defaultsPath}.editable`);
    optional(boolean)(defaults.snappable, `${defaultsPath}.snappable`);
    optional(styleLike)(defaults.style, `${defaultsPath}.style`);
  } else {
    optional(oneOf(['1.1.1', '1.3.0']))(d.version, `${path}.version`);
    optional(oneOf(['overlay']))(d.as, `${path}.as`);
    checkKeys(defaults, defaultsPath, WMS_DISCOVER_DEFAULT_KEYS);
    optional(unitInterval)(defaults.opacity, `${defaultsPath}.opacity`);
    optional(boolean)(defaults.tiled, `${defaultsPath}.tiled`);
    optional(oneOf(['mapserver', 'geoserver', 'qgis', 'carmentaserver']))(
      defaults.serverType,
      `${defaultsPath}.serverType`,
    );
    optional(nullableString)(defaults.crossOrigin, `${defaultsPath}.crossOrigin`);
    optional(string)(defaults.attribution, `${defaultsPath}.attribution`);
    if (defaults.params !== undefined) {
      object(defaults.params, `${defaultsPath}.params`);
      for (const [key, v] of Object.entries(defaults.params as Record<string, unknown>)) {
        if (!['string', 'number', 'boolean'].includes(typeof v)) {
          throw new ConfigError(
            `${defaultsPath}.params.${key}`,
            'expected a string, number or boolean',
          );
        }
      }
    }
  }
}

/** Validate one discovery source, for example before `editor.discovery.run`. */
export function validateDiscoverConfig(
  source: unknown,
  path = 'discover',
): asserts source is DiscoverConfig {
  checkDiscover(source, path);
}

// ---------------------------------------------------------------------------
// root

const ROOT_KEYS = [
  'target',
  'map',
  'view',
  'projections',
  'proj4',
  'basemaps',
  'layers',
  'overlays',
  'groups',
  'discover',
  'editMode',
  'cursor',
  'changes',
  'locale',
  'messages',
  'selection',
  'layerHighlight',
  'snapping',
  'grid',
  'curves',
  'units',
  'constraints',
  'draft',
] as const;
const SNAPPING_KEYS = ['enabled', 'tolerancePx', 'modes'] as const;
const SNAP_MODES = ['vertex', 'midpoint', 'perpendicular', 'tangent'] as const;

function checkSnapping(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, SNAPPING_KEYS);
  if (c.enabled !== undefined) boolean(c.enabled, `${path}.enabled`);
  if (c.tolerancePx !== undefined) {
    number(c.tolerancePx, `${path}.tolerancePx`);
    if ((c.tolerancePx as number) <= 0) {
      throw new ConfigError(`${path}.tolerancePx`, 'expected a positive number');
    }
  }
  if (c.modes !== undefined) {
    arrayOf(oneOf([...SNAP_MODES]))(c.modes, `${path}.modes`);
    if ((c.modes as unknown[]).length === 0) {
      throw new ConfigError(`${path}.modes`, 'expected at least one snap mode');
    }
  }
}
const GRID_KEYS = ['enabled', 'spacing', 'origin', 'visible'] as const;

function checkGrid(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, GRID_KEYS);
  if (c.enabled !== undefined) boolean(c.enabled, `${path}.enabled`);
  if (c.visible !== undefined) boolean(c.visible, `${path}.visible`);
  if (c.spacing !== undefined) {
    number(c.spacing, `${path}.spacing`);
    if ((c.spacing as number) <= 0) {
      throw new ConfigError(`${path}.spacing`, 'expected a positive number');
    }
  }
  if (c.origin !== undefined) {
    arrayOf(number)(c.origin, `${path}.origin`);
    if ((c.origin as unknown[]).length !== 2) {
      throw new ConfigError(`${path}.origin`, 'expected [x, y]');
    }
  }
}
const CURVES_KEYS = ['tolerance'] as const;

const UNITS_KEYS = ['length'] as const;

function checkUnits(value: unknown, path: string): void {
  object(value, path);
  const u = value as Record<string, unknown>;
  checkKeys(u, path, UNITS_KEYS);
  if (u.length !== undefined && u.length !== 'auto' && !isLengthUnit(u.length)) {
    throw new ConfigError(
      `${path}.length`,
      `expected "auto" or one of ${LENGTH_UNITS.map((unit) => unit.id).join(', ')}`,
    );
  }
}

function checkCurves(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, CURVES_KEYS);
  if (c.tolerance !== undefined) {
    number(c.tolerance, `${path}.tolerance`);
    if ((c.tolerance as number) <= 0) {
      throw new ConfigError(`${path}.tolerance`, 'expected a positive number');
    }
  }
}
const DRAFT_KEYS = ['enabled', 'id', 'title', 'style'] as const;

function checkDraft(value: unknown, path: string, layerIds: string[]): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, DRAFT_KEYS);
  if (c.enabled !== undefined) boolean(c.enabled, `${path}.enabled`);
  if (c.id !== undefined) {
    string(c.id, `${path}.id`);
    if (layerIds.includes(c.id as string)) {
      throw new ConfigError(`${path}.id`, `collides with the layer id "${String(c.id)}"`);
    }
  }
  if (c.title !== undefined) string(c.title, `${path}.title`);
  if (c.style !== undefined) styleLike(c.style, `${path}.style`);
}
const CONSTRAINTS_KEYS = ['angle'] as const;
const ANGLE_CONSTRAINT_KEYS = ['enabled', 'step'] as const;

function checkConstraints(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, CONSTRAINTS_KEYS);
  if (c.angle === undefined) return;
  const anglePath = `${path}.angle`;
  object(c.angle, anglePath);
  const a = c.angle as Record<string, unknown>;
  checkKeys(a, anglePath, ANGLE_CONSTRAINT_KEYS);
  if (a.enabled !== undefined) boolean(a.enabled, `${anglePath}.enabled`);
  if (a.step !== undefined) {
    number(a.step, `${anglePath}.step`);
    if ((a.step as number) <= 0 || (a.step as number) > 360) {
      throw new ConfigError(`${anglePath}.step`, 'expected a number in (0, 360]');
    }
  }
}
const SELECTION_KEYS = [
  'strokeColor',
  'strokeWidth',
  'fillColor',
  'pointRadius',
  'haloColor',
  'haloWidth',
  'vertexSize',
  'inspect',
] as const;

function checkSelection(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, SELECTION_KEYS);
  if (c.strokeColor !== undefined) string(c.strokeColor, `${path}.strokeColor`);
  if (c.fillColor !== undefined) string(c.fillColor, `${path}.fillColor`);
  if (c.haloColor !== undefined) string(c.haloColor, `${path}.haloColor`);
  if (c.inspect !== undefined) boolean(c.inspect, `${path}.inspect`);
  for (const key of ['strokeWidth', 'pointRadius', 'haloWidth', 'vertexSize'] as const) {
    if (c[key] !== undefined) {
      number(c[key], `${path}.${key}`);
      if ((c[key] as number) < 0) {
        throw new ConfigError(`${path}.${key}`, 'expected a non-negative number');
      }
    }
  }
}
const LAYER_HIGHLIGHT_KEYS = ['strokeColor', 'strokeWidth', 'fillColor', 'pointRadius'] as const;

function checkLayerHighlight(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, LAYER_HIGHLIGHT_KEYS);
  if (c.strokeColor !== undefined) string(c.strokeColor, `${path}.strokeColor`);
  if (c.fillColor !== undefined) string(c.fillColor, `${path}.fillColor`);
  for (const key of ['strokeWidth', 'pointRadius'] as const) {
    if (c[key] !== undefined) {
      number(c[key], `${path}.${key}`);
      if ((c[key] as number) < 0) {
        throw new ConfigError(`${path}.${key}`, 'expected a non-negative number');
      }
    }
  }
}
const CHANGES_KEYS = ['crs', 'precision', 'fullFeatures'] as const;

function checkChanges(value: unknown, path: string, ctx: Context): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, CHANGES_KEYS);
  if (c.crs !== undefined) checkProjectionCode(ctx)(c.crs, `${path}.crs`);
  if (c.precision !== undefined) {
    number(c.precision, `${path}.precision`);
    if (!Number.isInteger(c.precision) || (c.precision as number) < 0) {
      throw new ConfigError(`${path}.precision`, 'expected a non-negative integer');
    }
  }
  if (c.fullFeatures !== undefined) boolean(c.fullFeatures, `${path}.fullFeatures`);
}
const CURSOR_KEYS = ['crosshair', 'pickBoxSize', 'color', 'pickColor', 'angle'] as const;

function checkCursor(value: unknown, path: string): void {
  object(value, path);
  const c = value as Record<string, unknown>;
  checkKeys(c, path, CURSOR_KEYS);
  if (c.crosshair !== undefined) boolean(c.crosshair, `${path}.crosshair`);
  if (c.pickBoxSize !== undefined) {
    number(c.pickBoxSize, `${path}.pickBoxSize`);
    if ((c.pickBoxSize as number) <= 0) {
      throw new ConfigError(`${path}.pickBoxSize`, 'expected a positive number');
    }
  }
  if (c.color !== undefined) string(c.color, `${path}.color`);
  if (c.pickColor !== undefined) string(c.pickColor, `${path}.pickColor`);
  if (c.angle !== undefined) number(c.angle, `${path}.angle`);
}

function contextFrom(config: Record<string, unknown>): Context {
  const declared = new Set<string>();
  if (Array.isArray(config.projections)) {
    for (const p of config.projections)
      if (isObject(p) && typeof p.code === 'string') declared.add(p.code);
  }
  return { declaredProjections: declared };
}

function checkUniqueIds(items: unknown[], path: string, kind: string): void {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const id = isObject(item) ? item.id : undefined;
    if (typeof id !== 'string') return; // reported by the item check
    if (seen.has(id)) throw new ConfigError(`${path}[${i}].id`, `duplicate ${kind} id "${id}"`);
    seen.add(id);
  });
}

/** Validate one basemap config, for example before `editor.basemaps.add`. */
export function validateBasemapConfig(
  basemap: unknown,
  path = 'basemap',
): asserts basemap is BasemapConfig {
  checkBasemap(basemap, path, { declaredProjections: new Set() });
}

/** Validate one overlay config, for example before `editor.overlays.add`. */
export function validateOverlayConfig(
  overlay: unknown,
  path = 'overlay',
): asserts overlay is OverlayConfig {
  checkOverlay(overlay, path, { declaredProjections: new Set() });
}

/** Ids of the configured vector layers and the draft layer (the overlay ids must not collide). */
function configuredLayerIds(c: Record<string, unknown>): string[] {
  const ids = Array.isArray(c.layers)
    ? (c.layers as { id?: unknown }[]).map((l) => (typeof l?.id === 'string' ? l.id : ''))
    : [];
  const draft = isObject(c.draft) && typeof c.draft.id === 'string' ? c.draft.id : 'draft';
  return [...ids, draft];
}

/** Validate one layer config, for example before `editor.layers.add`. */
export function validateLayerConfig(layer: unknown, path = 'layer'): asserts layer is LayerConfig {
  checkLayer(layer, path, { declaredProjections: new Set() });
}

/**
 * Validate an editor configuration. Throws `ConfigError` naming the offending path.
 * Does not mutate the input.
 */
export function validateConfig(config: unknown): asserts config is EditorConfig {
  object(config, 'config');
  const c = config as Record<string, unknown>;
  checkKeys(c, 'config', ROOT_KEYS);

  const hasTarget = c.target !== undefined;
  const hasMap = c.map !== undefined;
  if (hasTarget === hasMap) {
    throw new ConfigError('config', 'exactly one of "target" or "map" is required');
  }
  if (hasTarget && typeof c.target !== 'string' && !isObject(c.target)) {
    throw new ConfigError('config.target', 'expected an element id or an element');
  }
  if (hasMap && !isObject(c.map)) {
    throw new ConfigError('config.map', 'expected an OpenLayers Map instance');
  }
  if (c.projections !== undefined) {
    arrayOf(checkProjection)(c.projections, 'config.projections');
    const codes = new Set<string>();
    (c.projections as { code: string }[]).forEach((p, i) => {
      if (codes.has(p.code))
        throw new ConfigError(`config.projections[${i}].code`, `duplicate code "${p.code}"`);
      codes.add(p.code);
    });
  }
  if (c.proj4 !== undefined && typeof c.proj4 !== 'function') {
    throw new ConfigError('config.proj4', 'expected the proj4 library');
  }
  if (c.editMode !== undefined) boolean(c.editMode, 'config.editMode');
  if (c.cursor !== undefined) checkCursor(c.cursor, 'config.cursor');
  if (c.locale !== undefined) oneOf(['en', 'de'])(c.locale, 'config.locale');
  if (c.messages !== undefined) {
    object(c.messages, 'config.messages');
    for (const [key, value] of Object.entries(c.messages as Record<string, unknown>)) {
      string(value, `config.messages.${key}`);
    }
  }
  const ctx = contextFrom(c);
  if (c.changes !== undefined) checkChanges(c.changes, 'config.changes', ctx);
  if (c.selection !== undefined) checkSelection(c.selection, 'config.selection');
  if (c.layerHighlight !== undefined) {
    checkLayerHighlight(c.layerHighlight, 'config.layerHighlight');
  }
  if (c.snapping !== undefined) checkSnapping(c.snapping, 'config.snapping');
  if (c.grid !== undefined) checkGrid(c.grid, 'config.grid');
  if (c.curves !== undefined) checkCurves(c.curves, 'config.curves');
  if (c.units !== undefined) checkUnits(c.units, 'config.units');
  if (c.constraints !== undefined) checkConstraints(c.constraints, 'config.constraints');
  if (c.draft !== undefined) {
    checkDraft(c.draft, 'config.draft', configuredLayerIds(c).slice(0, -1));
  }
  if (c.view !== undefined) checkView(c.view, 'config.view', ctx);
  if (c.basemaps !== undefined) {
    if (!Array.isArray(c.basemaps)) throw new ConfigError('config.basemaps', 'expected an array');
    c.basemaps.forEach((b, i) => checkBasemap(b, `config.basemaps[${i}]`, ctx));
    checkUniqueIds(c.basemaps, 'config.basemaps', 'basemap');
  }
  if (c.layers !== undefined) {
    if (!Array.isArray(c.layers)) throw new ConfigError('config.layers', 'expected an array');
    c.layers.forEach((l, i) => checkLayer(l, `config.layers[${i}]`, ctx));
    checkUniqueIds(c.layers, 'config.layers', 'layer');
  }
  if (c.discover !== undefined) {
    if (!Array.isArray(c.discover)) throw new ConfigError('config.discover', 'expected an array');
    c.discover.forEach((d, i) => checkDiscover(d, `config.discover[${i}]`));
  }
  if (c.groups !== undefined) {
    if (!Array.isArray(c.groups)) throw new ConfigError('config.groups', 'expected an array');
    c.groups.forEach((g, i) => checkGroup(g, `config.groups[${i}]`));
    checkUniqueIds(c.groups, 'config.groups', 'group');
  }
  if (c.overlays !== undefined) {
    if (!Array.isArray(c.overlays)) throw new ConfigError('config.overlays', 'expected an array');
    c.overlays.forEach((o, i) => checkOverlay(o, `config.overlays[${i}]`, ctx));
    checkUniqueIds(c.overlays, 'config.overlays', 'overlay');
    // Overlays share the drawing order and the style store with the layers: one id space.
    const taken = new Set(configuredLayerIds(c));
    c.overlays.forEach((o, i) => {
      const id = isObject(o) ? o.id : undefined;
      if (typeof id === 'string' && taken.has(id)) {
        throw new ConfigError(`config.overlays[${i}].id`, `collides with the layer id "${id}"`);
      }
    });
  }
}
