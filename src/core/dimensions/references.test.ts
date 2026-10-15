// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import {
  isRefs,
  isStale,
  referencedPoints,
  referenceFor,
  remapReferences,
  resolveReference,
  type DimensionReference,
} from './references';

const square = () =>
  new Polygon([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ]);

function parcel(): Feature {
  const feature = new Feature(square());
  feature.setId(7);
  return feature;
}

describe('referenceFor', () => {
  it('records vertex, midpoint and perpendicular snaps on an object with an id', () => {
    const feature = parcel();
    const snap = (mode: string, coordinate: number[]) => ({
      mode,
      coordinate,
      layer: 'parcels',
      feature,
    });
    expect(referenceFor(snap('vertex', [10, 10]), [10, 10])).toEqual({
      layer: 'parcels',
      id: 7,
      kind: 'vertex',
      path: [0, 2],
    });
    expect(referenceFor(snap('midpoint', [10, 5]), [10, 5])).toEqual({
      layer: 'parcels',
      id: 7,
      kind: 'midpoint',
      path: [0, 1],
    });
    expect(referenceFor(snap('perpendicular', [2.5, 10]), [2.5, 10])).toMatchObject({
      kind: 'edge',
      path: [0, 2],
      t: 0.75,
    });
  });

  it('records nothing for a grid snap, an object without id or a point the snap did not place', () => {
    const feature = parcel();
    expect(referenceFor({ mode: 'grid', coordinate: [0, 0] }, [0, 0])).toBeNull();
    expect(
      referenceFor({ mode: 'vertex', coordinate: [0, 0], layer: 'parcels', feature }, [1, 1]),
    ).toBeNull();
    const anonymous = new Feature(square());
    expect(
      referenceFor(
        { mode: 'vertex', coordinate: [0, 0], layer: 'parcels', feature: anonymous },
        [0, 0],
      ),
    ).toBeNull();
    expect(referenceFor(null, [0, 0])).toBeNull();
  });
});

describe('resolving and checking references', () => {
  const vertex: DimensionReference = { layer: 'parcels', id: 7, kind: 'vertex', path: [0, 2] };
  const edge: DimensionReference = { layer: 'parcels', id: 7, kind: 'edge', path: [0, 0], t: 0.5 };

  it('resolves vertices and points on segments, null when gone', () => {
    expect(resolveReference(vertex, square())).toEqual([10, 10]);
    expect(resolveReference(edge, square())).toEqual([5, 0]);
    expect(resolveReference({ ...vertex, path: [0, 9] }, square())).toBeNull();
    expect(resolveReference(vertex, undefined)).toBeNull();
  });

  it('tells stale dimensions and moves them onto the references', () => {
    const target = parcel();
    const dimension = new Feature({
      geometry: new LineString([
        [5, 0],
        [10, 10],
      ]),
      refs: [edge, vertex],
    });
    const find = (layer: string, id: string | number) =>
      layer === 'parcels' && id === 7 ? target : null;
    expect(isStale(dimension, find, 0.001)).toBe(false);
    target.setGeometry(
      new Polygon([
        [
          [0, 0],
          [10, 0],
          [12, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
    );
    expect(isStale(dimension, find, 0.001)).toBe(true);
    expect(referencedPoints(dimension, find)).toEqual([
      [5, 0],
      [12, 10],
    ]);
    expect(isStale(dimension, () => null, 0.001)).toBe(true); // the object is gone
    expect(referencedPoints(dimension, () => null)).toBeNull();
  });

  it('validates refs and remaps temporary ids', () => {
    expect(isRefs(undefined)).toBe(true);
    expect(isRefs([vertex, null])).toBe(true);
    expect(isRefs([vertex])).toBe(false);
    expect(isRefs([{ ...vertex, kind: 'corner' }, null])).toBe(false);
    expect(isRefs([{ ...edge, t: 2 }, null])).toBe(false);
    const fresh = { ...vertex, id: 'tmp-3' };
    expect(remapReferences([fresh, null], { 'tmp-3': 9001 })).toEqual([
      { ...vertex, id: 9001 },
      null,
    ]);
    expect(remapReferences([vertex, null], { 'tmp-3': 9001 })).toBeNull();
  });
});
