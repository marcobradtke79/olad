import type { Coordinate } from 'ol/coordinate';
import { normalizeAngle } from '../geometry/segments';

/**
 * Angle lock: a direction from `reference` may only be a multiple of `stepDeg` away from
 * `baseDeg` (the straightedge angle). Angles are in degrees, counter-clockwise from the +x
 * axis of the view projection, which is also how the straightedge angle appears on screen.
 */
export interface AngleConstraintResult {
  /** `point` projected onto the nearest allowed direction through `reference`. */
  coordinate: Coordinate;
  /** The allowed direction that was taken, normalised to [0, 360). */
  angle: number;
}

/** The allowed direction nearest to `degrees`, as `baseDeg + k · stepDeg`, normalised. */
export function nearestAllowedAngle(degrees: number, baseDeg: number, stepDeg: number): number {
  const k = Math.round((degrees - baseDeg) / stepDeg);
  return normalizeAngle(baseDeg + k * stepDeg);
}

/** Projects `point` onto the ray from `reference` with the allowed direction nearest to it. */
export function constrainToAngleStep(
  point: Coordinate,
  reference: Coordinate,
  baseDeg: number,
  stepDeg: number,
): AngleConstraintResult {
  const dx = point[0]! - reference[0]!;
  const dy = point[1]! - reference[1]!;
  const distance = Math.hypot(dx, dy);
  if (distance === 0)
    return { coordinate: [reference[0]!, reference[1]!], angle: normalizeAngle(baseDeg) };
  const angle = nearestAllowedAngle((Math.atan2(dy, dx) * 180) / Math.PI, baseDeg, stepDeg);
  const radians = (angle * Math.PI) / 180;
  // Keep the projected length along the chosen direction (not the pointer distance), as
  // CAD ortho does: the pointer's component along the direction.
  const along = dx * Math.cos(radians) + dy * Math.sin(radians);
  return {
    coordinate: [
      reference[0]! + along * Math.cos(radians),
      reference[1]! + along * Math.sin(radians),
    ],
    angle,
  };
}
