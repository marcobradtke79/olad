/**
 * Local test server for the full edit-and-save cycle. No external backend needed.
 * Plain node:http, run with `node test-server/server.ts` (Node 22.6+ strips the types).
 *
 *   GET  /config          test configuration (test-config.json merged with layers.json)
 *   GET  /data/:layer     current data of a GeoJSON layer; other files in data/ are served as is
 *   GET  /wfs             WFS emulation. GetFeature (outputFormat=application/json, srsName, bbox,
 *                         count / maxFeatures + startIndex paging with numberMatched; ?fail=1 answers
 *                         500, ?auth=1 needs an Authorization header, ?failonce=<token> fails once per token;
 *                         typeName with or without the "test:" prefix), GetCapabilities (1.1.0, or 2.0.0
 *                         for VERSION=2.0.0: one feature type test:<layer> per seeded GeoJSON layer) and
 *                         DescribeFeatureType (an XML Schema from layers.json)
 *   GET  /wms             WMS emulation: GetCapabilities (1.3.0), GetMap (hatched PNG per layer), GetLegendGraphic,
 *                         GetFeatureInfo (JSON: one record per queryable QUERY_LAYERS entry)
 *   POST /changes[?fail=1] apply a change set, answer { idMap }; fail=1 answers 500
 *   GET  /changes/log     every change set received since start / reset
 *   POST /reset           restore the seed data
 *   GET  /                test page (public/), plus /dist/* and /vendor/{ol.js,ol.css,proj4.js,geotiff.js}
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { hatchTile, legendImage, type Rgb } from './png.ts';

proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const REPO = resolve(ROOT, '..');
const PORT = Number(process.env.PORT ?? 8787);
// geotiff is a dependency of ol, not of this repo: resolve it relative to ol's real location
// (pnpm symlinks node_modules/ol into its store).
const GEOTIFF_BROWSER = join(
  createRequire(realpathSync(join(REPO, 'node_modules/ol/package.json'))).resolve('geotiff'),
  '../../dist-browser',
);

type Geometry = { type: string; coordinates: unknown };
type Feature = {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: Geometry | null;
};
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type Change =
  | {
      op: 'insert';
      layer: string;
      tempId: string;
      geometry: Geometry;
      properties?: Record<string, unknown>;
    }
  | {
      op: 'update';
      layer: string;
      id: string | number;
      geometry?: Geometry;
      properties?: Record<string, unknown>;
      changed?: string[];
    }
  | { op: 'delete'; layer: string; id: string | number };
type ChangeSet = { version: number; crs?: string; changes: (Change & { crs: string })[] };

/** Storage projection of the seed data. */
const DATA_CRS = 'EPSG:4326';

function reprojectCoordinates(coordinates: unknown, from: string, to: string): unknown {
  if (!Array.isArray(coordinates)) return coordinates;
  if (typeof coordinates[0] === 'number') return proj4(from, to, coordinates as number[]);
  return coordinates.map((c) => reprojectCoordinates(c, from, to));
}

/** GeoJSON geometry from `from` into the storage projection. */
function toDataCrs(
  geometry: Geometry | null | undefined,
  from: string,
): Geometry | null | undefined {
  if (!geometry || from === DATA_CRS) return geometry;
  const g = geometry as Geometry & { coordinates?: unknown };
  return { ...g, coordinates: reprojectCoordinates(g.coordinates, from, DATA_CRS) } as Geometry;
}

const seed = new Map<string, FeatureCollection>();
let data = new Map<string, FeatureCollection>();
const log: { receivedAt: string; changeSet: ChangeSet; idMap: Record<string, number> }[] = [];
let nextId = 10_000;
/** `typeName:token` pairs whose `failonce=<token>` request already failed once. */
const failedOnce = new Set<string>();

async function loadSeed(): Promise<void> {
  const dir = join(ROOT, 'data');
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.geojson')) continue;
    const layer = file.replace(/\.geojson$/, '');
    seed.set(layer, JSON.parse(await readFile(join(dir, file), 'utf8')) as FeatureCollection);
  }
  resetData();
}

