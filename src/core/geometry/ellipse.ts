import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import { circleSegmentCount } from './circle';

/**
 * An ellipse by its centre, the half-length `a` of the first axis, the half-length `b` of the
 * second axis and the direction of the first axis (`rotation`, radians, counter-clockwise from
 * the +x axis). `a` is not necessarily the longer one.
 */
export interface EllipseDefinition {
  center: Coordinate;
  a: number;
  b: number;
  rotation: number;
}

/** Distance of `p` from the infinite line through `origin` with direction `rotation`. */
function distanceFromAxis(p: Coordinate, origin: Coordinate, rotation: number): number {
  const dx = p[0]! - origin[0]!;
  const dy = p[1]! - origin[1]!;
  return Math.abs(-dx * Math.sin(rotation) + dy * Math.cos(rotation));
}

/**
 * The ellipse with the given centre, one end of the first axis and a point whose distance from
 * that axis is the second half-axis. `null` when the axis end is on the centre or the point
 * is on the axis.
 */
export function ellipseFromCentre(
  center: Coordinate,
  axisEnd: Coordinate,
  point: Coordinate,
): EllipseDefinition | null {
  const a = Math.hypot(axisEnd[0]! - center[0]!, axisEnd[1]! - center[1]!);
  if (a === 0) return null;
  const rotation = Math.atan2(axisEnd[1]! - center[1]!, axisEnd[0]! - center[0]!);
  const b = distanceFromAxis(point, center, rotation);
  return b > 1e-9 * a ? { center: [center[0]!, center[1]!], a, b, rotation } : null;
}

/**
 * The ellipse whose first axis runs from `first` to `second` and whose second half-axis is the
 * distance of `point` from that axis. `null` when the ends coincide or the point is on the axis.
 */
export function ellipseFromAxis(
  first: Coordinate,
  second: Coordinate,
  point: Coordinate,
): EllipseDefinition | null {
  const center = [(first[0]! + second[0]!) / 2, (first[1]! + second[1]!) / 2];
  return ellipseFromCentre(center, second, point);
}

/**
 * The ellipse inscribed in the box with opposite corners `a` and `b` whose sides run along and
 * across `angleDeg` (degrees, the straightedge angle), as the rectangle tool builds it. `null`
 * when the box has no width or no height.
 */
export function ellipseFromCorners(
  a: Coordinate,
  b: Coordinate,
  angleDeg: number,
): EllipseDefinition | null {
  const rotation = (angleDeg * Math.PI) / 180;
  const dx = b[0]! - a[0]!;
  const dy = b[1]! - a[1]!;
  const along = dx * Math.cos(rotation) + dy * Math.sin(rotation);
  const across = -dx * Math.sin(rotation) + dy * Math.cos(rotation);
  // Relative tolerance: cos 90° is not exactly 0 in floating point.
  const epsilon = 1e-9 * Math.hypot(dx, dy);
  if (Math.abs(along) <= epsilon || Math.abs(across) <= epsilon) return null;
  return {
    center: [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2],
    a: Math.abs(along) / 2,
    b: Math.abs(across) / 2,
    rotation,
  };
}

/**
 * The ellipse as a closed counter-clockwise ring starting at the end of the first axis,
 * linearized with uniform parameter steps. The step count is that of a circle with the longer
 * half-axis: the ellipse is that circle squeezed along one axis, which never makes a chord
 * deviate more, so no chord deviates more than `tolerance` (map units) from the true curve.
 */
export function ellipsePolygon(ellipse: EllipseDefinition, tolerance: number): Polygon {
  const { center, a, b, rotation } = ellipse;
  const count = circleSegmentCount(Math.max(a, b), tolerance);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const ring: Coordinate[] = [];
  for (let i = 0; i < count; i++) {
    const t = (2 * Math.PI * i) / count;
    const u = a * Math.cos(t);
    const v = b * Math.sin(t);
    ring.push([
      Math.round((center[0]! + u * cos - v * sin) * 1e9) / 1e9 + 0,
      Math.round((center[1]! + u * sin + v * cos) * 1e9) / 1e9 + 0,
    ]);
  }
  ring.push([ring[0]![0]!, ring[0]![1]!]);
  return new Polygon([ring]);
}
