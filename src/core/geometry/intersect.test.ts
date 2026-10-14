import { describe, expect, it } from 'vitest';
import { rayIntersection, segmentIntersection, segmentsIntersect } from './intersect';

describe('segmentsIntersect', () => {
  it('detects crossing segments', () => {
    expect(segmentsIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true);
  });

  it('rejects separate and parallel segments', () => {
    expect(segmentsIntersect([0, 0], [1, 0], [0, 1], [1, 1])).toBe(false);
    expect(segmentsIntersect([0, 0], [1, 1], [2, 2], [3, 3])).toBe(false); // collinear, apart
    expect(segmentsIntersect([0, 0], [1, 0], [2, 1], [3, 2])).toBe(false);
  });

  it('counts touching and overlapping as intersecting', () => {
    expect(segmentsIntersect([0, 0], [2, 0], [1, 0], [1, 1])).toBe(true); // T junction
    expect(segmentsIntersect([0, 0], [2, 0], [2, 0], [3, 1])).toBe(true); // shared endpoint
    expect(segmentsIntersect([0, 0], [2, 0], [1, 0], [3, 0])).toBe(true); // collinear overlap
  });
});

describe('segmentIntersection', () => {
  it('returns the crossing point and both parameters', () => {
    expect(segmentIntersection([0, 0], [4, 0], [1, -1], [1, 3])).toEqual({
      point: [1, 0],
      t: 0.25,
      u: 0.25,
    });
    expect(segmentIntersection([0, 0], [4, 0], [4, -1], [4, 1])).toMatchObject({ t: 1, u: 0.5 });
  });

  it('is null for missing, parallel and collinear segments', () => {
    expect(segmentIntersection([0, 0], [4, 0], [5, -1], [5, 1])).toBeNull();
    expect(segmentIntersection([0, 0], [4, 0], [0, 1], [4, 1])).toBeNull();
    expect(segmentIntersection([0, 0], [4, 0], [2, 0], [6, 0])).toBeNull();
  });
});

describe('rayIntersection', () => {
  it('hits segments ahead only', () => {
    expect(rayIntersection([0, 0], [1, 0], [5, -1], [5, 1])).toEqual({
      point: [5, 0],
      t: 5,
      u: 0.5,
    });
    expect(rayIntersection([0, 0], [-1, 0], [5, -1], [5, 1])).toBeNull(); // behind
    expect(rayIntersection([0, 0], [1, 0], [5, 1], [5, 2])).toBeNull(); // beside
    expect(rayIntersection([0, 0], [1, 0], [0, 1], [5, 1])).toBeNull(); // parallel
  });
});
