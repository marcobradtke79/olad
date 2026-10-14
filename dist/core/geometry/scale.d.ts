import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
/**
 * The factor that takes the distance base → reference to the distance base → target, or `null`
 * when the reference coincides with the base (no length to compare with).
 */
export declare function scaleFactor(base: Coordinate, reference: Coordinate, target: Coordinate): number | null;
/**
 * A copy of `geometry` scaled uniformly by `factor` around `anchor`. A positive factor keeps
 * the ring winding. Throws for a factor that is not a finite number greater than 0.
 */
export declare function scaleGeometry(geometry: Geometry, factor: number, anchor: Coordinate): Geometry;
