// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat, toLonLat } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportLayers, type ExportLayer } from '../export/exportLayers';
import { ImportError, readImport, type ImportGroup } from './readImport';

beforeAll(() => {
  proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
  register(proj4);
});

const VIEW = 'EPSG:3857';
const ll = (lon: number, lat: number) => fromLonLat([lon, lat]);
const square = (lon: number, lat: number) => [
  [
    ll(lon, lat),
    ll(lon + 0.01, lat),
    ll(lon + 0.01, lat + 0.01),
    ll(lon, lat + 0.01),
    ll(lon, lat),
  ],
];

function sample(): ExportLayer[] {
  const parcel = new Feature({
    geometry: new Polygon(square(8, 49)),
    owner: 'Adler',
    area: 12.5,
    ok: true,
  });
  parcel.setId(1);
  const parcel2 = new Feature({
    geometry: new Polygon(square(8.1, 49)),
    owner: 'Bauer',
    area: 3,
    ok: false,
  });
  const road = new Feature({
    geometry: new LineString([ll(8, 49), ll(8.1, 49.2)]),
    name: 'Main',
    lanes: 2,
  });
  const hydrant = new Feature({ geometry: new Point(ll(8.4, 49)), name: 'H1' });
  return [
    { id: 'parcels', title: 'Parcels', features: [parcel, parcel2] },
    { id: 'roads', title: 'Roads', features: [road] },
    { id: 'hydrants', title: 'Hydrants', features: [hydrant] },
  ];
}

const summary = (groups: ImportGroup[]) =>
  groups.map((g) => ({ name: g.name, type: g.geometryType, count: g.features.length }));
const lonLat = (f: Feature) =>
  toLonLat((f.getGeometry() as Point).getCoordinates()).map((v) => +v.toFixed(6));

