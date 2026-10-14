import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
/**
 * The path a parallel runs along: the reference's line or ring offset by `distance` (map
 * units, positive to the left of the direction of travel). A closed path repeats its first
 * vertex at the end.
 */
export interface ParallelPath {
    path: Coordinate[];
    closed: boolean;
    distance: number;
}
/**
 * Why there is no parallel through a start point: `unsupported` (not a line or polygon),
 * `collapsed` (nothing of the object can be followed at that distance) or `too-close` (the
 * start lies closer than its distance to another part of the object).
 */
export type ParallelFailure = 'unsupported' | 'collapsed' | 'too-close';
/**
 * The parallel through `start` to the line, polyline or polygon: the part or ring nearest to
 * `start` offset by the perpendicular distance of `start` from its nearest segment, on that
 * side (left of the direction of travel is positive). A start on the reference traces it.
 * Parts that cannot be followed at that distance are skipped (`offsetPath`), and the parallel
 * never comes closer than the distance to any part of the object: where another part is
 * nearer (a hairpin, a line doubling back or crossing itself) it continues where its offsets
 * cross, skipping the vertices between, or ends. A ring that loses parts becomes an open path
 * around the start. Returns a `ParallelFailure` when there is no parallel.
 */
export declare function parallelPath(geometry: Geometry, start: Coordinate): ParallelPath | ParallelFailure;
/** Length of the path (a closed path includes its closing segment). */
export declare function pathLength(path: Coordinate[]): number;
/** Position of the point of the path nearest to `point`, as a distance from its start. */
export declare function stationOf(path: Coordinate[], point: Coordinate): number;
/**
 * The piece of the path from station `from` to station `to`, in that direction (reversed when
 * `to < from`). An open path clamps both to its ends. On a closed path the stations may lie
 * outside 0 … length (unwrapped): the piece then runs past the closing vertex, at most once
 * around. `null` when the piece has no length.
 */
export declare function subPath(path: Coordinate[], closed: boolean, from: number, to: number): Coordinate[] | null;
