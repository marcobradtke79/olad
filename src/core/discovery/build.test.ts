// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { validateLayerConfig, validateOverlayConfig } from '../config/validate';
import { buildWfsLayerConfig, buildWmsOverlayConfig, knownCrs, workspaceOf } from './build';
import { readDescribeFeatureType } from './describeFeatureType';
import { fixture } from './fixtures/fixture';
import { readWfsCapabilities } from './wfsCapabilities';
import { readWmsCapabilities } from './wmsCapabilities';

const wfsCaps = readWfsCapabilities(fixture('wfs-1.1.0.xml'));
const [parcelsSchema] = readDescribeFeatureType(fixture('describe-parcels.xsd'));
const wmsCaps = readWmsCapabilities(fixture('wms-1.3.0.xml'));

describe('workspaceOf and knownCrs', () => {
  it('splits the workspace and normalises CRS names OpenLayers knows', () => {
    expect(workspaceOf('topp:roads')).toBe('topp');
    expect(workspaceOf('roads')).toBeUndefined();
    expect(knownCrs('urn:ogc:def:crs:EPSG::4326')).toBe('EPSG:4326');
    expect(knownCrs('urn:x-ogc:def:crs:EPSG:3857')).toBe('EPSG:3857');
    expect(knownCrs('http://www.opengis.net/gml/srs/epsg.xml#4326')).toBe('EPSG:4326');
    expect(knownCrs('CRS:84')).toBe('EPSG:4326');
    expect(knownCrs('urn:x-ogc:def:crs:EPSG:25832')).toBeUndefined(); // not registered here
    expect(knownCrs(undefined)).toBeUndefined();
  });
});

describe('buildWfsLayerConfig', () => {
  const geometry = parcelsSchema!.geometry!;
  it('builds a read-only bbox WFS layer with schema, extent and workspace group', () => {
    const config = buildWfsLayerConfig(
      wfsCaps.featureTypes[0]!,
      { ...parcelsSchema!, geometry },
      { type: 'wfs', url: '/geoserver/wfs' },
      wfsCaps,
    );
    expect(config).toEqual({
      id: 'topp:parcels',
      title: 'Parcels',
      source: {
        format: 'wfs',
        url: '/geoserver/wfs',
        typeName: 'topp:parcels',
        version: '1.1.0',
        outputFormat: 'application/json',
        strategy: 'bbox',
      },
      geometryType: 'MultiPolygon',
      schema: { fields: parcelsSchema!.fields },
      editable: false,
      group: 'topp',
      extent: [9.9, 53.5, 10.1, 53.6],
      extentProjection: 'EPSG:4326',
    });
    expect(() => validateLayerConfig(config)).not.toThrow();
  });

  it('applies defaults, the configured output format, version, fetch and data projection', () => {
    const config = buildWfsLayerConfig(
      wfsCaps.featureTypes[1]!,
      { ...parcelsSchema!, geometry },
      {
        type: 'wfs',
        url: '/wfs',
        version: '2.0.0',
        outputFormat: 'GML3',
        fetch: { credentials: 'include' },
        defaults: { visible: false, editable: true, minZoom: 10, group: 'Discovered' },
      },
      wfsCaps,
    );
    expect(config).toMatchObject({
      source: {
        version: '2.0.0',
        outputFormat: 'GML3',
        dataProjection: 'EPSG:4326',
        fetch: { credentials: 'include' },
      },
      visible: false,
      editable: true,
      minZoom: 10,
      group: 'Discovered',
    });
    expect(() => validateLayerConfig(config)).not.toThrow();
  });

  it('leaves the output format to GML when the service offers no JSON', () => {
    const config = buildWfsLayerConfig(
      wfsCaps.featureTypes[0]!,
      { ...parcelsSchema!, geometry },
      { type: 'wfs', url: '/wfs' },
      { ...wfsCaps, outputFormats: ['GML2'] },
    );
    expect(config.source.outputFormat).toBeUndefined();
  });
});

describe('buildWmsOverlayConfig', () => {
  it('builds a tiled transparent overlay on the configured URL', () => {
    const config = buildWmsOverlayConfig(
      wmsCaps.layers[0]!,
      { type: 'wms', url: '/geoserver/wms' },
      wmsCaps,
      'EPSG:3857',
    );
    expect(config).toEqual({
      id: 'topp:roads',
      type: 'wms',
      title: 'Roads',
      url: '/geoserver/wms',
      params: { LAYERS: 'topp:roads', TRANSPARENT: true, VERSION: '1.3.0', FORMAT: 'image/png' },
      tiled: true,
      queryable: true,
      legendUrl: 'http://proxy.internal/legend?layer=topp:roads',
      minZoom: 10.13,
      maxZoom: 19.09,
      extent: [9, 53, 11, 54],
      extentProjection: 'EPSG:4326',
      attribution: '<a href="https://topp.example/">Topp &amp; friends</a>',
      group: 'Base group',
    });
    expect(() => validateOverlayConfig(config)).not.toThrow();
  });

  it('applies defaults and requests EPSG:3857 when the view projection is not offered', () => {
    const config = buildWmsOverlayConfig(
      wmsCaps.layers[3]!,
      {
        type: 'wms',
        url: '/wms',
        defaults: {
          visible: false,
          opacity: 0.8,
          tiled: false,
          serverType: 'geoserver',
          crossOrigin: 'anonymous',
          params: { STYLES: '', LAYERS: 'ignored' },
          attribution: 'Mine',
          minZoom: 3,
          group: 'G',
        },
      },
      wmsCaps,
      'EPSG:25832',
    );
    expect(config).toMatchObject({
      id: 'loose',
      params: { STYLES: '', LAYERS: 'loose', TRANSPARENT: true },
      tiled: false,
      visible: false,
      opacity: 0.8,
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
      attribution: 'Mine',
      minZoom: 3,
      group: 'G',
      projection: 'EPSG:3857',
    });
    expect(config.maxZoom).toBeUndefined();
  });
});
