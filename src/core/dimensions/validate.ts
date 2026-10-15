import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import type { MessageCode } from '../i18n';
import { DIMENSION_TYPES, SUPPORTED_DIMENSION_TYPES, type DimensionType } from './types';

export interface DimensionIssue {
  code: Extract<MessageCode, 'dimension-type' | 'dimension-points' | 'dimension-value'>;
  params: Record<string, string | number>;
}

const isNullish = (value: unknown): boolean => value === null || value === undefined;

/**
 * Check a dimension object of a dimension layer: a known, supported `dimType`, a line with two
 * distinct points, and well-typed properties. `null` when valid.
 */
export function validateDimensionFeature(
  geometry: Geometry | undefined,
  properties: Record<string, unknown>,
): DimensionIssue | null {
  const type = properties.dimType ?? 'aligned';
  if (
    typeof type !== 'string' ||
    !(DIMENSION_TYPES as readonly string[]).includes(type) ||
    !SUPPORTED_DIMENSION_TYPES.includes(type as DimensionType)
  ) {
    return { code: 'dimension-type', params: { type: String(type) } };
  }
  const points = geometry instanceof LineString ? geometry.getCoordinates() : [];
  const distinct =
    points.length === 2 && (points[0]![0] !== points[1]![0] || points[0]![1] !== points[1]![1]);
  if (!distinct) {
    return { code: 'dimension-points', params: { expected: 2, actual: points.length } };
  }
  const field = properties.fieldValue;
  if (!isNullish(field) && !(typeof field === 'number' && Number.isFinite(field) && field >= 0)) {
    return { code: 'dimension-value', params: { property: 'fieldValue' } };
  }
  const rotation = properties.rotation;
  if (type === 'rotated' && !(typeof rotation === 'number' && Number.isFinite(rotation))) {
    return { code: 'dimension-value', params: { property: 'rotation' } };
  }
  for (const name of ['offset', 'textPosition', 'gisValue', 'rotation']) {
    const value = properties[name];
    if (!isNullish(value) && !(typeof value === 'number' && Number.isFinite(value))) {
      return { code: 'dimension-value', params: { property: name } };
    }
  }
  for (const name of ['text', 'chain']) {
    const value = properties[name];
    if (!isNullish(value) && typeof value !== 'string') {
      return { code: 'dimension-value', params: { property: name } };
    }
  }
  return null;
}
