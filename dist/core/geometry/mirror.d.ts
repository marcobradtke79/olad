import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
/** `p` reflected across the infinite line through `a` and `b`. */
export declare function reflectPoint(p: Coordinate, a: Coordinate, b: Coordinate): Coordinate;
/**
 * A copy of `geometry` reflected across the line through `a` and `b`. Polygon rings are
 * reversed after the reflection so each keeps its winding (a reflection flips orientation).
 * Throws when `a` and `b` coincide.
 */
export declare function mirrorGeometry(geometry: Geometry, a: Coordinate, b: Coordinate): Geometry;
