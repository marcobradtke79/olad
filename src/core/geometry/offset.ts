import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { nearestSegment } from './segments';

/**
 * A mitre join is replaced by a bevel when its tip would lie farther than this many offset
 * distances from the original vertex (turns sharper than about 30°).
 */
export const OFFSET_MITRE_LIMIT = 4;

const round = (v: number) => Math.round(v * 1e9) / 1e9 + 0;
const same = (a: Coordinate, b: Coordinate) => a[0] === b[0] && a[1] === b[1];

function dedupe(coords: Coordinate[]): Coordinate[] {
  const out: Coordinate[] = [];
  for (const c of coords) if (out.length === 0 || !same(out[out.length - 1]!, c)) out.push(c);
  return out;
}

/** Twice the signed area of a ring (positive when counter-clockwise). */
function signedArea2(ring: Coordinate[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a[0]! * b[1]! - b[0]! * a[1]!;
  }
  return sum;
}

interface OffsetSegment {
  a: Coordinate;
  b: Coordinate;
  dx: number;
  dy: number;
}

/** Intersection of the lines through `s` and `t`, or `null` when they are parallel. */
function lineIntersection(s: OffsetSegment, t: OffsetSegment): Coordinate | null {
  const cross = s.dx * t.dy - s.dy * t.dx;
  if (Math.abs(cross) <= 1e-12 * Math.hypot(s.dx, s.dy) * Math.hypot(t.dx, t.dy)) return null;
  const u = ((t.a[0]! - s.a[0]!) * t.dy - (t.a[1]! - s.a[1]!) * t.dx) / cross;
  return [s.a[0]! + u * s.dx, s.a[1]! + u * s.dy];
}

/**
 * The vertices of `coords` moved `distance` to the left of the direction of travel (negative:
 * to the right): every segment is shifted along its normal and consecutive segments are joined
 * at the intersection of their lines (mitre), or by a bevel when the mitre would spike beyond
 * `OFFSET_MITRE_LIMIT`; parallel segments join at the shifted vertex. Open lines keep butt ends,
 * a closed ring is closed again. `null` when fewer than 2 (open) or 3 (closed) distinct vertices
 * remain, or when a segment collapses (it is shorter than the offset on the inside of a turn,
 * so the shifted copy would run backwards and form a loop).
 */
export function offsetRing(
  coords: Coordinate[],
  distance: number,
  closed: boolean,
): Coordinate[] | null {
  let points = dedupe(coords);
  if (closed && points.length > 1 && same(points[0]!, points[points.length - 1]!)) {
    points = points.slice(0, -1);
  }
  if (points.length < (closed ? 3 : 2) || !(Math.abs(distance) > 0)) return null;
  const count = closed ? points.length : points.length - 1;
  const segments: OffsetSegment[] = [];
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const dx = b[0]! - a[0]!;
    const dy = b[1]! - a[1]!;
    const length = Math.hypot(dx, dy);
    const nx = (-dy / length) * distance;
    const ny = (dx / length) * distance;
    segments.push({ a: [a[0]! + nx, a[1]! + ny], b: [b[0]! + nx, b[1]! + ny], dx, dy });
  }
  const join = (s: OffsetSegment, t: OffsetSegment, vertex: Coordinate): Coordinate[] => {
    const dot = s.dx * t.dx + s.dy * t.dy;
    const mitre = lineIntersection(s, t);
    if (!mitre) return dot > 0 ? [t.a] : [s.b, t.a]; // straight on, or a U-turn
    const reach = Math.hypot(mitre[0]! - vertex[0]!, mitre[1]! - vertex[1]!);
    return reach > OFFSET_MITRE_LIMIT * Math.abs(distance) ? [s.b, t.a] : [mitre];
  };
  // The join before segment i (its first point ends segment i - 1, its last point starts i).
  const joins: Coordinate[][] = [];
  for (let i = 0; i < count; i++) {
    const previous = segments[(i - 1 + count) % count]!;
    joins.push(i === 0 && !closed ? [segments[0]!.a] : join(previous, segments[i]!, points[i]!));
  }
  // A segment that runs backwards after the joins has collapsed (shorter than the offset on
  // the inside of a turn): refuse rather than produce a loop.
  for (let i = 0; i < count; i++) {
    const start = joins[i]![joins[i]!.length - 1]!;
    const end = i === count - 1 && !closed ? segments[i]!.b : joins[(i + 1) % count]![0]!;
    const { dx, dy } = segments[i]!;
    if ((end[0]! - start[0]!) * dx + (end[1]! - start[1]!) * dy <= 0) return null;
  }
  const result: Coordinate[] = joins.flat();
  if (!closed) result.push(segments[count - 1]!.b);
  const ring = dedupe(result.map(([x, y]) => [round(x!), round(y!)]));
  if (closed && ring.length > 1 && same(ring[0]!, ring[ring.length - 1]!)) ring.pop();
  if (ring.length < (closed ? 3 : 2)) return null;
  if (closed) ring.push([ring[0]![0]!, ring[0]![1]!]);
  return ring;
}