/** Transform every coordinate of a GeoJSON geometry (data is stored in EPSG:4326). */
function transformGeometry(geometry: Geometry | null, to: string): Geometry | null {
  if (!geometry || to === 'EPSG:4326') return geometry;
  const code = /EPSG:{1,2}(\d+)$/i.exec(to)?.[1];
  const target = code ? `EPSG:${code}` : to;
  const walk = (c: unknown): unknown =>
    typeof (c as unknown[])[0] === 'number'
      ? proj4('EPSG:4326', target, c as number[])
      : (c as unknown[]).map(walk);
  return { ...geometry, coordinates: walk(geometry.coordinates) };
}

function intersects(geometry: Geometry | null, bbox: number[]): boolean {
  if (!geometry) return false;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      const [x, y] = c as number[];
      minX = Math.min(minX, x!);
      maxX = Math.max(maxX, x!);
      minY = Math.min(minY, y!);
      maxY = Math.max(maxY, y!);
    } else (c as unknown[]).forEach(walk);
  };
  walk(geometry.coordinates);
  return !(maxX < bbox[0]! || minX > bbox[2]! || maxY < bbox[1]! || minY > bbox[3]!);
}

function resetData(): void {
  data = new Map([...seed].map(([k, v]) => [k, structuredClone(v)]));
  log.length = 0;
  nextId = 10_000;
}

function validateChangeSet(body: unknown): ChangeSet {
  if (typeof body !== 'object' || body === null) throw new Error('body must be an object');
  const cs = body as Partial<ChangeSet>;
  if (cs.version !== 1) throw new Error('version must be 1');
  if (cs.crs !== undefined && typeof cs.crs !== 'string') throw new Error('crs must be a string');
  if (!Array.isArray(cs.changes)) throw new Error('changes must be an array');
  cs.changes.forEach((c, i) => {
    if (!['insert', 'update', 'delete'].includes(c.op)) throw new Error(`changes[${i}].op invalid`);
    if (typeof c.crs !== 'string') throw new Error(`changes[${i}].crs must be a string`);
    if (typeof c.layer !== 'string') throw new Error(`changes[${i}].layer must be a string`);
    if (!data.has(c.layer)) throw new Error(`changes[${i}].layer "${c.layer}" unknown`);
    if (c.op === 'insert' && typeof c.tempId !== 'string')
      throw new Error(`changes[${i}].tempId required`);
    if (c.op !== 'insert' && c.id === undefined) throw new Error(`changes[${i}].id required`);
  });
  return cs as ChangeSet;
}

function applyChangeSet(cs: ChangeSet): Record<string, number> {
  const idMap: Record<string, number> = {};
  for (const change of cs.changes) {
    const collection = data.get(change.layer)!;
    if (change.op === 'insert') {
      const id = nextId++;
      idMap[change.tempId] = id;
      collection.features.push({
        type: 'Feature',
        id,
        properties: { ...(change.properties ?? {}), id },
        geometry: toDataCrs(change.geometry, change.crs) as Geometry,
      });
    } else {
      const index = collection.features.findIndex((f) => String(f.id) === String(change.id));
      if (index < 0) throw new Error(`feature ${change.id} not found in ${change.layer}`);
      if (change.op === 'delete') {
        collection.features.splice(index, 1);
      } else {
        const feature = collection.features[index]!;
        if (change.geometry) feature.geometry = toDataCrs(change.geometry, change.crs) as Geometry;
        if (change.properties) Object.assign(feature.properties, change.properties);
      }
    }
  }
  return idMap;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.kml': 'application/vnd.google-earth.kml+xml; charset=utf-8',
  '.gpx': 'application/gpx+xml; charset=utf-8',
  '.gml': 'application/gml+xml; charset=utf-8',
  '.topojson': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.xml': 'text/xml; charset=utf-8',
};

function send(res: ServerResponse, status: number, body: unknown, type = MIME['.json']): void {
  res.writeHead(status, {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2));
}

// ---- WMS emulation --------------------------------------------------------------------------
// Three layers over the seed data, enough for overlays, legends, GetFeatureInfo and discovery:
// `test:parcels` (queryable, legend), `test:roads` (legend, scale range) and `test:hillshade`.

/** Colours of the emulated layers, used for GetMap tiles and legends. */
const WMS_COLORS: Record<string, Rgb> = {
  'test:parcels': [37, 99, 235],
  'test:roads': [220, 38, 38],
  'test:hillshade': [107, 114, 128],
  xyz: [16, 185, 129],
};
const WMS_DEFAULT_COLOR: Rgb = [168, 85, 247];
const pngCache = new Map<string, Buffer>();

