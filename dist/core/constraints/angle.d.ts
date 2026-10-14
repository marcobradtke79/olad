import { Coordinate } from 'ol/coordinate';
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
export declare function nearestAllowedAngle(degrees: number, baseDeg: number, stepDeg: number): number;
/** Projects `point` onto the ray from `reference` with the allowed direction nearest to it. */
export declare function constrainToAngleStep(point: Coordinate, reference: Coordinate, baseDeg: number, stepDeg: number): AngleConstraintResult;
