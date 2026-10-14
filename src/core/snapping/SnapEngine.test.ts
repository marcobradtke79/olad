// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedGridConfig, ResolvedSnappingConfig } from '../config/types';
import { circlePolygon } from '../geometry/circle';
import { LayerManager } from '../layers/LayerManager';
import { SnapEngine, snapCandidates } from './SnapEngine';

function fakeMap(): OlMap {
  const layers = new Collection<BaseLayer>();
  return {
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getLayers: () => layers,
  } as unknown as OlMap;
}

function setup(config: Partial<ResolvedSnappingConfig> = {}) {
  const lm = new LayerManager(fakeMap(), () => 'EPSG:3857', {
    onChange: vi.fn(),
    onLoad: vi.fn(),
    onError: vi.fn(),
    onActiveChange: vi.fn(),
  });
  const add = (id: string, snappable = true) =>
    lm.add({
      id,
      geometryType: 'LineString',
      snappable,
      source: { format: 'geojson', data: '{"type":"FeatureCollection","features":[]}' },
    });
  add('lines');
  add('nosnap', false);
  const state: ResolvedSnappingConfig = {
    enabled: true,
    tolerancePx: 10,
    modes: ['vertex', 'midpoint'],
    ...config,
  };
  const grid: ResolvedGridConfig = { enabled: false, spacing: 10, origin: [0, 0], visible: true };
  const engine = new SnapEngine(
    lm,
    () => state,
    () => grid,
  );
  // 1 map unit per pixel, pixel y pointing down from y = 1000.
  const toPixel = (c: number[]) => [c[0]!, 1000 - c[1]!];
  const snap = (x: number, y: number) => engine.snap([x, y], toPixel([x, y]), 1, toPixel);
  return { lm, state, grid, engine, snap };
}

