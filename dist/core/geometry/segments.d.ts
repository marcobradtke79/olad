import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
export type Segment = [Coordinate, Coordinate];
/**
 * Every coordinate run of a geometry: a line string, each ring of a polygon, each part of a
 * multi geometry. Points and multi-points have none.
 */
export declare function ringsOf(geometry: Geometry): Coordinate[][];
/** Every line segment of a geometry. Points and multi-points have none. */
export declare function segmentsOf(geometry: Geometry): Segment[];
/** The segment of `geometry` closest to `coordinate`, or `undefined` for point geometries. */
export declare function nearestSegment(geometry: Geometry, coordinate: Coordinate): Segment | undefined;
/**
 * Orthogonal projection of `point` onto the line through `a` and `b`. `t` is the position
 * along `a → b` (0 at `a`, 1 at `b`); outside [0, 1] the foot lies beyond the segment. A
 * degenerate segment projects onto `a`.
 */
export declare function projectOnSegment(point: Coordinate, a: Coordinate, b: Coordinate): {
    foot: Coordinate;
    t: number;
};
/** Normalise an angle in degrees to [0, 360). */
export declare function normalizeAngle(degrees: number): number;
/**
 * Angle of the line through two screen pixels in degrees, counter-clockwise from the screen
 * x-axis (pixel y grows downwards), normalised to [0, 180) since a line has no direction.
 */
export declare function screenAngle(from: Coordinate, to: Coordinate): number;
