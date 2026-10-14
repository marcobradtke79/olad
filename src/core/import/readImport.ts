import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import type FeatureFormat from 'ol/format/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import GML2 from 'ol/format/GML2';
import GML3 from 'ol/format/GML3';
import GML32 from 'ol/format/GML32';
import GPX from 'ol/format/GPX';
import KML from 'ol/format/KML';
import TopoJSON from 'ol/format/TopoJSON';
import type Geometry from 'ol/geom/Geometry';
import type SimpleGeometry from 'ol/geom/SimpleGeometry';
import { get as getProjection } from 'ol/proj';
import { parse } from 'ol/xml';
import type { FieldConfig, FieldType } from '../config/types';
import { validateGeometry } from '../geometry/validity';
import type { LocalGeometryType } from '../layers/local';
import { wrapForLayer } from '../tools/draw';

export type ImportFormat = 'geojson' | 'topojson' | 'kml' | 'gml' | 'gpx';

export interface ImportFormatInfo {
  id: ImportFormat;
  label: string;
  extensions: string[];
}

export const IMPORT_FORMATS: readonly ImportFormatInfo[] = [
  { id: 'geojson', label: 'GeoJSON', extensions: ['geojson', 'json'] },
  { id: 'topojson', label: 'TopoJSON', extensions: ['topojson'] },
  { id: 'kml', label: 'KML', extensions: ['kml'] },
  { id: 'gml', label: 'GML', extensions: ['gml', 'xml'] },
  { id: 'gpx', label: 'GPX', extensions: ['gpx'] },
];

/** Objects of one geometry family from one group of the file, ready for one layer. */
export interface ImportGroup {
  /** Stable key for targets (`'0'`, `'1'` ...). */
  key: string;
  /** Suggested layer name: the file's folder / layer / feature type, else the file name. */
  name: string;
  geometryType: LocalGeometryType;
  /** Valid objects in the view projection, with sanitized attribute names; no ids. */
  features: Feature[];
  /** Attributes found, with inferred types; `label` keeps an original name that was changed. */
  fields: FieldConfig[];
  /** Objects left out because their geometry is invalid. */
  invalid: number;
}

export interface ImportPreview {
  format: ImportFormat;
  /** The CRS the file's coordinates were read in. */
  dataProjection: string;
  groups: ImportGroup[];
  /** Objects without a usable geometry (none, or a geometry collection). */
  skipped: number;
}

export interface ReadImportOptions {
  /** File name; its extension picks the format and its base name names the groups. */
  filename?: string;
  /** Force a format instead of detecting it. */
  format?: ImportFormat;
  /** Projection the features are read into. */
  viewProjection: string;
}

/** Thrown for a file that cannot be read; the message is meant for the user. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

interface RawGroup {
  name: string | null;
  features: Feature[];
}

type Family = 'points' | 'lines' | 'polygons';

const FAMILY: Record<string, Family> = {
  Point: 'points',
  MultiPoint: 'points',
  LineString: 'lines',
  MultiLineString: 'lines',
  Polygon: 'polygons',
  MultiPolygon: 'polygons',
};
const SINGLE: Record<Family, LocalGeometryType> = {
  points: 'Point',
  lines: 'LineString',
  polygons: 'Polygon',
};
/** KML bookkeeping properties OpenLayers reads but nobody wants as attributes. */
const KML_NOISE = new Set(['styleUrl', 'visibility', 'open']);
const NUMBER = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Read a GeoJSON, TopoJSON, KML, GML (2, 3, 3.2) or GPX file into groups of one geometry family
 * each: grouped by the file's own grouping (the `layer` property written by the exporter,
 * TopoJSON objects, top-level KML folders, GML feature types), then split into points, lines
 * and polygons. Throws `ImportError` for unreadable files or an unregistered CRS.
 */
export function readImport(text: string, options: ReadImportOptions): ImportPreview {
  const format = options.format ?? detectFormat(text, options.filename);
  const base = baseName(options.filename);
  const { raw, dataProjection } = readRaw(format, text, options.viewProjection);
  let skipped = 0;
  const groups: ImportGroup[] = [];
  for (const group of raw) {
    const families = new Map<Family, Feature[]>();
    for (const feature of group.features) {
      const family = FAMILY[feature.getGeometry()?.getType() ?? ''];
      if (!family) {
        skipped++;
        continue;
      }
      if (!families.has(family)) families.set(family, []);
      families.get(family)!.push(feature);
    }
    const name = group.name?.trim() || base;
    for (const [family, features] of families) {
      const multi = features.some((f) => f.getGeometry()!.getType().startsWith('Multi'));
      const geometryType = (multi ? `Multi${SINGLE[family]}` : SINGLE[family]) as LocalGeometryType;
      groups.push(
        buildGroup(
          String(groups.length),
          families.size > 1 ? `${name} – ${family}` : name,
          geometryType,
          features,
          format !== 'geojson' && format !== 'topojson',
        ),
      );
    }
  }
  return { format, dataProjection, groups, skipped };
}