/** Lon/lat bounding box of a collection. */
function bboxOf(collections: FeatureCollection[]): [number, number, number, number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number') {
      box[0] = Math.min(box[0], c[0] as number);
      box[1] = Math.min(box[1], c[1] as number);
      box[2] = Math.max(box[2], c[0] as number);
      box[3] = Math.max(box[3], c[1] as number);
    } else c.forEach(visit);
  };
  for (const collection of collections) {
    for (const feature of collection.features) visit(feature.geometry?.coordinates);
  }
  return box;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

interface WmsLayer {
  name: string;
  title: string;
  abstract: string;
  bbox: [number, number, number, number];
  queryable: boolean;
  legend: boolean;
  minScale?: number;
  maxScale?: number;
}

function wmsLayerXml(layer: WmsLayer, base: string): string {
  const [west, south, east, north] = layer.bbox;
  const [minX, minY] = proj4('EPSG:4326', 'EPSG:3857', [west, south]);
  const [maxX, maxY] = proj4('EPSG:4326', 'EPSG:3857', [east, north]);
  const legend = layer.legend
    ? `      <Style><Name>default</Name><Title>Default</Title>
        <LegendURL width="96" height="20"><Format>image/png</Format>
          <OnlineResource xlink:type="simple" xlink:href="${escapeXml(`${base}/wms?SERVICE=WMS&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${layer.name}`)}"/>
        </LegendURL></Style>\n`
    : '';
  const scale =
    layer.minScale !== undefined && layer.maxScale !== undefined
      ? `      <MinScaleDenominator>${layer.minScale}</MinScaleDenominator>\n      <MaxScaleDenominator>${layer.maxScale}</MaxScaleDenominator>\n`
      : '';
  return `    <Layer queryable="${layer.queryable ? 1 : 0}">
      <Name>${escapeXml(layer.name)}</Name>
      <Title>${escapeXml(layer.title)}</Title>
      <Abstract>${escapeXml(layer.abstract)}</Abstract>
      <EX_GeographicBoundingBox>
        <westBoundLongitude>${west}</westBoundLongitude><eastBoundLongitude>${east}</eastBoundLongitude>
        <southBoundLatitude>${south}</southBoundLatitude><northBoundLatitude>${north}</northBoundLatitude>
      </EX_GeographicBoundingBox>
      <BoundingBox CRS="CRS:84" minx="${west}" miny="${south}" maxx="${east}" maxy="${north}"/>
      <BoundingBox CRS="EPSG:4326" minx="${south}" miny="${west}" maxx="${north}" maxy="${east}"/>
      <BoundingBox CRS="EPSG:3857" minx="${minX}" miny="${minY}" maxx="${maxX}" maxy="${maxY}"/>
${scale}${legend}    </Layer>
`;
}

/** The layers of the WMS emulation, with bounding boxes from the current seed data. */
function wmsLayers(): WmsLayer[] {
  const parcels = data.get('parcels') ? [data.get('parcels')!] : [];
  const roads = data.get('roads') ? [data.get('roads')!] : [];
  return [
    {
      name: 'test:parcels',
      title: 'Parcels',
      abstract: 'The parcels of the seed data; answers GetFeatureInfo.',
      bbox: bboxOf(parcels),
      queryable: true,
      legend: true,
    },
    {
      name: 'test:roads',
      title: 'Roads',
      abstract: 'The roads of the seed data, shown between the scales 1:1000 and 1:500000.',
      bbox: bboxOf(roads),
      queryable: false,
      legend: true,
      minScale: 1000,
      maxScale: 500000,
    },
    {
      name: 'test:hillshade',
      title: 'Hillshade',
      abstract: 'A raster without legend that does not answer GetFeatureInfo.',
      bbox: bboxOf([...parcels, ...roads]),
      queryable: false,
      legend: false,
    },
  ];
}

