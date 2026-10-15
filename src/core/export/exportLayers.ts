import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import GML32 from 'ol/format/GML32';
import GPX from 'ol/format/GPX';
import KML from 'ol/format/KML';
import type Geometry from 'ol/geom/Geometry';
import { get as getProjection } from 'ol/proj';

export type ExportFormat = 'geojson' | 'kml' | 'gml' | 'gpx';

/** What a UI needs to offer a format. `crs` is set when the format allows only that CRS. */
export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  mimeType: string;
  extension: string;
  crs?: string;
  /** Geometry types the format cannot hold; such objects are skipped. */
  skips?: string;
}

export const EXPORT_FORMATS: readonly ExportFormatInfo[] = [
  { id: 'geojson', label: 'GeoJSON', mimeType: 'application/geo+json', extension: 'geojson' },
  {
    id: 'kml',
    label: 'KML',
    mimeType: 'application/vnd.google-earth.kml+xml',
    extension: 'kml',
    crs: 'EPSG:4326',
  },
  { id: 'gml', label: 'GML 3.2', mimeType: 'application/gml+xml', extension: 'gml' },
  {
    id: 'gpx',
    label: 'GPX',
    mimeType: 'application/gpx+xml',
    extension: 'gpx',
    crs: 'EPSG:4326',
    skips: 'polygons and multi-points',
  },
];

export interface ExportOptions {
  format: ExportFormat;
  /** Output CRS for GeoJSON and GML. Default `EPSG:4326`; KML and GPX are always EPSG:4326. */
  projection?: string;
  /** Coordinate decimals. Default 7 for degrees, 3 for metric CRS. */
  decimals?: number;
  /**
   * Write the objects of dimension layers as drawn (`editor.exportLayers` only): their lines,
   * arrow heads, marks and text points (`drawnDimensions`) instead of their definition lines.
   */
  dimensionsAsDrawn?: boolean;
}

export interface ExportResult {
  content: string;
  mimeType: string;
  extension: string;
  /** Suggested file name: the layer title for one layer, `export-YYYY-MM-DD` for several. */
  filename: string;
  /** Objects written. */
  featureCount: number;
  /** Objects the format cannot hold (GPX: polygons, multi-points). */
  skipped: number;
}

/** One layer to export: features in the view projection. */
export interface ExportLayer {
  id: string;
  title: string;
  features: Feature[];
}

const GML_NS = 'http://www.opengis.net/gml/3.2';
const FEATURE_NS = 'urn:ol-cad:export';
/** XML element names OpenLayers can write (no namespace prefix). */
const XML_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/**
 * Write the objects of several layers into one file of `format`. Features are read in
 * `viewProjection` and never modified. GeoJSON: one FeatureCollection, each feature with a
 * `layer` property; KML: one Folder per layer; GML 3.2: one feature type per layer; GPX:
 * waypoints, routes and tracks of all layers.
 */
