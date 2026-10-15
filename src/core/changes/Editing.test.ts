// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import { describe, expect, it, vi } from 'vitest';
import { LayerManager } from '../layers/LayerManager';
import {
  composite,
  deleteFeature,
  insertFeature,
  updateGeometry,
  updateProperties,
} from './commands';
import { Editing } from './Editing';
import type { Change, ChangeSet } from './exportChangeSet';

function fakeMap(): OlMap {
  const layers = new Collection<BaseLayer>();
  return {
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getLayers: () => layers,
  } as unknown as OlMap;
}

function setup(
  options: { fullFeatures?: boolean; precision?: number; crs?: string; untracked?: string } = {},
) {
  const { untracked, ...changes } = options;
  let projection = 'EPSG:3857';
  const lm = new LayerManager(fakeMap(), () => projection, {
    onChange: vi.fn(),
    onLoad: vi.fn(),
    onError: vi.fn(),
    onActiveChange: vi.fn(),
    shouldLoad: (layer, id) => editing.shouldLoad(layer, id),
  });
  lm.add({
    id: 'points',
    geometryType: 'Point',
    editable: true,
    source: { format: 'geojson', data: '{"type":"FeatureCollection","features":[]}' },
  });
  lm.add({
    id: 'lines',
    geometryType: 'LineString',
    editable: { insert: true, update: true, delete: false },
    source: { format: 'geojson', data: '{"type":"FeatureCollection","features":[]}' },
  });
  lm.add({
    id: 'readonly',
    geometryType: 'Polygon',
    editable: false,
    source: { format: 'geojson', dataProjection: 'EPSG:4326', data: '{}' },
  });
  lm.add({ id: 'draft', geometryType: 'Any', editable: true, source: { features: [] } });
  const events = {
    change: vi.fn(),
    validationerror: vi.fn(),
    historychange: vi.fn(),
    featureinsert: vi.fn(),
  };
  const editing: Editing = new Editing({
    layers: lm,
    getProjection: () => projection,
    locale: 'en',
    messages: {},
    changes: { fullFeatures: false, ...changes },
    events,
    ...(untracked ? { isTracked: (layer: string) => layer !== untracked } : {}),
  });
  // A loaded feature with an id, as the loader would produce it (original kept in EPSG:4326).
  const loaded = new Feature({ geometry: new Point(fromLonLat([8, 49])), name: 'old', lanes: 2 });
  loaded.setId(1);
  lm.originals.set(loaded, 'EPSG:4326', new Point([8, 49]));
  lm.getSource('points').addFeature(loaded);
  const line = new Feature({
    geometry: new LineString([fromLonLat([8, 49]), fromLonLat([8.1, 49])]),
    name: 'road',
  });
  line.setId('r1');
  lm.getSource('lines').addFeature(line);
  const setProjection = (code: string) => {
    const from = projection;
    projection = code;
    editing.reproject(from, code);
    lm.reproject(
      from,
      code,
      (f: Feature) => editing.tracker.isGeometryModified(f),
      (f: Feature) => editing.tracker.isTouched(f),
    );
  };
  return { lm, editing, events, loaded, line, setProjection };
}

const lastChangeSet = (events: { change: ReturnType<typeof vi.fn> }): ChangeSet =>
  events.change.mock.calls.at(-1)![0] as ChangeSet;

