import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import { offsetPath } from './offset';
import { projectOnSegment } from './segments';
import { nearestStation } from './trim';

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

interface Base {
  coords: Coordinate[];
  closed: boolean;
}

function basesOf(geometry: Geometry): Base[] {
  if (geometry instanceof LineString) return [{ coords: geometry.getCoordinates(), closed: false }];
  if (geometry instanceof MultiLineString) {
    return geometry.getCoordinates().map((coords) => ({ coords, closed: false }));
  }
  if (geometry instanceof Polygon) {
    return geometry.getCoordinates().map((coords) => ({ coords, closed: true }));
  }
  if (geometry instanceof MultiPolygon) {
    return geometry
      .getCoordinates()
      .flatMap((rings) => rings.map((coords) => ({ coords, closed: true })));
  }
  return [];
}

/** The segment of `coords` nearest to `point` and its distance (feet clamped to the segment). */
function nearest(
  coords: Coordinate[],
  point: Coordinate,
): { a: Coordinate; b: Coordinate; d: number } | null {
  let best: { a: Coordinate; b: Coordinate; d: number } | null = null;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!;
    const b = coords[i]!;
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const t = Math.min(1, Math.max(0, projectOnSegment(point, a, b).t));
    const d = Math.hypot(
      point[0]! - (a[0]! + t * (b[0]! - a[0]!)),
      point[1]! - (a[1]! + t * (b[1]! - a[1]!)),
    );
    if (!best || d < best.d) best = { a, b, d };
  }
  return best;
}

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
export function parallelPath(
  geometry: Geometry,
  start: Coordinate,
): ParallelPath | ParallelFailure {
  const bases = basesOf(geometry);
  let chosen: { base: Base; a: Coordinate; b: Coordinate; d: number } | null = null;
  for (const base of bases) {
    const hit = nearest(base.coords, start);
    if (hit && (!chosen || hit.d < chosen.d)) chosen = { base, ...hit };
  }
  if (!chosen) return 'unsupported';
  const { base, a, b } = chosen;
  const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
  const distance =
    ((b[0]! - a[0]!) * (start[1]! - a[1]!) - (b[1]! - a[1]!) * (start[0]! - a[0]!)) / length;
  if (Math.abs(distance) <= 1e-9 * length) {
    const path = base.coords.map((c) => [c[0]!, c[1]!]);
    if (base.closed && (path[0]![0] !== path.at(-1)![0] || path[0]![1] !== path.at(-1)![1])) {
      path.push([path[0]![0]!, path[0]![1]!]);
    }
    return { path, closed: base.closed, distance: 0 };
  }
  const raw = offsetPath(base.coords, distance, base.closed);
  if (!raw) return 'collapsed';
  const cleaned = keepDistance(
    raw,
    base.closed,
    referenceSegments(bases),
    Math.abs(distance),
    start,
  );
  return typeof cleaned === 'string' ? cleaned : { ...cleaned, distance };
}

type Segment = [Coordinate, Coordinate];

function referenceSegments(bases: Base[]): Segment[] {
  const out: Segment[] = [];
  for (const { coords } of bases) {
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1]!;
      const b = coords[i]!;
      if (a[0] !== b[0] || a[1] !== b[1]) out.push([a, b]);
    }
  }
  return out;
}

/** Parameters along `p→q` and `r→s` of their intersection, or `null` (none or parallel). */
function intersect(
  p: Coordinate,
  q: Coordinate,
  r: Coordinate,
  s: Coordinate,
): { t: number; u: number } | null {
  const ax = q[0]! - p[0]!;
  const ay = q[1]! - p[1]!;
  const bx = s[0]! - r[0]!;
  const by = s[1]! - r[1]!;
  const den = ax * by - ay * bx;
  if (Math.abs(den) <= 1e-12 * Math.hypot(ax, ay) * Math.hypot(bx, by)) return null;
  const cx = r[0]! - p[0]!;
  const cy = r[1]! - p[1]!;
  const t = (cx * by - cy * bx) / den;
  const u = (cx * ay - cy * ax) / den;
  const e = 1e-12;
  return t < -e || t > 1 + e || u < -e || u > 1 + e ? null : { t, u };
}

/**
 * Whether `p` lies in the band of some reference segment: its foot falls inside the segment
 * and it is closer than `d`. Points beside a segment's end vertex do not count, so the
 * parallel's own bevels round a bend stay valid.
 */
