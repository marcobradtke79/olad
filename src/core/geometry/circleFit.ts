import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { circumcircle, type CircleDefinition } from './circle';
import { projectOnSegment } from './segments';

/** A circle recovered from a linearized curve. */
export interface CircleRun extends CircleDefinition {
  /** The vertices of the circular run, in their order along the line. */
  run: Coordinate[];
  /** Whether the run is a whole ring (a full circle). */
  full: boolean;
}

/** Largest turn at a vertex of a linearized circle, in degrees (as for the tangent snap). */
const MAX_TURN = 20;
/** Smallest turn that still counts as curved, in degrees. */
const MIN_TURN = 0.05;
/** Relative difference allowed between the turns of one circular run. */
const TURN_SPREAD = 0.5;
/** Relative distance of a run vertex from the fitted circle that is still accepted. */
const FIT_TOLERANCE = 0.01;

interface Line {
  coordinates: Coordinate[];
  closed: boolean;
}

function linesOf(geometry: Geometry): Line[] {
  if (geometry instanceof LineString)
    return [{ coordinates: geometry.getCoordinates(), closed: false }];
  if (geometry instanceof MultiLineString) {
    return geometry.getCoordinates().map((coordinates) => ({ coordinates, closed: false }));
  }
  if (geometry instanceof Polygon) {
    return geometry.getCoordinates().map((coordinates) => ({ coordinates, closed: true }));
  }
  if (geometry instanceof MultiPolygon) {
    return geometry
      .getCoordinates()
      .flatMap((polygon) => polygon.map((coordinates) => ({ coordinates, closed: true })));
  }
  return [];
}

/** Signed turn at `b` going from `a` over `b` to `c`, in degrees (left turns positive). */
function turnAt(a: Coordinate, b: Coordinate, c: Coordinate): number {
  const t1 = Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!);
  const t2 = Math.atan2(c[1]! - b[1]!, c[0]! - b[0]!);
  let turn = ((t2 - t1) * 180) / Math.PI;
  while (turn > 180) turn -= 360;
  while (turn < -180) turn += 360;
  return turn;
}

/**
 * The circle of the curved part of `geometry` nearest to `at` (within `tolerance` map units):
 * the run of vertices around the nearest segment whose turns have one sign, stay below 20° and
 * differ by at most half from each other, as a linearized circle or arc does. The circle goes
 * through the run's first, middle and last vertex; every run vertex must lie within 1 % of the
 * radius. `null` for straight parts, corners and too short runs (fewer than three vertices).
 */
export function fitCircleRun(
  geometry: Geometry,
  at: Coordinate,
  tolerance: number,
): CircleRun | null {
  // The nearest segment of any line or ring.
  let best: { line: Line; index: number } | null = null;
  let bestDistance = tolerance;
  for (const line of linesOf(geometry)) {
    const coordinates = line.coordinates;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const a = coordinates[i]!;
      const b = coordinates[i + 1]!;
      const { foot, t } = projectOnSegment(at, a, b);
      const point = t <= 0 ? a : t >= 1 ? b : foot;
      const distance = Math.hypot(point[0]! - at[0]!, point[1]! - at[1]!);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { line, index: i };
      }
    }
  }
  if (!best) return null;
  const { line, index } = best;
  // Unique vertices; a ring's closing copy is left out and indices wrap around.
  const vertices = line.closed ? line.coordinates.slice(0, -1) : line.coordinates;
  const n = vertices.length;
  if (n < 3) return null;
  const at_ = (i: number) => vertices[((i % n) + n) % n]!;
  const turn = (i: number): number | null => {
    if (!line.closed && (i <= 0 || i >= n - 1)) return null;
    return turnAt(at_(i - 1), at_(i), at_(i + 1));
  };
  // The reference turn: at an end of the nearest segment.
  const seed = turn(index) ?? turn(index + 1);
  if (seed === null || Math.abs(seed) < MIN_TURN || Math.abs(seed) > MAX_TURN) return null;
  const fits = (i: number): boolean => {
    const t = turn(i);
    return (
      t !== null &&
      Math.sign(t) === Math.sign(seed) &&
      Math.abs(t) <= MAX_TURN &&
      Math.abs(t - seed) <= TURN_SPREAD * Math.abs(seed)
    );
  };
  // Grow the run in both directions from the segment's ends.
  let start = fits(index) ? index : index + 1;
  let end = fits(index + 1) ? index + 1 : index;
  if (!fits(start)) return null;
  while (end - start + 1 < n && fits(start - 1)) start--;
  while (end - start + 1 < n && fits(end + 1)) end++;
  const full = line.closed && end - start + 1 >= n;
  const run: Coordinate[] = [];
  for (let i = start; i <= end; i++) run.push(at_(i));
  if (run.length < 3) return null;
  const circle = full
    ? circumcircle(run[0]!, run[Math.floor(n / 3)]!, run[Math.floor((2 * n) / 3)]!)
    : circumcircle(run[0]!, run[Math.floor(run.length / 2)]!, run[run.length - 1]!);
  if (!circle) return null;
  const { center, radius } = circle;
  const onCircle = run.every(
    (v) =>
      Math.abs(Math.hypot(v[0]! - center[0]!, v[1]! - center[1]!) - radius) <=
      FIT_TOLERANCE * radius,
  );
  return onCircle ? { center, radius, run, full } : null;
}
