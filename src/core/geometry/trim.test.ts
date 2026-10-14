import { describe, expect, it } from 'vitest';
import { segmentsOf, type Segment } from './segments';
import Polygon from 'ol/geom/Polygon';
import { extendLine, nearestStation, trimLine } from './trim';

const line = [
  [0, 0],
  [10, 0],
  [20, 0],
];
const at = (x: number): Segment => [
  [x, -5],
  [x, 5],
];

describe('nearestStation', () => {
  it('measures the nearest position along the line', () => {
    expect(nearestStation(line, [12, 3])).toBe(12);
    expect(nearestStation(line, [-4, 1])).toBe(0);
    expect(nearestStation(line, [25, 0])).toBe(20);
  });
});

describe('trimLine', () => {
  it('removes the end piece on the clicked side of a crossing', () => {
    expect(trimLine(line, [at(15)], [18, 1])).toEqual({
      kept: [
        [
          [0, 0],
          [10, 0],
          [15, 0],
        ],
      ],
      removed: [
        [15, 0],
        [20, 0],
      ],
    });
    expect(trimLine(line, [at(15)], [3, 1])!.kept).toEqual([
      [
        [15, 0],
        [20, 0],
      ],
    ]);
  });

  it('removes an interior piece between two crossings, keeping two parts', () => {
    const result = trimLine(line, [at(5), at(15)], [12, -1])!;
    expect(result.kept).toEqual([
      [
        [0, 0],
        [5, 0],
      ],
      [
        [15, 0],
        [20, 0],
      ],
    ]);
    expect(result.removed).toEqual([
      [5, 0],
      [10, 0],
      [15, 0],
    ]);
  });

  it('reuses a vertex the cutting edge passes through', () => {
    expect(trimLine(line, [at(10)], [15, 0])!.kept).toEqual([
      [
        [0, 0],
        [10, 0],
      ],
    ]);
  });

  it('is null without a crossing or when nothing would remain', () => {
    expect(trimLine(line, [at(30)], [5, 0])).toBeNull();
    expect(trimLine(line, [], [5, 0])).toBeNull();
    expect(trimLine(line, [at(0)], [5, 0])).toBeNull(); // crossing only at the start
    expect(trimLine([[0, 0]], [at(0)], [0, 0])).toBeNull();
    expect(
      trimLine(
        [
          [1, 1],
          [1, 1],
        ],
        [at(1)],
        [1, 1],
      ),
    ).toBeNull();
  });

  it('takes polygon edges as cutting edges', () => {
    const square = new Polygon([
      [
        [4, -2],
        [8, -2],
        [8, 2],
        [4, 2],
        [4, -2],
      ],
    ]);
    expect(trimLine(line, segmentsOf(square), [6, 0])!.kept).toEqual([
      [
        [0, 0],
        [4, 0],
      ],
      [
        [8, 0],
        [10, 0],
        [20, 0],
      ],
    ]);
  });
});

describe('extendLine', () => {
  it('moves the end nearer to the click onto the boundary', () => {
    expect(extendLine(line, [at(30)], [18, 0])).toEqual({
      line: [
        [0, 0],
        [10, 0],
        [30, 0],
      ],
      added: [
        [20, 0],
        [30, 0],
      ],
    });
    expect(extendLine(line, [at(-7)], [2, 0])!.line[0]).toEqual([-7, 0]);
  });

  it('follows the direction of the end segment and takes the first boundary ahead', () => {
    const bent = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const wall: Segment = [
      [-5, 20],
      [25, 20],
    ];
    const nearer: Segment = [
      [-5, 15],
      [25, 15],
    ];
    expect(extendLine(bent, [wall, nearer], [10, 9])!.line[2]).toEqual([10, 15]);
  });

  it('is null when the ray misses, the end touches already or the end segment is degenerate', () => {
    expect(extendLine(line, [at(-7)], [18, 0])).toBeNull(); // boundary behind the clicked end
    expect(extendLine(line, [at(20), at(30)], [18, 0])).toBeNull(); // end lies on a boundary
    expect(
      extendLine(
        [
          [0, 0],
          [0, 0],
        ],
        [at(5)],
        [0, 0],
      ),
    ).toBeNull();
    expect(
      extendLine(
        [
          [0, 0],
          [10, 0],
          [10, 0],
        ],
        [at(15)],
        [9, 0],
      )!.line[2],
    ).toEqual([15, 0]); // coincident end vertices are skipped for the direction
  });
});
