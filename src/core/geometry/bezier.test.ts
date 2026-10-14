import { squaredDistanceToSegment } from 'ol/coordinate';
import { describe, expect, it } from 'vitest';
import {
  bezierLineString,
  bezierPoint,
  bezierSegmentCount,
  chordHandles,
  MAX_BEZIER_SEGMENTS,
  type CubicBezier,
} from './bezier';

const sCurve: CubicBezier = {
  start: [0, 0],
  startHandle: [50, 100],
  endHandle: [50, -100],
  end: [100, 0],
};

describe('bezierPoint', () => {
  it('passes through the ends and the symmetric midpoint', () => {
    expect(bezierPoint(sCurve, 0)).toEqual([0, 0]);
    expect(bezierPoint(sCurve, 1)).toEqual([100, 0]);
    const mid = bezierPoint(sCurve, 0.5);
    expect(mid[0]).toBeCloseTo(50, 9);
    expect(mid[1]).toBeCloseTo(0, 9);
    const quarter = bezierPoint(sCurve, 0.25);
    expect(quarter[1]).toBeGreaterThan(0); // bulges towards the first handle
  });
});

describe('bezierSegmentCount', () => {
  it('grows as the tolerance shrinks, is one for a straight curve and clamps', () => {
    const coarse = bezierSegmentCount(sCurve, 1);
    const fine = bezierSegmentCount(sCurve, 0.01);
    expect(fine).toBeGreaterThan(coarse);
    expect(coarse).toBeGreaterThan(1);
    const straight: CubicBezier = {
      start: [0, 0],
      ...chordHandles([0, 0], [30, 30]),
      end: [30, 30],
    };
    expect(bezierSegmentCount(straight, 0.01)).toBe(1);
    expect(bezierSegmentCount(sCurve, 0)).toBe(1);
    expect(bezierSegmentCount(sCurve, 1e-12)).toBe(MAX_BEZIER_SEGMENTS);
  });
});

describe('bezierLineString', () => {
  it('keeps the ends exactly and stays within the tolerance of the curve', () => {
    const tolerance = 0.05;
    const line = bezierLineString(sCurve, tolerance);
    const points = line.getCoordinates();
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1]).toEqual([100, 0]);
    expect(points.length).toBe(bezierSegmentCount(sCurve, tolerance) + 1);
    for (let i = 0; i <= 1000; i++) {
      const sample = bezierPoint(sCurve, i / 1000);
      let best = Infinity;
      for (let j = 1; j < points.length; j++) {
        best = Math.min(best, squaredDistanceToSegment(sample, [points[j - 1]!, points[j]!]));
      }
      expect(Math.sqrt(best)).toBeLessThanOrEqual(tolerance);
    }
    expect(points.flat().some((v) => Object.is(v, -0))).toBe(false);
  });

  it('is the chord for default handles', () => {
    const curve: CubicBezier = { start: [1, 2], ...chordHandles([1, 2], [7, 8]), end: [7, 8] };
    expect(bezierLineString(curve, 0.01).getCoordinates()).toEqual([
      [1, 2],
      [7, 8],
    ]);
  });
});

describe('chordHandles', () => {
  it('places the handles one third along the chord from each end', () => {
    expect(chordHandles([0, 0], [30, 0])).toEqual({
      startHandle: [10, 0],
      endHandle: [20, 0],
    });
  });
});
