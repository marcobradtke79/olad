import type { Coordinate } from 'ol/coordinate';
import { get as getProjection, getPointResolution, type ProjectionLike } from 'ol/proj';
import { getDistance, offset } from 'ol/sphere';

/**
 * Projection-aware planar measurement. Web Mercator distorts distances and geographic
 * projections are not planar at all, so typed lengths in metres go through these helpers.
 * Scale is taken at one point (the start of an offset, the midpoint of a distance): exact in
 * the limit of short segments, off by the change of scale across a long one.
 */

function resolve(projection: ProjectionLike) {
  const resolved = getProjection(projection);
  if (!resolved) throw new Error(`Unknown projection ${String(projection)}`);
  return resolved;
}

/** Map units per metre at `coordinate`: 1 / cos φ in EPSG:3857, about 1 in UTM. */
export function unitsPerMetre(projection: ProjectionLike, coordinate: Coordinate): number {
  const resolved = resolve(projection);
  if (resolved.getUnits() === 'degrees') {
    // Degrees per metre along a parallel, for callers that need a rough figure only.
    const east = offset(coordinate, 1, Math.PI / 2);
    return Math.abs(east[0]! - coordinate[0]!);
  }
  return 1 / getPointResolution(resolved, 1, coordinate, 'm');
}

/** `coordinate` moved by `dx` metres east and `dy` metres north. */
export function offsetMetres(
  projection: ProjectionLike,
  coordinate: Coordinate,
  dx: number,
  dy: number,
): Coordinate {
  const resolved = resolve(projection);
  if (resolved.getUnits() === 'degrees') {
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return [coordinate[0]!, coordinate[1]!];
    return offset(coordinate, distance, Math.atan2(dx, dy)); // bearing clockwise from north
  }
  const scale = unitsPerMetre(resolved, coordinate);
  return [coordinate[0]! + dx * scale, coordinate[1]! + dy * scale];
}

/** Distance between two coordinates in metres. */
export function distanceMetres(projection: ProjectionLike, a: Coordinate, b: Coordinate): number {
  const resolved = resolve(projection);
  if (resolved.getUnits() === 'degrees') return getDistance(a, b);
  const mid: Coordinate = [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2];
  return Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) / unitsPerMetre(resolved, mid);
}