describe('Editing: executing commands', () => {
  it('inserts with a temporary id and exports an insert', () => {
    const { lm, editing, events } = setup();
    const feature = new Feature({ geometry: new Point(fromLonLat([8.5, 49.5])), name: 'new' });
    expect(editing.execute(insertFeature('points', feature))).toBe(true);
    expect(feature.getId()).toBe('tmp-1');
    expect(lm.getSource('points').hasFeature(feature)).toBe(true);
    expect(editing.hasChanges()).toBe(true);
    const set = lastChangeSet(events);
    expect(set).toEqual({
      version: 1,
      crs: 'EPSG:4326',
      changes: [
        {
          op: 'insert',
          layer: 'points',
          crs: 'EPSG:4326',
          tempId: 'tmp-1',
          geometry: { type: 'Point', coordinates: expect.any(Array) },
          properties: { name: 'new' },
        },
      ],
    });
    const [x, y] = (set.changes[0] as { geometry: { coordinates: number[] } }).geometry.coordinates;
    expect(x).toBeCloseTo(8.5, 6);
    expect(y).toBeCloseTo(49.5, 6);
    expect(events.historychange).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false });
  });

  it('updates geometry and properties, exporting changed parts only', () => {
    const { editing, events, loaded } = setup();
    editing.execute(updateProperties(loaded, { name: 'new', extra: 1 }));
    let set = lastChangeSet(events);
    expect(set.changes).toEqual([
      {
        op: 'update',
        layer: 'points',
        crs: 'EPSG:4326',
        id: 1,
        properties: { name: 'new', extra: 1 },
        changed: ['name', 'extra'],
      },
    ]);
    editing.execute(updateGeometry(loaded, new Point(fromLonLat([9, 50]))));
    set = lastChangeSet(events);
    expect(set.changes).toHaveLength(1);
    const change = set.changes[0] as { changed: string[]; geometry: { coordinates: number[] } };
    expect(change.changed).toEqual(['geometry', 'name', 'extra']);
    expect(change.geometry.coordinates[0]).toBeCloseTo(9, 6);
    expect(change.geometry.coordinates[1]).toBeCloseTo(50, 6);
  });

  it('removes a property with undefined and exports it as null', () => {
    const { editing, events, loaded } = setup();
    editing.execute(updateProperties(loaded, { lanes: undefined }));
    expect(loaded.get('lanes')).toBeUndefined();
    expect(lastChangeSet(events).changes[0]).toMatchObject({
      properties: { lanes: null },
      changed: ['lanes'],
    });
    editing.undo();
    expect(loaded.get('lanes')).toBe(2);
    expect(editing.hasChanges()).toBe(false);
  });

  it('deletes and exports a delete', () => {
    const { lm, editing, events, loaded } = setup();
    expect(editing.execute(deleteFeature(loaded))).toBe(true);
    expect(lm.getSource('points').hasFeature(loaded)).toBe(false);
    expect(lastChangeSet(events).changes).toEqual([
      { op: 'delete', layer: 'points', crs: 'EPSG:4326', id: 1 },
    ]);
    expect(editing.shouldLoad('points', 1)).toBe(false);
    expect(editing.shouldLoad('points', 2)).toBe(true);
  });

  it('applies composites atomically and undoes them as one step', () => {
    const { lm, editing, events, loaded } = setup();
    const feature = new Feature(new Point(fromLonLat([8, 48])));
    editing.execute(
      composite([insertFeature('points', feature), deleteFeature(loaded)], 'replace'),
    );
    expect(lastChangeSet(events).changes.map((c) => c.op)).toEqual(['insert', 'delete']);
    editing.undo();
    expect(lm.getSource('points').hasFeature(loaded)).toBe(true);
    expect(lm.getSource('points').hasFeature(feature)).toBe(false);
    expect(editing.hasChanges()).toBe(false);
    editing.redo();
    expect(lastChangeSet(events).changes).toHaveLength(2);
  });
});

