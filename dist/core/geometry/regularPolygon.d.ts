import { Coordinate } from 'ol/coordinate';
import { default as Polygon } from 'ol/geom/Polygon';
/** Fewest sides of a regular polygon (a triangle). */
export declare const MIN_REGULAR_POLYGON_SIDES = 3;
/** Most sides of a regular polygon, bounding the vertex count like a linearized circle. */
export declare const MAX_REGULAR_POLYGON_SIDES = 1024;
/** Whether `sides` is a whole number within the allowed range. */
export declare function isValidSideCount(sides: number): boolean;
/**
 * The regular polygon with `sides` equal sides inscribed in the circle around `center` through
 * `vertex`: `vertex` is its first vertex, the others follow counter-clockwise. A closed ring;
 * `null` when `vertex` equals the centre or the side count is invalid.
 */
export declare function regularPolygon(center: Coordinate, vertex: Coordinate, sides: number): Polygon | null;
