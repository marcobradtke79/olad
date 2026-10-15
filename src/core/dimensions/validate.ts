import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import type { MessageCode } from '../i18n';
import { isRefs } from './references';
import {
  DIMENSION_TYPES,
  dimensionPointCount,
  LEVEL_KINDS,
  SUPPORTED_DIMENSION_TYPES,
  type DimensionType,
} from './types';

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
  const expected = dimensionPointCount(type as DimensionType);
  const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];
  // Consecutive points differ; the vertex of an angle and the centre of an arc differ from
  // both other points.
  // A station's point may be the line's end (the end measure); a level's label may sit on
  // its point.
  const mayRepeat = (i: number) => (type === 'station' && i === 2) || type === 'level';
  const distinct =
    points.length === expected &&
    points.every((point, i) => i === 0 || mayRepeat(i) || !same(point, points[i - 1]!)) &&
    (expected < 3 || !same(points[0]!, points[2]!) || type === 'arc' || type === 'station');
  const centreApart =
    type !== 'arc' || (!same(points[0]!, points[1]!) && !same(points[0]!, points[2]!));
  if (!distinct || !centreApart) {
    return { code: 'dimension-points', params: { expected, actual: points.length } };
  }
  const field = properties.fieldValue;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  // Heights and slopes may be negative; a level needs its height.
  const signed = type === 'level' || type === 'slope';
  if (
    (type === 'level' && !finite(field)) ||
    (!isNullish(field) && !(finite(field) && (signed || (field as number) >= 0)))
  ) {
    return { code: 'dimension-value', params: { property: 'fieldValue' } };
  }
  if (!isNullish(properties.fieldOffset) && !finite(properties.fieldOffset)) {
    return { code: 'dimension-value', params: { property: 'fieldOffset' } };
  }
  if (
    !isNullish(properties.levelKind) &&
    !(LEVEL_KINDS as readonly unknown[]).includes(properties.levelKind)
  ) {
    return { code: 'dimension-value', params: { property: 'levelKind' } };
  }
  const rotation = properties.rotation;
  const directed = type === 'rotated' || type === 'running';
  if (directed && !(typeof rotation === 'number' && Number.isFinite(rotation))) {
    return { code: 'dimension-value', params: { property: 'rotation' } };
  }
  if (type === 'angular' && !(typeof properties.offset === 'number' && properties.offset > 0)) {
    return { code: 'dimension-value', params: { property: 'offset' } };
  }
  for (const name of ['offset', 'textPosition', 'gisValue', 'gisOffset', 'rotation']) {
    const value = properties[name];
    if (!isNullish(value) && !(typeof value === 'number' && Number.isFinite(value))) {
      return { code: 'dimension-value', params: { property: name } };
    }
  }
  if (!isRefs(properties.refs, points.length)) {
    return { code: 'dimension-value', params: { property: 'refs' } };
  }
  for (const name of ['text', 'chain']) {
    const value = properties[name];
    if (!isNullish(value) && typeof value !== 'string') {
      return { code: 'dimension-value', params: { property: name } };
    }
  }
  return null;
}