describe('Editing: validation', () => {
  it('rejects commands that violate editability without side effects', () => {
    const { lm, editing, events, line } = setup();
    const polygon = new Feature(
      new Polygon([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ]),
    );
    expect(editing.execute(insertFeature('readonly', polygon))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({
        code: 'not-editable',
        message: 'Layer "readonly" does not allow insert.',
        layer: 'readonly',
      }),
    );
    expect(lm.getSource('readonly').getFeatures()).toHaveLength(0);
    expect(editing.execute(deleteFeature(line))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'not-editable', layer: 'lines', featureId: 'r1' }),
    );
    expect(lm.getSource('lines').hasFeature(line)).toBe(true);
    expect(editing.hasChanges()).toBe(false);
    expect(events.change).not.toHaveBeenCalled();
  });

  it('rejects unknown layers, foreign features and features without ids', () => {
    const { lm, editing, events } = setup();
    expect(editing.execute(insertFeature('nope', new Feature(new Point([0, 0]))))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'layer-unknown' }),
    );
    expect(editing.execute(deleteFeature(new Feature(new Point([0, 0]))))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'feature-not-in-layer' }),
    );
    const anonymous = new Feature(new Point([0, 0]));
    lm.getSource('points').addFeature(anonymous);
    expect(editing.execute(updateProperties(anonymous, { a: 1 }))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'feature-without-id', layer: 'points' }),
    );
  });

  it('rejects invalid geometries and honours the predicate and locale', () => {
    const { lm, editing, events, loaded } = setup();
    expect(
      editing.execute(
        updateGeometry(
          loaded,
          new LineString([
            [0, 0],
            [1, 1],
          ]),
        ),
      ),
    ).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({
        code: 'geometry-type',
        message: 'Expected a Point geometry, got LineString.',
      }),
    );
    expect(editing.execute(insertFeature('lines', new Feature(new LineString([[0, 0]]))))).toBe(
      false,
    );
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'too-few-vertices' }),
    );
    lm.setEditable('points', {
      update: true,
      predicate: (f: Feature) => f.get('name') !== 'old',
    });
    expect(editing.execute(updateProperties(loaded, { name: 'x' }))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'not-editable' }),
    );
  });

  it('a composite with one invalid command changes nothing', () => {
    const { lm, editing, loaded } = setup();
    const fine = new Feature(new Point([1, 1]));
    expect(
      editing.execute(composite([insertFeature('points', fine), deleteFeature(new Feature())])),
    ).toBe(false);
    expect(lm.getSource('points').hasFeature(fine)).toBe(false);
    expect(lm.getSource('points').hasFeature(loaded)).toBe(true);
    expect(editing.canUndo()).toBe(false);
  });
});

describe('Editing: pending inserts stay editable', () => {
  it('allows update and delete of an inserted feature on an insert-only layer', () => {
    const { lm, editing, events } = setup();
    lm.add({
      id: 'insertonly',
      geometryType: 'Point',
      editable: { insert: true },
      source: { format: 'geojson', data: '{}' },
    });
    const feature = new Feature(new Point([0, 0]));
    expect(editing.execute(insertFeature('insertonly', feature))).toBe(true);
    expect(editing.canEdit('update', feature)).toBe(true);
    expect(editing.canEdit('delete', feature)).toBe(true);
    expect(editing.execute(updateProperties(feature, { pressure: 4.5 }))).toBe(true);
    expect(lastChangeSet(events).changes[0]).toMatchObject({
      op: 'insert',
      properties: { pressure: 4.5 },
    });
    expect(editing.execute(deleteFeature(feature))).toBe(true);
    expect(editing.hasChanges()).toBe(false);
    // Once accepted it is an ordinary feature of the layer: no updates any more.
    const kept = new Feature(new Point([1, 1]));
    editing.execute(insertFeature('insertonly', kept));
    editing.accept({ idMap: { 'tmp-2': 7 } });
    expect(editing.canEdit('update', kept)).toBe(false);
    expect(editing.execute(updateProperties(kept, { pressure: 1 }))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'not-editable' }),
    );
    expect(editing.canEdit('update', new Feature())).toBe(false);
  });
});

describe('Editing: collapse rules', () => {
  it('insert + update → one insert with the final state', () => {
    const { editing, events } = setup();
    const feature = new Feature({ geometry: new Point([0, 0]), name: 'a' });
    editing.execute(insertFeature('points', feature));
    editing.execute(updateProperties(feature, { name: 'b' }));
    editing.execute(updateGeometry(feature, new Point([5, 5])));
    const { changes } = lastChangeSet(events);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'insert', properties: { name: 'b' } });
  });

  it('insert + delete → nothing', () => {
    const { editing, events } = setup();
    const feature = new Feature(new Point([0, 0]));
    editing.execute(insertFeature('points', feature));
    editing.execute(deleteFeature(feature));
    expect(lastChangeSet(events).changes).toEqual([]);
    expect(editing.hasChanges()).toBe(false);
  });

  it('update + update → one update; update + delete → delete', () => {
    const { editing, events, loaded } = setup();
    editing.execute(updateProperties(loaded, { name: 'b' }));
    editing.execute(updateProperties(loaded, { name: 'c' }));
    expect(lastChangeSet(events).changes).toEqual([
      expect.objectContaining({ op: 'update', properties: { name: 'c' }, changed: ['name'] }),
    ]);
    editing.execute(deleteFeature(loaded));
    expect(lastChangeSet(events).changes).toEqual([
      { op: 'delete', layer: 'points', crs: 'EPSG:4326', id: 1 },
    ]);
  });

  it('update back to the original state → nothing', () => {
    const { editing, events, loaded } = setup();
    const original = loaded.getGeometry()!.clone();
    editing.execute(updateProperties(loaded, { name: 'b' }));
    editing.execute(updateGeometry(loaded, new Point([1, 2])));
    editing.execute(updateProperties(loaded, { name: 'old' }));
    editing.execute(updateGeometry(loaded, original));
    expect(lastChangeSet(events).changes).toEqual([]);
    expect(editing.hasChanges()).toBe(false);
    expect(editing.canUndo()).toBe(true);
  });
});

