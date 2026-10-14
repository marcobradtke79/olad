import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
/**
 * Indices into a geometry's nested coordinate array, ending at a vertex: `[]` for a point,
 * `[i]` for a line or multi-point, `[ring, i]` for a polygon, `[part, i]` for a multi-line and
 * `[polygon, ring, i]` for a multi-polygon. Ring paths never address the closing copy.
 */
export type VertexPath = number[];
export interface Vertex {
    coordinate: Coordinate;
    path: VertexPath;
}
/** A segment addressed by the path of its start vertex, with the nearest point on it. */
export interface Edge {
    path: VertexPath;
    foot: Coordinate;
}
/** Every vertex of a geometry with its path (rings without their closing copy). */
export declare function listVertices(geometry: Geometry): Vertex[];
/** The vertex closest to `coordinate` within `maxDistance` (map units), or `null`. */
export declare function nearestVertex(geometry: Geometry, coordinate: Coordinate, maxDistance: number): Vertex | null;
/**
 * The segment closest to `coordinate` within `maxDistance` (map units) and the point on it
 * nearest to `coordinate`, or `null`. Points and multi-points have no segments.
 */
export declare function nearestEdge(geometry: Geometry, coordinate: Coordinate, maxDistance: number): Edge | null;
/** A copy of `geometry` with the vertex at `path` moved to `coordinate`. */
export declare function setVertex(geometry: Geometry, path: VertexPath, coordinate: Coordinate): Geometry;
/** A copy of `geometry` with `coordinate` inserted after the vertex at `path`. */
export declare function insertVertexAfter(geometry: Geometry, path: VertexPath, coordinate: Coordinate): Geometry;
/**
 * A copy of `geometry` without the vertex at `path`. No minimum is enforced: the editing
 * pipeline rejects a geometry with too few vertices.
 */
export declare function removeVertex(geometry: Geometry, path: VertexPath): Geometry;
