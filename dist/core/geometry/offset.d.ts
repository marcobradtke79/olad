import { Coordinate } from 'ol/coordinate';
import { default as Geometry } from 'ol/geom/Geometry';
/**
 * A mitre join is replaced by a bevel when its tip would lie farther than this many offset
 * distances from the original vertex (turns sharper than about 30°).
 */
export declare const OFFSET_MITRE_LIMIT = 4;
/**
 * The vertices of `coords` moved `distance` to the left of the direction of travel (negative:
 * to the right): every segment is shifted along its normal and consecutive segments are joined
 * at the intersection of their lines (mitre), or by a bevel when the mitre would spike beyond
 * `OFFSET_MITRE_LIMIT`; parallel segments join at the shifted vertex. Open lines keep butt ends,
 * a closed ring is closed again. `null` when fewer than 2 (open) or 3 (closed) distinct vertices
 * remain, or when a segment collapses (it is shorter than the offset on the inside of a turn,
 * so the shifted copy would run backwards and form a loop).
 */
export declare function offsetRing(coords: Coordinate[], distance: number, closed: boolean): Coordinate[] | null;
/**
 * Like `offsetRing`, but parts that cannot be followed at this distance are skipped instead of
 * refusing the whole path: a segment that collapses (shorter than the offset on the inside of
 * a bend, so its shifted copy would run backwards) is removed and its neighbours are joined
 * directly; two antiparallel neighbours whose shifted lines have crossed (the sides of a notch
 * narrower than twice the distance) are removed together; a collapsed first or last segment of
 * an open line is dropped. On the inside of a bend the join is always the mitre, so the
 * collapse check sees every overlap. `null` when fewer than 1 (open) or 3 (closed) segments
 * remain, or a closed path would turn inside out.
 */
export declare function offsetPath(coords: Coordinate[], distance: number, closed: boolean): Coordinate[] | null;
/**
 * The geometry offset by `distance` (map units): lines to the left of their direction of travel
 * (negative: right), polygons grown (negative: shrunk, holes growing). Multi-part geometries are
 * offset part by part, dropping parts that collapse. `null` when nothing is left or the
 * geometry cannot be offset (points).
 */
export declare function offsetGeometry(geometry: Geometry, distance: number): Geometry | null;
/**
 * The sign of the offset a clicked point asks for: for lines `1` left or `-1` right of the
 * nearest segment (`null` exactly on its line), for polygons `-1` inside (shrink) and `1`
 * outside (grow); `null` for geometries that cannot be offset.
 */
export declare function offsetSide(geometry: Geometry, coordinate: Coordinate): 1 | -1 | null;