describe('Editing: undo and redo', () => {
  it('walks the history in order and clears redo on a new command', () => {
    const { editing, loaded } = setup();
    editing.execute(updateProperties(loaded, { name: 'b' }));
    editing.execute(updateProperties(loaded, { name: 'c' }));
    expect(editing.undo()).toBe(true);
    expect(loaded.get('name')).toBe('b');
    expect(editing.undo()).toBe(true);
    expect(loaded.get('name')).toBe('old');
    expect(editing.undo()).toBe(false);
    expect(editing.redo()).toBe(true);
    expect(loaded.get('name')).toBe('b');
    expect(editing.canRedo()).toBe(true);
    editing.execute(updateProperties(loaded, { name: 'd' }));
    expect(editing.canRedo()).toBe(false);
    expect(editing.redo()).toBe(false);
  });

  it('undoes an insert and a delete', () => {
    const { lm, editing, loaded, events } = setup();
    const feature = new Feature(new Point([0, 0]));
    editing.execute(insertFeature('points', feature));
    expect(events.featureinsert).toHaveBeenCalledTimes(1);
    expect(events.featureinsert).toHaveBeenCalledWith({ layer: 'points', feature });
    editing.execute(deleteFeature(loaded));
    editing.undo();
    expect(lm.getSource('points').hasFeature(loaded)).toBe(true);
    editing.undo();
    expect(lm.getSource('points').hasFeature(feature)).toBe(false);
    expect(editing.hasChanges()).toBe(false);
    editing.redo();
    expect(lm.getSource('points').hasFeature(feature)).toBe(true);
    expect(feature.getId()).toBe('tmp-1');
    expect(events.featureinsert).toHaveBeenCalledTimes(1); // not on redo
    expect(editing.getChangeSet().changes).toEqual([expect.objectContaining({ op: 'insert' })]);
  });
});

