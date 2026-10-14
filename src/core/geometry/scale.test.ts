import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import { scaleFactor, scaleGeometry } from './scale';

describe('scaleFactor', () => {
  it('compares the target distance with the reference distance from the base', () => {
    expect(scaleFactor([0, 0], [10, 0], [20, 0])).toBe(2);
    expect(scaleFactor([1, 1], [1, 5], [3, 1])).toBe(0.5); // direction does not matter
    expect(scaleFactor([0, 0], [10, 0], [0, 0])).toBe(0);
    expect(scaleFactor([2, 3], [2, 3], [5, 5])).toBeNull();
  });
});

describe('scaleGeometry', () => {
  it('scales a copy around the anchor and keeps the anchor fixed', () => {
    const line = new LineString([
      [2, 2],
      [4, 2],
    ]);
    const scaled = scaleGeometry(line, 2, [2, 2]) as LineString;
    expect(scaled.getCoordinates()).toEqual([
      [2, 2],
      [6, 2],
    ]);
    expect(line.getCoordinates()).toEqual([
      [2, 2],
      [4, 2],
    ]); // the original is untouched
    expect((scaleGeometry(new Point([1, 1]), 3, [1, 1]) as Point).getCoordinates()).toEqual([1, 1]);
  });

  it('is undone by the inverse factor and keeps the winding of rings and holes', () => {
    const polygon = new Polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [2, 2],
        [2, 4],
        [4, 4],
        [4, 2],
        [2, 2],
      ],
    ]);
    const anchor = [3, 7];
    const scaled = scaleGeometry(polygon, 2, anchor) as Polygon;
    expect(scaled.getArea()).toBeCloseTo(polygon.getArea() * 4, 9);
    const area = (ring: number[][]) =>
      ring.reduce((sum, c, i) => {
        const n = ring[(i + 1) % ring.length]!;
        return sum + c[0]! * n[1]! - n[0]! * c[1]!;
      }, 0);
    polygon.getCoordinates().forEach((ring, i) => {
      expect(Math.sign(area(scaled.getCoordinates()[i]!))).toBe(Math.sign(area(ring)));
    });
    const back = scaleGeometry(scaled, 0.5, anchor) as Polygon;
    back.getCoordinates().forEach((ring, i) =>
      ring.forEach((c, j) => {
        expect(c[0]).toBeCloseTo(polygon.getCoordinates()[i]![j]![0]!, 12);
        expect(c[1]).toBeCloseTo(polygon.getCoordinates()[i]![j]![1]!, 12);
      }),
    );
  });

  it('scales the members of a collection', () => {
    const collection = new GeometryCollection([new Point([1, 0]), new Point([0, 2])]);
    const scaled = scaleGeometry(collection, 3, [0, 0]) as GeometryCollection;
    expect(scaled.getGeometries().map((g) => (g as Point).getCoordinates())).toEqual([
      [3, 0],
      [0, 6],
    ]);
  });

  it('rejects a factor that is not greater than 0', () => {
    const point = new Point([1, 1]);
    expect(() => scaleGeometry(point, 0, [0, 0])).toThrow('greater than 0');
    expect(() => scaleGeometry(point, -2, [0, 0])).toThrow('greater than 0');
    expect(() => scaleGeometry(point, Number.NaN, [0, 0])).toThrow('greater than 0');
  });
});
