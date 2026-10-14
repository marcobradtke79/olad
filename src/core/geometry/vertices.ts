import { squaredDistance, type Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { projectOnSegment } from './segments';

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

type Editable = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon;

/** A line of coordinates inside a geometry: its path prefix and whether it is a closed ring. */
interface Line {
  prefix: number[];
  coordinates: Coordinate[];
  closed: boolean;
  /** Whether consecutive coordinates form segments (not for multi-points). */
  segments: boolean;
}

function isEditable(geometry: Geometry): geometry is Editable {
  return (
    geometry instanceof Point ||
    geometry instanceof MultiPoint ||
    geometry instanceof LineString ||
    geometry instanceof MultiLineString ||
    geometry instanceof Polygon ||
    geometry instanceof MultiPolygon
  );
}

function lines(geometry: Geometry): Line[] {
  if (geometry instanceof Point) {
    return [
      { prefix: [], coordinates: [geometry.getCoordinates()], closed: false, segments: false },
    ];
  }
  if (geometry instanceof MultiPoint) {
    return [{ prefix: [], coordinates: geometry.getCoordinates(), closed: false, segments: false }];
  }
  if (geometry instanceof LineString) {
    return [{ prefix: [], coordinates: geometry.getCoordinates(), closed: false, segments: true }];
  }
  if (geometry instanceof MultiLineString) {
    return geometry
      .getCoordinates()
      .map((coordinates, j) => ({ prefix: [j], coordinates, closed: false, segments: true }));
  }
  if (geometry instanceof Polygon) {
    return geometry
      .getCoordinates()
      .map((coordinates, r) => ({ prefix: [r], coordinates, closed: true, segments: true }));
  }
  if (geometry instanceof MultiPolygon) {
    return geometry.getCoordinates().flatMap((polygon, p) =>
      polygon.map((coordinates, r) => ({
        prefix: [p, r],
        coordinates,
        closed: true,
        segments: true,
      })),
    );
  }
  return [];
}

/** Every vertex of a geometry with its path (rings without their closing copy). */
export function listVertices(geometry: Geometry): Vertex[] {
  if (geometry instanceof Point) return [{ coordinate: geometry.getCoordinates(), path: [] }];
  const vertices: Vertex[] = [];
  for (const line of lines(geometry)) {
    const count = line.closed ? line.coordinates.length - 1 : line.coordinates.length;
    for (let i = 0; i < count; i++) {
      vertices.push({ coordinate: line.coordinates[i]!, path: [...line.prefix, i] });
    }
  }
  return vertices;
}

/** The vertex closest to `coordinate` within `maxDistance` (map units), or `null`. */
export function nearestVertex(
  geometry: Geometry,
  coordinate: Coordinate,
  maxDistance: number,
): Vertex | null {
  let best: Vertex | null = null;
  let bestDistance = maxDistance * maxDistance;
  for (const vertex of listVertices(geometry)) {
    const distance = squaredDistance(vertex.coordinate, coordinate);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = vertex;
    }
  }
  return best;
}

/**
 * The segment closest to `coordinate` within `maxDistance` (map units) and the point on it
 * nearest to `coordinate`, or `null`. Points and multi-points have no segments.
 */
export function nearestEdge(
  geometry: Geometry,
  coordinate: Coordinate,
  maxDistance: number,
): Edge | null {
  let best: Edge | null = null;
  let bestDistance = maxDistance * maxDistance;
  for (const line of lines(geometry)) {
    if (!line.segments) continue;
    for (let i = 0; i < line.coordinates.length - 1; i++) {
      const a = line.coordinates[i]!;
      const b = line.coordinates[i + 1]!;
      const { foot, t } = projectOnSegment(coordinate, a, b);
      const clamped = t <= 0 ? a : t >= 1 ? b : foot;
      const distance = squaredDistance(clamped, coordinate);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { path: [...line.prefix, i], foot: [clamped[0]!, clamped[1]!] };
      }
    }
  }
  return best;
}

/** A copy of `geometry` with the vertex at `path` moved to `coordinate`. */
export function setVertex(geometry: Geometry, path: VertexPath, coordinate: Coordinate): Geometry {
  return edit(geometry, path, (line, index) => {
    line[index] = coordinate.slice();
  });
}

/** A copy of `geometry` with `coordinate` inserted after the vertex at `path`. */
export function insertVertexAfter(
  geometry: Geometry,
  path: VertexPath,
  coordinate: Coordinate,
): Geometry {
  return edit(geometry, path, (line, index) => {
    line.splice(index + 1, 0, coordinate.slice());
  });
}

/**
 * A copy of `geometry` without the vertex at `path`. No minimum is enforced: the editing
 * pipeline rejects a geometry with too few vertices.
 */
export function removeVertex(geometry: Geometry, path: VertexPath): Geometry {
  return edit(geometry, path, (line, index) => {
    line.splice(index, 1);
  });
}

type NestedCoordinates = Coordinate | NestedCoordinates[];

function edit(
  geometry: Geometry,
  path: VertexPath,
  change: (line: Coordinate[], index: number) => void,
): Geometry {
  if (!isEditable(geometry)) return geometry.clone();
  const clone = geometry.clone() as Editable;
  if (clone instanceof Point) {
    const line = [clone.getCoordinates()];
    change(line, 0);
    if (line[0]) clone.setCoordinates(line[0]);
    return clone;
  }
  const coordinates = clone.getCoordinates() as NestedCoordinates[];
  let container: NestedCoordinates[] = coordinates;
  for (const index of path.slice(0, -1)) container = container[index] as NestedCoordinates[];
  const line = container as Coordinate[];
  const index = path[path.length - 1]!;
  const closed = clone instanceof Polygon || clone instanceof MultiPolygon;
  change(line, index);
  if (closed && line.length > 0) line[line.length - 1] = line[0]!.slice();
  (clone as unknown as { setCoordinates(c: unknown): void }).setCoordinates(coordinates);
  return clone;
}
