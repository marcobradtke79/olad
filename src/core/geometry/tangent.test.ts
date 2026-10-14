import { describe, expect, it } from 'vitest';
import { bezierLineString } from './bezier';
import { circlePolygon, circleSegmentCount } from './circle';
import { TANGENT_MAX_TURN, tangentPoints } from './tangent';

const center = [100, 100];
const radius = 50;
const tolerance = 0.5;
const ring = circlePolygon(center, radius, tolerance).getCoordinates()[0]!;

/** The exact tangent points of the circle seen from `reference`. */
function exactTangents(reference: number[]): number[][] {
  const dx = reference[0]! - center[0]!;
  const dy = reference[1]! - center[1]!;
  const distance = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const offset = Math.acos(radius / distance);
  return [base + offset, base - offset].map((a) => [
    center[0]! + radius * Math.cos(a),
    center[1]! + radius * Math.sin(a),
  ]);
}

describe('tangentPoints', () => {
  it('finds the two tangent vertices of a linearized circle', () => {
    const reference = [300, 150];
    const points = tangentPoints(ring, reference);
    expect(points).toHaveLength(2);
    const halfChord = radius * Math.sin(Math.PI / circleSegmentCount(radius, tolerance));
    for (const expected of exactTangents(reference)) {
      const hit = points.find(
        (p) => Math.hypot(p[0]! - expected[0]!, p[1]! - expected[1]!) <= halfChord,
      );
      expect(hit).toBeDefined();
      // The hit is a ring vertex and the line from the reference is (nearly) perpendicular to the radius.
      expect(ring).toContainEqual(hit);
      const rx = hit![0]! - center[0]!;
      const ry = hit![1]! - center[1]!;
      const lx = hit![0]! - reference[0]!;
      const ly = hit![1]! - reference[1]!;
      const cos = Math.abs(rx * lx + ry * ly) / (Math.hypot(rx, ry) * Math.hypot(lx, ly));
      expect(cos).toBeLessThan(Math.sin(Math.PI / circleSegmentCount(radius, tolerance)));
    }
  });

  it('yields nothing from inside the circle or at a vertex', () => {
    expect(tangentPoints(ring, [110, 90])).toEqual([]);
    expect(tangentPoints(ring, center)).toEqual([]);
    expect(tangentPoints(ring, [150, 100])).toEqual([]); // on the ring itself
  });

  it('ignores corners and straight runs', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    expect(tangentPoints(square, [30, 5])).toEqual([]);
    expect(tangentPoints(square, [30, 5], 90)).toEqual([
      [10, 0],
      [10, 10],
    ]);
    const straight = [
      [0, 0],
      [5, 0],
      [10, 0],
    ];
    expect(tangentPoints(straight, [5, 10])).toEqual([]);
    expect(tangentPoints(straight, [20, 0])).toEqual([]); // reference on the line
    expect(tangentPoints([[0, 0]], [1, 1])).toEqual([]);
    expect(
      tangentPoints(
        [
          [0, 0],
          [0, 0],
          [5, 1],
        ],
        [3, 3],
      ),
    ).toEqual([]); // zero-length segment
  });

  it('finds tangent points on an open curve but never at its ends', () => {
    const arc = bezierLineString(
      { start: [0, 0], startHandle: [0, 60], endHandle: [100, 60], end: [100, 0] },
      0.1,
    ).getCoordinates();
    const points = tangentPoints(arc, [50, 200]);
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) expect(arc.slice(1, -1)).toContainEqual(p);
    expect(tangentPoints(arc, [0, 100])).not.toContainEqual([0, 0]);
    expect(tangentPoints(arc, [50, 10])).toEqual([]); // under the arc, inside its bend
  });

  it('exposes the turn threshold', () => {
    expect(TANGENT_MAX_TURN).toBe(20);
  });
});
