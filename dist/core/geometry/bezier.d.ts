import { Coordinate } from 'ol/coordinate';
import { default as LineString } from 'ol/geom/LineString';
/** A cubic Bézier curve: the handles are its control points (tangent direction and tension). */
export interface CubicBezier {
    start: Coordinate;
    startHandle: Coordinate;
    endHandle: Coordinate;
    end: Coordinate;
}
/** Most segments a linearized curve gets, bounding the vertex count of huge curves. */
export declare const MAX_BEZIER_SEGMENTS = 1024;
/** The point of the curve at parameter `t` in [0, 1]. */
export declare function bezierPoint(curve: CubicBezier, t: number): Coordinate;
/**
 * Number of equal parameter steps so that no chord deviates more than `tolerance` (same units
 * as the coordinates) from the curve, from Wang's bound for a cubic: `ceil(sqrt(0.75 d / t))`
 * with `d` the largest second difference of the control points. `min` for a straight curve or
 * a non-positive tolerance, at most `max`.
 */
export declare function bezierSegmentCount(curve: CubicBezier, tolerance: number, min?: number, max?: number): number;
/** The curve as a line with `bezierSegmentCount` segments; start and end are kept exactly. */
export declare function bezierLineString(curve: CubicBezier, tolerance: number): LineString;
/** Default handles one third along the chord from each end: the curve starts straight. */
export declare function chordHandles(start: Coordinate, end: Coordinate): {
    startHandle: Coordinate;
    endHandle: Coordinate;
};
