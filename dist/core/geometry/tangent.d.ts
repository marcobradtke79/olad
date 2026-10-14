import { Coordinate } from 'ol/coordinate';
/**
 * Largest turn angle at a vertex, in degrees, for which it still counts as part of a curve.
 * A linearized circle turns at most 360 / 24 = 15° per vertex; polygon corners turn far more.
 */
export declare const TANGENT_MAX_TURN = 20;
/**
 * The vertices of a linearized curve where a line from `reference` touches it: the turn at the
 * vertex is at most `maxTurn` degrees and both neighbours lie on the same side of the line from
 * the reference through the vertex, so the line meets the polyline without crossing it. A ring
 * (first vertex equal to the last) is treated cyclically; on an open line the end vertices are
 * never tangent points. A reference inside a convex ring yields nothing.
 */
export declare function tangentPoints(ring: Coordinate[], reference: Coordinate, maxTurn?: number): Coordinate[];
