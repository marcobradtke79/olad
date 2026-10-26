// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fixture } from './fixtures/fixture';
import { compileGlob, nameFilter } from './glob';
import { fieldTypeOf, geometryTypeOf, readDescribeFeatureType } from './describeFeatureType';
import { readWfsCapabilities } from './wfsCapabilities';
import { readWmsCapabilities, zoomForScaleDenominator } from './wmsCapabilities';

describe('glob', () => {
  it('matches * across the workspace colon and ? as one character', () => {
    const match = compileGlob(['topp:*', 'a?c']);
    expect(['topp:roads', 'topp:', 'abc', 'a.c'].map(match)).toEqual([true, true, true, true]);
    expect(['xtopp:roads', 'ac', 'abcd', 'Topp:roads'].map(match)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(compileGlob(['a.b'])('axb')).toBe(false); // regex characters are literal
  });

  it('includes everything without include and applies exclude after it', () => {
    expect(nameFilter()('x')).toBe(true);
    const filter = nameFilter(['test:*'], ['test:dim*']);
    expect(['test:lamps', 'test:dimensions', 'other:x'].map(filter)).toEqual([true, false, false]);
  });
});

describe('readWfsCapabilities', () => {
  it('reads 1.1.0: types, titles, CRS, WGS84 box and output formats', () => {
    const caps = readWfsCapabilities(fixture('wfs-1.1.0.xml'));
    expect(caps.version).toBe('1.1.0');
    expect(caps.title).toBe('GeoServer Web Feature Service');
    expect(caps.featureTypes.map((t) => t.name)).toEqual([
      'topp:parcels',
      'topp:points',
      'topp:tables',
      'other:roads',
    ]);
    expect(caps.featureTypes[0]).toEqual({
      name: 'topp:parcels',
      title: 'Parcels',
      abstract: 'Cadastral parcels',
      defaultCrs: 'urn:x-ogc:def:crs:EPSG:25832',
      otherCrs: ['urn:x-ogc:def:crs:EPSG:4326'],
      wgs84Bbox: [9.9, 53.5, 10.1, 53.6],
    });
    expect(caps.featureTypes[3]).toEqual({
      name: 'other:roads',
      defaultCrs: 'EPSG:3857',
      otherCrs: [],
    });
    expect(caps.outputFormats).toContain('application/json');
    expect(caps.outputFormats).not.toContain('hits');
  });

  it('reads 2.0.0 and 1.0.0 element names', () => {
    const two = readWfsCapabilities(fixture('wfs-2.0.0.xml'));
    expect(two.featureTypes[0]).toMatchObject({
      name: 'ws:lakes',
      defaultCrs: 'urn:ogc:def:crs:EPSG::4326',
      otherCrs: ['urn:ogc:def:crs:EPSG::3857'],
      wgs84Bbox: [1, 2, 3, 4],
    });
    expect(two.outputFormats).toEqual([
      'application/gml+xml; version=3.2',
      'application/json; subtype=geojson',
    ]);
    const one = readWfsCapabilities(fixture('wfs-1.0.0.xml'));
    expect(one.title).toBe('Old WFS');
    expect(one.featureTypes[0]).toMatchObject({
      name: 'rivers',
      defaultCrs: 'EPSG:4326',
      wgs84Bbox: [5, 45, 15, 55],
    });
    expect(one.outputFormats).toEqual(['GML2', 'JSON']);
  });

  it('throws for exception reports and other documents', () => {
    expect(() =>
      readWfsCapabilities(
        '<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows"><ows:Exception><ows:ExceptionText>No such service</ows:ExceptionText></ows:Exception></ows:ExceptionReport>',
      ),
    ).toThrow('No such service');
    expect(() => readWfsCapabilities('<html/>')).toThrow(/not a WFS capabilities/);
    expect(() => readWfsCapabilities('not xml <')).toThrow(/not valid XML/);
  });
});

describe('readDescribeFeatureType', () => {
  it('finds the first geometry and maps the other properties to fields', () => {
    const [parcels] = readDescribeFeatureType(fixture('describe-parcels.xsd'));
    expect(parcels).toEqual({
      name: 'parcels',
      geometry: { property: 'the_geom', geometryType: 'MultiPolygon' },
      geometryProperties: ['the_geom', 'centroid'],
      fields: [
        { name: 'owner', type: 'string', required: true },
        { name: 'area', type: 'number' },
        { name: 'usage', type: 'enum', values: ['residential', 'commercial'] },
      ],
    });
  });

  it('maps every scalar type and a generic geometry to Any', () => {
    const [points] = readDescribeFeatureType(fixture('describe-points.xsd'));
    expect(points!.geometry).toEqual({ property: 'geom', geometryType: 'Any' });
    expect(Object.fromEntries(points!.fields.map((f) => [f.name, f.type]))).toEqual({
      name: 'string',
      code: 'string',
      link: 'string',
      count: 'integer',
      big: 'integer',
      small: 'integer',
      tiny: 'integer',
      pos: 'integer',
      uns: 'integer',
      ratio: 'number',
      price: 'number',
      flag: 'boolean',
      day: 'date',
      stamp: 'string',
      clock: 'string',
      odd: 'string',
    });
    // nillable="false" without minOccurs="0" is required.
    expect(points!.fields.find((f) => f.name === 'name')!.required).toBe(true);
  });

  it('classifies GML property types and simple types', () => {
    expect(
      [
        'gml:PointPropertyType',
        'gml:MultiPointPropertyType',
        'gml:CurvePropertyType',
        'gml:MultiCurvePropertyType',
        'gml:SurfacePropertyType',
        'gml:PolygonPropertyType',
        'gml:MultiGeometryPropertyType',
        'xsd:string',
        'gml:CodeType',
      ].map(geometryTypeOf),
    ).toEqual([
      'Point',
      'MultiPoint',
      'LineString',
      'MultiLineString',
      'Polygon',
      'Polygon',
      'Any',
      undefined,
      undefined,
    ]);
    expect(fieldTypeOf('xs:nonNegativeInteger')).toBe('integer');
  });
});

describe('readWmsCapabilities', () => {
  it('reads named leaf layers with inherited CRS, scale, extent, attribution and queryable', () => {
    const caps = readWmsCapabilities(fixture('wms-1.3.0.xml'));
    expect(caps.version).toBe('1.3.0');
    expect(caps.formats).toEqual(['image/png', 'image/jpeg']);
    expect(caps.infoFormats).toEqual(['application/json', 'text/html']);
    expect(caps.layers.map((l) => l.name)).toEqual([
      'topp:roads',
      'topp:hillshade',
      'other:ortho',
      'loose',
    ]);
    expect(caps.layers[0]).toEqual({
      name: 'topp:roads',
      title: 'Roads',
      abstract: 'Road network',
      queryable: true,
      group: 'Base group',
      legendUrl: 'http://proxy.internal/legend?layer=topp:roads',
      minScale: 1000,
      maxScale: 500000,
      extent: [9, 53, 11, 54],
      crs: ['EPSG:4326', 'EPSG:3857', 'EPSG:25832'],
      attribution: '<a href="https://topp.example/">Topp &amp; friends</a>',
    });
    expect(caps.layers[1]).toMatchObject({
      queryable: false,
      minScale: 1000,
      maxScale: 100000,
      extent: [-180, -90, 180, 90],
      group: 'Base group',
    });
    expect(caps.layers[1]!.legendUrl).toBeUndefined();
    expect(caps.layers[2]!.group).toBe('Untitled-free');
    expect(caps.layers[3]!.group).toBeUndefined(); // the root layer is no group
  });

  it('reads 1.1.1 SRS lists and LatLonBoundingBox', () => {
    const caps = readWmsCapabilities(fixture('wms-1.1.1.xml'));
    expect(caps.version).toBe('1.1.1');
    expect(caps.layers).toEqual([
      {
        name: 'rivers',
        title: 'Rivers',
        queryable: true,
        extent: [5, 45, 15, 55],
        crs: ['EPSG:4326', 'EPSG:31467'],
      },
    ]);
  });

  it('throws for service exceptions', () => {
    expect(() =>
      readWmsCapabilities(
        '<ServiceExceptionReport><ServiceException>Layer unknown</ServiceException></ServiceExceptionReport>',
      ),
    ).toThrow('Layer unknown');
  });
});

describe('zoomForScaleDenominator', () => {
  it('uses 0.28 mm pixels on the default tile grid', () => {
    expect(zoomForScaleDenominator(559082264.03, 'EPSG:3857')).toBe(0);
    expect(zoomForScaleDenominator(559082264.03 / 2 ** 10, 'EPSG:3857')).toBe(10);
    expect(zoomForScaleDenominator(500000, 'EPSG:3857')).toBe(10.13);
    expect(zoomForScaleDenominator(0, 'EPSG:3857')).toBeUndefined();
    expect(zoomForScaleDenominator(1000, 'EPSG:9999')).toBeUndefined();
  });
});