describe('readImport', () => {
  it('round-trips our GeoJSON: groups by layer, keeps attribute types', () => {
    const text = exportLayers(sample(), { format: 'geojson' }, VIEW).content;
    const preview = readImport(text, { filename: 'export.geojson', viewProjection: VIEW });
    expect(preview.format).toBe('geojson');
    expect(preview.dataProjection).toBe('EPSG:4326');
    expect(summary(preview.groups)).toEqual([
      { name: 'parcels', type: 'Polygon', count: 2 },
      { name: 'roads', type: 'LineString', count: 1 },
      { name: 'hydrants', type: 'Point', count: 1 },
    ]);
    expect(preview.groups[0]!.fields).toEqual([
      { name: 'owner', type: 'string' },
      { name: 'area', type: 'number' },
      { name: 'ok', type: 'boolean' },
    ]);
    const parcel = preview.groups[0]!.features[0]!;
    expect(parcel.getId()).toBeUndefined();
    expect(parcel.get('layer')).toBeUndefined();
    expect(parcel.get('area')).toBe(12.5);
    expect(lonLat(preview.groups[2]!.features[0]!)).toEqual([8.4, 49]);
  });

  it('splits mixed groups by family, wraps singles into the multi type and names them', () => {
    const json = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { 'street name': 'A', '1st': 1 },
          geometry: { type: 'Point', coordinates: [8, 49] },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [8, 49],
                [8.1, 49],
                [8.1, 49.1],
                [8, 49],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: new MultiPolygon([]).getType() && {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [9, 49],
                  [9.1, 49],
                  [9.1, 49.1],
                  [9, 49],
                ],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'GeometryCollection', geometries: [] },
        },
        { type: 'Feature', properties: {}, geometry: null },
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 1],
                [1, 0],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };
    const preview = readImport(JSON.stringify(json), {
      filename: 'site plan.json',
      viewProjection: VIEW,
    });
    expect(summary(preview.groups)).toEqual([
      { name: 'site plan – points', type: 'Point', count: 1 },
      { name: 'site plan – polygons', type: 'MultiPolygon', count: 2 },
    ]);
    expect(preview.groups[1]!.invalid).toBe(1); // the bow tie
    expect(preview.skipped).toBe(2);
    expect(preview.groups[0]!.fields).toEqual([
      { name: 'street_name', type: 'string', label: 'street name' },
      { name: '_1st', type: 'integer', label: '1st' },
    ]);
    expect(preview.groups[0]!.features[0]!.get('street_name')).toBe('A');
  });

  it('reads the crs member of GeoJSON and refuses unregistered ones', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [460000, 5430000] },
    };
    const crs = (name: string) => ({ type: 'name', properties: { name } });
    const preview = readImport(
      JSON.stringify({
        type: 'FeatureCollection',
        crs: crs('urn:ogc:def:crs:EPSG::25832'),
        features: [feature],
      }),
      { viewProjection: VIEW },
    );
    expect(preview.dataProjection).toBe('EPSG:25832');
    expect(lonLat(preview.groups[0]!.features[0]!)[0]).toBeCloseTo(8.45, 1);
    expect(() =>
      readImport(
        JSON.stringify({ type: 'FeatureCollection', crs: crs('EPSG:31467'), features: [] }),
        {
          viewProjection: VIEW,
        },
      ),
    ).toThrow(/EPSG:31467, which is not registered/);
  });

  it('reads KML folders as groups, with numbers and booleans from ExtendedData text', () => {
    const text = exportLayers(sample(), { format: 'kml' }, VIEW).content;
    const preview = readImport(text, { viewProjection: VIEW });
    expect(preview.format).toBe('kml');
    expect(summary(preview.groups)).toEqual([
      { name: 'Parcels', type: 'Polygon', count: 2 },
      { name: 'Roads', type: 'LineString', count: 1 },
      { name: 'Hydrants', type: 'Point', count: 1 },
    ]);
    expect(preview.groups[0]!.fields).toEqual([
      { name: 'area', type: 'number' },
      { name: 'ok', type: 'boolean' },
      { name: 'owner', type: 'string' },
    ]);
    expect(preview.groups[0]!.features[0]!.get('area')).toBe(12.5);
    expect(preview.groups[1]!.features[0]!.get('name')).toBe('Main');
  });

  it('reads KML without folders as one group named after the file', () => {
    const text = exportLayers([sample()[2]!], { format: 'kml' }, VIEW).content.replace(
      /<\/?Folder>|<name>Hydrants<\/name>/g,
      '',
    );
    const preview = readImport(text, { filename: 'points.kml', viewProjection: VIEW });
    expect(summary(preview.groups)).toEqual([{ name: 'points', type: 'Point', count: 1 }]);
  });

  it('reads our GML 3.2 per feature type, latitude-first EPSG:4326 included', () => {
    const text = exportLayers(sample(), { format: 'gml' }, VIEW).content;
    const preview = readImport(text, { filename: 'x.gml', viewProjection: VIEW });
    expect(summary(preview.groups)).toEqual([
      { name: 'parcels', type: 'Polygon', count: 2 },
      { name: 'roads', type: 'LineString', count: 1 },
      { name: 'hydrants', type: 'Point', count: 1 },
    ]);
    expect(lonLat(preview.groups[2]!.features[0]!)).toEqual([8.4, 49]);
    expect(preview.groups[1]!.fields).toEqual([
      { name: 'name', type: 'string' },
      { name: 'lanes', type: 'integer' },
    ]);
  });

  it('reads GML 3 from a WFS response in another CRS', () => {
    const text = `<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:t="urn:t"><gml:featureMember><t:trees><t:geom><gml:Point srsName="EPSG:25832"><gml:pos>460000 5430000</gml:pos></gml:Point></t:geom><t:kind>oak</t:kind></t:trees></gml:featureMember></wfs:FeatureCollection>`;
    const preview = readImport(text, { filename: 'trees.xml', viewProjection: VIEW });
    expect(preview.format).toBe('gml');
    expect(preview.dataProjection).toBe('EPSG:25832');
    expect(summary(preview.groups)).toEqual([{ name: 'trees', type: 'Point', count: 1 }]);
    expect(preview.groups[0]!.features[0]!.get('kind')).toBe('oak');
    expect(lonLat(preview.groups[0]!.features[0]!)[0]).toBeCloseTo(8.45, 1);
  });

  it('reads GPX waypoints and routes, splitting them into points and lines', () => {
    const text = exportLayers(sample(), { format: 'gpx' }, VIEW).content;
    const preview = readImport(text, { filename: 'tour.gpx', viewProjection: VIEW });
    expect(summary(preview.groups)).toEqual([
      { name: 'tour – points', type: 'Point', count: 1 },
      { name: 'tour – lines', type: 'LineString', count: 1 },
    ]);
  });

  it('detects formats from content and rejects unreadable files', () => {
    const kml = exportLayers(sample().slice(2), { format: 'kml' }, VIEW).content;
    expect(readImport(kml, { filename: 'data.xml', viewProjection: VIEW }).format).toBe('kml');
    expect(() => readImport('hello', { viewProjection: VIEW })).toThrow(ImportError);
    expect(() => readImport('{ nope', { filename: 'a.geojson', viewProjection: VIEW })).toThrow(
      /not valid JSON/,
    );
    expect(() => readImport('<a><b></a>', { filename: 'a.gml', viewProjection: VIEW })).toThrow(
      ImportError,
    );
  });
});