function wmsCapabilities(base: string): string {
  const layers = wmsLayers();
  const [west, south, east, north] = bboxOf([...data.values()]);
  const dcp = `<DCPType><HTTP><Get><OnlineResource xlink:type="simple" xlink:href="${escapeXml(`${base}/wms?`)}"/></Get></HTTP></DCPType>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms" xmlns:xlink="http://www.w3.org/1999/xlink">
  <Service>
    <Name>WMS</Name>
    <Title>ol-cad test server</Title>
    <Abstract>WMS emulation over the seed data for the Playwright tests.</Abstract>
  </Service>
  <Capability>
    <Request>
      <GetCapabilities><Format>text/xml</Format>${dcp}</GetCapabilities>
      <GetMap><Format>image/png</Format>${dcp}</GetMap>
      <GetFeatureInfo><Format>application/json</Format>${dcp}</GetFeatureInfo>
    </Request>
    <Exception><Format>XML</Format></Exception>
    <Layer>
      <Title>ol-cad test server</Title>
      <CRS>EPSG:3857</CRS><CRS>EPSG:4326</CRS><CRS>CRS:84</CRS>
      <EX_GeographicBoundingBox>
        <westBoundLongitude>${west}</westBoundLongitude><eastBoundLongitude>${east}</eastBoundLongitude>
        <southBoundLatitude>${south}</southBoundLatitude><northBoundLatitude>${north}</northBoundLatitude>
      </EX_GeographicBoundingBox>
      <Layer>
        <Title>Test</Title>
        <Abstract>The layers of the test server.</Abstract>
${layers.map((layer) => wmsLayerXml(layer, base)).join('')}      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>
`;
}

/** One entry of config/layers.json, as far as the WFS emulation reads it. */
interface ConfiguredLayer {
  id: string;
  title?: string;
  geometryType?: string;
  source?: { typeName?: string };
  schema?: { fields?: { name: string; type: string; required?: boolean; values?: unknown[] }[] };
}

type FieldOf<L extends ConfiguredLayer> = NonNullable<NonNullable<L['schema']>['fields']>[number];

async function configuredLayers(): Promise<ConfiguredLayer[]> {
  const { layers } = JSON.parse(await readFile(join(ROOT, 'config/layers.json'), 'utf8'));
  return Array.isArray(layers) ? (layers as ConfiguredLayer[]) : [];
}

/** The layer configured under the seed name, as a layer id or as a WFS typeName. */
function configuredFor(layers: ConfiguredLayer[], name: string): ConfiguredLayer | undefined {
  return layers.find((l) => l.id === name) ?? layers.find((l) => l.source?.typeName === name);
}

/** WFS GetCapabilities over the seeded GeoJSON layers, 1.1.0 or 2.0.0 shaped. */
async function wfsCapabilities(base: string, version: string): Promise<string> {
  const layers = await configuredLayers();
  const two = version === '2.0.0';
  const ns = two ? 'http://www.opengis.net/wfs/2.0' : 'http://www.opengis.net/wfs';
  const ows = two ? 'http://www.opengis.net/ows/1.1' : 'http://www.opengis.net/ows';
  const crs = (code: string) =>
    two ? `urn:ogc:def:crs:EPSG::${code}` : `urn:x-ogc:def:crs:EPSG:${code}`;
  const [def, other] = two ? ['DefaultCRS', 'OtherCRS'] : ['DefaultSRS', 'OtherSRS'];
  const types = [...data.keys()].sort().map((name) => {
    const [west, south, east, north] = bboxOf([data.get(name)!]);
    const title = layers.find((l) => l.id === name)?.title ?? name;
    return `    <FeatureType>
      <Name>test:${escapeXml(name)}</Name>
      <Title>${escapeXml(title)}</Title>
      <Abstract>Seed data of ${escapeXml(name)}</Abstract>
      <${def}>${crs('4326')}</${def}>
      <${other}>${crs('3857')}</${other}>
      <ows:WGS84BoundingBox><ows:LowerCorner>${west} ${south}</ows:LowerCorner><ows:UpperCorner>${east} ${north}</ows:UpperCorner></ows:WGS84BoundingBox>
    </FeatureType>`;
  });
  const values = ['application/json', 'GML2', 'text/xml; subtype=gml/3.1.1']
    .map((v) => `<ows:Value>${escapeXml(v)}</ows:Value>`)
    .join('');
  const formats = two ? `<ows:AllowedValues>${values}</ows:AllowedValues>` : values;
  return `<?xml version="1.0" encoding="UTF-8"?>
<WFS_Capabilities version="${version}" xmlns="${ns}" xmlns:ows="${ows}" xmlns:test="${base}/test">
  <ows:ServiceIdentification><ows:Title>ol-cad test server</ows:Title><ows:ServiceType>WFS</ows:ServiceType></ows:ServiceIdentification>
  <ows:OperationsMetadata>
    <ows:Operation name="GetCapabilities"/>
    <ows:Operation name="DescribeFeatureType"/>
    <ows:Operation name="GetFeature"><ows:Parameter name="outputFormat">${formats}</ows:Parameter></ows:Operation>
  </ows:OperationsMetadata>
  <FeatureTypeList>
${types.join('\n')}
  </FeatureTypeList>
</WFS_Capabilities>
`;
}

