import { Coordinate } from 'ol/coordinate';
import { default as Polygon } from 'ol/geom/Polygon';
/**
 * The rectangle with corners `a` and `b` whose sides run along and across the direction
 * `angleDeg` (degrees, counter-clockwise from the +x axis of the view projection, the
 * straightedge angle). With 0° it is axis-aligned. The ring is counter-clockwise whatever the
 * drag direction. `null` when the corners lie on one of the axes (no width or no height).
 */
export declare function rectangleFromCorners(a: Coordinate, b: Coordinate, angleDeg: number): Polygon | null;
