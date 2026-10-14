// @vitest-environment jsdom
import proj4 from 'proj4';
import { fromLonLat } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import { describe, expect, it } from 'vitest';
import { resolveLayer } from '../config/defaults';
import type { LayerConfig } from '../config/types';
import { OriginalStore } from './originals';
import { createFormat, normalizeCode, readFeatures, wfsUrl } from './vector';

proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);
register(proj4);

function read(
  partial: Partial<LayerConfig> & { source: LayerConfig['source'] },
  data: string | object,
) {
  const layer = resolveLayer({ id: 't', geometryType: 'Point', ...partial });
  const originals = new OriginalStore();
  const result = readFeatures(layer, createFormat(layer.source), data, 'EPSG:3857', originals);
  return { ...result, originals };
}

const near = (a: number[], b: number[], tolerance = 0.5) =>
  a.every((v, i) => Math.abs(v - b[i]!) < tolerance);

describe('readFeatures', () => {
  it('reads GeoJSON, transforms to the view projection and keeps the original', () => {
    const { features, dataProjection, originals } = read(
      { source: { format: 'geojson', data: '' }, idProperty: 'pid' },
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { pid: 7 },
            geometry: { type: 'Point', coordinates: [8.4, 49] },
          },
        ],
      },
    );
    expect(dataProjection).toBe('EPSG:4326');
    expect(features).toHaveLength(1);
    const feature = features[0]!;
    expect(feature.getId()).toBe(7);
    expect(near(feature.getGeometry()!.getExtent().slice(0, 2), fromLonLat([8.4, 49]), 1e-6)).toBe(
      true,
    );
    const original = originals.get(feature)!;
    expect(original.projection).toBe('EPSG:4326');
    expect(original.geometry.getExtent()).toEqual([8.4, 49, 8.4, 49]);
  });

  it('reads inline features', () => {
    const { features } = read(
      {
        source: {
          features: [
            {
              type: 'Feature',
              id: 'a',
              properties: {},
              geometry: { type: 'Point', coordinates: [0, 0] },
            },
          ],
        },
      },
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'a',
            properties: {},
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
        ],
      },
    );
    expect(features[0]!.getId()).toBe('a');
  });

  it('reads WKT in a configured projection', () => {
    const { features, dataProjection } = read(
      {
        source: {
          format: 'wkt',
          data: 'GEOMETRYCOLLECTION(POINT(456000 5428000),POINT(456100 5428100))',
          dataProjection: 'EPSG:25832',
        },
      },
      'GEOMETRYCOLLECTION(POINT(456000 5428000),POINT(456100 5428100))',
    );
    expect(dataProjection).toBe('EPSG:25832');
    expect(features).toHaveLength(2);
    expect(
      near(features[0]!.getGeometry()!.getExtent().slice(0, 2), fromLonLat([8.4, 49]), 1000),
    ).toBe(true);
  });

  it('reads KML and GPX', () => {
    const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
      <Placemark><name>h1</name><Point><coordinates>8.4,49,0</coordinates></Point></Placemark></Document></kml>`;
    expect(read({ source: { format: 'kml', data: kml } }, kml).features).toHaveLength(1);
    const gpx = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
      <rte><rtept lat="49" lon="8.4"/><rtept lat="49.1" lon="8.5"/></rte></gpx>`;
    const { features } = read(
      { source: { format: 'gpx', data: gpx }, geometryType: 'LineString' },
      gpx,
    );
    expect(features[0]!.getGeometry()!.getType()).toBe('LineString');
  });

  it('reads GML with srsName as the data projection', () => {
    const gml = `<?xml version="1.0"?>
      <gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:t="http://example.com/t">
        <gml:featureMember><t:tree gml:id="t1"><t:geom>
          <gml:Point srsName="EPSG:25832"><gml:pos>456000 5428000</gml:pos></gml:Point>
        </t:geom><t:species>oak</t:species></t:tree></gml:featureMember>
      </gml:FeatureCollection>`;
    const { features, dataProjection, originals } = read(
      { source: { format: 'gml', data: gml } },
      gml,
    );
    expect(dataProjection).toBe('EPSG:25832');
    expect(
      near(features[0]!.getGeometry()!.getExtent().slice(0, 2), fromLonLat([8.4, 49]), 1000),
    ).toBe(true);
    expect(features).toHaveLength(1);
    expect(features[0]!.get('species')).toBe('oak');
    expect(originals.get(features[0]!)!.geometry.getExtent().slice(0, 2)).toEqual([
      456000, 5428000,
    ]);
  });

  it('reads TopoJSON', () => {
    const topo = {
      type: 'Topology',
      objects: {
        b: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0]], id: 'b1' }] },
      },
      arcs: [
        [
          [8.4, 49],
          [8.41, 49],
          [8.41, 49.01],
          [8.4, 49.01],
          [8.4, 49],
        ],
      ],
    };
    const { features } = read(
      { source: { format: 'topojson', data: topo }, geometryType: 'Polygon' },
      topo,
    );
    expect(features).toHaveLength(1);
    expect(features[0]!.getGeometry()!.getType()).toBe('Polygon');
  });

  it('parses WFS JSON output with GeoJSON and defaults the data projection to the view', () => {
    const data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'l1',
          properties: {},
          geometry: { type: 'Point', coordinates: [935000, 6270000] },
        },
      ],
    };
    const { dataProjection, features } = read(
      {
        source: { format: 'wfs', url: '/wfs', typeName: 'lamps', outputFormat: 'application/json' },
      },
      data,
    );
    expect(dataProjection).toBe('EPSG:3857');
    expect(features[0]!.getGeometry()!.getExtent().slice(0, 2)).toEqual([935000, 6270000]);
  });
});

describe('normalizeCode', () => {
  it('maps URN and URL forms to registered codes', () => {
    expect(normalizeCode('urn:ogc:def:crs:EPSG::25832')).toBe('EPSG:25832');
    expect(normalizeCode('http://www.opengis.net/gml/srs/epsg.xml#4326')).toBe('EPSG:4326');
    expect(normalizeCode('EPSG:3857')).toBe('EPSG:3857');
    expect(normalizeCode('EPSG:999999')).toBeUndefined();
  });
});

describe('wfsUrl', () => {
  it('builds a GetFeature request with bbox', () => {
    const url = new URL(
      wfsUrl(
        {
          format: 'wfs',
          url: 'https://example.com/wfs?map=x',
          typeName: 'ns:parcels',
          outputFormat: 'application/json',
        },
        [1, 2, 3, 4],
        'EPSG:3857',
      ),
    );
    expect(url.searchParams.get('map')).toBe('x');
    expect(url.searchParams.get('request')).toBe('GetFeature');
    expect(url.searchParams.get('typeName')).toBe('ns:parcels');
    expect(url.searchParams.get('version')).toBe('1.1.0');
    expect(url.searchParams.get('bbox')).toBe('1,2,3,4,EPSG:3857');
    expect(url.searchParams.get('outputFormat')).toBe('application/json');
  });

  it('uses typeNames for WFS 2.0.0 and omits an infinite bbox', () => {
    const url = new URL(
      wfsUrl(
        { format: 'wfs', url: 'https://example.com/wfs', typeName: 'a', version: '2.0.0' },
        [-Infinity, -Infinity, Infinity, Infinity],
        'EPSG:4326',
      ),
    );
    expect(url.searchParams.get('typeNames')).toBe('a');
    expect(url.searchParams.has('bbox')).toBe(false);
  });
});