describe('snapCandidates', () => {
  it('lists vertices and midpoints by mode', () => {
    const line = new LineString([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(snapCandidates(line, ['vertex']).map((c) => c.coordinate)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(snapCandidates(line, ['midpoint']).map((c) => c.coordinate)).toEqual([
      [5, 0],
      [10, 5],
    ]);
    expect(snapCandidates(new Point([3, 4]), ['vertex', 'midpoint'])).toEqual([
      { coordinate: [3, 4], mode: 'vertex' },
    ]);
    const square = new Polygon([
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
    ]);
    expect(snapCandidates(square, ['midpoint'])).toHaveLength(4);
    expect(snapCandidates(square, ['vertex'])).toHaveLength(5);
  });
});

describe('SnapEngine', () => {
  it('snaps to the nearest vertex or midpoint within the pixel radius', () => {
    const { lm, snap } = setup();
    const road = new Feature(
      new LineString([
        [100, 100],
        [200, 100],
      ]),
    );
    road.setId('r');
    lm.getSource('lines').addFeature(road);
    expect(snap(104, 97)).toMatchObject({ coordinate: [100, 100], mode: 'vertex', layer: 'lines' });
    expect(snap(104, 97)!.pixel).toEqual([100, 900]);
    expect(snap(153, 106)).toMatchObject({ coordinate: [150, 100], mode: 'midpoint' });
    expect(snap(130, 100)).toBeNull(); // 20 px from both candidates
    expect(snap(111, 100)).toBeNull(); // 11 px: outside the 10 px radius
    expect(snap(110, 100)).toMatchObject({ mode: 'vertex' }); // exactly on the radius
  });

  it('measures the radius in pixels, not map units', () => {
    const { lm, engine } = setup();
    lm.getSource('lines').addFeature(new Feature(new Point([0, 0])));
    const toPixel = (c: number[]) => [c[0]! / 10, -c[1]! / 10]; // resolution 10
    expect(engine.snap([50, 0], toPixel([50, 0]), 10, toPixel)).toMatchObject({ mode: 'vertex' });
    expect(engine.snap([150, 0], toPixel([150, 0]), 10, toPixel)).toBeNull();
  });

  it('honours modes, the enabled flag, snappable and visible layers', () => {
    const { lm, state, snap } = setup({ modes: ['midpoint'] });
    const road = new Feature(
      new LineString([
        [0, 0],
        [10, 0],
      ]),
    );
    lm.getSource('lines').addFeature(road);
    expect(snap(1, 0)).toMatchObject({ coordinate: [5, 0], mode: 'midpoint' }); // vertex mode off
    state.modes = ['vertex'];
    expect(snap(1, 0)).toMatchObject({ coordinate: [0, 0], mode: 'vertex' });
    state.enabled = false;
    expect(snap(1, 0)).toBeNull();
    state.enabled = true;
    lm.getSource('nosnap').addFeature(new Feature(new Point([500, 500])));
    expect(snap(501, 500)).toBeNull();
    lm.setVisible('lines', false);
    expect(snap(1, 0)).toBeNull();
  });

  it('falls back to the nearest grid intersection when grid snap is on', () => {
    const { lm, state, grid, snap } = setup();
    lm.getSource('lines').addFeature(new Feature(new Point([100, 100])));
    expect(snap(63, 48)).toBeNull(); // grid off, nothing nearby
    grid.enabled = true;
    expect(snap(63, 48)).toEqual({ coordinate: [60, 50], pixel: [60, 950], mode: 'grid' });
    grid.spacing = 25;
    grid.origin = [5, 5];
    expect(snap(63, 48)).toMatchObject({ coordinate: [55, 55], mode: 'grid' });
    // A geometry snap within the radius wins over the grid.
    grid.spacing = 10;
    grid.origin = [0, 0];
    expect(snap(104, 97)).toMatchObject({ coordinate: [100, 100], mode: 'vertex' });
    // With geometry snapping off the grid still applies.
    state.enabled = false;
    expect(snap(104, 97)).toMatchObject({ coordinate: [100, 100], mode: 'grid' });
    expect(snap(104, 94)).toMatchObject({ coordinate: [100, 90], mode: 'grid' });
    grid.enabled = false;
    expect(snap(104, 94)).toBeNull();
  });

  it('snaps perpendicular from a reference vertex onto a segment', () => {
    const { lm, state, engine } = setup({ modes: ['perpendicular'] });
    lm.getSource('lines').addFeature(
      new Feature(
        new LineString([
          [0, 100],
          [100, 100],
        ]),
      ),
    );
    const toPixel = (c: number[]) => [c[0]!, 1000 - c[1]!];
    const snapWith = (x: number, y: number, reference: number[] | null) =>
      engine.snap([x, y], toPixel([x, y]), 1, toPixel, reference);
    // Reference below the line at x = 40: the foot is (40, 100).
    expect(snapWith(43, 96, [40, 20])).toMatchObject({
      coordinate: [40, 100],
      mode: 'perpendicular',
    });
    expect(snapWith(43, 96, null)).toBeNull(); // no drawing in progress
    expect(snapWith(60, 96, [40, 20])).toBeNull(); // pointer 20 px from the foot
    expect(snapWith(103, 96, [140, 20])).toBeNull(); // foot beyond the segment end
    state.modes = ['vertex', 'perpendicular'];
    expect(snapWith(98, 96, [100, 20])).toMatchObject({ mode: 'vertex' }); // vertex wins
    expect(snapCandidates(new Point([1, 1]), ['perpendicular'], [0, 0])).toEqual([]);
  });

  it('snaps to the tangent point of a circle from a reference vertex', () => {
    const { lm, state, engine } = setup({ modes: ['tangent'] });
    const circle = circlePolygon([100, 100], 50, 0.5);
    lm.getSource('lines').addFeature(new Feature(circle));
    const toPixel = (c: number[]) => [c[0]!, 1000 - c[1]!];
    const snapWith = (x: number, y: number, reference: number[] | null) =>
      engine.snap([x, y], toPixel([x, y]), 1, toPixel, reference);
    // Reference east of the circle at (300, 100): tangent points at x = 112.5, y = 100 ± 48.4.
    const hit = snapWith(114, 150, [300, 100]);
    expect(hit).toMatchObject({ mode: 'tangent', layer: 'lines' });
    expect(hit!.coordinate[0]).toBeCloseTo(112.5, 0);
    expect(hit!.coordinate[1]).toBeCloseTo(148.4, 0);
    expect(circle.getCoordinates()[0]).toContainEqual(hit!.coordinate);
    expect(snapWith(114, 150, null)).toBeNull(); // no drawing in progress
    expect(snapWith(130, 150, [300, 100])).toBeNull(); // pointer 18 px from the tangent point
    expect(snapWith(150, 100, [300, 100])).toBeNull(); // the near vertex is no tangent point
    expect(snapWith(114, 150, [100, 100])).toBeNull(); // reference inside the circle
    state.modes = ['vertex', 'tangent'];
    expect(snapWith(114, 150, [300, 100])).toMatchObject({ mode: 'tangent' }); // tangent wins
    expect(snapWith(150, 100, [300, 100])).toMatchObject({ mode: 'vertex' });
    expect(snapCandidates(circle, ['tangent'], [300, 100])).toHaveLength(2);
    expect(snapCandidates(new Point([1, 1]), ['tangent'], [0, 0])).toEqual([]);
  });

  it('prefers a vertex over a midpoint at the same distance', () => {
    const { lm, snap } = setup();
    lm.getSource('lines').addFeature(
      new Feature(
        new LineString([
          [0, 0],
          [10, 0],
        ]),
      ),
    );
    lm.getSource('lines').addFeature(new Feature(new Point([5, 0])));
    expect(snap(5, 2)).toMatchObject({ coordinate: [5, 0], mode: 'vertex' });
  });
});