const GML_PROPERTY_TYPES: Record<string, string> = {
  Point: 'PointPropertyType',
  MultiPoint: 'MultiPointPropertyType',
  LineString: 'LineStringPropertyType',
  MultiLineString: 'MultiLineStringPropertyType',
  Polygon: 'PolygonPropertyType',
  MultiPolygon: 'MultiPolygonPropertyType',
};

const XSD_TYPES: Record<string, string> = {
  string: 'xsd:string',
  number: 'xsd:double',
  integer: 'xsd:int',
  boolean: 'xsd:boolean',
  date: 'xsd:date',
};

/** Fields of a seed layer without a configured schema, typed from its first feature's values. */
function inferredFields(name: string): FieldOf<ConfiguredLayer>[] {
  const properties = data.get(name)?.features[0]?.properties ?? {};
  return Object.entries(properties).map(([key, value]) => ({
    name: key,
    type:
      typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number'
          ? Number.isInteger(value)
            ? 'integer'
            : 'number'
          : 'string',
  }));
}

/**
 * DescribeFeatureType: the geometry element typed from the configured layer of the same id
 * (a type without one, like test:points, advertises a generic gml:GeometryPropertyType) and
 * one element per schema field of the layer configured under that id or typeName (else per
 * property of the first seed feature).
 */
async function describeFeatureType(base: string, name: string): Promise<string | undefined> {
  if (!data.has(name)) return undefined;
  const layers = await configuredLayers();
  const geometryType = layers.find((l) => l.id === name)?.geometryType;
  const geometry = `gml:${GML_PROPERTY_TYPES[geometryType ?? ''] ?? 'GeometryPropertyType'}`;
  const fields = (configuredFor(layers, name)?.schema?.fields ?? inferredFields(name)).map(
    (field) => {
      const occurs = field.required
        ? 'minOccurs="1" nillable="false"'
        : 'minOccurs="0" nillable="true"';
      if (field.type === 'enum') {
        const numeric = (field.values ?? []).every((v) => typeof v === 'number');
        const values = (field.values ?? [])
          .map((v) => `<xsd:enumeration value="${escapeXml(String(v))}"/>`)
          .join('');
        return `          <xsd:element name="${escapeXml(field.name)}" maxOccurs="1" ${occurs}><xsd:simpleType><xsd:restriction base="${numeric ? 'xsd:int' : 'xsd:string'}">${values}</xsd:restriction></xsd:simpleType></xsd:element>`;
      }
      return `          <xsd:element name="${escapeXml(field.name)}" maxOccurs="1" ${occurs} type="${XSD_TYPES[field.type] ?? 'xsd:string'}"/>`;
    },
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:gml="http://www.opengis.net/gml" xmlns:test="${base}/test" targetNamespace="${base}/test" elementFormDefault="qualified">
  <xsd:complexType name="${escapeXml(name)}Type">
    <xsd:complexContent>
      <xsd:extension base="gml:AbstractFeatureType">
        <xsd:sequence>
          <xsd:element name="geometry" maxOccurs="1" minOccurs="0" nillable="true" type="${geometry}"/>
${fields.join('\n')}
        </xsd:sequence>
      </xsd:extension>
    </xsd:complexContent>
  </xsd:complexType>
  <xsd:element name="${escapeXml(name)}" type="test:${escapeXml(name)}Type" substitutionGroup="gml:_Feature"/>
</xsd:schema>
`;
}

function handleWms(url: URL, res: ServerResponse): void {
  const params = new Map<string, string>();
  for (const [key, value] of url.searchParams) params.set(key.toLowerCase(), value);
  const request = (params.get('request') ?? '').toLowerCase();
  const size = (key: string) =>
    Math.max(1, Math.min(2048, Math.round(Number(params.get(key))) || 256));
  const png = (key: string, make: () => Buffer): Buffer => {
    let image = pngCache.get(key);
    if (!image) {
      image = make();
      pngCache.set(key, image);
    }
    return image;
  };
  switch (request) {
    case 'getcapabilities':
      return send(res, 200, wmsCapabilities(`http://localhost:${PORT}`), MIME['.xml']);
    case 'getmap': {
      const layer = (params.get('layers') ?? '').split(',')[0] ?? '';
      const color = WMS_COLORS[layer] ?? WMS_DEFAULT_COLOR;
      const width = size('width');
      const height = size('height');
      const image = png(`map:${layer}:${width}x${height}`, () => hatchTile(width, height, color));
      return send(res, 200, image, MIME['.png']);
    }
    case 'getlegendgraphic': {
      const layer = params.get('layer') ?? '';
      const color = WMS_COLORS[layer] ?? WMS_DEFAULT_COLOR;
      return send(
        res,
        200,
        png(`legend:${layer}`, () => legendImage(color)),
        MIME['.png'],
      );
    }
    case 'getfeatureinfo': {
      const names = (params.get('query_layers') ?? params.get('layers') ?? '')
        .split(',')
        .filter(Boolean);
      const layers = wmsLayers();
      const features = names.flatMap((name) => {
        const layer = layers.find((l) => l.name === name);
        if (!layer?.queryable) return [];
        return [
          {
            type: 'Feature',
            id: `${name}.1`,
            geometry: null,
            properties: {
              layer: name,
              title: layer.title,
              pixel: `${params.get('i') ?? params.get('x') ?? '?'},${params.get('j') ?? params.get('y') ?? '?'}`,
            },
          },
        ];
      });
      return send(
        res,
        200,
        {
          type: 'FeatureCollection',
          features,
          totalFeatures: features.length,
          numberReturned: features.length,
        },
        MIME['.geojson'],
      );
    }
    default:
      return send(res, 400, { error: `unsupported WMS request "${params.get('request') ?? ''}"` });
  }
}