function inBand(p: Coordinate, segments: Segment[], d: number): boolean {
  for (const [a, b] of segments) {
    const dx = b[0]! - a[0]!;
    const dy = b[1]! - a[1]!;
    const len2 = dx * dx + dy * dy;
    const t = ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / len2;
    if (t <= 1e-9 || t >= 1 - 1e-9) continue;
    const off = Math.abs(dx * (p[1]! - a[1]!) - dy * (p[0]! - a[0]!)) / Math.sqrt(len2);
    if (off < d * (1 - 1e-6)) return true;
  }
  return false;
}

/**
 * The part of a raw parallel that keeps at least `d` from every reference segment, as one
 * path through the start. The raw path is cut where it enters or leaves the band of a
 * reference segment and where it crosses itself; the pieces outside every band are valid.
 * From the piece of the start the path continues with the adjacent piece while that is valid,
 * else at a crossing of the path with itself it jumps to the valid piece on the other branch
 * (skipping the vertices between), else it ends; the same backwards.
 */
function keepDistance(
  raw: Coordinate[],
  closed: boolean,
  references: Segment[],
  d: number,
  start: Coordinate,
): { path: Coordinate[]; closed: boolean } | ParallelFailure {
  let path = raw;
  let startStation = 0;
  if (closed) {
    // Open the ring at the start, so the pieces run away from it in both directions.
    const s = stationOf(raw, start);
    const opened = subPath(raw, true, s, s + pathLength(raw));
    if (!opened) return 'collapsed';
    path = opened;
  } else {
    startStation = stationOf(raw, start);
  }
  const along = stations(path);
  const L = along.at(-1)!;
  const tol = 1e-7 * L + 1e-9;
  const n = path.length - 1;
  const cuts = [0, L];
  const crossings: [number, number][] = [];
  const at = (i: number, t: number) => along[i]! + t * (along[i + 1]! - along[i]!);
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (closed && i === 0 && j === n - 1) continue; // neighbours across the opening
      const hit = intersect(path[i]!, path[i + 1]!, path[j]!, path[j + 1]!);
      if (!hit) continue;
      const si = at(i, hit.t);
      const sj = at(j, hit.u);
      if (sj - si <= tol) continue;
      cuts.push(si, sj);
      crossings.push([si, sj]);
    }
  }
  for (const [a, b] of references) {
    const len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    const nx = (-(b[1]! - a[1]!) / len) * d;
    const ny = ((b[0]! - a[0]!) / len) * d;
    const plus = (c: Coordinate): Coordinate => [c[0]! + nx, c[1]! + ny];
    const minus = (c: Coordinate): Coordinate => [c[0]! - nx, c[1]! - ny];
    const bounds: Segment[] = [
      [plus(a), plus(b)],
      [minus(a), minus(b)],
      [minus(a), plus(a)],
      [minus(b), plus(b)],
    ];
    for (let i = 0; i < n; i++) {
      for (const [r, s] of bounds) {
        const hit = intersect(path[i]!, path[i + 1]!, r, s);
        if (hit) cuts.push(at(i, hit.t));
      }
    }
  }
  cuts.sort((x, y) => x - y);
  const marks: number[] = [];
  for (const c of cuts) if (marks.length === 0 || c - marks[marks.length - 1]! > tol) marks.push(c);
  marks[marks.length - 1] = L;
  const pieces: { a: number; b: number; valid: boolean }[] = [];
  for (let k = 1; k < marks.length; k++) {
    const a = marks[k - 1]!;
    const b = marks[k]!;
    pieces.push({ a, b, valid: !inBand(pointAt(path, along, (a + b) / 2), references, d) });
  }
  const pieceAt = (station: number) => {
    const candidates = pieces.filter((p) => p.a - tol <= station && station <= p.b + tol);
    return candidates.find((p) => p.valid) ?? candidates[0];
  };
  const first = closed ? pieces[0] : pieceAt(startStation);
  if (!first?.valid) return 'too-close';
  // Each range is a stretch of the raw path; a gap between ranges is a jump at a crossing.
  const ranges: [number, number][] = [[first.a, first.b]];
  let k = pieces.indexOf(first);
  for (;;) {
    const e = pieces[k]!.b;
    const next = pieces[k + 1];
    if (!next) break;
    if (next.valid) {
      ranges[ranges.length - 1]![1] = next.b;
      k++;
      continue;
    }
    const target = crossings
      .filter(([x, y]) => Math.abs(x - e) <= tol && y > e + tol)
      .map(([, y]) => pieces.findIndex((p) => Math.abs(p.a - y) <= tol))
      .find((m) => m > k && pieces[m]!.valid);
    if (target === undefined) break;
    k = target;
    ranges.push([pieces[k]!.a, pieces[k]!.b]);
  }
  const forwardEnd = pieces[k]!.b;
  // Backwards: from the start piece of an open path, or from the end of an opened ring.
  let j = closed ? pieces.length : pieces.indexOf(first);
  const before: [number, number][] = [];
  const stop = closed ? forwardEnd : -Infinity;
  for (;;) {
    const s = j === pieces.length ? L : pieces[j]!.a;
    const previous = pieces[j - 1];
    if (!previous || previous.a < stop - tol) break;
    if (previous.valid) {
      if (before.length && Math.abs(before[0]![0] - s) <= tol) before[0]![0] = previous.a;
      else before.unshift([previous.a, previous.b]);
      j--;
      continue;
    }
    const target = crossings
      .filter(([x, y]) => Math.abs(y - s) <= tol && x < s - tol)
      .map(([x]) => pieces.findIndex((p) => Math.abs(p.b - x) <= tol))
      .find((m) => m >= 0 && m < j && pieces[m]!.valid && pieces[m]!.a >= stop - tol);
    if (target === undefined) break;
    before.unshift([pieces[target]!.a, pieces[target]!.b]);
    j = target;
  }
  if (closed && ranges.length === 1 && ranges[0]![0] <= tol && ranges[0]![1] >= L - tol) {
    return { path: raw, closed: true };
  }
  const all = closed ? [...before, ...ranges] : [...before, ...ranges];
  if (!closed && before.length && ranges.length) {
    // The backward stretch ends where the start piece begins: one range.
    const last = before[before.length - 1]!;
    if (Math.abs(last[1] - ranges[0]![0]) <= tol) {
      all.splice(before.length - 1, 2, [last[0], ranges[0]![1]]);
    }
  }
  const out: Coordinate[] = [];
  for (const [a, b] of all) {
    for (const c of subPath(path, false, a, b) ?? []) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(c[0]! - last[0]!, c[1]! - last[1]!) > tol) out.push(c);
    }
  }
  return out.length >= 2 ? { path: out, closed: false } : 'too-close';
}

