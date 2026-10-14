import { squaredDistanceToSegment, type Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LinearRing from 'ol/geom/LinearRing';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';

export type Segment = [Coordinate, Coordinate];

/**
 * Every coordinate run of a geometry: a line string, each ring of a polygon, each part of a
 * multi geometry. Points and multi-points have none.
 */
export function ringsOf(geometry: Geometry): Coordinate[][] {
  if (geometry instanceof LineString || geometry instanceof LinearRing) {
    return [geometry.getCoordinates()];
  }
  if (geometry instanceof MultiLineString || geometry instanceof Polygon) {
    return geometry.getCoordinates();
  }
  if (geometry instanceof MultiPolygon) return geometry.getCoordinates().flat();
  if (geometry instanceof GeometryCollection) {
    return geometry.getGeometriesArray().flatMap(ringsOf);
  }
  return [];
}

/** Every line segment of a geometry. Points and multi-points have none. */
export function segmentsOf(geometry: Geometry): Segment[] {
  const segments: Segment[] = [];
  for (const ring of ringsOf(geometry)) {
    for (let i = 1; i < ring.length; i++) segments.push([ring[i - 1]!, ring[i]!]);
  }
  return segments;
}

/** The segment of `geometry` closest to `coordinate`, or `undefined` for point geometries. */
export function nearestSegment(geometry: Geometry, coordinate: Coordinate): Segment | undefined {
  let best: Segment | undefined;
  let bestDistance = Infinity;
  for (const segment of segmentsOf(geometry)) {
    const distance = squaredDistanceToSegment(coordinate, segment);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = segment;
    }
  }
  return best;
}

/**
 * Orthogonal projection of `point` onto the line through `a` and `b`. `t` is the position
 * along `a → b` (0 at `a`, 1 at `b`); outside [0, 1] the foot lies beyond the segment. A
 * degenerate segment projects onto `a`.
 */
export function projectOnSegment(
  point: Coordinate,
  a: Coordinate,
  b: Coordinate,
): { foot: Coordinate; t: number } {
  const dx = b[0]! - a[0]!;
  const dy = b[1]! - a[1]!;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return { foot: [a[0]!, a[1]!], t: 0 };
  const t = ((point[0]! - a[0]!) * dx + (point[1]! - a[1]!) * dy) / length2;
  return { foot: [a[0]! + t * dx, a[1]! + t * dy], t };
}

/** Normalise an angle in degrees to [0, 360). */
export function normalizeAngle(degrees: number): number {
  const a = degrees % 360;
  return a < 0 ? a + 360 : a;
}

/**
 * Angle of the line through two screen pixels in degrees, counter-clockwise from the screen
 * x-axis (pixel y grows downwards), normalised to [0, 180) since a line has no direction.
 */
export function screenAngle(from: Coordinate, to: Coordinate): number {
  const dx = to[0]! - from[0]!;
  const dy = to[1]! - from[1]!;
  const degrees = (Math.atan2(-dy, dx) * 180) / Math.PI;
  const a = normalizeAngle(degrees) % 180;
  return Object.is(a, -0) ? 0 : a;
}
