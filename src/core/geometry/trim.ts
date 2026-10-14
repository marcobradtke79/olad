import { squaredDistanceToSegment, type Coordinate } from 'ol/coordinate';
import { rayIntersection, segmentIntersection } from './intersect';
import { projectOnSegment, type Segment } from './segments';

/** A position along a polyline: distance from its start and the point there. */
interface Station {
  s: number;
  point: Coordinate;
}

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

/** Distance of every vertex from the start of the polyline. */
function stations(line: Coordinate[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) {
    out.push(
      out[i - 1]! + Math.hypot(line[i]![0]! - line[i - 1]![0]!, line[i]![1]! - line[i - 1]![1]!),
    );
  }
  return out;
}

/** Position of the point of the polyline nearest to `point`, as a distance from its start. */
export function nearestStation(line: Coordinate[], point: Coordinate): number {
  const along = stations(line);
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const t = Math.min(1, Math.max(0, projectOnSegment(point, a, b).t));
    const foot = [a[0]! + t * (b[0]! - a[0]!), a[1]! + t * (b[1]! - a[1]!)];
    const distance = Math.hypot(point[0]! - foot[0]!, point[1]! - foot[1]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = along[i - 1]! + t * (along[i]! - along[i - 1]!);
    }
  }
  return best;
}

/** The piece of the polyline between two stations (`null` start / end: the line's ends). */
function subLine(
  line: Coordinate[],
  along: number[],
  from: Station | null,
  to: Station | null,
  eps: number,
): Coordinate[] {
  const start = from ?? { s: 0, point: line[0]! };
  const end = to ?? { s: along[along.length - 1]!, point: line[line.length - 1]! };
  const out: Coordinate[] = [[start.point[0]!, start.point[1]!]];
  for (let i = 0; i < line.length; i++) {
    if (along[i]! > start.s + eps && along[i]! < end.s - eps)
      out.push([line[i]![0]!, line[i]![1]!]);
  }
  out.push([end.point[0]!, end.point[1]!]);
  return out;
}

/**
 * Trim a polyline at the cutting edges: the piece around `click` between the nearest crossings
 * before and after it is removed (to the line's end where there is no crossing on that side).
 * Crossings of the line with itself do not count. `null` when no crossing bounds the clicked
 * piece or nothing of the line would remain.
 */
export function trimLine(
  line: Coordinate[],
  cutters: Segment[],
  click: Coordinate,
): TrimResult | null {
  if (line.length < 2) return null;
  const along = stations(line);
  const total = along[along.length - 1]!;
  if (!(total > 0)) return null;
  const eps = 1e-9 * total;
  const crossings: Station[] = [];
  for (let i = 1; i < line.length; i++) {
    for (const [c, d] of cutters) {
      const hit = segmentIntersection(line[i - 1]!, line[i]!, c, d);
      if (hit)
        crossings.push({
          s: along[i - 1]! + hit.t * (along[i]! - along[i - 1]!),
          point: hit.point,
        });
    }
  }
  const s = nearestStation(line, click);
  let before: Station | null = null;
  let after: Station | null = null;
  for (const crossing of crossings) {
    if (crossing.s < s - eps && (!before || crossing.s > before.s)) before = crossing;
    if (crossing.s > s + eps && (!after || crossing.s < after.s)) after = crossing;
  }
  if (!before && !after) return null;
  const kept: Coordinate[][] = [];
  if (before && before.s > eps) kept.push(subLine(line, along, null, before, eps));
  if (after && after.s < total - eps) kept.push(subLine(line, along, after, null, eps));
  if (kept.length === 0) return null;
  return { kept, removed: subLine(line, along, before, after, eps) };
}

/**
 * Extend a polyline at the end nearer to `click` (measured along the line) along the direction
 * of its end segment to the first cutting edge ahead; the end vertex moves there. `null` when
 * the end already lies on a cutting edge, its segment has no length or the ray misses.
 */
export function extendLine(
  line: Coordinate[],
  cutters: Segment[],
  click: Coordinate,
): ExtendResult | null {
  if (line.length < 2) return null;
  const along = stations(line);
  const total = along[along.length - 1]!;
  if (!(total > 0)) return null;
  const atStart = nearestStation(line, click) <= total / 2;
  const endIndex = atStart ? 0 : line.length - 1;
  const end = line[endIndex]!;
  // The direction of the end segment, skipping coincident vertices.
  const step = atStart ? 1 : -1;
  let neighbour: Coordinate | undefined;
  for (let i = endIndex + step; i >= 0 && i < line.length; i += step) {
    if (line[i]![0] !== end[0] || line[i]![1] !== end[1]) {
      neighbour = line[i];
      break;
    }
  }
  if (!neighbour) return null;
  const eps2 = (1e-9 * total) ** 2;
  if (cutters.some((segment) => squaredDistanceToSegment(end, segment) <= eps2)) return null;
  const direction = [end[0]! - neighbour[0]!, end[1]! - neighbour[1]!];
  let best: Coordinate | null = null;
  let bestT = Infinity;
  for (const [c, d] of cutters) {
    const hit = rayIntersection(end, direction, c, d);
    if (hit && hit.t < bestT) {
      bestT = hit.t;
      best = hit.point;
    }
  }
  if (!best) return null;
  const extended = line.map((c) => [c[0]!, c[1]!]);
  extended[endIndex] = best;
  return { line: extended, added: [[end[0]!, end[1]!], best] };
}
