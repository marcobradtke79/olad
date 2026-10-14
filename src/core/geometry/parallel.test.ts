import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import { parallelPath, pathLength, stationOf, subPath, type ParallelPath } from './parallel';

/** The parallel, failing the test when there is none. */
const ok = (result: ReturnType<typeof parallelPath>): ParallelPath => {
  if (typeof result === 'string') throw new Error(`no parallel: ${result}`);
  return result;
};

const square = () =>
  new Polygon([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ]);

describe('parallelPath', () => {
  it('offsets a line to the side of the start point by its distance', () => {
    const line = new LineString([
      [0, 0],
      [100, 0],
    ]);
    const left = ok(parallelPath(line, [30, 20]));
    expect(left).toEqual({
      path: [
        [0, 20],
        [100, 20],
      ],
      closed: false,
      distance: 20,
    });
    const right = ok(parallelPath(line, [30, -5]));
    expect(right.distance).toBe(-5);
    expect(right.path).toEqual([
      [0, -5],
      [100, -5],
    ]);
  });

  it('follows the bends of a polyline with mitre joins', () => {
    const l = new LineString([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
    // Inside the bend, 10 to the left of travel.
    expect(ok(parallelPath(l, [50, 10])).path).toEqual([
      [0, 10],
      [90, 10],
      [90, 100],
    ]);
  });

  it('traces the reference for a start on it', () => {
    const line = new LineString([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const traced = ok(parallelPath(line, [5, 0]));
    expect(traced.distance).toBe(0);
    expect(traced.path).toEqual(line.getCoordinates());
  });

  it('takes the ring of a polygon, inside or outside, as a closed path', () => {
    const inside = ok(parallelPath(square(), [5, 2]));
    expect(inside.closed).toBe(true);
    expect(inside.distance).toBe(2); // counter-clockwise ring: the interior is on the left
    expect(inside.path).toEqual([
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
      [2, 2],
    ]);
    const outside = ok(parallelPath(square(), [5, -3]));
    expect(outside.path[0]).toEqual([-3, -3]);
    expect(pathLength(outside.path)).toBe(64);
  });

  it('picks the nearest part of a multi-line, skips collapsing parts, refuses points and empty rings', () => {
    const multi = new MultiLineString([
      [
        [0, 0],
        [10, 0],
      ],
      [
        [0, 50],
        [10, 50],
      ],
    ]);
    expect(ok(parallelPath(multi, [5, 47])).path).toEqual([
      [0, 47],
      [10, 47],
    ]);
    expect(parallelPath(new Point([0, 0]), [1, 1])).toBe('unsupported');
    // A 2-long leg: 5 inside the bend its parallel would run backwards, so it is skipped.
    const hook = new LineString([
      [0, 0],
      [100, 0],
      [100, 2],
    ]);
    expect(ok(parallelPath(hook, [50, 5])).path).toEqual([
      [0, 5],
      [100, 5],
    ]);
    // The centre of a square: every side collapses, nothing is left.
    expect(parallelPath(square(), [5, 5])).toBe('collapsed');
    expect(ok(parallelPath(hook, [50, -5])).path).toEqual([
      [0, -5],
      [105, -5],
      [105, 2],
    ]); // outside the bend it works
  });
});

describe('parallelPath keeps its distance from every part of the object', () => {
  type Seg = [number[], number[]];
  const segmentsOf = (coords: number[][]): Seg[] =>
    coords.slice(1).map((c, i) => [coords[i]!, c] as Seg);
  /** Whether two segments cross (touching ends excluded). */
  const crosses = ([p, q]: Seg, [r, s]: Seg) => {
    const d = (a: number[], b: number[], c: number[]) =>
      (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
    const d1 = d(r, s, p);
    const d2 = d(r, s, q);
    const d3 = d(p, q, r);
    const d4 = d(p, q, s);
    return d1 * d2 < -1e-9 && d3 * d4 < -1e-9;
  };
  /** Closest distance of `p` to the segments whose foot falls inside them. */
  const beside = (p: number[], segments: Seg[]) =>
    Math.min(
      ...segments.map(([a, b]) => {
        const dx = b[0]! - a[0]!;
        const dy = b[1]! - a[1]!;
        const t = ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / (dx * dx + dy * dy);
        if (t <= 1e-6 || t >= 1 - 1e-6) return Infinity;
        return Math.abs(dx * (p[1]! - a[1]!) - dy * (p[0]! - a[0]!)) / Math.hypot(dx, dy);
      }),
    );
  const expectClear = (path: number[][], reference: number[][], distance: number) => {
    const refs = segmentsOf(reference);
    for (const seg of segmentsOf(path)) {
      for (const ref of refs) expect(crosses(seg, ref)).toBe(false);
      for (let k = 0; k <= 20; k++) {
        const f = k / 20;
        const p = [
          seg[0][0]! + f * (seg[1][0]! - seg[0][0]!),
          seg[0][1]! + f * (seg[1][1]! - seg[0][1]!),
        ];
        expect(beside(p, refs)).toBeGreaterThanOrEqual(Math.abs(distance) * (1 - 1e-6));
      }
    }
  };

  it('stops before the branch where the object crosses itself', () => {
    const x = [
      [0, 0],
      [100, 0],
      [100, 100],
      [50, 100],
      [50, -50],
    ];
    const parallel = ok(parallelPath(new LineString(x), [20, 5]));
    expect(parallel.path).toEqual([
      [0, 5],
      [45, 5],
    ]);
    expectClear(parallel.path, x, 5);
    // Started beyond the crossing branch, it runs on round the loop up to that branch.
    const loop = ok(parallelPath(new LineString(x), [80, 5]));
    expect(loop.path[0]).toEqual([55, 5]);
    expectClear(loop.path, x, 5);
  });

  it('never crosses a zig-zag with a hairpin, at small or large distances on either side', () => {
    const zigzag = [
      [0, 0],
      [150, 120],
      [290, -80],
      [480, 150],
      [180, 450],
      [570, 240],
      [660, 340],
      [660, 380],
      [1100, 470],
      [1320, 330],
    ];
    const line = new LineString(zigzag);
    let checked = 0;
    for (const [a, b] of segmentsOf(zigzag)) {
      const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
      const normal = [-(b[1]! - a[1]!) / length, (b[0]! - a[0]!) / length];
      const middle = [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2];
      for (const distance of [-120, -60, -20, 20, 60, 120]) {
        const start = [middle[0]! + normal[0]! * distance, middle[1]! + normal[1]! * distance];
        const result = parallelPath(line, start);
        if (typeof result === 'string') continue; // nearer to another part: not this segment's parallel
        expectClear(result.path, zigzag, result.distance);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('skips a pocket whose opening is narrower than twice the distance', () => {
    // A pocket below the line, 10 wide at its mouth, 70 wide inside; the parallel runs 20 above.
    const pocket = [
      [0, 0],
      [100, 0],
      [90, -60],
      [160, -60],
      [110, 0],
      [200, 0],
    ];
    const parallel = ok(parallelPath(new LineString(pocket), [50, 20]));
    expectClear(parallel.path, pocket, 20);
    // It goes on past the pocket instead of stopping or diving into it.
    expect(parallel.path[0]).toEqual([0, 20]);
    expect(parallel.path.at(-1)).toEqual([200, 20]);
    expect(Math.min(...parallel.path.map(([, y]) => y!))).toBeGreaterThan(-10);
    // Started beyond the pocket, it skips it backwards the same way.
    const back = ok(parallelPath(new LineString(pocket), [180, 20]));
    expectClear(back.path, pocket, 20);
    expect(back.path[0]).toEqual([0, 20]);
    expect(back.path.at(-1)).toEqual([200, 20]);
    expect(Math.min(...back.path.map(([, y]) => y!))).toBeGreaterThan(-10);
  });

  it('opens a ring whose waist is too narrow and stays in the lobe it started in', () => {
    // Two 40 x 40 lobes joined by a corridor 6 wide; the parallel runs 5 inside.
    const dumbbell = [
      [0, 0],
      [40, 0],
      [40, 17],
      [60, 17],
      [60, 0],
      [100, 0],
      [100, 40],
      [60, 40],
      [60, 23],
      [40, 23],
      [40, 40],
      [0, 40],
      [0, 0],
    ];
    const parallel = ok(parallelPath(new Polygon([dumbbell]), [20, 5]));
    expect(parallel.closed).toBe(false);
    expectClear(parallel.path, dumbbell, 5);
    for (const [x] of parallel.path) expect(x).toBeLessThanOrEqual(45);
    // A ring that keeps its distance stays closed.
    expect(ok(parallelPath(square(), [5, 2])).closed).toBe(true);
  });

  it('leaves parallels that keep their distance unchanged', () => {
    const l = new LineString([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
    expect(ok(parallelPath(l, [50, -10])).path).toEqual([
      [0, -10],
      [110, -10],
      [110, 100],
    ]);
  });
});

describe('subPath and stationOf', () => {
  const l = [
    [0, 10],
    [90, 10],
    [90, 100],
  ];

  it('cuts a piece between two stations, through the bends, either direction', () => {
    expect(stationOf(l, [40, 0])).toBe(40);
    expect(stationOf(l, [200, 50])).toBe(130);
    expect(subPath(l, false, 40, 130)).toEqual([
      [40, 10],
      [90, 10],
      [90, 50],
    ]);
    expect(subPath(l, false, 130, 40)).toEqual([
      [90, 50],
      [90, 10],
      [40, 10],
    ]);
  });

  it('clamps an open path at its ends and refuses an empty piece', () => {
    expect(subPath(l, false, 40, 1000)!.at(-1)).toEqual([90, 100]);
    expect(subPath(l, false, -50, 10)![0]).toEqual([0, 10]);
    expect(subPath(l, false, 40, 40)).toBeNull();
  });

  it('runs past the closing vertex of a ring with unwrapped stations', () => {
    const ring = ok(parallelPath(square(), [5, 2])).path; // 2,2 → 8,2 → 8,8 → 2,8 → 2,2; length 24
    // From the middle of the left side (station 21) on past the start to station 3 + 24.
    expect(subPath(ring, true, 21, 27)).toEqual([
      [2, 5],
      [2, 2],
      [5, 2],
    ]);
    // The same piece backwards, and a negative station going the other way.
    expect(subPath(ring, true, 3, -3)).toEqual([
      [5, 2],
      [2, 2],
      [2, 5],
    ]);
    // At most once around.
    expect(subPath(ring, true, 3, 100)!.length).toBe(6);
  });
});
