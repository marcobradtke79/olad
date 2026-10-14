// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { describe, expect, it, vi } from 'vitest';
import { Editing } from '../changes/Editing';
import { LayerManager } from '../layers/LayerManager';
import { LocalLayers } from '../layers/local';
import { applyImport, importTargets, type ImportContext } from './applyImport';
import { readImport } from './readImport';

const VIEW = 'EPSG:3857';

function setup() {
  const collection = new Collection<BaseLayer>();
  const map = {
    addLayer: (l: BaseLayer) => collection.push(l),
    removeLayer: (l: BaseLayer) => collection.remove(l),
    getLayers: () => collection,
  } as unknown as OlMap;
  const lm = new LayerManager(map, () => VIEW, {
    onChange: vi.fn(),
    onLoad: vi.fn(),
    onError: vi.fn(),
    onActiveChange: vi.fn(),
  });
  lm.add({
    id: 'parcels',
    geometryType: 'MultiPolygon',
    editable: true,
    source: { features: [] },
    schema: {
      fields: [
        { name: 'owner', type: 'string' },
        { name: 'area', type: 'number' },
        { name: 'usage', type: 'string', default: 'residential' },
      ],
    },
  });
  lm.add({ id: 'readonly', geometryType: 'Polygon', editable: false, source: { features: [] } });
  lm.add({ id: 'roads', geometryType: 'LineString', editable: true, source: { features: [] } });
  const local = new LocalLayers({
    addLayer: (config) => lm.add(config),
    removeLayer: (id) => lm.remove(id),
    hasLayer: (id) => lm.has(id),
    getSource: (id) => lm.getSource(id),
    setTitle: (id, title) => lm.setTitle(id, title),
    setFields: (id, fields) => lm.setFields(id, fields),
    setLocal: (id, on) => lm.setLocal(id, on),
    getProjection: () => VIEW,
    emit: vi.fn(),
  });
  const featureinsert = vi.fn();
  const editing = new Editing({
    layers: lm,
    getProjection: () => VIEW,
    locale: 'en',
    messages: {},
    changes: { fullFeatures: false },
    events: {
      change: vi.fn(),
      validationerror: vi.fn(),
      historychange: vi.fn(),
      featureinsert,
    },
    isTracked: (layer) => !lm.isLocal(layer),
  });
  const ctx: ImportContext = {
    listLayers: () => lm.list(),
    getConfig: (id) => lm.getConfig(id),
    canInsert: (id) => lm.canEdit(id, 'insert'),
    createLocalLayer: (def) => local.create(def),
    removeLocalLayer: (id) => local.remove(id),
    execute: (command) => editing.execute(command),
  };
  return { lm, local, editing, ctx, featureinsert };
}

const polygon = (x: number, props: object) => ({
  type: 'Feature',
  properties: props,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [x, 49],
        [x + 0.01, 49],
        [x + 0.01, 49.01],
        [x, 49],
      ],
    ],
  },
});
const file = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    polygon(8, { owner: 'Adler', area: '12.5', note: 'x' }),
    polygon(8.1, { owner: 'Bauer' }),
    {
      type: 'Feature',
      properties: { name: 'A' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [8, 49],
          [8.1, 49.1],
        ],
      },
    },
  ],
});

describe('applyImport', () => {
  it('lists fitting target layers per group', () => {
    const { ctx } = setup();
    const preview = readImport(file, { filename: 'site.geojson', viewProjection: VIEW });
    expect(importTargets(ctx, preview.groups[0]!)).toEqual(['parcels']); // Polygon into MultiPolygon
    expect(importTargets(ctx, preview.groups[1]!)).toEqual(['roads']);
  });

  it('creates local layers by default, untracked, in one undo step', () => {
    const { lm, local, editing, ctx, featureinsert } = setup();
    const preview = readImport(file, { filename: 'site.geojson', viewProjection: VIEW });
    const result = applyImport(ctx, preview, { '1': { type: 'new', title: 'Paths' } });
    expect(result).toEqual({
      created: ['local-1', 'local-2'],
      inserted: 3,
      skipped: 0,
      droppedAttributes: [],
    });
    expect(local.get('local-1')).toMatchObject({
      title: 'site – polygons',
      geometryType: 'Polygon',
      featureCount: 2,
    });
    expect(local.get('local-2')).toMatchObject({
      title: 'Paths',
      geometryType: 'LineString',
      featureCount: 1,
    });
    expect(local.get('local-1').fields.map((f) => f.name)).toEqual(['owner', 'area', 'note']);
    expect(editing.getChangeSet().changes).toEqual([]);
    // Flagged so the attribute popup stays closed for imported objects.
    expect(featureinsert).toHaveBeenCalledTimes(3);
    expect(featureinsert.mock.calls.every(([event]) => event.imported === true)).toBe(true);
    editing.undo();
    expect(lm.getSource('local-1').getFeatures()).toHaveLength(0);
  });

  it('inserts into an existing layer with defaults, coerced values and dropped attributes', () => {
    const { lm, editing, ctx } = setup();
    const preview = readImport(file, { viewProjection: VIEW });
    const result = applyImport(ctx, preview, {
      '0': { type: 'layer', id: 'parcels' },
      '1': { type: 'skip' },
    });
    expect(result).toEqual({ created: [], inserted: 2, skipped: 1, droppedAttributes: ['note'] });
    const [first] = lm.getSource('parcels').getFeatures();
    expect(first!.getGeometry()!.getType()).toBe('MultiPolygon');
    expect(first!.getProperties()).toMatchObject({
      owner: 'Adler',
      area: 12.5,
      usage: 'residential',
    });
    expect(first!.get('note')).toBeUndefined();
    expect(editing.getChangeSet().changes.map((c) => c.op)).toEqual(['insert', 'insert']);
  });

  it('refuses a target that cannot take the group and creates nothing', () => {
    const { lm, ctx } = setup();
    const preview = readImport(file, { viewProjection: VIEW });
    expect(() => applyImport(ctx, preview, { '0': { type: 'layer', id: 'readonly' } })).toThrow(
      /cannot take/,
    );
    expect(lm.list().some((l) => l.local)).toBe(false);
  });

  it('removes the created layers again when validation rejects the command', () => {
    const { lm, ctx } = setup();
    const preview = readImport(file, { viewProjection: VIEW });
    const rejecting = { ...ctx, execute: () => false };
    expect(() => applyImport(rejecting, preview)).toThrow(/rejected/);
    expect(lm.list().some((l) => l.local)).toBe(false);
  });
});
