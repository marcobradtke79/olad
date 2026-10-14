import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { linearRingIsClockwise } from 'ol/geom/flat/orient';
import { describe, expect, it } from 'vitest';
import { mirrorGeometry, reflectPoint } from './mirror';

const close = (actual: number[], expected: number[]) => {
  expect(actual[0]).toBeCloseTo(expected[0]!, 9);
  expect(actual[1]).toBeCloseTo(expected[1]!, 9);
};

const clockwise = (ring: number[][]) => linearRingIsClockwise(ring.flat(), 0, ring.length * 2, 2);

describe('reflectPoint', () => {
  it('reflects across horizontal, vertical and diagonal lines', () => {
    close(reflectPoint([3, 4], [0, 0], [1, 0]), [3, -4]);
    close(reflectPoint([3, 4], [10, -5], [10, 5]), [17, 4]);
    close(reflectPoint([3, 1], [0, 0], [1, 1]), [1, 3]);
    close(reflectPoint([2, 2], [0, 0], [5, 5]), [2, 2]); // on the axis
  });
});

describe('mirrorGeometry', () => {
  it('mirrors points and lines into copies, twice is the identity', () => {
    const line = new LineString([
      [1, 1],
      [4, 2],
    ]);
    const mirrored = mirrorGeometry(line, [0, 0], [0, 1]) as LineString;
    expect(mirrored).not.toBe(line);
    expect(mirrored.getCoordinates()).toEqual([
      [-1, 1],
      [-4, 2],
    ]);
    expect(line.getCoordinates()[0]).toEqual([1, 1]); // untouched
    const back = mirrorGeometry(mirrored, [0, 0], [0, 1]) as LineString;
    expect(back.getCoordinates()).toEqual(line.getCoordinates());
    expect((mirrorGeometry(new Point([2, 5]), [0, 0], [1, 0]) as Point).getCoordinates()).toEqual([
      2, -5,
    ]);
    expect(
      (mirrorGeometry(new MultiPoint([[1, 0]]), [0, 0], [0, 1]) as MultiPoint).getCoordinates(),
    ).toEqual([[-1, 0]]);
  });

  it('keeps the winding of polygon rings and holes', () => {
    const outer = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ];
    const hole = [
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 1],
      [1, 1],
    ];
    const polygon = new Polygon([outer, hole]);
    const mirrored = mirrorGeometry(polygon, [10, 0], [10, 1]) as Polygon;
    const [mOuter, mHole] = mirrored.getCoordinates();
    expect(clockwise(mOuter!)).toBe(clockwise(outer));
    expect(clockwise(mHole!)).toBe(clockwise(hole));
    expect(mOuter!.map(([x]) => x).sort()).toEqual([16, 16, 20, 20, 20]);
    expect(mirrored.getArea()).toBeCloseTo(polygon.getArea(), 9);
    const multi = mirrorGeometry(new MultiPolygon([[outer]]), [0, 0], [1, 0]) as MultiPolygon;
    expect(clockwise(multi.getCoordinates()[0]![0]!)).toBe(clockwise(outer));
  });

  it('mirrors collections part by part and refuses a degenerate line', () => {
    const collection = new GeometryCollection([new Point([1, 1]), new Point([2, 0])]);
    const mirrored = mirrorGeometry(collection, [0, 0], [1, 0]) as GeometryCollection;
    expect(mirrored.getGeometriesArray().map((g) => (g as Point).getCoordinates())).toEqual([
      [1, -1],
      [2, 0],
    ]);
    expect(() => mirrorGeometry(new Point([1, 1]), [3, 3], [3, 3])).toThrow('two distinct');
  });
});