export function exportLayers(
  layers: ExportLayer[],
  options: ExportOptions,
  viewProjection: string,
  now: Date = new Date(),
): ExportResult {
  if (layers.length === 0) throw new Error('Nothing to export: no layer chosen');
  const info = EXPORT_FORMATS.find((f) => f.id === options.format);
  if (!info) throw new Error(`Unknown export format "${String(options.format)}"`);
  const projection = info.crs ?? options.projection ?? 'EPSG:4326';
  const resolved = getProjection(projection);
  if (!resolved) throw new Error(`Unknown projection ${projection}`);
  const decimals = options.decimals ?? (resolved.getUnits() === 'degrees' ? 7 : 3);
  const write = { dataProjection: projection, featureProjection: viewProjection, decimals };

  let content: string;
  let featureCount = 0;
  let skipped = 0;
  switch (options.format) {
    case 'geojson': {
      const features = layers.flatMap((layer) =>
        layer.features.map((f) => {
          const copy = copyFeature(f);
          copy.set(copy.get('layer') === undefined ? 'layer' : '_layer', layer.id);
          return copy;
        }),
      );
      featureCount = features.length;
      const collection = new GeoJSON().writeFeaturesObject(features, write) as Record<
        string,
        unknown
      >;
      const epsg = /^EPSG:(\d+)$/.exec(resolved.getCode());
      if (epsg && epsg[1] !== '4326') {
        collection.crs = { type: 'name', properties: { name: `urn:ogc:def:crs:EPSG::${epsg[1]}` } };
      }
      content = JSON.stringify(collection, null, 2);
      break;
    }
    case 'kml': {
      const kml = new KML({ writeStyles: false });
      const folders = layers.map((layer) => {
        const features = layer.features.map((f) => copyFeature(f, true));
        featureCount += features.length;
        const doc = kml.writeFeatures(features, write);
        return `<Folder><name>${escapeXml(layer.title)}</name>${placemarks(doc)}</Folder>`;
      });
      content =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${folders.join('')}</Document></kml>\n`;
      break;
    }
    case 'gml': {
      const members = layers.map((layer) => {
        const type = xmlName(layer.id);
        const gml = new GML32({ featureNS: FEATURE_NS, featureType: type, srsName: projection });
        const features = layer.features.map((f) => copyFeature(f, true));
        featureCount += features.length;
        const xml = gml.writeFeatures(features, write);
        const inner = xml.slice(xml.indexOf('>') + 1, xml.lastIndexOf('</'));
        // GML 3.2 identifies features by gml:id (an NCName), not the GML 2 fid.
        return inner.replace(
          / fid="([^"]*)"/g,
          (_, id: string) => ` gml:id="${xmlName(`${type}.${id}`)}"`,
        );
      });
      content =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<gml:FeatureCollection xmlns:gml="${GML_NS}" xmlns:olcad="${FEATURE_NS}" gml:id="export">` +
        `<gml:featureMembers>${members.join('')}</gml:featureMembers></gml:FeatureCollection>\n`;
      break;
    }
    case 'gpx': {
      // GPX wants waypoints, then routes, then tracks.
      const order: Record<string, number> = { Point: 0, LineString: 1, MultiLineString: 2 };
      const features: Feature[] = [];
      for (const layer of layers) {
        for (const f of layer.features) {
          const type = f.getGeometry()?.getType();
          if (type === undefined || !(type in order)) {
            skipped++;
            continue;
          }
          const copy = copyFeature(f);
          if (copy.get('name') === undefined) {
            copy.set('name', `${layer.title} ${String(f.getId() ?? features.length + 1)}`);
          }
          features.push(copy);
        }
      }
      features.sort(
        (a, b) => order[a.getGeometry()!.getType()]! - order[b.getGeometry()!.getType()]!,
      );
      featureCount = features.length;
      content =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new GPX().writeFeatures(features, write) +
        '\n';
      break;
    }
  }

  const base = layers.length === 1 ? layers[0]!.title : `export-${now.toISOString().slice(0, 10)}`;
  return {
    content,
    mimeType: info.mimeType,
    extension: info.extension,
    filename: `${fileName(base)}.${info.extension}`,
    featureCount,
    skipped,
  };
}

/**
 * A detached copy with the same id, geometry clone and properties. For XML formats
 * (`xml`), properties that are not valid element names are left out and values that are not
 * primitives are written as JSON text.
 */
function copyFeature(feature: Feature, xml = false): Feature {
  const copy = new Feature();
  const geometryName = feature.getGeometryName();
  for (const [key, value] of Object.entries(feature.getProperties())) {
    if (key === geometryName) continue;
    if (xml && (!XML_NAME.test(key) || key === 'geometry')) continue;
    if (value === undefined) continue;
    copy.set(
      key,
      xml && value !== null && typeof value === 'object' ? JSON.stringify(value) : value,
    );
  }
  const geometry = feature.getGeometry() as Geometry | undefined;
  if (geometry) copy.setGeometry(geometry.clone());
  const id = feature.getId();
  if (id !== undefined) copy.setId(id);
  return copy;
}

/**
 * The Placemarks of a KML document. OpenLayers writes several features into a `<Document>` but
 * a single one as a bare `<Placemark>`, so take everything from the first to the last.
 */
function placemarks(kml: string): string {
  const start = kml.indexOf('<Placemark');
  const end = kml.lastIndexOf('</Placemark>');
  return start < 0 || end < 0 ? '' : kml.slice(start, end + '</Placemark>'.length);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** An XML NCName from any id: invalid characters become `_`, a leading digit gets `_`. */
function xmlName(text: string): string {
  const name = text.replace(/[^A-Za-z0-9_.-]/g, '_');
  return /^[A-Za-z_]/.test(name) ? name : `_${name}`;
}

/** A file name without characters that file systems reject. */
function fileName(text: string): string {
  return text.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'export';
}
