import { describe, expect, it } from 'vitest';
import {
  isValidSideCount,
  MAX_REGULAR_POLYGON_SIDES,
  MIN_REGULAR_POLYGON_SIDES,
  regularPolygon,
} from './regularPolygon';

describe('isValidSideCount', () => {
  it('accepts whole numbers from 3 to 1024', () => {
    expect(MIN_REGULAR_POLYGON_SIDES).toBe(3);
    expect(MAX_REGULAR_POLYGON_SIDES).toBe(1024);
    expect(isValidSideCount(3)).toBe(true);
    expect(isValidSideCount(1024)).toBe(true);
    expect(isValidSideCount(2)).toBe(false);
    expect(isValidSideCount(1025)).toBe(false);
    expect(isValidSideCount(3.5)).toBe(false);
    expect(isValidSideCount(NaN)).toBe(false);
    expect(isValidSideCount(Infinity)).toBe(false);
  });
});

describe('regularPolygon', () => {
  it('builds a square from the centre and one vertex, counter-clockwise and closed', () => {
    const ring = regularPolygon([0, 0], [1, 0], 4)!.getCoordinates()[0]!;
    expect(ring).toEqual([
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 0],
    ]);
    expect(ring.flat().some((v) => Object.is(v, -0))).toBe(false);
  });

  it('starts at the given vertex and keeps every vertex at the circumradius with equal sides', () => {
    const center = [10, -5];
    const vertex = [13, -1]; // radius 5, rotated
    const ring = regularPolygon(center, vertex, 6)!.getCoordinates()[0]!;
    expect(ring).toHaveLength(7);
    expect(ring[0]![0]).toBeCloseTo(13, 9);
    expect(ring[0]![1]).toBeCloseTo(-1, 9);
    expect(ring[6]).toEqual(ring[0]);
    const edges: number[] = [];
    for (let i = 0; i < 6; i++) {
      const [x, y] = ring[i]!;
      expect(Math.hypot(x! - center[0]!, y! - center[1]!)).toBeCloseTo(5, 9);
      const [nx, ny] = ring[i + 1]!;
      edges.push(Math.hypot(nx! - x!, ny! - y!));
    }
    for (const edge of edges) expect(edge).toBeCloseTo(5, 9); // a hexagon's side equals its radius
  });

  it('is counter-clockwise and approaches the circle area as the sides grow', () => {
    const triangle = regularPolygon([0, 0], [2, 0], 3)!;
    expect(triangle.getArea()).toBeCloseTo(3 * Math.sqrt(3), 7); // side 2√3 → area 3√3
    const ring = triangle.getCoordinates()[0]!;
    let signed = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      signed += ring[i]![0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * ring[i]![1]!;
    }
    expect(signed).toBeGreaterThan(0);
    const many = regularPolygon([0, 0], [2, 0], 1024)!;
    expect(many.getArea()).toBeCloseTo(Math.PI * 4, 3);
    expect(many.getCoordinates()[0]).toHaveLength(1025);
  });

  it('returns null for a zero radius or an invalid side count', () => {
    expect(regularPolygon([1, 1], [1, 1], 5)).toBeNull();
    expect(regularPolygon([0, 0], [1, 0], 2)).toBeNull();
    expect(regularPolygon([0, 0], [1, 0], 4.5)).toBeNull();
    expect(regularPolygon([0, 0], [1, 0], 1025)).toBeNull();
  });
});
