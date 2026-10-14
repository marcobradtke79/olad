import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';

/** Fewest sides of a regular polygon (a triangle). */
export const MIN_REGULAR_POLYGON_SIDES = 3;
/** Most sides of a regular polygon, bounding the vertex count like a linearized circle. */
export const MAX_REGULAR_POLYGON_SIDES = 1024;

/** Whether `sides` is a whole number within the allowed range. */
export function isValidSideCount(sides: number): boolean {
  return (
    Number.isInteger(sides) &&
    sides >= MIN_REGULAR_POLYGON_SIDES &&
    sides <= MAX_REGULAR_POLYGON_SIDES
  );
}

/**
 * The regular polygon with `sides` equal sides inscribed in the circle around `center` through
 * `vertex`: `vertex` is its first vertex, the others follow counter-clockwise. A closed ring;
 * `null` when `vertex` equals the centre or the side count is invalid.
 */
export function regularPolygon(
  center: Coordinate,
  vertex: Coordinate,
  sides: number,
): Polygon | null {
  const dx = vertex[0]! - center[0]!;
  const dy = vertex[1]! - center[1]!;
  const radius = Math.hypot(dx, dy);
  if (!(radius > 0) || !isValidSideCount(sides)) return null;
  const start = Math.atan2(dy, dx);
  const ring: Coordinate[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = start + (2 * Math.PI * i) / sides;
    ring.push([
      Math.round((center[0]! + radius * Math.cos(angle)) * 1e9) / 1e9 + 0,
      Math.round((center[1]! + radius * Math.sin(angle)) * 1e9) / 1e9 + 0,
    ]);
  }
  ring.push([ring[0]![0]!, ring[0]![1]!]);
  return new Polygon([ring]);
}
