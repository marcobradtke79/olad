import type { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';

/**
 * The rectangle with corners `a` and `b` whose sides run along and across the direction
 * `angleDeg` (degrees, counter-clockwise from the +x axis of the view projection, the
 * straightedge angle). With 0° it is axis-aligned. The ring is counter-clockwise whatever the
 * drag direction. `null` when the corners lie on one of the axes (no width or no height).
 */
export function rectangleFromCorners(
  a: Coordinate,
  b: Coordinate,
  angleDeg: number,
): Polygon | null {
  const radians = (angleDeg * Math.PI) / 180;
  const u = [Math.cos(radians), Math.sin(radians)];
  const v = [-u[1]!, u[0]!];
  const dx = b[0]! - a[0]!;
  const dy = b[1]! - a[1]!;
  const along = dx * u[0]! + dy * u[1]!;
  const across = dx * v[0]! + dy * v[1]!;
  // Relative tolerance: cos 90° is not exactly 0 in floating point.
  const epsilon = 1e-9 * Math.hypot(dx, dy);
  if (Math.abs(along) <= epsilon || Math.abs(across) <= epsilon) return null;
  const corner = (s: number, t: number): Coordinate => [
    a[0]! + s * u[0]! + t * v[0]!,
    a[1]! + s * u[1]! + t * v[1]!,
  ];
  const ring: Coordinate[] = [
    [a[0]!, a[1]!],
    corner(along, 0),
    corner(along, across),
    corner(0, across),
  ];
  // Counter-clockwise ring, independent of the drag direction.
  if (along * across < 0) ring.reverse();
  ring.push([a[0]!, a[1]!]);
  if (ring[0]![0] !== a[0] || ring[0]![1] !== a[1]) {
    // After reversing, the first vertex is a different corner: keep `a` first.
    ring.pop();
    while (ring[0]![0] !== a[0] || ring[0]![1] !== a[1]) ring.push(ring.shift()!);
    ring.push([a[0]!, a[1]!]);
  }
  return new Polygon([ring]);
}
