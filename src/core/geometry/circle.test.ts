import { describe, expect, it } from 'vitest';
import {
  circlePolygon,
  circleSegmentCount,
  circumcircle,
  MAX_CIRCLE_SEGMENTS,
  MIN_CIRCLE_SEGMENTS,
} from './circle';

describe('circumcircle', () => {
  it('finds the circle through three points', () => {
    const circle = circumcircle([0, 0], [2, 0], [0, 2])!;
    expect(circle.center[0]).toBeCloseTo(1, 9);
    expect(circle.center[1]).toBeCloseTo(1, 9);
    expect(circle.radius).toBeCloseTo(Math.SQRT2, 9);
    const offset = circumcircle([10, -5], [13, -5], [10, -1])!;
    expect(offset.center[0]).toBeCloseTo(11.5, 9);
    expect(offset.center[1]).toBeCloseTo(-3, 9);
    expect(offset.radius).toBeCloseTo(2.5, 9);
  });

  it('is independent of the point order', () => {
    const a = circumcircle([1, 7], [4, 3], [-2, 0])!;
    const b = circumcircle([-2, 0], [1, 7], [4, 3])!;
    expect(a.center[0]).toBeCloseTo(b.center[0]!, 9);
    expect(a.center[1]).toBeCloseTo(b.center[1]!, 9);
    expect(a.radius).toBeCloseTo(b.radius, 9);
  });

  it('rejects collinear and coincident points', () => {
    expect(circumcircle([0, 0], [1, 1], [2, 2])).toBeNull();
    expect(circumcircle([0, 0], [0, 0], [2, 2])).toBeNull();
    expect(circumcircle([0, 0], [3, 1], [3, 1])).toBeNull();
    expect(circumcircle([5, 5], [5, 5], [5, 5])).toBeNull();
  });
});

describe('circleSegmentCount', () => {
  it('grows as the tolerance shrinks and respects the clamps', () => {
    const coarse = circleSegmentCount(100, 1);
    const fine = circleSegmentCount(100, 0.01);
    expect(fine).toBeGreaterThan(coarse);
    expect(coarse).toBeGreaterThanOrEqual(MIN_CIRCLE_SEGMENTS);
    expect(circleSegmentCount(1, 0.5)).toBe(MIN_CIRCLE_SEGMENTS);
    expect(circleSegmentCount(1, 0)).toBe(MIN_CIRCLE_SEGMENTS);
    expect(circleSegmentCount(1, 2)).toBe(MIN_CIRCLE_SEGMENTS);
    expect(circleSegmentCount(1e6, 1e-6)).toBe(MAX_CIRCLE_SEGMENTS);
    expect(circleSegmentCount(50, 0.01, 8, 64)).toBe(64);
  });

  it('keeps the chord deviation within the tolerance', () => {
    const radius = 100;
    const tolerance = 0.01;
    const count = circleSegmentCount(radius, tolerance);
    const sagitta = radius * (1 - Math.cos(Math.PI / count));
    expect(sagitta).toBeLessThanOrEqual(tolerance);
  });
});

describe('circlePolygon', () => {
  it('builds a closed counter-clockwise ring on the circle, starting east of the centre', () => {
    const polygon = circlePolygon([10, 20], 5, 0.0001);
    const ring = polygon.getCoordinates()[0]!;
    expect(ring).toHaveLength(circleSegmentCount(5, 0.0001) + 1);
    expect(ring[0]).toEqual([15, 20]);
    expect(ring[ring.length - 1]).toEqual(ring[0]);
    for (const [x, y] of ring) {
      expect(Math.hypot(x! - 10, y! - 20)).toBeCloseTo(5, 6);
    }
    expect(ring[1]![1]!).toBeGreaterThan(20); // counter-clockwise: the second vertex is north
    expect(polygon.getArea()).toBeCloseTo(Math.PI * 25, 1);
  });

  it('writes no negative zero', () => {
    const ring = circlePolygon([0, 0], 1, 0.001).getCoordinates()[0]!;
    for (const [x, y] of ring) {
      expect(Object.is(x, -0)).toBe(false);
      expect(Object.is(y, -0)).toBe(false);
    }
  });
});
