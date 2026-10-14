import { describe, expect, it } from 'vitest';
import { ConfigError, validateConfig } from './validate';

const base = { target: 'map' };

function errorPath(config: unknown): string {
  try {
    validateConfig(config);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as ConfigError).path;
  }
  throw new Error('expected validateConfig to throw');
}

describe('validateConfig', () => {
  it('accepts a minimal config', () => {
    expect(() => validateConfig(base)).not.toThrow();
  });

  it('requires exactly one of target and map', () => {
    expect(errorPath({})).toBe('config');
    expect(errorPath({ target: 'map', map: {} })).toBe('config');
  });

  it('rejects unknown keys with their path', () => {
    expect(errorPath({ ...base, foo: 1 })).toBe('config.foo');
    expect(errorPath({ ...base, view: { zooom: 1 } })).toBe('config.view.zooom');
    expect(errorPath({ ...base, basemaps: [{ id: 'a', type: 'osm', url: 'x' }] })).toBe(
      'config.basemaps[0].url',
    );
  });

  it('validates view fields', () => {
    expect(errorPath({ ...base, view: { projection: 'EPSG:99999' } })).toBe(
      'config.view.projection',
    );
    expect(errorPath({ ...base, view: { center: [1] } })).toBe('config.view.center');
    expect(errorPath({ ...base, view: { extent: [1, 2, 3] } })).toBe('config.view.extent');
    expect(errorPath({ ...base, view: { zoom: 'high' } })).toBe('config.view.zoom');
    expect(errorPath({ ...base, view: { minZoom: 10, maxZoom: 5 } })).toBe('config.view.minZoom');
    expect(() =>
      validateConfig({
        ...base,
        view: { projection: 'EPSG:4326', center: [8, 49], zoom: 10, extent: [0, 0, 10, 50] },
      }),
    ).not.toThrow();
  });

  it('validates basemaps', () => {
    expect(errorPath({ ...base, basemaps: {} })).toBe('config.basemaps');
    expect(errorPath({ ...base, basemaps: [{ type: 'osm' }] })).toBe('config.basemaps[0].id');
    expect(errorPath({ ...base, basemaps: [{ id: 'a', type: 'bing' }] })).toBe(
      'config.basemaps[0].type',
    );
    expect(errorPath({ ...base, basemaps: [{ id: 'a', type: 'xyz' }] })).toBe(
      'config.basemaps[0].url',
    );
    expect(errorPath({ ...base, basemaps: [{ id: 'a', type: 'osm', visible: 'yes' }] })).toBe(
      'config.basemaps[0].visible',
    );
    expect(
      errorPath({
        ...base,
        basemaps: [
          { id: 'a', type: 'osm' },
          { id: 'a', type: 'osm' },
        ],
      }),
    ).toBe('config.basemaps[1].id');
    expect(
      errorPath({ ...base, basemaps: [{ id: 'a', type: 'xyz', url: 'u', crossOrigin: 1 }] }),
    ).toBe('config.basemaps[0].crossOrigin');
  });

  it('includes the path in the message', () => {
    expect(() => validateConfig({ ...base, view: { zoom: 'x' } })).toThrow(
      'Invalid config at config.view.zoom',
    );
  });
});

describe('validateConfig: editMode', () => {
  it('accepts a boolean and rejects anything else', () => {
    expect(() => validateConfig({ ...base, editMode: true })).not.toThrow();
    expect(errorPath({ ...base, editMode: 'yes' })).toBe('config.editMode');
  });
});

describe('validateConfig: cursor', () => {
  it('validates the crosshair options', () => {
    expect(() =>
      validateConfig({ ...base, cursor: { crosshair: false, pickBoxSize: 12, color: 'red' } }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, cursor: {} })).not.toThrow();
    expect(errorPath({ ...base, cursor: { foo: 1 } })).toBe('config.cursor.foo');
    expect(errorPath({ ...base, cursor: { crosshair: 'no' } })).toBe('config.cursor.crosshair');
    expect(errorPath({ ...base, cursor: { pickBoxSize: 0 } })).toBe('config.cursor.pickBoxSize');
    expect(errorPath({ ...base, cursor: { color: 3 } })).toBe('config.cursor.color');
    expect(errorPath({ ...base, cursor: { pickColor: 3 } })).toBe('config.cursor.pickColor');
    expect(errorPath({ ...base, cursor: { angle: '30' } })).toBe('config.cursor.angle');
    expect(() => validateConfig({ ...base, cursor: { angle: -30 } })).not.toThrow();
  });
});

