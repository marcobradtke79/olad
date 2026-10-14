import { describe, expect, it } from 'vitest';
import { rectangleFromCorners } from './rectangle';

const ring = (a: number[], b: number[], angle = 0) =>
  rectangleFromCorners(a, b, angle)!.getCoordinates()[0]!;

describe('rectangleFromCorners', () => {
  it('builds a counter-clockwise axis-aligned ring starting at the first corner, whatever the drag direction', () => {
    const expected = [
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
      [0, 0],
    ];
    expect(ring([0, 0], [4, 3])).toEqual(expected);
    // Dragging the other way round the same first corner mirrors the ring but keeps it CCW.
    expect(ring([0, 0], [-4, 3])).toEqual([
      [0, 0],
      [0, 3],
      [-4, 3],
      [-4, 0],
      [0, 0],
    ]);
    expect(ring([0, 0], [4, -3])).toEqual([
      [0, 0],
      [0, -3],
      [4, -3],
      [4, 0],
      [0, 0],
    ]);
    expect(ring([0, 0], [-4, -3])).toEqual([
      [0, 0],
      [-4, 0],
      [-4, -3],
      [0, -3],
      [0, 0],
    ]);
  });

  it('aligns the sides with the given angle', () => {
    const r = ring([0, 0], [0, 10], 45); // the diagonal lies at 90°: a square rotated by 45°
    expect(r).toHaveLength(5);
    const side = (i: number) => [r[i + 1]![0]! - r[i]![0]!, r[i + 1]![1]! - r[i]![1]!];
    const angle = (s: number[]) => ((Math.atan2(s[1]!, s[0]!) * 180) / Math.PI + 360) % 90;
    expect(angle(side(0))).toBeCloseTo(45, 9);
    expect(angle(side(1))).toBeCloseTo(45, 9);
    expect(Math.hypot(...side(0))).toBeCloseTo(Math.hypot(...side(1)), 9);
    expect(rectangleFromCorners([0, 0], [0, 10], 45)!.getArea()).toBeCloseTo(50, 9);
  });

  it('returns null for a degenerate rectangle', () => {
    expect(rectangleFromCorners([0, 0], [5, 0], 0)).toBeNull();
    expect(rectangleFromCorners([0, 0], [0, 5], 0)).toBeNull();
    expect(rectangleFromCorners([1, 1], [1, 1], 30)).toBeNull();
  });
});
