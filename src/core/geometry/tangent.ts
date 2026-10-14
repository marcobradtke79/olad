import type { Coordinate } from 'ol/coordinate';

/**
 * Largest turn angle at a vertex, in degrees, for which it still counts as part of a curve.
 * A linearized circle turns at most 360 / 24 = 15° per vertex; polygon corners turn far more.
 */
export const TANGENT_MAX_TURN = 20;

/**
 * The vertices of a linearized curve where a line from `reference` touches it: the turn at the
 * vertex is at most `maxTurn` degrees and both neighbours lie on the same side of the line from
 * the reference through the vertex, so the line meets the polyline without crossing it. A ring
 * (first vertex equal to the last) is treated cyclically; on an open line the end vertices are
 * never tangent points. A reference inside a convex ring yields nothing.
 */
export function tangentPoints(
  ring: Coordinate[],
  reference: Coordinate,
  maxTurn = TANGENT_MAX_TURN,
): Coordinate[] {
  const n = ring.length;
  if (n < 3) return [];
  const closed = n > 3 && ring[0]![0] === ring[n - 1]![0] && ring[0]![1] === ring[n - 1]![1];
  // On a closed ring the duplicate closing vertex is skipped; its neighbour wraps around.
  const count = closed ? n - 1 : n;
  const first = closed ? 0 : 1;
  const last = closed ? count - 1 : count - 2;
  const maxTurnRad = (maxTurn * Math.PI) / 180;
  const out: Coordinate[] = [];
  for (let i = first; i <= last; i++) {
    const v = ring[i]!;
    const p = ring[(i - 1 + count) % count]!;
    const q = ring[(i + 1) % count]!;
    const vx = v[0]! - reference[0]!;
    const vy = v[1]! - reference[1]!;
    if (vx === 0 && vy === 0) continue;
    const ax = v[0]! - p[0]!;
    const ay = v[1]! - p[1]!;
    const bx = q[0]! - v[0]!;
    const by = q[1]! - v[1]!;
    if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) continue;
    const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    if (turn > maxTurnRad) continue;
    // Side of p and q relative to the line reference → v.
    const sideP = vx * (p[1]! - reference[1]!) - vy * (p[0]! - reference[0]!);
    const sideQ = vx * (q[1]! - reference[1]!) - vy * (q[0]! - reference[0]!);
    if (sideP === 0 || sideQ === 0 || sideP > 0 !== sideQ > 0) continue;
    out.push([v[0]!, v[1]!]);
  }
  return out;
}
