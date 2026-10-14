// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import { describe, expect, it, vi } from 'vitest';
import { Editing } from '../changes/Editing';
import { insertFeature } from '../changes/commands';
import { ConfigError } from '../config/validate';
import { LayerManager } from './LayerManager';
import { LocalLayerImportError, LocalLayers, type LocalLayerChange } from './local';

function setup(projection = 'EPSG:3857') {
  const collection = new Collection<BaseLayer>();
  const map = {
    addLayer: (l: BaseLayer) => collection.push(l),
    removeLayer: (l: BaseLayer) => collection.remove(l),
    getLayers: () => collection,
  } as unknown as OlMap;
  const layerEvents = {
    onChange: vi.fn(),
    onLoad: vi.fn(),
    onError: vi.fn(),
    onActiveChange: vi.fn(),
  };
  const lm = new LayerManager(map, () => projection, layerEvents);
  lm.add({ id: 'parcels', geometryType: 'Polygon', editable: true, source: { features: [] } });
  const changes: LocalLayerChange[] = [];
  const local = new LocalLayers({
    addLayer: (config) => lm.add(config),
    removeLayer: (id) => lm.remove(id),
    hasLayer: (id) => lm.has(id),
    getSource: (id) => lm.getSource(id),
    setTitle: (id, title) => lm.setTitle(id, title),
    setFields: (id, fields) => lm.setFields(id, fields),
    setLocal: (id, on) => lm.setLocal(id, on),
    getProjection: () => projection,
    emit: (change) => changes.push(change),
  });
  const editing = new Editing({
    layers: lm,
    getProjection: () => projection,
    locale: 'en',
    messages: {},
    changes: { fullFeatures: false },
    events: {
      change: vi.fn(),
      validationerror: vi.fn(),
      historychange: vi.fn(),
      featureinsert: vi.fn(),
    },
    isTracked: (layer) => !lm.isLocal(layer),
  });
  return { lm, local, editing, changes, layerEvents };
}

const definition = {
  title: ' Trees ',
  geometryType: 'Point' as const,
  fields: [
    { name: 'species', type: 'string' as const, label: 'Species', required: true },
    { name: 'height', type: 'number' as const },
  ],
};

