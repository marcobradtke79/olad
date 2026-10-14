// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { register } from 'ol/proj/proj4';
import { fromLonLat } from 'ol/proj';
import proj4 from 'proj4';
import { beforeAll, describe, expect, it } from 'vitest';
import { EXPORT_FORMATS, exportLayers, type ExportLayer } from './exportLayers';

beforeAll(() => {
  proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
  register(proj4);
});

const ll = (lon: number, lat: number) => fromLonLat([lon, lat]);

function layers(): ExportLayer[] {
  const point = new Feature({ geometry: new Point(ll(8.4, 49)), owner: 'Bauer & Co', n: 2 });
  point.setId(7);
  const parcel = new Feature({
    geometry: new Polygon([[ll(8, 49), ll(8.1, 49), ll(8.1, 49.1), ll(8, 49)]]),
    owner: 'Adler',
    tags: { a: 1 },
    'bad name': 'x',
  });
  parcel.setId(1);
  const road = new Feature({ geometry: new LineString([ll(8, 49), ll(8.1, 49.2)]), name: 'Main' });
  const lamps = new Feature({ geometry: new MultiPoint([ll(8, 49)]) });
  return [
    { id: 'parcels', title: 'Parcels', features: [parcel, point] },
    { id: 'roads', title: 'Roads / main', features: [road, lamps] },
  ];
}

const NOW = new Date('2026-10-14T10:00:00Z');

describe('exportLayers', () => {
  it('writes one GeoJSON FeatureCollection in EPSG:4326 with the layer of each feature', () => {
    const input = layers();
    const result = exportLayers(input, { format: 'geojson' }, 'EPSG:3857', NOW);
    expect(result).toMatchObject({
      mimeType: 'application/geo+json',
      filename: 'export-2026-10-14.geojson',
      featureCount: 4,
      skipped: 0,
    });
    const json = JSON.parse(result.content);
    expect(json.type).toBe('FeatureCollection');
    expect(json.crs).toBeUndefined();
    expect(json.features.map((f: { properties: { layer: string } }) => f.properties.layer)).toEqual(
      ['parcels', 'parcels', 'roads', 'roads'],
    );
    const point = json.features[1];
    expect(point.id).toBe(7);
    expect(point.properties).toEqual({ owner: 'Bauer & Co', n: 2, layer: 'parcels' });
    expect(point.geometry.coordinates).toEqual([8.4, 49]);
    // The features themselves are untouched.
    expect(input[0]!.features[1]!.get('layer')).toBeUndefined();
    expect((input[0]!.features[1]!.getGeometry() as Point).getCoordinates()).toEqual(ll(8.4, 49));
  });

  it('writes GeoJSON in another CRS with a crs member and metric decimals', () => {
    const result = exportLayers(
      layers().slice(0, 1),
      { format: 'geojson', projection: 'EPSG:25832' },
      'EPSG:3857',
    );
    const json = JSON.parse(result.content);
    expect(json.crs.properties.name).toBe('urn:ogc:def:crs:EPSG::25832');
    const [x, y] = json.features[1].geometry.coordinates;
    expect(x).toBeGreaterThan(400000);
    expect(y).toBeGreaterThan(5400000);
    expect(String(x).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);
    expect(result.filename).toBe('Parcels.geojson');
  });

  it('writes KML with one Folder per layer, attributes as ExtendedData, always lon/lat', () => {
    const result = exportLayers(layers(), { format: 'kml', projection: 'EPSG:25832' }, 'EPSG:3857');
    expect(result.content).toMatch(/^<\?xml/);
    expect(result.content.match(/<Folder>/g)).toHaveLength(2);
    expect(result.content).toContain('<Folder><name>Parcels</name>');
    expect(result.content).toContain('<name>Roads / main</name>');
    expect(result.content).toContain(
      '<Data name="owner"><value><![CDATA[Bauer & Co]]></value></Data>',
    );
    expect(result.content).toContain('<Data name="tags"><value>{"a":1}</value></Data>');
    expect(result.content).not.toContain('bad name');
    expect(result.content).toContain('<coordinates>8.4,49</coordinates>');
    expect(result.filename).toBe('export-' + new Date().toISOString().slice(0, 10) + '.kml');
    const doc = new DOMParser().parseFromString(result.content, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('keeps a layer with a single object in its KML folder', () => {
    const single: ExportLayer = {
      id: 'roads',
      title: 'Roads',
      features: [new Feature({ geometry: new LineString([ll(8, 49), ll(8.1, 49.2)]), name: 'L' })],
    };
    const result = exportLayers([single], { format: 'kml' }, 'EPSG:3857');
    expect(result.content).toMatch(
      /<Folder><name>Roads<\/name><Placemark>.*<\/Placemark><\/Folder>/,
    );
    expect(result.featureCount).toBe(1);
  });

  it('writes GML 3.2 with a feature type per layer and gml:id', () => {
    const result = exportLayers(layers(), { format: 'gml' }, 'EPSG:3857');
    const doc = new DOMParser().parseFromString(result.content, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    const ns = 'urn:ol-cad:export';
    expect(doc.getElementsByTagNameNS(ns, 'parcels')).toHaveLength(2);
    expect(doc.getElementsByTagNameNS(ns, 'roads')).toHaveLength(2);
    expect(result.content).toContain('gml:id="parcels.7"');
    expect(result.content).toContain('srsName="EPSG:4326"');
    // EPSG:4326 in GML has latitude first.
    expect(result.content).toContain('<pos srsDimension="2">49 8.4</pos>');
    expect(result.featureCount).toBe(4);
  });

  it('writes GPX with waypoints before routes and skips polygons and multi-points', () => {
    const result = exportLayers(layers(), { format: 'gpx' }, 'EPSG:3857');
    expect(result.featureCount).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.content.indexOf('<wpt')).toBeLessThan(result.content.indexOf('<rte'));
    expect(result.content).toContain('<wpt lat="49" lon="8.4"><name>Parcels 7</name></wpt>');
    expect(result.content).toContain('<name>Main</name>');
  });

  it('rejects an empty selection and unknown formats', () => {
    expect(() => exportLayers([], { format: 'geojson' }, 'EPSG:3857')).toThrow(/no layer/);
    expect(() => exportLayers(layers(), { format: 'shp' as never }, 'EPSG:3857')).toThrow(
      /Unknown/,
    );
    expect(EXPORT_FORMATS.map((f) => f.id)).toEqual(['geojson', 'kml', 'gml', 'gpx']);
  });
});