function detectFormat(text: string, filename?: string): ImportFormat {
  const ext = filename?.toLowerCase().split('.').pop();
  const byExtension = IMPORT_FORMATS.find(
    (f) => ext && f.extensions.includes(ext) && ext !== 'xml',
  );
  if (byExtension) {
    if (byExtension.id === 'geojson' && /"type"\s*:\s*"Topology"/.test(text)) return 'topojson';
    return byExtension.id;
  }
  const start = text.trimStart();
  if (start.startsWith('{')) return /"type"\s*:\s*"Topology"/.test(text) ? 'topojson' : 'geojson';
  if (start.startsWith('<')) {
    const root = /<(?:[\w-]+:)?(kml|gpx)[\s>]/.exec(
      start.replace(/<\?[^>]*\?>|<!--[\s\S]*?-->/g, ''),
    );
    if (root?.[1] === 'kml') return 'kml';
    if (root?.[1] === 'gpx') return 'gpx';
    return 'gml';
  }
  throw new ImportError('Unknown file format: expected GeoJSON, TopoJSON, KML, GML or GPX');
}

function readRaw(
  format: ImportFormat,
  text: string,
  viewProjection: string,
): { raw: RawGroup[]; dataProjection: string } {
  const read = (reader: FeatureFormat<FeatureLike>, source: unknown, dataProjection: string) =>
    reader.readFeatures(source as string, {
      dataProjection,
      featureProjection: viewProjection,
    }) as Feature[];
  switch (format) {
    case 'geojson': {
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new ImportError('The file is not valid JSON');
      }
      const crs = json.crs as { properties?: { name?: string } } | undefined;
      const dataProjection = registered(crs?.properties?.name ?? 'EPSG:4326');
      const features = wrapErrors(() => read(new GeoJSON(), json, dataProjection));
      return { raw: groupByProperty(features, 'layer'), dataProjection };
    }
    case 'topojson': {
      const features = wrapErrors(() =>
        read(new TopoJSON({ layerName: '__object' }), text, 'EPSG:4326'),
      );
      return { raw: groupByProperty(features, '__object'), dataProjection: 'EPSG:4326' };
    }
    case 'kml': {
      const doc = parseXml(text);
      const kml = new KML({ extractStyles: false });
      const container = firstChild(doc.documentElement, 'Document') ?? doc.documentElement;
      const folders = children(container, 'Folder');
      const raw: RawGroup[] = [];
      const loose = children(container, 'Placemark');
      if (folders.length === 0) {
        raw.push({ name: null, features: read(kml, doc, 'EPSG:4326') });
      } else {
        if (loose.length > 0) {
          raw.push({ name: null, features: loose.flatMap((p) => read(kml, p, 'EPSG:4326')) });
        }
        for (const folder of folders) {
          raw.push({
            name: firstChild(folder, 'name')?.textContent ?? null,
            features: read(kml, folder, 'EPSG:4326'),
          });
        }
      }
      for (const group of raw) {
        for (const feature of group.features) {
          for (const key of KML_NOISE) feature.unset(key, true);
        }
      }
      return { raw, dataProjection: 'EPSG:4326' };
    }
    case 'gml': {
      const doc = parseXml(text);
      const srs = doc.documentElement.querySelector('[srsName]')?.getAttribute('srsName');
      const dataProjection = registered(srs ?? 'EPSG:4326');
      const Reader = text.includes('http://www.opengis.net/gml/3.2')
        ? GML32
        : /<(?:\w+:)?(pos|posList)[\s>]/.test(text)
          ? GML3
          : GML2;
      const types = featureTypes(doc);
      if (types.length === 0) throw new ImportError('No features found in the GML file');
      const raw = types.map(({ ns, name }) => ({
        name,
        features: wrapErrors(() =>
          read(new Reader({ featureNS: ns, featureType: name }), doc, dataProjection),
        ),
      }));
      return { raw, dataProjection };
    }
    case 'gpx': {
      const doc = parseXml(text);
      return {
        raw: [{ name: null, features: read(new GPX(), doc, 'EPSG:4326') }],
        dataProjection: 'EPSG:4326',
      };
    }
  }
}

