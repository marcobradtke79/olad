import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import { circlePolygon } from './circle';
import { fitCircleRun } from './circleFit';

describe('fitCircleRun', () => {
  it('recovers a linearized circle from any of its segments', () => {
    const circle = circlePolygon([100, 200], 12.5, 0.01);
    const fit = fitCircleRun(circle, [112.5, 200.3], 1)!;
    expect(fit.full).toBe(true);
    expect(fit.center[0]).toBeCloseTo(100, 6);
    expect(fit.center[1]).toBeCloseTo(200, 6);
    expect(fit.radius).toBeCloseTo(12.5, 6);
  });

  it('finds the arc inside a line between straight parts', () => {
    // Straight east, a quarter circle of radius 10 around (10, 10), straight north.
    const arc = Array.from({ length: 17 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2);
      return [10 + 10 * Math.cos(a), 10 + 10 * Math.sin(a)];
    });
    const line = new LineString([[-20, 0], ...arc, [20, 40]]);
    const fit = fitCircleRun(line, [17.07, 2.93], 1)!;
    expect(fit.full).toBe(false);
    expect(fit.radius).toBeCloseTo(10, 6);
    expect(fit.center[0]).toBeCloseTo(10, 6);
    expect(fit.run.length).toBeGreaterThanOrEqual(15);
  });

  it('gives null for corners, straight lines and misses', () => {
    const square = new Polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    expect(fitCircleRun(square, [10, 5], 1)).toBeNull();
    expect(
      fitCircleRun(
        new LineString([
          [0, 0],
          [10, 0],
          [20, 0],
        ]),
        [5, 0],
        1,
      ),
    ).toBeNull();
    expect(fitCircleRun(circlePolygon([0, 0], 5, 0.01), [50, 50], 1)).toBeNull();
  });
});
