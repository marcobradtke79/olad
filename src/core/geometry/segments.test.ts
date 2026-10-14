import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import {
  nearestSegment,
  normalizeAngle,
  projectOnSegment,
  ringsOf,
  screenAngle,
  segmentsOf,
} from './segments';

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe('ringsOf', () => {
  it('lists the coordinate runs of every geometry type', () => {
    const line = [
      [0, 0],
      [1, 1],
    ];
    expect(ringsOf(new LineString(line))).toEqual([line]);
    expect(ringsOf(new MultiLineString([line, line]))).toEqual([line, line]);
    expect(ringsOf(new Polygon([square, square]))).toEqual([square, square]);
    expect(ringsOf(new MultiPolygon([[square], [square, square]]))).toHaveLength(3);
    expect(ringsOf(new GeometryCollection([new Point([0, 0]), new LineString(line)]))).toEqual([
      line,
    ]);
    expect(ringsOf(new Point([0, 0]))).toEqual([]);
    expect(ringsOf(new MultiPoint([[0, 0]]))).toEqual([]);
  });
});

describe('segmentsOf', () => {
  it('lists segments of lines, rings, multi geometries and collections', () => {
    expect(
      segmentsOf(
        new LineString([
          [0, 0],
          [1, 0],
          [1, 1],
        ]),
      ),
    ).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
      ],
    ]);
    expect(segmentsOf(new Polygon([square]))).toHaveLength(4);
    expect(segmentsOf(new MultiPolygon([[square], [square]]))).toHaveLength(8);
    expect(
      segmentsOf(
        new MultiLineString([
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
            [4, 4],
          ],
        ]),
      ),
    ).toHaveLength(3);
    expect(
      segmentsOf(new GeometryCollection([new Point([0, 0]), new Polygon([square])])),
    ).toHaveLength(4);
  });

  it('has no segments for points', () => {
    expect(segmentsOf(new Point([1, 2]))).toEqual([]);
    expect(
      segmentsOf(
        new MultiPoint([
          [1, 2],
          [3, 4],
        ]),
      ),
    ).toEqual([]);
  });
});

describe('nearestSegment', () => {
  it('returns the segment closest to the coordinate', () => {
    expect(nearestSegment(new Polygon([square]), [11, 5])).toEqual([
      [10, 0],
      [10, 10],
    ]);
    expect(nearestSegment(new Polygon([square]), [5, -3])).toEqual([
      [0, 0],
      [10, 0],
    ]);
    expect(nearestSegment(new Polygon([square]), [-1, 9])).toEqual([
      [0, 10],
      [0, 0],
    ]);
  });

  it('is undefined for point geometries', () => {
    expect(nearestSegment(new Point([0, 0]), [0, 0])).toBeUndefined();
  });
});

describe('projectOnSegment', () => {
  it('finds the foot of the perpendicular and its parameter', () => {
    expect(projectOnSegment([5, 3], [0, 0], [10, 0])).toEqual({ foot: [5, 0], t: 0.5 });
    expect(projectOnSegment([-4, 2], [0, 0], [10, 0])).toEqual({ foot: [-4, 0], t: -0.4 });
    expect(projectOnSegment([12, -1], [0, 0], [10, 0])).toEqual({ foot: [12, 0], t: 1.2 });
    const diagonal = projectOnSegment([0, 10], [0, 0], [10, 10]);
    expect(diagonal.foot[0]).toBeCloseTo(5);
    expect(diagonal.foot[1]).toBeCloseTo(5);
    expect(diagonal.t).toBeCloseTo(0.5);
    expect(projectOnSegment([3, 3], [1, 1], [1, 1])).toEqual({ foot: [1, 1], t: 0 });
  });
});

describe('angles', () => {
  it('normalises to [0, 360)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(-30)).toBe(330);
    expect(normalizeAngle(720)).toBe(0);
  });

  it('measures screen angles counter-clockwise with pixel y pointing down', () => {
    expect(screenAngle([0, 0], [10, 0])).toBe(0);
    expect(screenAngle([10, 0], [0, 0])).toBe(0);
    expect(screenAngle([0, 10], [0, 0])).toBe(90); // straight up on screen
    expect(screenAngle([0, 0], [0, 10])).toBe(90);
    expect(screenAngle([0, 0], [10, -10])).toBeCloseTo(45);
    expect(screenAngle([0, 0], [10, 10])).toBeCloseTo(135);
  });
});