interface PathSegment extends OffsetSegment {
  /** The original end points, before the shift. */
  oa: Coordinate;
  ob: Coordinate;
}

const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

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
export function offsetPath(
  coords: Coordinate[],
  distance: number,
  closed: boolean,
): Coordinate[] | null {
  let points = dedupe(coords);
  if (closed && points.length > 1 && same(points[0]!, points[points.length - 1]!)) {
    points = points.slice(0, -1);
  }
  if (points.length < (closed ? 3 : 2) || !(Math.abs(distance) > 0)) return null;
  const count = closed ? points.length : points.length - 1;
  let segments: PathSegment[] = [];
  for (let i = 0; i < count; i++) {
    const oa = points[i]!;
    const ob = points[(i + 1) % points.length]!;
    const dx = ob[0]! - oa[0]!;
    const dy = ob[1]! - oa[1]!;
    const length = Math.hypot(dx, dy);
    const nx = (-dy / length) * distance;
    const ny = (dx / length) * distance;
    segments.push({ a: [oa[0]! + nx, oa[1]! + ny], b: [ob[0]! + nx, ob[1]! + ny], dx, dy, oa, ob });
  }
  const join = (s: PathSegment, t: PathSegment): Coordinate[] => {
    const turn = cross(s.dx, s.dy, t.dx, t.dy);
    const mitre = lineIntersection(s, t);
    if (!mitre) return s.dx * t.dx + s.dy * t.dy > 0 ? [t.a] : [s.b, t.a];
    // Inside the bend (turning towards the offset side) the mitre is exact; outside it may
    // spike and is bevelled beyond the limit.
    if (turn * distance > 0) return [mitre];
    const reach = Math.hypot(mitre[0]! - s.ob[0]!, mitre[1]! - s.ob[1]!);
    return reach > OFFSET_MITRE_LIMIT * Math.abs(distance) ? [s.b, t.a] : [mitre];
  };
  const minimum = closed ? 3 : 1;
  for (let guard = 0; guard <= count * 2; guard++) {
    if (segments.length < minimum) return null;
    const n = segments.length;
    const pairs = closed ? n : n - 1;
    // Antiparallel neighbours whose shifted lines have crossed: both go.
    let crossed = -1;
    for (let i = 0; i < pairs && n > 1; i++) {
      const s = segments[i]!;
      const t = segments[(i + 1) % n]!;
      if (lineIntersection(s, t) || s.dx * t.dx + s.dy * t.dy >= 0) continue;
      const before = cross(s.dx, s.dy, t.oa[0]! - s.oa[0]!, t.oa[1]! - s.oa[1]!);
      const after = cross(s.dx, s.dy, t.a[0]! - s.a[0]!, t.a[1]! - s.a[1]!);
      if (before !== 0 && Math.sign(before) !== Math.sign(after)) {
        crossed = i;
        break;
      }
    }
    if (crossed >= 0) {
      const next = (crossed + 1) % n;
      segments = segments.filter((_, i) => i !== crossed && i !== next);
      continue;
    }
    const joins: Coordinate[][] = [];
    for (let i = 0; i < n; i++) {
      joins.push(
        i === 0 && !closed ? [segments[0]!.a] : join(segments[(i - 1 + n) % n]!, segments[i]!),
      );
    }
    let collapsed = -1;
    for (let i = 0; i < n; i++) {
      const start = joins[i]![joins[i]!.length - 1]!;
      const end = i === n - 1 && !closed ? segments[i]!.b : joins[(i + 1) % n]![0]!;
      const { dx, dy } = segments[i]!;
      if ((end[0]! - start[0]!) * dx + (end[1]! - start[1]!) * dy <= 0) {
        collapsed = i;
        break;
      }
    }
    if (collapsed >= 0) {
      segments = segments.filter((_, i) => i !== collapsed);
      continue;
    }
    const result: Coordinate[] = joins.flat();
    if (!closed) result.push(segments[n - 1]!.b);
    const path = dedupe(result.map(([x, y]) => [round(x!), round(y!)]));
    if (closed && path.length > 1 && same(path[0]!, path[path.length - 1]!)) path.pop();
    if (path.length < (closed ? 3 : 2)) return null;
    if (closed) {
      // A ring offset inwards beyond its size turns inside out.
      if (Math.sign(signedArea2(path)) !== Math.sign(signedArea2(points))) return null;
      path.push([path[0]![0]!, path[0]![1]!]);
    }
    return path;
  }
  return null;
}

