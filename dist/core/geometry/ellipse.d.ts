import { Coordinate } from 'ol/coordinate';
import { default as Polygon } from 'ol/geom/Polygon';
/**
 * An ellipse by its centre, the half-length `a` of the first axis, the half-length `b` of the
 * second axis and the direction of the first axis (`rotation`, radians, counter-clockwise from
 * the +x axis). `a` is not necessarily the longer one.
 */
export interface EllipseDefinition {
    center: Coordinate;
    a: number;
    b: number;
    rotation: number;
}
/**
 * The ellipse with the given centre, one end of the first axis and a point whose distance from
 * that axis is the second half-axis. `null` when the axis end is on the centre or the point
 * is on the axis.
 */
export declare function ellipseFromCentre(center: Coordinate, axisEnd: Coordinate, point: Coordinate): EllipseDefinition | null;
/**
 * The ellipse whose first axis runs from `first` to `second` and whose second half-axis is the
 * distance of `point` from that axis. `null` when the ends coincide or the point is on the axis.
 */
export declare function ellipseFromAxis(first: Coordinate, second: Coordinate, point: Coordinate): EllipseDefinition | null;
/**
 * The ellipse inscribed in the box with opposite corners `a` and `b` whose sides run along and
 * across `angleDeg` (degrees, the straightedge angle), as the rectangle tool builds it. `null`
 * when the box has no width or no height.
 */
export declare function ellipseFromCorners(a: Coordinate, b: Coordinate, angleDeg: number): EllipseDefinition | null;
/**
 * The ellipse as a closed counter-clockwise ring starting at the end of the first axis,
 * linearized with uniform parameter steps. The step count is that of a circle with the longer
 * half-axis: the ellipse is that circle squeezed along one axis, which never makes a chord
 * deviate more, so no chord deviates more than `tolerance` (map units) from the true curve.
 */
export declare function ellipsePolygon(ellipse: EllipseDefinition, tolerance: number): Polygon;