describe('Editing: accept, discard, reprojection, layer removal', () => {
  it('accept assigns real ids, refreshes originals and clears history', () => {
    const { lm, editing, events, loaded } = setup();
    const feature = new Feature(new Point(fromLonLat([8, 48])));
    editing.execute(insertFeature('points', feature));
    editing.execute(updateGeometry(loaded, new Point(fromLonLat([9, 50]))));
    editing.accept({ idMap: { 'tmp-1': 4711 } });
    expect(feature.getId()).toBe(4711);
    expect(editing.hasChanges()).toBe(false);
    expect(editing.canUndo()).toBe(false);
    expect(lastChangeSet(events).changes).toEqual([]);
    const original = lm.originals.get(loaded)!;
    expect(original.projection).toBe('EPSG:4326');
    const [x, y] = (original.geometry as Point).getCoordinates();
    expect(x).toBeCloseTo(9, 6);
    expect(y).toBeCloseTo(50, 6);
    expect(lm.originals.get(feature)?.projection).toBe('EPSG:4326');
    // Further edits start from the new baseline.
    editing.execute(updateProperties(feature, { name: 'later' }));
    expect(editing.getChangeSet().changes).toEqual([
      expect.objectContaining({ op: 'update', id: 4711, changed: ['name'] }),
    ]);
  });

  it('accept without an id keeps the temporary id', () => {
    const { editing } = setup();
    const feature = new Feature(new Point([0, 0]));
    editing.execute(insertFeature('points', feature));
    editing.accept();
    expect(feature.getId()).toBe('tmp-1');
  });

  it('discard restores every touched feature', () => {
    const { lm, editing, loaded, line } = setup();
    const inserted = new Feature(new Point([0, 0]));
    editing.execute(insertFeature('points', inserted));
    editing.execute(updateProperties(loaded, { name: 'changed' }));
    editing.execute(
      updateGeometry(
        line,
        new LineString([
          [0, 0],
          [1, 1],
        ]),
      ),
    );
    editing.execute(deleteFeature(loaded));
    editing.discard();
    expect(lm.getSource('points').hasFeature(inserted)).toBe(false);
    expect(lm.getSource('points').hasFeature(loaded)).toBe(true);
    expect(loaded.get('name')).toBe('old');
    expect(toLonLat((line.getGeometry() as LineString).getFirstCoordinate())[0]).toBeCloseTo(8, 6);
    expect(editing.hasChanges()).toBe(false);
    expect(editing.canUndo()).toBe(false);
  });

  it('keeps edits and snapshots consistent across a projection switch', () => {
    const { editing, loaded, setProjection } = setup();
    editing.execute(updateGeometry(loaded, new Point(fromLonLat([9, 50]))));
    setProjection('EPSG:4326');
    const [x, y] = (loaded.getGeometry() as Point).getCoordinates();
    expect(x).toBeCloseTo(9, 6); // the edit survived (not rebuilt from the original)
    expect(y).toBeCloseTo(50, 6);
    expect(editing.getChangeSet().changes[0]).toMatchObject({ changed: ['geometry'] });
    editing.undo();
    expect((loaded.getGeometry() as Point).getCoordinates()[0]).toBeCloseTo(8, 6);
    expect(editing.hasChanges()).toBe(false);
  });

  it('removing a layer drops its changes and the history', () => {
    const { lm, editing, loaded } = setup();
    editing.execute(updateProperties(loaded, { name: 'x' }));
    editing.dropLayer('points');
    lm.remove('points');
    expect(editing.hasChanges()).toBe(false);
    expect(editing.canUndo()).toBe(false);
  });
});

describe('Editing: untracked layers', () => {
  it('applies, undoes and keeps draft commands without exporting them', () => {
    const { lm, editing, events } = setup({ untracked: 'draft' });
    const point = new Feature({ geometry: new Point([1, 2]) });
    const line = new Feature({
      geometry: new LineString([
        [0, 0],
        [5, 5],
      ]),
    });
    expect(editing.execute(insertFeature('draft', point))).toBe(true);
    expect(editing.execute(insertFeature('draft', line))).toBe(true);
    expect(point.getId()).toBe('tmp-1');
    expect(lm.getSource('draft').getFeatures()).toHaveLength(2);
    expect(events.featureinsert).toHaveBeenCalledTimes(2);
    expect(editing.hasChanges()).toBe(false);
    expect(lastChangeSet(events).changes).toEqual([]);
    // Still validated: a mixed layer takes every type, but not an invalid one.
    expect(editing.execute(insertFeature('draft', new Feature(new LineString([[0, 0]]))))).toBe(
      false,
    );
    expect(events.validationerror.mock.calls[0]![0].code).toBe('too-few-vertices');
    // Updates and deletes work and stay out of the change set; the history is kept.
    expect(editing.execute(updateGeometry(point, new Point([3, 4])))).toBe(true);
    expect(editing.execute(deleteFeature(line))).toBe(true);
    expect(lm.getSource('draft').getFeatures()).toHaveLength(1);
    expect(editing.hasChanges()).toBe(false);
    expect(editing.undo()).toBe(true);
    expect(lm.getSource('draft').getFeatures()).toHaveLength(2);
    expect(editing.undo()).toBe(true);
    expect((point.getGeometry() as Point).getCoordinates()).toEqual([1, 2]);
    // accept and discard leave draft features alone; the next tracked insert continues the ids.
    editing.discard();
    expect(lm.getSource('draft').getFeatures()).toHaveLength(2);
    editing.accept();
    expect(lm.getSource('draft').getFeatures()).toHaveLength(2);
    const tracked = new Feature({ geometry: new Point([1, 1]) });
    expect(editing.execute(insertFeature('points', tracked))).toBe(true);
    expect(tracked.getId()).toBe('tmp-3');
    expect(lastChangeSet(events).changes.map((c) => c.op)).toEqual(['insert']);
  });
});