/** A ring offset away from the polygon interior by `distance` (negative: towards it). */
function offsetPolygonRing(
  ring: Coordinate[],
  distance: number,
  hole: boolean,
): Coordinate[] | null {
  const area = signedArea2(ring.slice(0, -1));
  if (area === 0) return null;
  // The polygon interior is left of a counter-clockwise outer ring and right of a
  // counter-clockwise hole; "away from the interior" flips accordingly.
  const sign = area > 0 === hole ? 1 : -1;
  return offsetRing(ring, sign * distance, true);
}

function offsetPolygonRings(rings: Coordinate[][], distance: number): Coordinate[][] | null {
  const outer = rings[0] ? offsetPolygonRing(rings[0], distance, false) : null;
  if (!outer) return null;
  const result = [outer];
  for (const hole of rings.slice(1)) {
    const offset = offsetPolygonRing(hole, distance, true);
    if (offset) result.push(offset);
  }
  return result;
}

/**
 * The geometry offset by `distance` (map units): lines to the left of their direction of travel
 * (negative: right), polygons grown (negative: shrunk, holes growing). Multi-part geometries are
 * offset part by part, dropping parts that collapse. `null` when nothing is left or the
 * geometry cannot be offset (points).
 */
export function offsetGeometry(geometry: Geometry, distance: number): Geometry | null {
  if (geometry instanceof LineString) {
    const line = offsetRing(geometry.getCoordinates(), distance, false);
    return line ? new LineString(line) : null;
  }
  if (geometry instanceof MultiLineString) {
    const lines = geometry
      .getCoordinates()
      .map((line) => offsetRing(line, distance, false))
      .filter((line): line is Coordinate[] => line !== null);
    return lines.length ? new MultiLineString(lines) : null;
  }
  if (geometry instanceof Polygon) {
    const rings = offsetPolygonRings(geometry.getCoordinates(), distance);
    return rings ? new Polygon(rings) : null;
  }
  if (geometry instanceof MultiPolygon) {
    const polygons = geometry
      .getCoordinates()
      .map((rings) => offsetPolygonRings(rings, distance))
      .filter((rings): rings is Coordinate[][] => rings !== null);
    return polygons.length ? new MultiPolygon(polygons) : null;
  }
  return null;
}

/**
 * The sign of the offset a clicked point asks for: for lines `1` left or `-1` right of the
 * nearest segment (`null` exactly on its line), for polygons `-1` inside (shrink) and `1`
 * outside (grow); `null` for geometries that cannot be offset.
 */
export function offsetSide(geometry: Geometry, coordinate: Coordinate): 1 | -1 | null {
  if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
    return geometry.intersectsCoordinate(coordinate) ? -1 : 1;
  }
  if (geometry instanceof LineString || geometry instanceof MultiLineString) {
    const segment = nearestSegment(geometry, coordinate);
    if (!segment) return null;
    const [a, b] = segment;
    const cross =
      (b[0]! - a[0]!) * (coordinate[1]! - a[1]!) - (b[1]! - a[1]!) * (coordinate[0]! - a[0]!);
    return cross > 0 ? 1 : cross < 0 ? -1 : null;
  }
  return null;
}