describe('validateConfig: changes, locale and messages', () => {
  it('validates change set options', () => {
    expect(() =>
      validateConfig({ ...base, changes: { crs: 'EPSG:4326', precision: 6, fullFeatures: true } }),
    ).not.toThrow();
    expect(errorPath({ ...base, changes: { crs: 'EPSG:99999' } })).toBe('config.changes.crs');
    expect(errorPath({ ...base, changes: { precision: 1.5 } })).toBe('config.changes.precision');
    expect(errorPath({ ...base, changes: { precision: -1 } })).toBe('config.changes.precision');
    expect(errorPath({ ...base, changes: { fullFeatures: 1 } })).toBe(
      'config.changes.fullFeatures',
    );
    expect(errorPath({ ...base, changes: { foo: 1 } })).toBe('config.changes.foo');
  });

  it('validates the selection style', () => {
    expect(() =>
      validateConfig({
        ...base,
        selection: { strokeColor: 'red', strokeWidth: 2, pointRadius: 5 },
      }),
    ).not.toThrow();
    expect(errorPath({ ...base, selection: { strokeWidth: -1 } })).toBe(
      'config.selection.strokeWidth',
    );
    expect(errorPath({ ...base, selection: { fillColor: 1 } })).toBe('config.selection.fillColor');
    expect(() =>
      validateConfig({ ...base, selection: { haloColor: 'white', haloWidth: 0, vertexSize: 4 } }),
    ).not.toThrow();
    expect(errorPath({ ...base, selection: { haloColor: 1 } })).toBe('config.selection.haloColor');
    expect(errorPath({ ...base, selection: { haloWidth: -1 } })).toBe('config.selection.haloWidth');
    expect(errorPath({ ...base, selection: { vertexSize: 'x' } })).toBe(
      'config.selection.vertexSize',
    );
    expect(() => validateConfig({ ...base, selection: { inspect: false } })).not.toThrow();
    expect(errorPath({ ...base, selection: { inspect: 'yes' } })).toBe('config.selection.inspect');
    expect(errorPath({ ...base, selection: { foo: 1 } })).toBe('config.selection.foo');
  });

  it('validates the layer highlight style', () => {
    expect(() =>
      validateConfig({
        ...base,
        layerHighlight: {
          strokeColor: 'orange',
          strokeWidth: 2,
          fillColor: 'none',
          pointRadius: 4,
        },
      }),
    ).not.toThrow();
    expect(errorPath({ ...base, layerHighlight: { strokeWidth: -1 } })).toBe(
      'config.layerHighlight.strokeWidth',
    );
    expect(errorPath({ ...base, layerHighlight: { strokeColor: 1 } })).toBe(
      'config.layerHighlight.strokeColor',
    );
    expect(errorPath({ ...base, layerHighlight: { pointRadius: 'x' } })).toBe(
      'config.layerHighlight.pointRadius',
    );
    expect(errorPath({ ...base, layerHighlight: { halo: 1 } })).toBe('config.layerHighlight.halo');
  });

  it('validates snapping options', () => {
    expect(() =>
      validateConfig({
        ...base,
        snapping: { enabled: false, tolerancePx: 8, modes: ['vertex', 'perpendicular', 'tangent'] },
      }),
    ).not.toThrow();
    expect(errorPath({ ...base, snapping: { tolerancePx: 0 } })).toBe(
      'config.snapping.tolerancePx',
    );
    expect(errorPath({ ...base, snapping: { modes: [] } })).toBe('config.snapping.modes');
    expect(errorPath({ ...base, snapping: { modes: ['edge'] } })).toBe('config.snapping.modes[0]');
    expect(errorPath({ ...base, snapping: { enabled: 1 } })).toBe('config.snapping.enabled');
    expect(errorPath({ ...base, snapping: { foo: 1 } })).toBe('config.snapping.foo');
  });

  it('validates curve options', () => {
    expect(() => validateConfig({ ...base, curves: { tolerance: 0.5 } })).not.toThrow();
    expect(() => validateConfig({ ...base, curves: {} })).not.toThrow();
    expect(errorPath({ ...base, curves: { tolerance: 0 } })).toBe('config.curves.tolerance');
    expect(errorPath({ ...base, curves: { tolerance: '1' } })).toBe('config.curves.tolerance');
    expect(errorPath({ ...base, curves: { foo: 1 } })).toBe('config.curves.foo');
    expect(() => validateConfig({ ...base, units: { length: 'auto' } })).not.toThrow();
    expect(() => validateConfig({ ...base, units: { length: 'us-ft' } })).not.toThrow();
    expect(errorPath({ ...base, units: { length: 'furlong' } })).toBe('config.units.length');
    expect(errorPath({ ...base, units: { area: 'ha' } })).toBe('config.units.area');
    expect(errorPath({ ...base, curves: 1 })).toBe('config.curves');
  });

  it('validates grid options', () => {
    expect(() =>
      validateConfig({
        ...base,
        grid: { enabled: true, spacing: 2.5, origin: [100, -50], visible: false },
      }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, grid: {} })).not.toThrow();
    expect(errorPath({ ...base, grid: { spacing: 0 } })).toBe('config.grid.spacing');
    expect(errorPath({ ...base, grid: { spacing: '5' } })).toBe('config.grid.spacing');
    expect(errorPath({ ...base, grid: { origin: [1] } })).toBe('config.grid.origin');
    expect(errorPath({ ...base, grid: { origin: [1, 'a'] } })).toBe('config.grid.origin[1]');
    expect(errorPath({ ...base, grid: { enabled: 1 } })).toBe('config.grid.enabled');
    expect(errorPath({ ...base, grid: { visible: 'yes' } })).toBe('config.grid.visible');
    expect(errorPath({ ...base, grid: { foo: 1 } })).toBe('config.grid.foo');
  });

  it('validates draft options', () => {
    expect(() =>
      validateConfig({
        ...base,
        draft: {
          enabled: true,
          id: 'scratch',
          title: 'Scratch',
          style: { 'stroke-color': '#f00' },
        },
      }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, draft: {} })).not.toThrow();
    expect(errorPath({ ...base, draft: { enabled: 'yes' } })).toBe('config.draft.enabled');
    expect(errorPath({ ...base, draft: { id: '' } })).toBe('config.draft.id');
    expect(errorPath({ ...base, draft: { title: 1 } })).toBe('config.draft.title');
    expect(errorPath({ ...base, draft: { style: 'red' } })).toBe('config.draft.style');
    expect(errorPath({ ...base, draft: { foo: 1 } })).toBe('config.draft.foo');
    expect(
      errorPath({
        ...base,
        layers: [{ id: 'draft', geometryType: 'Point', source: { features: [] } }],
        draft: { id: 'draft' },
      }),
    ).toBe('config.draft.id');
    expect(() =>
      validateConfig({
        ...base,
        layers: [{ id: 'mixed', geometryType: 'Any', source: { features: [] } }],
      }),
    ).not.toThrow();
  });

  it('validates constraints options', () => {
    expect(() =>
      validateConfig({ ...base, constraints: { angle: { enabled: true, step: 45 } } }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, constraints: {} })).not.toThrow();
    expect(() => validateConfig({ ...base, constraints: { angle: {} } })).not.toThrow();
    expect(errorPath({ ...base, constraints: { foo: 1 } })).toBe('config.constraints.foo');
    expect(errorPath({ ...base, constraints: { angle: 1 } })).toBe('config.constraints.angle');
    expect(errorPath({ ...base, constraints: { angle: { step: 0 } } })).toBe(
      'config.constraints.angle.step',
    );
    expect(errorPath({ ...base, constraints: { angle: { step: 361 } } })).toBe(
      'config.constraints.angle.step',
    );
    expect(errorPath({ ...base, constraints: { angle: { enabled: 'x' } } })).toBe(
      'config.constraints.angle.enabled',
    );
    expect(errorPath({ ...base, constraints: { angle: { foo: 1 } } })).toBe(
      'config.constraints.angle.foo',
    );
  });

  it('validates locale and message overrides', () => {
    expect(() => validateConfig({ ...base, locale: 'de', messages: { x: 'y' } })).not.toThrow();
    expect(errorPath({ ...base, locale: 'fr' })).toBe('config.locale');
    expect(errorPath({ ...base, messages: { x: 1 } })).toBe('config.messages.x');
  });
});

