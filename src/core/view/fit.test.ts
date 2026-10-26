// @vitest-environment jsdom
import View from 'ol/View';
import type OlMap from 'ol/Map';
import { describe, expect, it } from 'vitest';
import { fitView, unionExtents } from './fit';

/** A stand-in for ol/Map: a real view, a size that may be missing, `once` for `change:size`. */
function fakeMap(size: [number, number] | undefined, projection = 'EPSG:3857') {
  const view = new View({ projection, center: [0, 0], zoom: 2 });
  const listeners: (() => void)[] = [];
  const map = {
    getView: () => view,
    getSize: () => size,
    once: (_type: string, listener: () => void) => listeners.push(listener),
    /** Give the map a size and fire `change:size`. */
    layout(next: [number, number]) {
      size = next;
      for (const listener of listeners.splice(0)) listener();
    },
  };
  return { view, map: map as unknown as OlMap & { layout(next: [number, number]): void } };
}

describe('fitView', () => {
  it('fits at once when the map has a size, with padding and a zoom cap', () => {
    const { view, map } = fakeMap([800, 600]);
    fitView(map, { extent: [100, 100, 300, 200] }, { padding: [10, 10, 10, 10], maxZoom: 12 });
    expect(view.getCenter()).toEqual([200, 150]);
    expect(view.getZoom()).toBe(12);
  });

  it('transforms an extent from its projection into the view projection', () => {
    const { view, map } = fakeMap([800, 600]);
    fitView(map, { extent: [8.39, 49.0, 8.41, 49.02], projection: 'EPSG:4326' });
    const [x, y] = view.getCenter()!;
    expect(x).toBeCloseTo(935084, -1);
    expect(y).toBeCloseTo(6276558.5, -1);
  });

  it('waits for the first size when the map has none yet', () => {
    const { view, map } = fakeMap(undefined);
    fitView(map, { extent: [100, 100, 300, 200] });
    expect(view.getCenter()).toEqual([0, 0]);
    map.layout([800, 600]);
    expect(view.getCenter()).toEqual([200, 150]);
  });
});

describe('unionExtents', () => {
  it('covers all extents and is null for none', () => {
    expect(unionExtents([])).toBeNull();
    expect(
      unionExtents([
        [0, 0, 1, 1],
        [-2, 3, 0, 4],
      ]),
    ).toEqual([-2, 0, 1, 4]);
  });
});
