import { describe, expect, it } from 'vitest';
import { gridPointsInExtent, nearestGridPoint } from './grid';

describe('nearestGridPoint', () => {
  it('rounds to the nearest intersection', () => {
    expect(nearestGridPoint([12, 17], 10)).toEqual([10, 20]);
    expect(nearestGridPoint([15, 25], 10)).toEqual([20, 30]); // halves round up
    expect(nearestGridPoint([-12, -17], 10)).toEqual([-10, -20]);
    expect(nearestGridPoint([0.26, 0.74], 0.5)).toEqual([0.5, 0.5]);
  });

  it('honours the origin', () => {
    expect(nearestGridPoint([12, 17], 10, [3, 4])).toEqual([13, 14]);
    expect(nearestGridPoint([3, 4], 10, [3, 4])).toEqual([3, 4]);
  });
});

describe('gridPointsInExtent', () => {
  it('lists the intersections inside the extent, row by row', () => {
    expect(gridPointsInExtent([0, 0, 20, 10], 10)).toEqual([
      [0, 0],
      [10, 0],
      [20, 0],
      [0, 10],
      [10, 10],
      [20, 10],
    ]);
    expect(gridPointsInExtent([1, 1, 9, 9], 10)).toEqual([]);
    expect(gridPointsInExtent([-15, -5, 5, 5], 10)).toEqual([
      [-10, 0],
      [0, 0],
    ]);
  });

  it('honours the origin and the density cap', () => {
    expect(gridPointsInExtent([0, 0, 10, 10], 10, [5, 5])).toEqual([[5, 5]]);
    expect(gridPointsInExtent([0, 0, 100, 100], 1, [0, 0], 1000)).toBeNull();
    expect(gridPointsInExtent([0, 0, 100, 100], 1, [0, 0], 10201)).toHaveLength(10201);
  });
});