describe('validateConfig: milestone 2 options', () => {
  const layer = (source: object, extra: object = {}) => ({
    ...base,
    layers: [{ id: 'l', geometryType: 'Point', source, ...extra }],
  });

  it('validates projections and accepts declared codes', () => {
    expect(
      errorPath({ ...base, projections: [{ code: 'EPSG:1', def: '+proj=longlat', title: 1 }] }),
    ).toBe('config.projections[0].title');
    expect(errorPath({ ...base, projections: [{ code: 'EPSG:1' }] })).toBe(
      'config.projections[0].def',
    );
    expect(
      errorPath({
        ...base,
        projections: [
          { code: 'A', def: 'x' },
          { code: 'A', def: 'y' },
        ],
      }),
    ).toBe('config.projections[1].code');
    expect(() =>
      validateConfig({
        ...base,
        projections: [{ code: 'EPSG:99', def: '+proj=longlat' }],
        view: { projection: 'EPSG:99' },
      }),
    ).not.toThrow();
    expect(errorPath({ ...base, proj4: {} })).toBe('config.proj4');
  });

  it('validates every basemap type', () => {
    const b = (o: object) => ({ ...base, basemaps: [{ id: 'b', ...o }] });
    expect(errorPath(b({ type: 'wms', url: 'u' }))).toBe('config.basemaps[0].params');
    expect(errorPath(b({ type: 'wms', url: 'u', params: { FORMAT: 'image/png' } }))).toBe(
      'config.basemaps[0].params',
    );
    expect(errorPath(b({ type: 'wms', url: 'u', params: { LAYERS: {} } }))).toBe(
      'config.basemaps[0].params.LAYERS',
    );
    expect(
      errorPath(b({ type: 'wms', url: 'u', params: { LAYERS: 'a' }, serverType: 'esri' })),
    ).toBe('config.basemaps[0].serverType');
    expect(() =>
      validateConfig(
        b({
          type: 'wms',
          url: 'u',
          params: { LAYERS: 'a' },
          tiled: false,
          projection: 'EPSG:4326',
        }),
      ),
    ).not.toThrow();
    expect(errorPath(b({ type: 'wmts', capabilitiesUrl: 'u' }))).toBe('config.basemaps[0].layer');
    expect(errorPath(b({ type: 'vector-tile', url: 'u', format: 'pbf' }))).toBe(
      'config.basemaps[0].format',
    );
    expect(errorPath(b({ type: 'vector-tile', url: 'u', style: 'red' }))).toBe(
      'config.basemaps[0].style',
    );
    expect(errorPath(b({ type: 'geotiff', sources: [] }))).toBe('config.basemaps[0].sources');
    expect(errorPath(b({ type: 'geotiff', sources: [{ bands: [1] }] }))).toBe(
      'config.basemaps[0].sources[0].url',
    );
    expect(errorPath(b({ type: 'geotiff', sources: [{ url: 'u' }], convertToRGB: 'yes' }))).toBe(
      'config.basemaps[0].convertToRGB',
    );
  });

  it('validates layer sources', () => {
    expect(errorPath(layer({}))).toBe('config.layers[0].source');
    expect(errorPath(layer({ url: 'a', data: 'b', format: 'geojson' }))).toBe(
      'config.layers[0].source',
    );
    expect(errorPath(layer({ url: 'a' }))).toBe('config.layers[0].source.format');
    expect(errorPath(layer({ features: [], format: 'kml' }))).toBe(
      'config.layers[0].source.format',
    );
    expect(errorPath(layer({ format: 'wfs', url: 'u' }))).toBe('config.layers[0].source.typeName');
    expect(errorPath(layer({ format: 'wfs', data: 'x', typeName: 't' }))).toBe(
      'config.layers[0].source.url',
    );
    expect(errorPath(layer({ format: 'gml', url: 'u', gmlVersion: '4' }))).toBe(
      'config.layers[0].source.gmlVersion',
    );
    expect(errorPath(layer({ format: 'geojson', url: 'u', dataProjection: 'EPSG:0' }))).toBe(
      'config.layers[0].source.dataProjection',
    );
    expect(errorPath(layer({ format: 'geojson', loader: 'x' }))).toBe(
      'config.layers[0].source.loader',
    );
    expect(() => validateConfig(layer({ format: 'geojson', loader: () => '' }))).not.toThrow();
  });

  it('validates layer options, editability and schema', () => {
    const src = { format: 'geojson', url: 'u' };
    expect(errorPath(layer(src, { geometryType: 'Line' }))).toBe('config.layers[0].geometryType');
    expect(errorPath(layer(src, { editable: 'yes' }))).toBe('config.layers[0].editable');
    expect(errorPath(layer(src, { editable: { insert: 1 } }))).toBe(
      'config.layers[0].editable.insert',
    );
    expect(errorPath(layer(src, { editable: { predicate: true } }))).toBe(
      'config.layers[0].editable.predicate',
    );
    expect(errorPath(layer(src, { schema: { fields: [{ name: 'a', type: 'text' }] } }))).toBe(
      'config.layers[0].schema.fields[0].type',
    );
    expect(errorPath(layer(src, { schema: { fields: [{ name: 'a', type: 'enum' }] } }))).toBe(
      'config.layers[0].schema.fields[0].values',
    );
    expect(
      errorPath(layer(src, { schema: { fields: [{ name: 'a', type: 'string', values: ['x'] }] } })),
    ).toBe('config.layers[0].schema.fields[0].values');
    expect(
      errorPath(layer(src, { schema: { fields: [{ name: 'a', type: 'string', pattern: '[' }] } })),
    ).toBe('config.layers[0].schema.fields[0].pattern');
    expect(
      errorPath(
        layer(src, { schema: { fields: [{ name: 'a', type: 'number', min: 2, max: 1 }] } }),
      ),
    ).toBe('config.layers[0].schema.fields[0].min');
    expect(
      errorPath(
        layer(src, {
          schema: {
            fields: [
              { name: 'a', type: 'number' },
              { name: 'a', type: 'number' },
            ],
          },
        }),
      ),
    ).toBe('config.layers[0].schema.fields[1].name');
    expect(
      errorPath({
        ...base,
        layers: [
          { id: 'x', geometryType: 'Point', source: src },
          { id: 'x', geometryType: 'Point', source: src },
        ],
      }),
    ).toBe('config.layers[1].id');
    expect(() =>
      validateConfig(
        layer(src, {
          title: 'T',
          visible: false,
          idProperty: 'id',
          editable: true,
          snappable: false,
          style: [{ 'stroke-color': 'red' }],
          minZoom: 2,
          maxZoom: 20,
          schema: {
            fields: [
              {
                name: 'e',
                type: 'enum',
                values: ['a', 1],
                default: 'a',
                required: true,
                readOnly: false,
                label: 'E',
              },
            ],
          },
        }),
      ),
    ).not.toThrow();
  });
});

