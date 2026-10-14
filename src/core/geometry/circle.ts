import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';

export interface CircleDefinition {
  center: Coordinate;
  radius: number;
}

/** Fewest segments a linearized circle gets, so small circles still look round. */
export const MIN_CIRCLE_SEGMENTS = 24;
/** Most segments a linearized circle gets, bounding the vertex count of huge circles. */
export const MAX_CIRCLE_SEGMENTS = 1024;

/**
 * The circle through three points (circumcircle), or `null` when they are collinear or two of
 * them coincide (relative tolerance on the determinant).
 */
export function circumcircle(a: Coordinate, b: Coordinate, c: Coordinate): CircleDefinition | null {
  const bx = b[0]! - a[0]!;
  const by = b[1]! - a[1]!;
  const cx = c[0]! - a[0]!;
  const cy = c[1]! - a[1]!;
  const d = 2 * (bx * cy - by * cx);
  const scale = Math.hypot(bx, by) * Math.hypot(cx, cy);
  if (scale === 0 || Math.abs(d) <= 1e-9 * scale) return null;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (cy * b2 - by * c2) / d;
  const uy = (bx * c2 - cx * b2) / d;
  return { center: [a[0]! + ux, a[1]! + uy], radius: Math.hypot(ux, uy) };
}

/**
 * Number of segments so that no chord deviates more than `tolerance` (same units as `radius`)
 * from the true circle, clamped to [`min`, `max`]. A tolerance of zero or at least the radius
 * gives `min`.
 */
export function circleSegmentCount(
  radius: number,
  tolerance: number,
  min = MIN_CIRCLE_SEGMENTS,
  max = MAX_CIRCLE_SEGMENTS,
): number {
  if (!(radius > 0) || !(tolerance > 0) || tolerance >= radius) return min;
  const count = Math.ceil(Math.PI / Math.acos(1 - tolerance / radius));
  return Math.min(max, Math.max(min, Number.isFinite(count) ? count : max));
}

/**
 * The circle as a closed counter-clockwise ring starting east of the centre, linearized with
 * `circleSegmentCount(radius, tolerance)` segments.
 */
export function circlePolygon(center: Coordinate, radius: number, tolerance: number): Polygon {
  const count = circleSegmentCount(radius, tolerance);
  const ring: Coordinate[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    ring.push([
      Math.round((center[0]! + radius * Math.cos(angle)) * 1e9) / 1e9 + 0,
      Math.round((center[1]! + radius * Math.sin(angle)) * 1e9) / 1e9 + 0,
    ]);
  }
  ring.push([ring[0]![0]!, ring[0]![1]!]);
  return new Polygon([ring]);
}