/** The group's objects with sanitized attribute names, inferred types and wrapped geometries. */
function buildGroup(
  key: string,
  name: string,
  geometryType: LocalGeometryType,
  sources: Feature[],
  xml: boolean,
): ImportGroup {
  // Original property name → field name, in order of first appearance.
  const names = new Map<string, string>();
  const used = new Set<string>();
  for (const feature of sources) {
    for (const prop of Object.keys(feature.getProperties())) {
      if (prop === feature.getGeometryName() || names.has(prop)) continue;
      let field = prop.replace(/[^A-Za-z0-9_]/g, '_');
      if (!FIELD_NAME.test(field)) field = `_${field}`;
      if (field === 'geometry') field = 'geometry_';
      let unique = field;
      for (let n = 2; used.has(unique); n++) unique = `${field}_${n}`;
      used.add(unique);
      names.set(prop, unique);
    }
  }
  const fields: FieldConfig[] = [];
  const convert = new Map<string, (value: unknown) => unknown>();
  for (const [prop, field] of names) {
    const values = sources
      .map((f) => f.get(prop) as unknown)
      .filter((v) => v !== undefined && v !== null && v !== '');
    const type = inferType(values, xml);
    fields.push({ name: field, type, ...(field !== prop ? { label: prop } : {}) });
    convert.set(prop, converter(type));
  }
  const features: Feature[] = [];
  let invalid = 0;
  for (const source of sources) {
    const geometry = wrapForLayer(toXY(source.getGeometry()!), geometryType);
    if (validateGeometry(geometry, geometryType)) {
      invalid++;
      continue;
    }
    const feature = new Feature();
    for (const [prop, field] of names) {
      const value = source.get(prop) as unknown;
      if (value === undefined || value === null || value === '') continue;
      feature.set(field, convert.get(prop)!(value));
    }
    feature.setGeometry(geometry);
    features.push(feature);
  }
  return { key, name, geometryType, features, fields, invalid };
}

/** A 2D copy: the editor has no Z or M editing, so heights and measures are dropped. */
function toXY(geometry: Geometry): Geometry {
  const copy = geometry.clone() as SimpleGeometry;
  if (copy.getStride() <= 2) return copy;
  const strip = (c: unknown): unknown =>
    Array.isArray(c) && typeof c[0] === 'number' ? c.slice(0, 2) : (c as unknown[]).map(strip);
  copy.setCoordinates(strip(copy.getCoordinates()) as never, 'XY');
  return copy;
}

function inferType(values: unknown[], xml: boolean): FieldType {
  if (values.length === 0) return 'string';
  const numeric = (v: unknown) =>
    typeof v === 'number' || (xml && typeof v === 'string' && NUMBER.test(v.trim()));
  if (values.every(numeric)) {
    return values.every((v) => Number.isInteger(Number(v))) ? 'integer' : 'number';
  }
  const boolean = (v: unknown) =>
    typeof v === 'boolean' || (xml && (v === 'true' || v === 'false'));
  if (values.every(boolean)) return 'boolean';
  return 'string';
}

function converter(type: FieldType): (value: unknown) => unknown {
  switch (type) {
    case 'integer':
    case 'number':
      return (v) => Number(v);
    case 'boolean':
      return (v) => v === true || v === 'true';
    default:
      return (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
}

function groupByProperty(features: Feature[], property: string): RawGroup[] {
  const grouped = features.length > 0 && features.every((f) => typeof f.get(property) === 'string');
  if (!grouped) return [{ name: null, features }];
  const groups = new Map<string, Feature[]>();
  for (const feature of features) {
    const name = feature.get(property) as string;
    feature.unset(property, true);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(feature);
  }
  return [...groups].map(([name, list]) => ({ name, features: list }));
}

/** The feature types of a GML document: member elements of featureMember(s) / member. */
function featureTypes(doc: Document): { ns: string; name: string }[] {
  const types = new Map<string, { ns: string; name: string }>();
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    const parent = el.parentElement?.localName;
    if (parent !== 'featureMember' && parent !== 'featureMembers' && parent !== 'member') continue;
    const ns = el.namespaceURI ?? '';
    const key = `${ns} ${el.localName}`;
    if (!types.has(key)) types.set(key, { ns, name: el.localName });
  }
  return [...types.values()];
}

/** `EPSG:n` for the usual spellings of a CRS name; throws when the code is not registered. */
function registered(name: string): string {
  const epsg = /EPSG(?::+|\/|.*#)(\d+)$/i.exec(name.trim());
  const code = epsg ? `EPSG:${epsg[1]}` : name.trim();
  if (/^CRS:?84$/i.test(code) || /OGC.*CRS84$/i.test(code)) return 'EPSG:4326';
  if (!getProjection(code)) {
    throw new ImportError(
      `The file uses the coordinate system ${code}, which is not registered (add it to the projections in the configuration)`,
    );
  }
  return code;
}

function parseXml(text: string): Document {
  const doc = parse(text);
  if (!doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    throw new ImportError('The file is not valid XML');
  }
  return doc;
}

function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((c) => c.localName === name);
}

function firstChild(parent: Element, name: string): Element | undefined {
  return children(parent, name)[0];
}

function wrapErrors<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(
      `The file could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function baseName(filename?: string): string {
  if (!filename) return 'Import';
  const name = filename
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]+$/, '');
  return name || 'Import';
}