describe('layers[].text', () => {
  const layer = (extra: Record<string, unknown>, geometryType = 'Point') => ({
    ...base,
    layers: [{ id: 'labels', geometryType, source: { features: [] }, ...extra }],
  });

  it('accepts true, false and the object form on point layers', () => {
    expect(() => validateConfig(layer({ text: true }))).not.toThrow();
    expect(() => validateConfig(layer({ text: false }, 'LineString'))).not.toThrow();
    expect(() =>
      validateConfig(layer({ text: { property: 'label', height: 5, color: '#000' } }, 'Any')),
    ).not.toThrow();
  });

  it('rejects unknown keys, a bad height and a layer that cannot hold points', () => {
    expect(errorPath(layer({ text: { size: 3 } }))).toBe('config.layers[0].text.size');
    expect(errorPath(layer({ text: { height: 0 } }))).toBe('config.layers[0].text.height');
    expect(errorPath(layer({ text: { height: '2' } }))).toBe('config.layers[0].text.height');
    expect(errorPath(layer({ text: { font: 3 } }))).toBe('config.layers[0].text.font');
    expect(errorPath(layer({ text: 'yes' }))).toBe('config.layers[0].text');
    expect(errorPath(layer({ text: true }, 'LineString'))).toBe('config.layers[0].text');
  });
});
