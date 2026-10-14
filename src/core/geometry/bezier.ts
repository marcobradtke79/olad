import type { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';

/** A cubic Bézier curve: the handles are its control points (tangent direction and tension). */
export interface CubicBezier {
  start: Coordinate;
  startHandle: Coordinate;
  endHandle: Coordinate;
  end: Coordinate;
}

/** Most segments a linearized curve gets, bounding the vertex count of huge curves. */
export const MAX_BEZIER_SEGMENTS = 1024;

const round = (v: number) => Math.round(v * 1e9) / 1e9 + 0;

/** The point of the curve at parameter `t` in [0, 1]. */
export function bezierPoint(curve: CubicBezier, t: number): Coordinate {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  const { start, startHandle, endHandle, end } = curve;
  return [
    a * start[0]! + b * startHandle[0]! + c * endHandle[0]! + d * end[0]!,
    a * start[1]! + b * startHandle[1]! + c * endHandle[1]! + d * end[1]!,
  ];
}

/**
 * Number of equal parameter steps so that no chord deviates more than `tolerance` (same units
 * as the coordinates) from the curve, from Wang's bound for a cubic: `ceil(sqrt(0.75 d / t))`
 * with `d` the largest second difference of the control points. `min` for a straight curve or
 * a non-positive tolerance, at most `max`.
 */
export function bezierSegmentCount(
  curve: CubicBezier,
  tolerance: number,
  min = 1,
  max = MAX_BEZIER_SEGMENTS,
): number {
  const { start, startHandle, endHandle, end } = curve;
  const d = Math.max(
    Math.hypot(
      start[0]! - 2 * startHandle[0]! + endHandle[0]!,
      start[1]! - 2 * startHandle[1]! + endHandle[1]!,
    ),
    Math.hypot(
      startHandle[0]! - 2 * endHandle[0]! + end[0]!,
      startHandle[1]! - 2 * endHandle[1]! + end[1]!,
    ),
  );
  if (!(d > 0) || !(tolerance > 0)) return min;
  const count = Math.ceil(Math.sqrt((0.75 * d) / tolerance));
  return Math.min(max, Math.max(min, Number.isFinite(count) ? count : max));
}

/** The curve as a line with `bezierSegmentCount` segments; start and end are kept exactly. */
export function bezierLineString(curve: CubicBezier, tolerance: number): LineString {
  const count = bezierSegmentCount(curve, tolerance);
  const points: Coordinate[] = [[curve.start[0]!, curve.start[1]!]];
  for (let i = 1; i < count; i++) {
    const [x, y] = bezierPoint(curve, i / count);
    points.push([round(x!), round(y!)]);
  }
  points.push([curve.end[0]!, curve.end[1]!]);
  return new LineString(points);
}

/** Default handles one third along the chord from each end: the curve starts straight. */
export function chordHandles(
  start: Coordinate,
  end: Coordinate,
): { startHandle: Coordinate; endHandle: Coordinate } {
  const dx = end[0]! - start[0]!;
  const dy = end[1]! - start[1]!;
  return {
    startHandle: [start[0]! + dx / 3, start[1]! + dy / 3],
    endHandle: [end[0]! - dx / 3, end[1]! - dy / 3],
  };
}
