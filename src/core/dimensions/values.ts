import type Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type { Coordinate } from 'ol/coordinate';
import type { ProjectionLike } from 'ol/proj';
import type { ResolvedDimensionConfig } from '../config/types';
import { measureLength } from '../measure/measurements';
import type { DimensionStatus, DimensionType } from './types';

/** The values of one dimension, computed for drawing and checks. */
export interface DimensionValues {
  type: DimensionType;
  /** The definition points in the view projection. */
  points: Coordinate[];
  /**
   * Unit vector of the measured direction in map units: from the first to the second point for
   * `aligned`, the `rotation` angle for `rotated`.
   */
  direction: Coordinate;
  /**
   * GIS value in metres, computed from the geometry as the measure tools do: the planar grid
   * distance in true-to-scale projected CRS (UTM), scale-corrected in Web Mercator.
   */
  gis: number;
  /** Field value in metres, or `null`. */
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

/**
 * The values of a dimension object, or `null` when the feature is not a dimension this version
 * draws: a two-point line with `dimType` `aligned` (or unset), `tie`, or `rotated` / `running`
 * (with `rotation`). A rotated or running dimension measures the distance projected onto its
 * direction; a running dimension's first point is the origin.
 */
export function dimensionValues(
  feature: Feature,
  config: Pick<ResolvedDimensionConfig, 'tolerance'>,
  projection: ProjectionLike,
): DimensionValues | null {
  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return null;
  const type = (feature.get('dimType') ?? 'aligned') as DimensionType;
  // `tie` measures like `aligned`, `running` like `rotated` (from the origin, the first point).
  if (!['aligned', 'rotated', 'running', 'tie'].includes(type)) return null;
  const points = geometry.getCoordinates();
  if (points.length !== 2) return null;
  const [p1, p2] = points as [Coordinate, Coordinate];
  const dx = p2[0]! - p1[0]!;
  const dy = p2[1]! - p1[1]!;
  let direction: Coordinate;
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
  const gis = measureLength(projection, measured).total;
  const field = fieldValueOf(feature.get('fieldValue'));
  const deviates = field !== null && Math.abs(field - gis) > config.tolerance;
  return {
    type,
    points,
    direction,
    gis,
    field,
    value: field ?? gis,
    computed: field === null,
    status: deviates ? 'deviates' : 'ok',
  };
}
