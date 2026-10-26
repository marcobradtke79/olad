import { describe, expect, it } from 'vitest';
import { applyDefaults } from './defaults';
import { validateConfig, validateOverlayConfig } from './validate';

const base = { target: 'map' };
const wms = { id: 'o', type: 'wms', url: '/wms', params: { LAYERS: 'x' } };

describe('validateConfig: overlays', () => {
  it('accepts every overlay type with its options', () => {
    expect(() =>
      validateConfig({
        ...base,
        overlays: [
          {
            id: 'a',
            type: 'xyz',
            url: 'https://t/{z}/{x}/{y}.png',
            title: 'A',
            visible: false,
            attribution: 'x',
            opacity: 0.5,
            minZoom: 8,
            maxZoom: 18,
            legendUrl: '/legend.png',
            sourceMinZoom: 0,
            sourceMaxZoom: 19,
            tileSize: 256,
            crossOrigin: 'anonymous',
          },
          {
            ...wms,
            id: 'b',
            tiled: false,
            serverType: 'geoserver',
            projection: 'EPSG:3857',
            crossOrigin: null,
          },
          { id: 'c', type: 'wmts', capabilitiesUrl: '/caps.xml', layer: 'web', matrixSet: 'm' },
          {
            id: 'd',
            type: 'vector-tile',
            url: 'https://t/{z}/{x}/{y}.pbf',
            format: 'mvt',
            sourceMaxZoom: 14,
            style: { 'stroke-color': '#999' },
          },
          { id: 'e', type: 'geotiff', sources: [{ url: '/a.tif' }], normalize: true },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects unknown types, keys and values with their path', () => {
    const fails = (overlay: Record<string, unknown>, path: string, message: RegExp) => {
      let error: unknown;
      try {
        validateConfig({ ...base, overlays: [overlay] });
      } catch (e) {
        error = e;
      }
      expect(error).toMatchObject({ path: `config.overlays[0].${path}` });
      expect((error as Error).message).toMatch(message);
    };
    fails({ id: 'o', type: 'osm' }, 'type', /expected one of xyz, wms/);
    fails({ ...wms, minZoom: 'x' }, 'minZoom', /number/);
    fails({ ...wms, sourceMinZoom: 1 }, 'sourceMinZoom', /unknown option/);
    fails({ id: 'o', type: 'xyz', url: 'u', minZoom: 'x' }, 'minZoom', /number/);
    fails({ ...wms, opacity: 1.5 }, 'opacity', /0 to 1/);
    fails({ ...wms, minZoom: 12, maxZoom: 8 }, 'maxZoom', /minZoom/);
    fails({ ...wms, legendUrl: 3 }, 'legendUrl', /string/);
    fails({ ...wms, params: {} }, 'params', /LAYERS/);
    expect(() => validateConfig({ ...base, overlays: {} })).toThrow(/expected an array/);
    expect(() => validateConfig({ ...base, overlays: [wms, { ...wms }] })).toThrow(
      /config\.overlays\[1\]\.id: duplicate overlay id/,
    );
  });

  it('keeps overlay ids apart from layer and draft ids', () => {
    const layer = { id: 'o', geometryType: 'Point', source: { features: [] } };
    expect(() => validateConfig({ ...base, layers: [layer], overlays: [wms] })).toThrow(
      /config\.overlays\[0\]\.id: collides/,
    );
    expect(() => validateConfig({ ...base, overlays: [{ ...wms, id: 'draft' }] })).toThrow(
      /collides/,
    );
    expect(() =>
      validateConfig({ ...base, draft: { id: 'sketch' }, overlays: [{ ...wms, id: 'draft' }] }),
    ).not.toThrow();
  });

  it('accepts queryable and infoFormat, and a layer legend URL', () => {
    expect(() =>
      validateConfig({
        ...base,
        overlays: [{ ...wms, queryable: true, infoFormat: 'application/vnd.ogc.gml' }],
        layers: [{ id: 'l', geometryType: 'Point', source: { features: [] }, legendUrl: '/l.png' }],
      }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, overlays: [{ ...wms, queryable: 'yes' }] })).toThrow(
      /config\.overlays\[0\]\.queryable/,
    );
    expect(() =>
      validateConfig({
        ...base,
        layers: [{ id: 'l', geometryType: 'Point', source: { features: [] }, legendUrl: 1 }],
      }),
    ).toThrow(/config\.layers\[0\]\.legendUrl/);
    expect(applyDefaults({ target: 'map', overlays: [wms as never] }).overlays[0]!.queryable).toBe(
      false,
    );
  });

  it('validates one overlay for editor.overlays.add', () => {
    expect(() => validateOverlayConfig(wms)).not.toThrow();
    expect(() => validateOverlayConfig({ id: 'o', type: 'wms', url: '/wms' })).toThrow(
      /overlay\.params/,
    );
  });

  it('applies the overlay defaults', () => {
    const resolved = applyDefaults({ target: 'map', overlays: [wms as never] });
    expect(resolved.overlays).toEqual([
      { ...wms, title: 'o', visible: true, opacity: 1, queryable: false },
    ]);
    expect(applyDefaults({ target: 'map' }).overlays).toEqual([]);
  });
});

describe('validateConfig: layers[].opacity and attribution', () => {
  const layer = { id: 'l', geometryType: 'Point', source: { features: [] } };
  it('accepts an opacity from 0 to 1 and a string attribution', () => {
    expect(() =>
      validateConfig({ ...base, layers: [{ ...layer, opacity: 0.4, attribution: '&copy; me' }] }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, layers: [{ ...layer, opacity: 2 }] })).toThrow(
      /config\.layers\[0\]\.opacity/,
    );
    expect(() => validateConfig({ ...base, layers: [{ ...layer, attribution: 1 }] })).toThrow(
      /config\.layers\[0\]\.attribution/,
    );
  });
});
