import { Coordinate } from 'ol/coordinate';
import { LengthUnit } from '../units';
import { ProjectionLike } from 'ol/proj';
/** A polyline's length in metres: per segment and in total. */
export interface LengthMeasure {
    total: number;
    segments: number[];
}
/** A polygon's area in square metres and its perimeter (outer ring) in metres. */
export interface AreaMeasure {
    area: number;
    perimeter: number;
}
/** The angle at a vertex in degrees (0 … 180) and its reflex (360 − angle). */
export interface AngleMeasure {
    angle: number;
    reflex: number;
}
/**
 * Length of a polyline in metres: planar in a true-to-scale metric grid, otherwise each
 * segment at its midpoint scale (`distanceMetres`).
 */
export declare function measureLength(projection: ProjectionLike, coords: Coordinate[]): LengthMeasure;
/**
 * Area of a polygon (outer ring first, then holes; rings closed or open) in square metres and
 * the length of its outer ring. Planar in a true-to-scale metric grid (UTM and similar); exact
 * on the projection's sphere in Web Mercator, matching its lengths; on the sphere through
 * `ol/sphere` otherwise (geographic).
 */
export declare function measureArea(projection: ProjectionLike, rings: Coordinate[][]): AreaMeasure;
/** The angle at `vertex` between the legs to `first` and `second`, in degrees. */
export declare function measureAngle(first: Coordinate, vertex: Coordinate, second: Coordinate): AngleMeasure;
/** A length for display in `unit` (default metres: m, km from 1000 m); see `units.ts`. */
export declare function formatLength(metres: number, unit?: LengthUnit): string;
/** An area for display in `unit`'s system (default metric: m², ha, km²); see `units.ts`. */
export declare function formatArea(squareMetres: number, unit?: LengthUnit): string;
/** An angle for display, in degrees with 1 decimal. */
export declare function formatAngle(degrees: number): string;