/** Distance of every vertex from the start of the path. */
function stations(path: Coordinate[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    out.push(
      out[i - 1]! + Math.hypot(path[i]![0]! - path[i - 1]![0]!, path[i]![1]! - path[i - 1]![1]!),
    );
  }
  return out;
}

/** Length of the path (a closed path includes its closing segment). */
export function pathLength(path: Coordinate[]): number {
  return stations(path).at(-1) ?? 0;
}

/** Position of the point of the path nearest to `point`, as a distance from its start. */
export function stationOf(path: Coordinate[], point: Coordinate): number {
  return nearestStation(path, point);
}

/** The point of the path at station `s` (clamped to its ends). */
function pointAt(path: Coordinate[], along: number[], s: number): Coordinate {
  if (s <= 0) return [path[0]![0]!, path[0]![1]!];
  for (let i = 1; i < path.length; i++) {
    if (s <= along[i]!) {
      const span = along[i]! - along[i - 1]!;
      const t = span > 0 ? (s - along[i - 1]!) / span : 0;
      const a = path[i - 1]!;
      const b = path[i]!;
      return [a[0]! + t * (b[0]! - a[0]!), a[1]! + t * (b[1]! - a[1]!)];
    }
  }
  const last = path[path.length - 1]!;
  return [last[0]!, last[1]!];
}

/**
 * The piece of the path from station `from` to station `to`, in that direction (reversed when
 * `to < from`). An open path clamps both to its ends. On a closed path the stations may lie
 * outside 0 … length (unwrapped): the piece then runs past the closing vertex, at most once
 * around. `null` when the piece has no length.
 */
export function subPath(
  path: Coordinate[],
  closed: boolean,
  from: number,
  to: number,
): Coordinate[] | null {
  if (path.length < 2) return null;
  if (to < from) return subPath(path, closed, to, from)?.reverse() ?? null;
  let line = path;
  let along = stations(path);
  const length = along.at(-1)!;
  if (!(length > 0)) return null;
  const epsilon = 1e-9 * length;
  if (closed) {
    const turns = Math.floor(from / length);
    from -= turns * length;
    to = Math.min(to - turns * length, from + length);
    // The ring twice in a row, so a piece past the closing vertex is an ordinary sub-line.
    line = [...path, ...path.slice(1)];
    along = [...along, ...along.slice(1).map((s) => s + length)];
  } else {
    from = Math.min(Math.max(from, 0), length);
    to = Math.min(Math.max(to, 0), length);
  }
  if (to - from <= epsilon) return null;
  const out: Coordinate[] = [pointAt(line, along, from)];
  for (let i = 0; i < line.length; i++) {
    if (along[i]! > from + epsilon && along[i]! < to - epsilon)
      out.push([line[i]![0]!, line[i]![1]!]);
  }
  out.push(pointAt(line, along, to));
  return out;
}
