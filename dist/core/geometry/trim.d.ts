import { Coordinate } from 'ol/coordinate';
import { Segment } from './segments';
export interface TrimResult {
    /** What remains of the line: one part, or two when an interior piece was removed. */
    kept: Coordinate[][];
    /** The removed piece, for previews. */
    removed: Coordinate[];
}
export interface ExtendResult {
    /** The line with the extended end moved onto the boundary. */
    line: Coordinate[];
    /** The added piece from the old end to the new one, for previews. */
    added: [Coordinate, Coordinate];
}
/** Position of the point of the polyline nearest to `point`, as a distance from its start. */
export declare function nearestStation(line: Coordinate[], point: Coordinate): number;
/**
 * Trim a polyline at the cutting edges: the piece around `click` between the nearest crossings
 * before and after it is removed (to the line's end where there is no crossing on that side).
 * Crossings of the line with itself do not count. `null` when no crossing bounds the clicked
 * piece or nothing of the line would remain.
 */
export declare function trimLine(line: Coordinate[], cutters: Segment[], click: Coordinate): TrimResult | null;
/**
 * Extend a polyline at the end nearer to `click` (measured along the line) along the direction
 * of its end segment to the first cutting edge ahead; the end vertex moves there. `null` when
 * the end already lies on a cutting edge, its segment has no length or the ray misses.
 */
export declare function extendLine(line: Coordinate[], cutters: Segment[], click: Coordinate): ExtendResult | null;
