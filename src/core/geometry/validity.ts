import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type { GeometryType } from '../config/types';
import { segmentsIntersect } from './intersect';

export type ValidityCode =
  | 'geometry-type'
  | 'empty-geometry'
  | 'too-few-vertices'
  | 'ring-not-closed'
  | 'zero-length-segment'
  | 'self-intersection';

export interface ValidationIssue {
  code: ValidityCode;
  /** Message parameters, for example the expected and actual geometry type. */
  params: Record<string, string | number>;
}

const TYPE_OF: Record<Exclude<GeometryType, 'Any'>, (g: Geometry) => boolean> = {
  Point: (g) => g instanceof Point,
  LineString: (g) => g instanceof LineString,
  Polygon: (g) => g instanceof Polygon,
  MultiPoint: (g) => g instanceof MultiPoint,
  MultiLineString: (g) => g instanceof MultiLineString,
  MultiPolygon: (g) => g instanceof MultiPolygon,
};

/** `'Any'` accepts every geometry that has a layer type of its own. */
function typeMatches(geometry: Geometry, expectedType: GeometryType): boolean {
  if (expectedType === 'Any') {
    return Object.values(TYPE_OF).some((check) => check(geometry));
  }
  return TYPE_OF[expectedType](geometry);
}

const same = (a: Coordinate, b: Coordinate) => a[0] === b[0] && a[1] === b[1];

/**
 * Planar validity of a geometry for a layer of `expectedType`: matching type, not empty,
 * minimum vertex counts, closed rings, no zero-length segments and no self-intersecting rings.
 * Returns the first issue found, or `null` when the geometry is valid.
 */
export function validateGeometry(
  geometry: Geometry | undefined,
  expectedType: GeometryType,
): ValidationIssue | null {
  if (!geometry) return { code: 'empty-geometry', params: {} };
  if (!typeMatches(geometry, expectedType)) {
    const actual =
      geometry instanceof GeometryCollection ? 'GeometryCollection' : geometry.getType();
    return { code: 'geometry-type', params: { expected: expectedType, actual } };
  }
  if (geometry instanceof Point) return null;
  if (geometry instanceof MultiPoint) {
    return geometry.getCoordinates().length === 0 ? { code: 'empty-geometry', params: {} } : null;
  }
  if (geometry instanceof LineString) return validateLine(geometry.getCoordinates());
  if (geometry instanceof MultiLineString)
    return validateParts(geometry.getCoordinates(), validateLine);
  if (geometry instanceof Polygon) return validatePolygon(geometry.getCoordinates());
  if (geometry instanceof MultiPolygon) {
    return validateParts(geometry.getCoordinates(), validatePolygon);
  }
  return null;
}

function validateParts<T>(
  parts: T[],
  check: (part: T) => ValidationIssue | null,
): ValidationIssue | null {
  if (parts.length === 0) return { code: 'empty-geometry', params: {} };
  for (const part of parts) {
    const issue = check(part);
    if (issue) return issue;
  }
  return null;
}

function validateLine(coordinates: Coordinate[]): ValidationIssue | null {
  if (coordinates.length === 0) return { code: 'empty-geometry', params: {} };
  if (coordinates.length < 2) {
    return { code: 'too-few-vertices', params: { minimum: 2, actual: coordinates.length } };
  }
  return zeroLength(coordinates);
}

function validatePolygon(rings: Coordinate[][]): ValidationIssue | null {
  if (rings.length === 0) return { code: 'empty-geometry', params: {} };
  for (const ring of rings) {
    const issue = validateRing(ring);
    if (issue) return issue;
  }
  return null;
}

function validateRing(ring: Coordinate[]): ValidationIssue | null {
  if (ring.length === 0) return { code: 'empty-geometry', params: {} };
  if (ring.length < 4) {
    return { code: 'too-few-vertices', params: { minimum: 4, actual: ring.length } };
  }
  if (!same(ring[0]!, ring[ring.length - 1]!)) return { code: 'ring-not-closed', params: {} };
  const zero = zeroLength(ring);
  if (zero) return zero;
  // Every pair of non-adjacent segments must stay apart (the first and last segment are
  // adjacent through the closing vertex).
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsIntersect(ring[i]!, ring[i + 1]!, ring[j]!, ring[j + 1]!)) {
        return { code: 'self-intersection', params: { segment: i, other: j } };
      }
    }
  }
  return null;
}

function zeroLength(coordinates: Coordinate[]): ValidationIssue | null {
  for (let i = 1; i < coordinates.length; i++) {
    if (same(coordinates[i - 1]!, coordinates[i]!)) {
      return { code: 'zero-length-segment', params: { segment: i - 1 } };
    }
  }
  return null;
}
