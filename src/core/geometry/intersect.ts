import type { Coordinate } from 'ol/coordinate';

/** Twice the signed area of triangle (a, b, c): positive when counter-clockwise. */
function cross(a: Coordinate, b: Coordinate, c: Coordinate): number {
  return (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
}

function onSegment(a: Coordinate, b: Coordinate, p: Coordinate): boolean {
  return (
    Math.min(a[0]!, b[0]!) <= p[0]! &&
    p[0]! <= Math.max(a[0]!, b[0]!) &&
    Math.min(a[1]!, b[1]!) <= p[1]! &&
    p[1]! <= Math.max(a[1]!, b[1]!)
  );
}

/**
 * Whether segment `ab` and segment `cd` share at least one point (touching counts).
 * Standard orientation test with the collinear cases handled by bounding-box checks.
 */
export function segmentsIntersect(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate,
): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(c, d, a)) return true;
  if (d2 === 0 && onSegment(c, d, b)) return true;
  if (d3 === 0 && onSegment(a, b, c)) return true;
  if (d4 === 0 && onSegment(a, b, d)) return true;
  return false;
}

/** Where two segments (or a ray and a segment) meet: `t` along the first, `u` along the second. */
export interface Crossing {
  point: Coordinate;
  t: number;
  u: number;
}

/** Shared parameters of the lines `a + t (b − a)` and `c + u (d − c)`; `null` when parallel. */
function lineParameters(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate,
): { t: number; u: number } | null {
  const rx = b[0]! - a[0]!;
  const ry = b[1]! - a[1]!;
  const sx = d[0]! - c[0]!;
  const sy = d[1]! - c[1]!;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) <= 1e-12 * Math.hypot(rx, ry) * Math.hypot(sx, sy)) return null;
  const qx = c[0]! - a[0]!;
  const qy = c[1]! - a[1]!;
  return { t: (qx * sy - qy * sx) / denominator, u: (qx * ry - qy * rx) / denominator };
}

/**
 * The point where segment `ab` crosses segment `cd`, with `t` and `u` in [0, 1]; `null` when
 * they miss or are parallel (collinear overlaps have no single crossing point).
 */
export function segmentIntersection(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate,
): Crossing | null {
  const p = lineParameters(a, b, c, d);
  if (!p || p.t < 0 || p.t > 1 || p.u < 0 || p.u > 1) return null;
  return { point: [a[0]! + p.t * (b[0]! - a[0]!), a[1]! + p.t * (b[1]! - a[1]!)], t: p.t, u: p.u };
}

/**
 * The point where the ray from `origin` in `direction` hits segment `cd`: `t > 0` in units of
 * `direction`, `u` in [0, 1]; `null` when it misses, points away or runs parallel.
 */
export function rayIntersection(
  origin: Coordinate,
  direction: Coordinate,
  c: Coordinate,
  d: Coordinate,
): Crossing | null {
  const ahead = [origin[0]! + direction[0]!, origin[1]! + direction[1]!];
  const p = lineParameters(origin, ahead, c, d);
  if (!p || p.t <= 0 || p.u < 0 || p.u > 1) return null;
  return {
    point: [origin[0]! + p.t * direction[0]!, origin[1]! + p.t * direction[1]!],
    t: p.t,
    u: p.u,
  };
}
