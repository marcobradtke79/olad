import { Coordinate } from 'ol/coordinate';
/**
 * Whether segment `ab` and segment `cd` share at least one point (touching counts).
 * Standard orientation test with the collinear cases handled by bounding-box checks.
 */
export declare function segmentsIntersect(a: Coordinate, b: Coordinate, c: Coordinate, d: Coordinate): boolean;
/** Where two segments (or a ray and a segment) meet: `t` along the first, `u` along the second. */
export interface Crossing {
    point: Coordinate;
    t: number;
    u: number;
}
/**
 * The point where segment `ab` crosses segment `cd`, with `t` and `u` in [0, 1]; `null` when
 * they miss or are parallel (collinear overlaps have no single crossing point).
 */
export declare function segmentIntersection(a: Coordinate, b: Coordinate, c: Coordinate, d: Coordinate): Crossing | null;
/**
 * The point where the ray from `origin` in `direction` hits segment `cd`: `t > 0` in units of
 * `direction`, `u` in [0, 1]; `null` when it misses, points away or runs parallel.
 */
export declare function rayIntersection(origin: Coordinate, direction: Coordinate, c: Coordinate, d: Coordinate): Crossing | null;