describe('Editing: export options', () => {
  it('rounds coordinates, forces a CRS and exports full features', () => {
    const { editing, loaded } = setup({ precision: 2, crs: 'EPSG:3857', fullFeatures: true });
    editing.execute(updateProperties(loaded, { name: 'full' }));
    const set = editing.getChangeSet();
    expect(set.crs).toBe('EPSG:3857');
    const change = set.changes[0] as {
      geometry: { coordinates: number[] };
      properties: Record<string, unknown>;
      changed: string[];
    };
    expect(change.changed).toEqual(['name']);
    expect(change.properties).toEqual({ name: 'full', lanes: 2 });
    const [x] = change.geometry.coordinates;
    expect(x).toBe(Math.round(fromLonLat([8, 49])[0]! * 100) / 100);
    expect(JSON.parse(JSON.stringify(set))).toEqual(set);
  });

  it('sets the top-level crs only when all changes share one', () => {
    const { lm, editing, loaded } = setup();
    lm.add({
      id: 'utm',
      geometryType: 'Point',
      editable: true,
      source: { format: 'geojson', dataProjection: 'EPSG:4326', data: '{}' },
    });
    lm.getOlLayer('utm').set('olcad:dataProjection', 'EPSG:4326');
    lm.getConfig('utm').source.dataProjection = 'EPSG:3857';
    editing.execute(updateProperties(loaded, { name: 'x' }));
    editing.execute(insertFeature('utm', new Feature(new Point([1, 1]))));
    const set = editing.getChangeSet();
    expect(set.crs).toBeUndefined();
    expect(set.changes.map((c: Change) => c.crs)).toEqual(['EPSG:4326', 'EPSG:3857']);
  });
});

describe('Editing: dimension layers', () => {
  const dimensions = (lm: LayerManager) =>
    lm.add({
      id: 'dims',
      geometryType: 'LineString',
      editable: true,
      dimension: { preset: 'surveying' },
      source: { features: [] },
    });
  const line = () => new LineString([fromLonLat([8, 49]), fromLonLat([8.0001, 49])]);

  it('inserts a valid dimension and tracks it with its properties', () => {
    const { lm, editing, events } = setup();
    dimensions(lm);
    const dim = new Feature({ geometry: line(), dimType: 'aligned', offset: 2, fieldValue: 7.3 });
    expect(editing.execute(insertFeature('dims', dim))).toBe(true);
    const [change] = lastChangeSet(events).changes;
    expect(change).toMatchObject({
      op: 'insert',
      layer: 'dims',
      properties: { dimType: 'aligned', offset: 2, fieldValue: 7.3 },
    });
  });

  it('rejects invalid dimensions and invalid property updates, changing nothing', () => {
    const { lm, editing, events } = setup();
    dimensions(lm);
    const three = new Feature(
      new LineString([fromLonLat([8, 49]), fromLonLat([8.1, 49]), fromLonLat([8.2, 49])]),
    );
    expect(editing.execute(insertFeature('dims', three))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({
        code: 'dimension-points',
        message: 'A dimension needs 2 distinct points, got 3.',
        layer: 'dims',
      }),
    );
    const dim = new Feature({ geometry: line() });
    expect(editing.execute(insertFeature('dims', dim))).toBe(true);
    expect(editing.execute(updateProperties(dim, { fieldValue: -2 }))).toBe(false);
    expect(events.validationerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: 'dimension-value' }),
    );
    expect(dim.get('fieldValue')).toBeUndefined();
    expect(editing.execute(updateProperties(dim, { fieldValue: 7.31 }))).toBe(true);
    // Other layers are not checked as dimensions.
    const road = new Feature(line());
    expect(editing.execute(insertFeature('lines', road))).toBe(true);
  });
});
