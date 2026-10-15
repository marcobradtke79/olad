import type Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import type { ProjectionLike } from 'ol/proj';
import { unitsPerMetre } from '../measure';
import { referencesOf, type DimensionReference } from './references';
import { sweepAngle, type DimensionValues } from './values';

/**
 * A grip of a dimension: a definition point (`index`), the dimension line or arc (its offset)
 * or the value of a linear dimension (its position along the line).
 */
export interface DimensionGrip {
  kind: 'point' | 'line' | 'text';
  index?: number;
  at: Coordinate;
}

const LINEAR: readonly string[] = ['aligned', 'rotated', 'running'];

const add = (a: Coordinate, b: Coordinate, f = 1): Coordinate => [
  a[0]! + b[0]! * f,
  a[1]! + b[1]! * f,
];
const unit = (angle: number): Coordinate => [Math.cos(angle), Math.sin(angle)];
const angleOf = (from: Coordinate, to: Coordinate) =>
  Math.atan2(to[1]! - from[1]!, to[0]! - from[0]!);

/** The geometry of a linear dimension: direction, normal, signed length and the line's start. */
function linear(values: DimensionValues, offset: number, perMetre: number) {
  const [p1, p2] = values.points as [Coordinate, Coordinate];
  const u = values.direction;
  const n: Coordinate = [-u[1]!, u[0]!];
  const length = (p2[0]! - p1[0]!) * u[0]! + (p2[1]! - p1[1]!) * u[1]!;
  return { p1, u, n, length, d1: add(p1, n, offset * perMetre) };
}

/** The grips of a dimension, in the view projection. Tie, station, level and slope: points only. */
export function dimensionGrips(
  feature: Feature,
  values: DimensionValues,
  projection: ProjectionLike,
): DimensionGrip[] {
  const grips: DimensionGrip[] = values.points.map((at, index) => ({ kind: 'point', index, at }));
  const offset = Number(feature.get('offset')) || 0;
  const [first, second, third] = values.points as [Coordinate, Coordinate, Coordinate | undefined];
  if (LINEAR.includes(values.type)) {
    const perMetre = unitsPerMetre(projection, first);
    const { u, length, d1 } = linear(values, offset, perMetre);
    const shift = (Number(feature.get('textPosition')) || 0) * perMetre;
    grips.push(
      { kind: 'line', at: add(d1, u, length * 0.2) },
      { kind: 'text', at: add(d1, u, length / 2 + shift) },
    );
  } else if (values.type === 'angular') {
    const radius = offset * unitsPerMetre(projection, second);
    const sweep = sweepAngle(second, first, third!);
    grips.push({
      kind: 'line',
      at: add(second, unit(angleOf(second, first) + sweep * 0.25), radius),
    });
  } else if (values.type === 'radius' || values.type === 'diameter') {
    const r = Math.hypot(second[0]! - first[0]!, second[1]! - first[1]!);
    const u: Coordinate = [(second[0]! - first[0]!) / r, (second[1]! - first[1]!) / r];
    grips.push({ kind: 'line', at: add(second, u, offset * unitsPerMetre(projection, first)) });
  } else if (values.type === 'arc') {
    const r = Math.hypot(second[0]! - first[0]!, second[1]! - first[1]!);
    const middle = angleOf(first, second) + sweepAngle(first, second, third!) / 2;
    grips.push({
      kind: 'line',
      at: add(first, unit(middle), r + offset * unitsPerMetre(projection, first)),
    });
  }
  return grips;
}

/**
 * What moving `grip` to `coordinate` changes: a new geometry (a definition point, with its
 * reference replaced by `reference`) or new properties (`offset`, `textPosition`). `null` when
 * the move makes no sense (an angle's arc onto its vertex).
 */
export function moveGrip(
  feature: Feature,
  values: DimensionValues,
  grip: DimensionGrip,
  coordinate: Coordinate,
  projection: ProjectionLike,
  reference: DimensionReference | null = null,
): { geometry?: LineString; properties: Record<string, unknown> } | null {
  if (grip.kind === 'point') {
    const points = values.points.map((p) => p.slice());
    points[grip.index!] = coordinate.slice();
    const refs = referencesOf(feature);
    const properties: Record<string, unknown> = {};
    if (refs.length > 0 || reference) {
      const next = points.map((_, i) => refs[i] ?? null);
      next[grip.index!] = reference;
      properties.refs = next.some((r) => r !== null) ? next : undefined;
    }
    return { geometry: new LineString(points), properties };
  }
  const [first, second] = values.points as [Coordinate, Coordinate];
  const round = (metres: number) => Math.round(metres * 1000) / 1000;
  if (LINEAR.includes(values.type)) {
    const perMetre = unitsPerMetre(projection, first);
    const offset = Number(feature.get('offset')) || 0;
    const { p1, u, n, length, d1 } = linear(values, offset, perMetre);
    if (grip.kind === 'line') {
      const across = (coordinate[0]! - p1[0]!) * n[0]! + (coordinate[1]! - p1[1]!) * n[1]!;
      return { properties: { offset: round(across / perMetre) } };
    }
    const middle = add(d1, u, length / 2);
    const along = (coordinate[0]! - middle[0]!) * u[0]! + (coordinate[1]! - middle[1]!) * u[1]!;
    return { properties: { textPosition: round(along / perMetre) } };
  }
  if (grip.kind !== 'line') return null;
  const centre = values.type === 'angular' ? second : first;
  const perMetre = unitsPerMetre(projection, centre);
  const distance = Math.hypot(coordinate[0]! - centre[0]!, coordinate[1]! - centre[1]!);
  if (values.type === 'angular') {
    return distance > 0 ? { properties: { offset: round(distance / perMetre) } } : null;
  }
  const r = Math.hypot(second[0]! - first[0]!, second[1]! - first[1]!);
  return { properties: { offset: round(Math.max(0, distance - r) / perMetre) } };
}
