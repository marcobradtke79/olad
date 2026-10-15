import type Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type { Coordinate } from 'ol/coordinate';
import type { ProjectionLike } from 'ol/proj';
import type { ResolvedDimensionConfig } from '../config/types';
import { measureLength } from '../measure/measurements';
import {
  dimensionPointCount,
  SUPPORTED_DIMENSION_TYPES,
  type DimensionStatus,
  type DimensionType,
} from './types';

/** The values of one dimension, computed for drawing and checks. */
export interface DimensionValues {
  type: DimensionType;
  /** The definition points in the view projection. */
  points: Coordinate[];
  /**
   * Unit vector of the measured direction in map units for the linear types: from the first to
   * the second point (`aligned`, `tie`), the `rotation` angle (`rotated`, `running`). `[1, 0]`
   * for angular and radial dimensions.
   */
  direction: Coordinate;
  /** `'m'` for lengths, `'deg'` for angles (`angular`). */
  unit: 'm' | 'deg';
  /**
   * GIS value: metres, computed from the geometry as the measure tools do (the planar grid
   * distance in true-to-scale projected CRS, scale-corrected in Web Mercator); degrees for an
   * angle (counter-clockwise from the first to the second leg).
   */
  gis: number;
  /** Field value in the same unit, or `null`. */
  field: number | null;
  /** The value shown: the field value if set, else the GIS value. */
  value: number;
  /** Whether the shown value is computed (no field value). */
  computed: boolean;
  status: DimensionStatus;
}

/** A finite number at least 0, else `null`. */
export function fieldValueOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Counter-clockwise sweep in radians from the direction `a → from` to `a → to`, in (0, 2π]. */
export function sweepAngle(centre: Coordinate, from: Coordinate, to: Coordinate): number {
  const a1 = Math.atan2(from[1]! - centre[1]!, from[0]! - centre[0]!);
  const a2 = Math.atan2(to[1]! - centre[1]!, to[0]! - centre[0]!);
  const sweep = (((a2 - a1) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return sweep === 0 ? 2 * Math.PI : sweep;
}

/** Degrees in an angle unit: gon has 400 per full circle. */
export const toAngleUnit = (degrees: number, unit: 'deg' | 'gon'): number =>
  unit === 'gon' ? (degrees * 400) / 360 : degrees;
/** An angle typed in `unit` as degrees. */
export const fromAngleUnit = (value: number, unit: 'deg' | 'gon'): number =>
  unit === 'gon' ? (value * 360) / 400 : value;

const LINEAR: readonly DimensionType[] = ['aligned', 'rotated', 'running', 'tie'];

/**
 * The values of a dimension object, or `null` when the feature is not a dimension this version
 * draws. Linear types: a two-point line, `aligned` (or unset) and `tie` measure the distance,
 * `rotated` and `running` (with `rotation`) the distance projected onto the rotation. `angular`:
 * [leg, vertex, leg], the angle counter-clockwise from the first to the second leg. `radius`
 * and `diameter`: [centre, point on the circle]. `arc`: [centre, start, end], the length of the
 * counter-clockwise arc.
 */
export function dimensionValues(
  feature: Feature,
  config: Pick<ResolvedDimensionConfig, 'tolerance'> &
    Partial<Pick<ResolvedDimensionConfig, 'angleTolerance' | 'angleUnit'>>,
  projection: ProjectionLike,
  /** Whether a measured object changed (references, see `isStale`): status `stale` wins. */
  stale = false,
): DimensionValues | null {
  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return null;
  const type = (feature.get('dimType') ?? 'aligned') as DimensionType;
  if (!SUPPORTED_DIMENSION_TYPES.includes(type)) return null;
  const points = geometry.getCoordinates();
  if (points.length !== dimensionPointCount(type)) return null;
  let direction: Coordinate = [1, 0];
  let gis: number;
  if (LINEAR.includes(type)) {
    const [p1, p2] = points as [Coordinate, Coordinate];
    const dx = p2[0]! - p1[0]!;
    const dy = p2[1]! - p1[1]!;
    let measured: Coordinate[] = points;
    if (type === 'rotated' || type === 'running') {
      const rotation = feature.get('rotation');
      if (typeof rotation !== 'number' || !Number.isFinite(rotation)) return null;
      const angle = (rotation * Math.PI) / 180;
      direction = [Math.cos(angle), Math.sin(angle)];
      const along = dx * direction[0]! + dy * direction[1]!;
      measured = [p1, [p1[0]! + direction[0]! * along, p1[1]! + direction[1]! * along]];
    } else {
      const length = Math.hypot(dx, dy);
      if (!(length > 0)) return null;
      direction = [dx / length, dy / length];
    }
    gis = measureLength(projection, measured).total;
  } else if (type === 'angular') {
    const [leg1, vertex, leg2] = points as [Coordinate, Coordinate, Coordinate];
    gis = (sweepAngle(vertex, leg1, leg2) * 180) / Math.PI;
  } else {
    const [centre, first] = points as [Coordinate, Coordinate];
    const radius = measureLength(projection, [centre, first]).total;
    if (!(radius > 0)) return null;
    gis =
      type === 'radius'
        ? radius
        : type === 'diameter'
          ? 2 * radius
          : radius * sweepAngle(centre, first, points[2]!);
  }
  const unit = type === 'angular' ? 'deg' : 'm';
  const tolerance =
    unit === 'deg'
      ? fromAngleUnit(config.angleTolerance ?? 0.1, config.angleUnit ?? 'deg')
      : config.tolerance;
  const field = fieldValueOf(feature.get('fieldValue'));
  const deviates = field !== null && Math.abs(field - gis) > tolerance;
  return {
    type,
    points,
    direction,
    unit,
    gis,
    field,
    value: field ?? gis,
    computed: field === null,
    status: stale ? 'stale' : deviates ? 'deviates' : 'ok',
  };
}
