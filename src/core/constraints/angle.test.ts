import { describe, expect, it } from 'vitest';
import { constrainToAngleStep, nearestAllowedAngle } from './angle';

const close = (actual: number[], expected: number[]) => {
  expect(actual[0]).toBeCloseTo(expected[0]!, 9);
  expect(actual[1]).toBeCloseTo(expected[1]!, 9);
};

describe('nearestAllowedAngle', () => {
  it('rounds to the nearest multiple of the step from the base', () => {
    expect(nearestAllowedAngle(10, 0, 90)).toBe(0);
    expect(nearestAllowedAngle(50, 0, 90)).toBe(90);
    expect(nearestAllowedAngle(-100, 0, 90)).toBe(270);
    expect(nearestAllowedAngle(100, 0, 45)).toBe(90);
    expect(nearestAllowedAngle(20, 0, 30)).toBe(30);
    expect(nearestAllowedAngle(50, 30, 90)).toBe(30);
    expect(nearestAllowedAngle(100, 30, 90)).toBe(120);
    expect(nearestAllowedAngle(-80, 30, 90)).toBe(300);
    expect(nearestAllowedAngle(45, 0, 90)).toBe(90); // exactly between: rounds up
  });
});

describe('constrainToAngleStep', () => {
  it('projects onto the four orthogonal directions with step 90', () => {
    const ref = [100, 100];
    close(constrainToAngleStep([180, 130], ref, 0, 90).coordinate, [180, 100]); // east
    close(constrainToAngleStep([120, 170], ref, 0, 90).coordinate, [100, 170]); // north
    close(constrainToAngleStep([20, 90], ref, 0, 90).coordinate, [20, 100]); // west
    close(constrainToAngleStep([110, 10], ref, 0, 90).coordinate, [100, 10]); // south
    expect(constrainToAngleStep([20, 90], ref, 0, 90).angle).toBe(180);
  });

  it('keeps the pointer component along the chosen direction', () => {
    const r = constrainToAngleStep([10, 10], [0, 0], 0, 45);
    expect(r.angle).toBe(45);
    close(r.coordinate, [10, 10]);
    const s = constrainToAngleStep([10, 8], [0, 0], 0, 45);
    expect(s.angle).toBe(45);
    close(s.coordinate, [9, 9]); // along = (10 + 8) / sqrt2, back onto the diagonal
  });

  it('follows the straightedge base angle and custom steps', () => {
    const r = constrainToAngleStep([100, 0], [0, 0], 30, 90);
    expect(r.angle).toBe(30);
    close(r.coordinate, [
      100 * Math.cos(Math.PI / 6) ** 2,
      100 * Math.cos(Math.PI / 6) * Math.sin(Math.PI / 6),
    ]);
    expect(constrainToAngleStep([0, 100], [0, 0], 30, 90).angle).toBe(120);
    expect(constrainToAngleStep([-100, 10], [0, 0], 30, 90).angle).toBe(210);
    expect(constrainToAngleStep([10, -100], [0, 0], 30, 90).angle).toBe(300);
    expect(constrainToAngleStep([100, 40], [0, 0], 0, 30).angle).toBe(30);
    expect(constrainToAngleStep([100, 70], [0, 0], 0, 30).angle).toBe(30);
    expect(constrainToAngleStep([60, 100], [0, 0], 0, 30).angle).toBe(60);
  });

  it('returns the reference for a zero distance', () => {
    expect(constrainToAngleStep([5, 5], [5, 5], 30, 90)).toEqual({ coordinate: [5, 5], angle: 30 });
  });
});
