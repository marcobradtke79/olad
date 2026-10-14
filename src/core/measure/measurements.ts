import type { Coordinate } from 'ol/coordinate';
import {
  formatArea as formatAreaIn,
  formatLength as formatLengthIn,
  type LengthUnit,
} from '../units';
import Polygon from 'ol/geom/Polygon';
import { equivalent, get as getProjection, type ProjectionLike } from 'ol/proj';
import { getArea } from 'ol/sphere';
import { distanceMetres, unitsPerMetre } from './index';

/** A polyline's length in metres: per segment and in total. */
export interface LengthMeasure {
  total: number;
  segments: number[];
}

/** A polygon's area in square metres and its perimeter (outer ring) in metres. */
export interface AreaMeasure {
  area: number;
  perimeter: number;
}

/** The angle at a vertex in degrees (0 … 180) and its reflex (360 − angle). */
export interface AngleMeasure {
  angle: number;
  reflex: number;
}

/** The radius of the sphere EPSG:3857 projects. */
const MERCATOR_RADIUS = 6378137;

/**
 * Whether map units are metres on the ground at `at`: a metric projection whose scale is
 * within 1 % of true there (UTM and similar). Such grids are measured planar, as surveyors do.
 */
function trueToScale(projection: ProjectionLike, at: Coordinate): boolean {
  const resolved = getProjection(projection);
  if (!resolved || resolved.getUnits() !== 'm' || isMercator(projection)) return false;
  return Math.abs(unitsPerMetre(resolved, at) - 1) < 0.01;
}

function isMercator(projection: ProjectionLike): boolean {
  const resolved = getProjection(projection);
  const mercator = getProjection('EPSG:3857');
  return !!resolved && !!mercator && equivalent(resolved, mercator);
}

/**
 * Length of a polyline in metres: planar in a true-to-scale metric grid, otherwise each
 * segment at its midpoint scale (`distanceMetres`).
 */
export function measureLength(projection: ProjectionLike, coords: Coordinate[]): LengthMeasure {
  const segments: number[] = [];
  const planar = coords.length > 0 && trueToScale(projection, coords[0]!);
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!;
    const b = coords[i]!;
    segments.push(
      planar ? Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) : distanceMetres(projection, a, b),
    );
  }
  return { total: segments.reduce((sum, s) => sum + s, 0), segments };
}

/**
 * The area enclosed by a ring drawn straight in Web Mercator, on the sphere the projection
 * maps (exact for straight Mercator edges): ∬ sech²(y / R) dx dy = −∮ R tanh(y / R) dx.
 */
function mercatorRingArea(ring: Coordinate[]): number {
  const R = MERCATOR_RADIUS;
  let sum = 0;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1]!;
    const [x2, y2] = ring[i]!;
    const dx = x2! - x1!;
    const dy = y2! - y1!;
    if (dx === 0) continue;
    sum +=
      Math.abs(dy) < 1e-9
        ? R * Math.tanh(y1! / R) * dx
        : (dx / dy) * R * R * Math.log(Math.cosh(y2! / R) / Math.cosh(y1! / R));
  }
  return -sum;
}

/**
 * Area of a polygon (outer ring first, then holes; rings closed or open) in square metres and
 * the length of its outer ring. Planar in a true-to-scale metric grid (UTM and similar); exact
 * on the projection's sphere in Web Mercator, matching its lengths; on the sphere through
 * `ol/sphere` otherwise (geographic).
 */
export function measureArea(projection: ProjectionLike, rings: Coordinate[][]): AreaMeasure {
  const closed = rings.map((ring) => {
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
  });
  const outer = closed[0] ?? [];
  const perimeter = measureLength(projection, outer).total;
  if (outer.length < 4) return { area: 0, perimeter };
  const polygon = new Polygon(closed);
  if (trueToScale(projection, outer[0]!)) return { area: polygon.getArea(), perimeter };
  if (isMercator(projection)) {
    const [shell, ...holes] = closed;
    const area =
      Math.abs(mercatorRingArea(shell!)) -
      holes.reduce((sum, hole) => sum + Math.abs(mercatorRingArea(hole)), 0);
    return { area: Math.max(0, area), perimeter };
  }
  return { area: Math.abs(getArea(polygon, { projection })), perimeter };
}

/** The angle at `vertex` between the legs to `first` and `second`, in degrees. */
export function measureAngle(
  first: Coordinate,
  vertex: Coordinate,
  second: Coordinate,
): AngleMeasure {
  const a = Math.atan2(first[1]! - vertex[1]!, first[0]! - vertex[0]!);
  const b = Math.atan2(second[1]! - vertex[1]!, second[0]! - vertex[0]!);
  let angle = Math.abs(((b - a) * 180) / Math.PI) % 360;
  if (angle > 180) angle = 360 - angle;
  return { angle, reflex: 360 - angle };
}

const fixed = (value: number, digits: number) => value.toFixed(digits);

/** A length for display in `unit` (default metres: m, km from 1000 m); see `units.ts`. */
export function formatLength(metres: number, unit: LengthUnit = 'm'): string {
  return formatLengthIn(metres, unit);
}

/** An area for display in `unit`'s system (default metric: m², ha, km²); see `units.ts`. */
export function formatArea(squareMetres: number, unit: LengthUnit = 'm'): string {
  return formatAreaIn(squareMetres, unit);
}

/** An angle for display, in degrees with 1 decimal. */
export function formatAngle(degrees: number): string {
  return `${fixed(degrees, 1)}°`;
}
