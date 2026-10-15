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
 * draws (an `aligned` dimension: a two-point line, `dimType` `aligned` or unset).
 */
export function dimensionValues(
  feature: Feature,
  config: Pick<ResolvedDimensionConfig, 'tolerance'>,
  projection: ProjectionLike,
): DimensionValues | null {
  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return null;
  const type = feature.get('dimType') ?? 'aligned';
  if (type !== 'aligned') return null;
  const points = geometry.getCoordinates();
  if (points.length !== 2) return null;
  const gis = measureLength(projection, points).total;
  const field = fieldValueOf(feature.get('fieldValue'));
  const deviates = field !== null && Math.abs(field - gis) > config.tolerance;
  return {
    type,
    points,
    gis,
    field,
    value: field ?? gis,
    computed: field === null,
    status: deviates ? 'deviates' : 'ok',
  };
}
