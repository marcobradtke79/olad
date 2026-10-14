// @vitest-environment jsdom
import type Feature from 'ol/Feature';
import { transform } from 'ol/proj';
import type Style from 'ol/style/Style';
import { describe, expect, it, vi } from 'vitest';
import { MeasurementStore, computeMeasurement, measurementExtent } from './MeasurementStore';

// Near the origin of Web Mercator one map unit is about one metre.
const PROJECTION = 'EPSG:3857';

function setup() {
  let projection = PROJECTION;
  const change = vi.fn();
  const live = vi.fn();
  const store = new MeasurementStore(() => projection, { change, live });
  const labels = (layer = store.layer) =>
    layer
      .getSource()!
      .getFeatures()
      .map((f: Feature) => (f.getStyle() as Style).getText()?.getText())
      .filter((t): t is string => typeof t === 'string');
  return { store, change, live, labels, setProjection: (p: string) => (projection = p) };
}

describe('computeMeasurement', () => {
  it('computes and labels each kind, or refuses too few points', () => {
    const distance = computeMeasurement(PROJECTION, 'distance', [
      [0, 0],
      [30, 0],
      [30, 40],
    ])!;
    expect(distance.values.length).toBeCloseTo(70, 3);
    expect(distance.values.segments).toHaveLength(2);
    expect(distance.label).toBe('70.00 m');
    const area = computeMeasurement(PROJECTION, 'area', [
      [0, 0],
      [200, 0],
      [200, 100],
      [0, 100],
    ])!;
    expect(area.values.area).toBeCloseTo(20000, 0);
    expect(area.label).toBe('2.00 ha · 600.00 m');
    const angle = computeMeasurement(PROJECTION, 'angle', [
      [10, 0],
      [0, 0],
      [0, 10],
    ])!;
    expect(angle.values).toEqual({ angle: 90, reflex: 270 });
    expect(angle.label).toBe('90.0°');
    expect(
      computeMeasurement(PROJECTION, 'area', [
        [0, 0],
        [1, 1],
      ]),
    ).toBeNull();
  });
});

describe('MeasurementStore', () => {
  it('adds, names, lists, removes and clears measurements with events', () => {
    const { store, change, labels } = setup();
    const first = store.add('distance', [
      [0, 0],
      [30, 0],
      [30, 40],
    ])!;
    expect(first.name).toBe('Distance 1');
    expect(first.id).toBe('m1');
    expect(change).toHaveBeenLastCalledWith([first]);
    // Segment labels and the total.
    expect(labels()).toEqual(['30.00 m', '40.00 m', '70.00 m']);
    const second = store.add('distance', [
      [0, 0],
      [5, 0],
    ])!;
    expect(second.name).toBe('Distance 2');
    expect(store.add('angle', [[0, 0]])).toBeNull();
    const area = store.add(
      'area',
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      { source: { layer: 'parcels', featureId: 7 } },
    )!;
    expect(area.name).toBe('Area 1');
    expect(area.source).toEqual({ layer: 'parcels', featureId: 7 });
    expect(store.list().map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(measurementExtent(first)).toEqual([0, 0, 30, 40]);
    expect(store.remove('m2')).toBe(true);
    expect(store.remove('m2')).toBe(false);
    expect(store.list().map((m) => m.id)).toEqual(['m1', 'm3']);
    change.mockClear();
    store.clear();
    expect(change).toHaveBeenCalledWith([]);
    expect(labels()).toEqual([]);
    store.clear();
    expect(change).toHaveBeenCalledTimes(1); // nothing left: no event
  });

  it('shows the measurement in progress on its own layer', () => {
    const { store, live, labels } = setup();
    expect(store.setLive('distance', [[0, 0]])!.label).toBe(''); // one point: nothing to measure yet
    const shown = store.setLive('distance', [
      [0, 0],
      [3, 4],
    ])!;
    expect(shown.label).toBe('5.00 m');
    expect(live).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'live', label: '5.00 m' }));
    expect(labels(store.liveLayer)).toEqual(['5.00 m']);
    expect(store.getLive()?.kind).toBe('distance');
    store.setLive(null);
    expect(live).toHaveBeenLastCalledWith(null);
    expect(store.getLive()).toBeNull();
    expect(store.list()).toEqual([]);
  });

  it('draws an angle with its arc and keeps values across a projection switch', () => {
    const { store, labels, setProjection } = setup();
    const angle = store.add('angle', [
      [1000, 0],
      [0, 0],
      [0, 1000],
    ])!;
    expect(labels()).toEqual(['90.0°']);
    expect(store.layer.getSource()!.getFeatures()).toHaveLength(3); // legs, arc, label
    setProjection('EPSG:4326');
    store.reproject('EPSG:3857', 'EPSG:4326');
    const moved = store.get(angle.id)!;
    expect(moved.values.angle).toBe(90);
    expect(moved.coordinates[0]![0]).toBeCloseTo(
      transform([1000, 0], 'EPSG:3857', 'EPSG:4326')[0]!,
      9,
    );
  });
});
