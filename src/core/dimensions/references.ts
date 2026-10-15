import type Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import { projectOnSegment } from '../geometry/segments';
import { nearestEdge, nearestVertex, segmentAt, vertexAt } from '../geometry/vertices';

/**
 * What a definition point of a dimension was snapped to: a vertex, the midpoint of a segment,
 * or a point on a segment (`t` from its start, 0 … 1; perpendicular snaps). The segment is
 * addressed by the path of its start vertex (`VertexPath`).
 */
export interface DimensionReference {
  layer: string;
  id: string | number;
  kind: 'vertex' | 'midpoint' | 'edge';
  path: number[];
  t?: number;
}

/** One reference per definition point, `null` for a typed or free point. */
export type DimensionRefs = (DimensionReference | null)[];

/** What a snap reports, as far as references need it (`SnapResult`). */
export interface SnapSource {
  coordinate: Coordinate;
  mode: string;
  layer?: string;
  feature?: Feature;
}

/** Distance below which two map coordinates count as the same point. */
const SAME = 1e-9;

const near = (a: Coordinate, b: Coordinate, tolerance: number) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!) <= tolerance;

/**
 * The reference for a point taken at `coordinate`, from the snap that placed it, or `null`
 * when the point was not snapped onto an object with an id (a grid snap, a typed point).
 */
export function referenceFor(
  snap: SnapSource | null | undefined,
  coordinate: Coordinate,
): DimensionReference | null {
  const feature = snap?.feature;
  const geometry = feature?.getGeometry();
  const id = feature?.getId();
  if (!snap || !snap.layer || !geometry || id === undefined) return null;
  const scale = Math.max(1, Math.abs(coordinate[0]!), Math.abs(coordinate[1]!));
  if (!near(snap.coordinate, coordinate, SAME * scale)) return null;
  const tolerance = 1e-6 * scale;
  if (snap.mode === 'vertex' || snap.mode === 'tangent') {
    const vertex = nearestVertex(geometry, coordinate, tolerance);
    return vertex ? { layer: snap.layer, id, kind: 'vertex', path: vertex.path } : null;
  }
  if (snap.mode === 'midpoint' || snap.mode === 'perpendicular') {
    const edge = nearestEdge(geometry, coordinate, tolerance);
    const segment = edge && segmentAt(geometry, edge.path);
    if (!edge || !segment) return null;
    if (snap.mode === 'midpoint') {
      return { layer: snap.layer, id, kind: 'midpoint', path: edge.path };
    }
    const { t } = projectOnSegment(coordinate, segment[0], segment[1]);
    return { layer: snap.layer, id, kind: 'edge', path: edge.path, t: Math.min(1, Math.max(0, t)) };
  }
  return null;
}

/** Where a reference points now in `geometry`, or `null` when the vertex or segment is gone. */
export function resolveReference(
  reference: DimensionReference,
  geometry: Geometry | undefined,
): Coordinate | null {
  if (!geometry) return null;
  if (reference.kind === 'vertex') return vertexAt(geometry, reference.path);
  const segment = segmentAt(geometry, reference.path);
  if (!segment) return null;
  const t = reference.kind === 'midpoint' ? 0.5 : (reference.t ?? 0);
  const [a, b] = segment;
  return [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t];
}

function isReference(value: unknown): value is DimensionReference {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.layer === 'string' &&
    (typeof r.id === 'string' || typeof r.id === 'number') &&
    (r.kind === 'vertex' || r.kind === 'midpoint' || r.kind === 'edge') &&
    Array.isArray(r.path) &&
    r.path.every((i) => Number.isInteger(i) && (i as number) >= 0) &&
    (r.t === undefined || (typeof r.t === 'number' && r.t >= 0 && r.t <= 1))
  );
}

/** Whether a `refs` property is well-formed: absent, or one reference or `null` per point. */
export function isRefs(value: unknown, points = 2): boolean {
  if (value === undefined || value === null) return true;
  return (
    Array.isArray(value) &&
    value.length === points &&
    value.every((ref) => ref === null || isReference(ref))
  );
}

/** The references of a dimension object (an empty list when it has none). */
export function referencesOf(feature: Feature): DimensionRefs {
  const refs = feature.get('refs') as unknown;
  return Array.isArray(refs) && isRefs(refs, refs.length) ? (refs as DimensionRefs) : [];
}

/**
 * Whether a dimension no longer matches what it measures: a referenced object is gone, or a
 * referenced point moved away from the dimension's definition point by more than `tolerance`
 * (map units). `find` looks up an editor object by layer and id.
 */
export function isStale(
  feature: Feature,
  find: (layer: string, id: string | number) => Feature | null | undefined,
  tolerance: number,
): boolean {
  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return false;
  const points = geometry.getCoordinates();
  return referencesOf(feature).some((ref, i) => {
    if (!ref || !points[i]) return false;
    const now = resolveReference(ref, find(ref.layer, ref.id)?.getGeometry());
    return now === null || !near(now, points[i], tolerance);
  });
}

/** The definition points moved onto what the references point at now, or `null` if one is gone. */
export function referencedPoints(
  feature: Feature,
  find: (layer: string, id: string | number) => Feature | null | undefined,
): Coordinate[] | null {
  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return null;
  const refs = referencesOf(feature);
  const points: Coordinate[] = [];
  for (const [i, point] of geometry.getCoordinates().entries()) {
    const ref = refs[i];
    if (!ref) {
      points.push(point);
      continue;
    }
    const now = resolveReference(ref, find(ref.layer, ref.id)?.getGeometry());
    if (!now) return null;
    points.push([now[0]!, now[1]!]);
  }
  return points;
}

/** The references with temporary ids replaced through `idMap`, or `null` when nothing changed. */
export function remapReferences(
  refs: DimensionRefs,
  idMap: Record<string, string | number>,
): DimensionRefs | null {
  let changed = false;
  const next = refs.map((ref) => {
    if (!ref || !(String(ref.id) in idMap)) return ref;
    changed = true;
    return { ...ref, id: idMap[String(ref.id)]! };
  });
  return changed ? next : null;
}
