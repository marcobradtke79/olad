import { describe, expect, it } from 'vitest';
import { circleSegmentCount } from './circle';
import {
  ellipseFromAxis,
  ellipseFromCentre,
  ellipseFromCorners,
  ellipsePolygon,
  type EllipseDefinition,
} from './ellipse';

/** The implicit ellipse equation at `p`: 1 on the curve. */
function onEllipse(p: number[], e: EllipseDefinition): number {
  const dx = p[0]! - e.center[0]!;
  const dy = p[1]! - e.center[1]!;
  const u = dx * Math.cos(e.rotation) + dy * Math.sin(e.rotation);
  const v = -dx * Math.sin(e.rotation) + dy * Math.cos(e.rotation);
  return (u / e.a) ** 2 + (v / e.b) ** 2;
}

function signedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i]![0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * ring[i]![1]!;
  }
  return sum / 2;
}

describe('ellipseFromCentre', () => {
  it('takes the first axis from the axis end and the second from the distance to that axis', () => {
    const e = ellipseFromCentre([10, 10], [10, 20], [13, 50])!;
    expect(e.center).toEqual([10, 10]);
    expect(e.a).toBe(10);
    expect(e.rotation).toBeCloseTo(Math.PI / 2, 12);
    expect(e.b).toBeCloseTo(3, 12); // only the distance across the axis counts
  });

  it('is null for an axis end on the centre or a point on the axis', () => {
    expect(ellipseFromCentre([0, 0], [0, 0], [1, 1])).toBeNull();
    expect(ellipseFromCentre([0, 0], [5, 0], [-7, 0])).toBeNull();
  });
});

describe('ellipseFromAxis', () => {
  it('centres the ellipse between the axis ends', () => {
    const e = ellipseFromAxis([0, 0], [20, 0], [5, -4])!;
    expect(e.center).toEqual([10, 0]);
    expect(e.a).toBe(10);
    expect(e.b).toBe(4);
    expect(e.rotation).toBe(0);
    expect(ellipseFromAxis([3, 3], [3, 3], [5, 5])).toBeNull();
  });
});

describe('ellipseFromCorners', () => {
  it('inscribes the ellipse in the box along the straightedge angle', () => {
    const e = ellipseFromCorners([0, 0], [20, -10], 0)!;
    expect(e).toEqual({ center: [10, -5], a: 10, b: 5, rotation: 0 });
    const turned = ellipseFromCorners([0, 0], [0, 20], 45)!;
    expect(turned.a).toBeCloseTo(Math.SQRT2 * 5, 12);
    expect(turned.b).toBeCloseTo(Math.SQRT2 * 5, 12);
    expect(turned.center).toEqual([0, 10]);
  });

  it('is null for a box without width or height', () => {
    expect(ellipseFromCorners([0, 0], [10, 0], 0)).toBeNull();
    expect(ellipseFromCorners([0, 0], [0, 10], 90)).toBeNull();
  });
});

describe('ellipsePolygon', () => {
  const ellipse: EllipseDefinition = { center: [100, 50], a: 40, b: 10, rotation: Math.PI / 6 };

  it('puts every vertex on the ellipse, counter-clockwise from the first axis end', () => {
    const ring = ellipsePolygon(ellipse, 0.01).getCoordinates()[0]!;
    expect(ring.length).toBe(circleSegmentCount(40, 0.01) + 1);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring[0]![0]).toBeCloseTo(100 + 40 * Math.cos(Math.PI / 6), 6);
    expect(ring[0]![1]).toBeCloseTo(50 + 40 * Math.sin(Math.PI / 6), 6);
    for (const vertex of ring) expect(onEllipse(vertex, ellipse)).toBeCloseTo(1, 6);
    expect(signedArea(ring)).toBeGreaterThan(0);
    expect(signedArea(ring)).toBeCloseTo(Math.PI * 40 * 10, -1);
  });

  it('keeps the chord deviation within the tolerance', () => {
    const tolerance = 0.05;
    const ring = ellipsePolygon(ellipse, tolerance).getCoordinates()[0]!;
    // The midpoint of each parameter step lies at most `tolerance` from its chord.
    const count = ring.length - 1;
    for (let i = 0; i < count; i++) {
      const t = (2 * Math.PI * (i + 0.5)) / count;
      const u = ellipse.a * Math.cos(t);
      const v = ellipse.b * Math.sin(t);
      const c = Math.cos(ellipse.rotation);
      const s = Math.sin(ellipse.rotation);
      const m = [ellipse.center[0]! + u * c - v * s, ellipse.center[1]! + u * s + v * c];
      const [p, q] = [ring[i]!, ring[i + 1]!];
      const length = Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!);
      const distance =
        Math.abs((q[0]! - p[0]!) * (p[1]! - m[1]!) - (p[0]! - m[0]!) * (q[1]! - p[1]!)) / length;
      expect(distance).toBeLessThanOrEqual(tolerance + 1e-9);
    }
  });
});