describe('LocalLayers', () => {
  it('creates an editable, snappable layer with the schema and marks it local', () => {
    const { lm, local, changes } = setup();
    const id = local.create(definition);
    expect(id).toBe('local-1');
    expect(lm.info(id)).toMatchObject({
      title: 'Trees',
      geometryType: 'Point',
      editable: { insert: true, update: true, delete: true },
      snappable: true,
      local: true,
    });
    expect(lm.info('parcels').local).toBe(false);
    expect(lm.getConfig(id).schema!.fields.map((f) => f.name)).toEqual(['species', 'height']);
    expect(local.list()).toEqual([{ id, ...definition, title: 'Trees', featureCount: 0 }]);
    expect(changes).toEqual([{ id, type: 'create' }]);
    expect(local.create(definition)).toBe('local-2');
  });

  it('rejects invalid definitions with the offending path', () => {
    const { local } = setup();
    const bad = (patch: object) => () => local.create({ ...definition, ...patch } as never);
    expect(bad({ title: '  ' })).toThrow(ConfigError);
    expect(bad({ geometryType: 'Any' })).toThrow(/geometryType/);
    expect(bad({ fields: [{ name: '1x', type: 'string' }] })).toThrow(/fields\[0\]\.name/);
    expect(bad({ fields: [{ name: 'geometry', type: 'string' }] })).toThrow(/reserved/);
    expect(
      bad({
        fields: [
          { name: 'a', type: 'string' },
          { name: 'a', type: 'number' },
        ],
      }),
    ).toThrow(/duplicate/);
    expect(bad({ fields: [{ name: 'kind', type: 'enum' }] })).toThrow(/values/);
    expect(local.list()).toEqual([]);
  });

  it('keeps edits out of the change set', () => {
    const { local, editing } = setup();
    const id = local.create(definition);
    const feature = new Feature({ geometry: new Point([1, 2]), species: 'oak' });
    expect(editing.execute(insertFeature(id, feature))).toBe(true);
    expect(local.get(id).featureCount).toBe(1);
    expect(editing.getChangeSet().changes).toEqual([]);
  });

  it('renames and replaces fields, moving renamed values and dropping removed ones', () => {
    const { lm, local, changes, layerEvents } = setup();
    const id = local.create(definition);
    const feature = new Feature({ geometry: new Point([0, 0]), species: 'oak', height: 12 });
    lm.getSource(id).addFeature(feature);
    local.rename(id, 'Old trees');
    expect(lm.info(id).title).toBe('Old trees');
    expect(layerEvents.onChange).toHaveBeenCalledWith({ id, type: 'title' });
    local.setFields(
      id,
      [
        { name: 'kind', type: 'string' },
        { name: 'planted', type: 'date' },
      ],
      { renamed: { species: 'kind' } },
    );
    expect(feature.get('kind')).toBe('oak');
    expect(feature.get('species')).toBeUndefined();
    expect(feature.get('height')).toBeUndefined();
    expect(lm.getConfig(id).schema!.fields.map((f) => f.name)).toEqual(['kind', 'planted']);
    expect(layerEvents.onChange).toHaveBeenCalledWith({ id, type: 'schema' });
    expect(changes.map((c) => c.type)).toEqual(['create', 'rename', 'schema']);
    expect(() => local.rename(id, '')).toThrow(/empty/);
  });

  it('removes a layer with its objects', () => {
    const { lm, local, changes } = setup();
    const id = local.create(definition);
    local.remove(id);
    expect(lm.has(id)).toBe(false);
    expect(local.list()).toEqual([]);
    expect(changes.at(-1)).toEqual({ id, type: 'remove' });
    expect(() => local.remove('parcels')).toThrow(/Unknown local layer/);
  });

  it('round-trips through export / import in EPSG:4326 with fresh ids', () => {
    const a = setup();
    const id = a.local.create(definition);
    const feature = new Feature({ geometry: new Point(fromLonLat([8.4, 49])), species: 'oak' });
    feature.setId('tmp-1');
    a.lm.getSource(id).addFeature(feature);
    const json = JSON.parse(JSON.stringify(a.local.export()));
    expect(json.version).toBe(1);
    expect(json.layers[0].features.features[0].geometry.coordinates[0]).toBeCloseTo(8.4, 6);

    const b = setup();
    b.local.import(json);
    expect(b.changes.at(-1)).toEqual({ id: null, type: 'import' });
    expect(b.lm.info(id)).toMatchObject({ title: 'Trees', local: true, featureCount: 1 });
    const [loaded] = b.lm.getSource(id).getFeatures();
    expect(loaded!.getId()).toBe('loc-1');
    expect(loaded!.get('species')).toBe('oak');
    const [lon, lat] = toLonLat((loaded!.getGeometry() as Point).getCoordinates());
    expect(lon).toBeCloseTo(8.4, 6);
    expect(lat).toBeCloseTo(49, 6);
    // A new layer continues the numbering; importing again replaces the layer.
    expect(b.local.create(definition)).toBe('local-2');
    b.local.import(json);
    expect(b.lm.getSource(id).getFeatures()).toHaveLength(1);
  });

  it('rejects malformed imports without changing anything', () => {
    const { local } = setup();
    expect(() => local.import({ version: 2, layers: [] })).toThrow(LocalLayerImportError);
    expect(() =>
      local.import({
        version: 1,
        layers: [
          {
            id: 'x',
            ...definition,
            geometryType: 'Curve',
            features: { type: 'FeatureCollection', features: [] },
          },
        ],
      }),
    ).toThrow(/layers\[0\]\.geometryType/);
    expect(() =>
      local.import({
        version: 1,
        layers: [
          { id: 'parcels', ...definition, features: { type: 'FeatureCollection', features: [] } },
        ],
      }),
    ).toThrow(/another layer/);
    expect(() => local.import({ version: 1, layers: [{ id: 'x', ...definition }] })).toThrow(
      /features/,
    );
    expect(local.list()).toEqual([]);
  });
});
