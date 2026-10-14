import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';

/**
 * The factor that takes the distance base → reference to the distance base → target, or `null`
 * when the reference coincides with the base (no length to compare with).
 */
export function scaleFactor(
  base: Coordinate,
  reference: Coordinate,
  target: Coordinate,
): number | null {
  const from = Math.hypot(reference[0]! - base[0]!, reference[1]! - base[1]!);
  if (from === 0) return null;
  return Math.hypot(target[0]! - base[0]!, target[1]! - base[1]!) / from;
}

/**
 * A copy of `geometry` scaled uniformly by `factor` around `anchor`. A positive factor keeps
 * the ring winding. Throws for a factor that is not a finite number greater than 0.
 */
export function scaleGeometry(geometry: Geometry, factor: number, anchor: Coordinate): Geometry {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error('The scale factor must be a number greater than 0');
  }
  const scaled = geometry.clone();
  scaled.scale(factor, factor, anchor);
  return scaled;
}