async function sendFile(res: ServerResponse, base: string, rel: string): Promise<void> {
  const path = normalize(join(base, rel));
  if (!path.startsWith(base) || !existsSync(path)) return send(res, 404, { error: 'not found' });
  send(res, 200, await readFile(path), MIME[extname(path)] ?? 'application/octet-stream');
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') return send(res, 204, '');

  if (method === 'GET' && pathname === '/config') {
    // The layers live in their own file (editability and attribute schema per layer) and are
    // merged into the editor configuration here, so the library still receives one object.
    const config = JSON.parse(await readFile(join(ROOT, 'config/test-config.json'), 'utf8'));
    const { layers } = JSON.parse(await readFile(join(ROOT, 'config/layers.json'), 'utf8'));
    if (!Array.isArray(layers)) {
      return send(res, 500, { error: 'config/layers.json must contain a "layers" array' });
    }
    return send(res, 200, { ...config, layers });
  }
  if (method === 'GET' && pathname.startsWith('/data/')) {
    const file = decodeURIComponent(pathname.slice('/data/'.length));
    const layer = file.replace(/\.geojson$/, '');
    const collection = data.get(layer);
    if (collection) return send(res, 200, collection, MIME['.geojson']);
    if (file.includes('.')) return sendFile(res, join(ROOT, 'data'), file);
    return send(res, 404, { error: `unknown layer "${layer}"` });
  }
  if (method === 'GET' && pathname === '/wfs') {
    const params = new Map<string, string>();
    for (const [key, value] of url.searchParams) params.set(key.toLowerCase(), value);
    // Feature types are advertised as test:<layer>; the seed data is keyed by <layer>.
    const typeName = (params.get('typename') ?? params.get('typenames'))?.replace(/^test:/, '');
    const request = params.get('request')?.toLowerCase() ?? 'getfeature';
    if (url.searchParams.get('fail') === '1') {
      return send(res, 500, { error: 'simulated WFS failure (fail=1)' });
    }
    if (url.searchParams.get('auth') === '1' && !req.headers.authorization) {
      return send(res, 401, { error: 'Authorization header required (auth=1)' });
    }
    const base = `http://${req.headers.host ?? `localhost:${PORT}`}`;
    if (request === 'getcapabilities') {
      const xml = await wfsCapabilities(
        base,
        params.get('version') === '2.0.0' ? '2.0.0' : '1.1.0',
      );
      return send(res, 200, xml, 'text/xml; charset=utf-8');
    }
    if (request === 'describefeaturetype') {
      const xsd = typeName ? await describeFeatureType(base, typeName) : undefined;
      if (!xsd) return send(res, 400, { error: `unknown typeName "${typeName}"` });
      return send(res, 200, xsd, 'text/xml; charset=utf-8');
    }
    const once = url.searchParams.get('failonce');
    if (once && typeName && !failedOnce.has(`${typeName}:${once}`)) {
      failedOnce.add(`${typeName}:${once}`);
      return send(res, 503, { error: `simulated transient failure (failonce=${once})` });
    }
    const collection = typeName ? data.get(typeName) : undefined;
    if (!collection) return send(res, 400, { error: `unknown typeName "${typeName}"` });
    if (!/json/i.test(url.searchParams.get('outputFormat') ?? '')) {
      return send(res, 400, {
        error: 'this emulation only supports outputFormat=application/json',
      });
    }
    const srsName = url.searchParams.get('srsName') ?? 'EPSG:4326';
    const bboxParam = url.searchParams.get('bbox');
    const matched = collection.features
      .map((f) => ({ ...f, geometry: transformGeometry(f.geometry, srsName) }))
      .filter(
        (f) => !bboxParam || intersects(f.geometry, bboxParam.split(',').slice(0, 4).map(Number)),
      );
    // Paging: WFS 2.0.0 count + startIndex, or the 1.x maxFeatures.
    const start = Math.max(0, Number(url.searchParams.get('startIndex')) || 0);
    const limit =
      Number(url.searchParams.get('count') ?? url.searchParams.get('maxFeatures')) || undefined;
    const features =
      limit === undefined ? matched.slice(start) : matched.slice(start, start + limit);
    return send(
      res,
      200,
      {
        type: 'FeatureCollection',
        features,
        totalFeatures: matched.length,
        numberMatched: matched.length,
        numberReturned: features.length,
      },
      MIME['.geojson'],
    );
  }
  if (method === 'GET' && pathname === '/wms') return handleWms(url, res);
  if (method === 'GET' && pathname === '/changes/log') return send(res, 200, log);
  if (method === 'POST' && pathname === '/changes') {
    if (url.searchParams.get('fail') === '1') {
      return send(res, 500, { error: 'simulated server failure (fail=1)' });
    }
    try {
      const changeSet = validateChangeSet(await readJson(req));
      const idMap = applyChangeSet(changeSet);
      log.push({ receivedAt: new Date().toISOString(), changeSet, idMap });
      return send(res, 200, { idMap });
    } catch (error) {
      return send(res, 400, { error: (error as Error).message });
    }
  }
  if (method === 'POST' && pathname === '/reset') {
    resetData();
    failedOnce.clear();
    return send(res, 200, { ok: true });
  }

  if (method === 'GET') {
    if (pathname === '/vendor/ol.js')
      return sendFile(res, join(REPO, 'node_modules/ol'), 'dist/ol.js');
    if (pathname === '/vendor/ol.css')
      return sendFile(res, join(REPO, 'node_modules/ol'), 'ol.css');
    if (pathname === '/vendor/geotiff.js') return sendFile(res, GEOTIFF_BROWSER, 'geotiff.js');
    if (pathname === '/vendor/proj4.js') {
      return sendFile(res, join(REPO, 'node_modules/proj4/dist'), 'proj4.js');
    }
    if (pathname.startsWith('/dist/'))
      return sendFile(res, join(REPO, 'dist'), pathname.slice('/dist/'.length));
    return sendFile(res, join(ROOT, 'public'), pathname === '/' ? 'index.html' : pathname);
  }
  send(res, 405, { error: 'method not allowed' });
}

await loadSeed();
createServer((req, res) => {
  handle(req, res).catch((error: Error) => send(res, 500, { error: error.message }));
}).listen(PORT, () => {
  console.log(
    `ol-cad test server: http://localhost:${PORT}/  (layers: ${[...data.keys()].join(', ')})`,
  );
  if (!existsSync(join(REPO, 'dist/ol-cad.umd.js'))) {
    console.warn(
      'dist/ol-cad.umd.js not found. Run `pnpm build` so the test page can load the library.',
    );
  }
});
