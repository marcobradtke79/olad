import { Coordinate } from 'ol/coordinate';
import { Extent } from 'ol/extent';
/**
 * Grid math for grid snapping: a square grid aligned with the axes of the view projection,
 * `spacing` units wide, with one intersection at `origin`.
 */
/** The grid intersection nearest to `coordinate`. */
export declare function nearestGridPoint(coordinate: Coordinate, spacing: number, origin?: Coordinate): Coordinate;
/**
 * Every grid intersection inside `extent` (inclusive), row by row, or `null` when there would be
 * more than `maxCount` of them (the grid is too dense to draw).
 */
export declare function gridPointsInExtent(extent: Extent, spacing: number, origin?: Coordinate, maxCount?: number): Coordinate[] | null;
