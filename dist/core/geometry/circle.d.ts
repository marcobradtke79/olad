import { Coordinate } from 'ol/coordinate';
import { default as Polygon } from 'ol/geom/Polygon';
export interface CircleDefinition {
    center: Coordinate;
    radius: number;
}
/** Fewest segments a linearized circle gets, so small circles still look round. */
export declare const MIN_CIRCLE_SEGMENTS = 24;
/** Most segments a linearized circle gets, bounding the vertex count of huge circles. */
export declare const MAX_CIRCLE_SEGMENTS = 1024;
/**
 * The circle through three points (circumcircle), or `null` when they are collinear or two of
 * them coincide (relative tolerance on the determinant).
 */
export declare function circumcircle(a: Coordinate, b: Coordinate, c: Coordinate): CircleDefinition | null;
/**
 * Number of segments so that no chord deviates more than `tolerance` (same units as `radius`)
 * from the true circle, clamped to [`min`, `max`]. A tolerance of zero or at least the radius
 * gives `min`.
 */
export declare function circleSegmentCount(radius: number, tolerance: number, min?: number, max?: number): number;
/**
 * The circle as a closed counter-clockwise ring starting east of the centre, linearized with
 * `circleSegmentCount(radius, tolerance)` segments.
 */
export declare function circlePolygon(center: Coordinate, radius: number, tolerance: number): Polygon;
