import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import { OFFSET_MITRE_LIMIT, offsetGeometry, offsetPath, offsetRing, offsetSide } from './offset';

const close = (actual: number[][] | null, expected: number[][]) => {
  expect(actual).not.toBeNull();
  expect(actual).toHaveLength(expected.length);
  actual!.forEach((c, i) => {
    expect(c[0]).toBeCloseTo(expected[i]![0]!, 8);
    expect(c[1]).toBeCloseTo(expected[i]![1]!, 8);
  });
};

describe('offsetRing', () => {
  it('shifts a line to its left for a positive distance and to its right for a negative one', () => {
    close(
      offsetRing(
        [
          [0, 0],
          [10, 0],
        ],
        2,
        false,
      ),
      [
        [0, 2],
        [10, 2],
      ],
    );
    close(
      offsetRing(
        [
          [0, 0],
          [10, 0],
        ],
        -2,
        false,
      ),
      [
        [0, -2],
        [10, -2],
      ],
    );
  });

  it('joins a right-angle corner with a mitre on both sides', () => {
    const corner = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    close(offsetRing(corner, 1, false), [
      [0, 1],
      [9, 1],
      [9, 10],
    ]);
    close(offsetRing(corner, -1, false), [
      [0, -1],
      [11, -1],
      [11, 10],
    ]);
  });

  it('bevels a sharp turn instead of spiking, and joins collinear segments at the vertex', () => {
    const angle = (20 * Math.PI) / 180;
    const sharp = [
      [0, 0],
      [10, 0],
      [10 - 10 * Math.cos(angle), 10 * Math.sin(angle)],
    ];
    const outer = offsetRing(sharp, -1, false)!; // right of the travel: the outside of the turn
    expect(outer).toHaveLength(4); // start, two bevel points, end
    for (const [x, y] of outer) {
      expect(Math.hypot(x! - 10, y! - 0)).toBeLessThanOrEqual(OFFSET_MITRE_LIMIT + 10);
    }
    expect(Math.hypot(outer[1]![0]! - 10, outer[1]![1]!)).toBeCloseTo(1, 8);
    expect(Math.hypot(outer[2]![0]! - 10, outer[2]![1]!)).toBeCloseTo(1, 8);
    close(
      offsetRing(
        [
          [0, 0],
          [5, 0],
          [5, 0],
          [10, 0],
        ],
        1,
        false,
      ),
      [
        [0, 1],
        [5, 1],
        [10, 1],
      ],
    );
  });

  it('returns null for too few vertices or a zero distance', () => {
    expect(offsetRing([[1, 1]], 1, false)).toBeNull();
    expect(
      offsetRing(
        [
          [1, 1],
          [1, 1],
        ],
        1,
        false,
      ),
    ).toBeNull();
    expect(
      offsetRing(
        [
          [0, 0],
          [1, 0],
          [0, 0],
        ],
        1,
        true,
      ),
    ).toBeNull();
    expect(
      offsetRing(
        [
          [0, 0],
          [1, 0],
        ],
        0,
        false,
      ),
    ).toBeNull();
  });
});

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

describe('offsetPath', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('equals offsetRing where nothing collapses', () => {
    const l = [
      [0, 0],
      [100, 0],
      [100, 100],
    ];
    expect(offsetPath(l, 10, false)).toEqual(offsetRing(l, 10, false));
    expect(offsetPath(l, -10, false)).toEqual(offsetRing(l, -10, false));
    expect(offsetPath(square, 2, true)).toEqual(offsetRing(square, 2, true));
    expect(offsetPath(square, -3, true)).toEqual(offsetRing(square, -3, true));
  });

  it('drops a collapsed end leg of an open line', () => {
    const hook = [
      [0, 0],
      [100, 0],
      [100, 2],
    ];
    expect(offsetRing(hook, 5, false)).toBeNull();
    expect(offsetPath(hook, 5, false)).toEqual([
      [0, 5],
      [100, 5],
    ]);
  });

  it('runs straight across a notch narrower than twice the distance', () => {
    // A ring with a 1-wide, 4-deep notch dented out of its bottom side, offset 2 inwards:
    // the notch walls move towards each other and cross.
    const notched = [
      [0, 0],
      [10, 0],
      [10, -4],
      [11, -4],
      [11, 0],
      [20, 0],
      [20, 20],
      [0, 20],
      [0, 0],
    ];
    expect(offsetRing(notched, 2, true)).toBeNull();
    const inner = offsetPath(notched, 2, true)!;
    expect(inner[0]).toEqual(inner[inner.length - 1]);
    // The notch is gone: every vertex keeps 2 from the outer sides, the bottom runs straight.
    expect(new Set(inner.map(([, y]) => y))).toEqual(new Set([2, 18]));
    for (const [x, y] of inner) {
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThanOrEqual(18);
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(18);
    }
  });

  it('also skips a notch whose walls are not exactly parallel', () => {
    const tilted = [
      [0, 0],
      [10, 0],
      [10.2, -4],
      [10.7, -4],
      [11, 0],
      [20, 0],
      [20, 20],
      [0, 20],
      [0, 0],
    ];
    expect(offsetRing(tilted, 2, true)).toBeNull();
    const inner = offsetPath(tilted, 2, true)!;
    expect(new Set(inner.map(([, y]) => y))).toEqual(new Set([2, 18]));
  });

  it('keeps the plain offset away from a collapsed jog', () => {
    const road = [
      [0, 0],
      [100, 0],
      [100, -0.5],
      [100.5, -0.5],
      [100.5, 0],
      [300, 0],
    ];
    expect(offsetRing(road, 10, false)).toBeNull();
    const parallel = offsetPath(road, 10, false)!;
    expect(parallel[0]).toEqual([0, 10]);
    expect(parallel[parallel.length - 1]).toEqual([300, 10]);
    for (const [, y] of parallel) expect(y).toBe(10);
  });

  it('refuses a ring that would turn inside out and degenerate input', () => {
    expect(offsetPath(square, 5, true)).toBeNull(); // every side collapses
    expect(offsetPath(square, 7, true)).toBeNull();
    expect(offsetPath([[1, 1]], 1, false)).toBeNull();
    expect(offsetPath(square, 0, true)).toBeNull();
  });
});

describe('offsetGeometry', () => {
  it('grows and shrinks a polygon, keeping the ring closed and its orientation', () => {
    const grown = offsetGeometry(new Polygon([square]), 1) as Polygon;
    expect(grown.getArea()).toBeCloseTo(144, 8);
    const ring = grown.getCoordinates()[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    close(ring, [
      [-1, -1],
      [11, -1],
      [11, 11],
      [-1, 11],
      [-1, -1],
    ]);
    const shrunk = offsetGeometry(new Polygon([square]), -1) as Polygon;
    expect(shrunk.getArea()).toBeCloseTo(64, 8);
    // A clockwise ring is treated by its own orientation: growing still grows.
    const clockwise = offsetGeometry(new Polygon([[...square].reverse()]), 1) as Polygon;
    expect(clockwise.getArea()).toBeCloseTo(144, 8);
    expect(offsetGeometry(new Polygon([square]), -6)).toBeNull(); // shrunk past its size
  });

  it('shrinks holes when the polygon grows and drops holes that collapse', () => {
    const outer = [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
      [0, 0],
    ];
    const hole = [
      [5, 5],
      [5, 8],
      [8, 8],
      [8, 5],
      [5, 5],
    ];
    const grown = offsetGeometry(new Polygon([outer, hole]), 1) as Polygon;
    expect(grown.getCoordinates()).toHaveLength(2);
    expect(grown.getArea()).toBeCloseTo(22 * 22 - 1, 8); // the hole is 1 × 1 now
    const shrunk = offsetGeometry(new Polygon([outer, hole]), -1) as Polygon;
    expect(shrunk.getArea()).toBeCloseTo(18 * 18 - 25, 8); // the hole grew to 5 × 5
    const noHole = offsetGeometry(new Polygon([outer, hole]), 2) as Polygon;
    expect(noHole.getCoordinates()).toHaveLength(1);
  });

  it('offsets multi-part geometries part by part and refuses points', () => {
    const lines = offsetGeometry(
      new MultiLineString([
        [
          [0, 0],
          [10, 0],
        ],
        [
          [0, 5],
          [10, 5],
        ],
      ]),
      1,
    ) as MultiLineString;
    close(lines.getCoordinates()[0]!, [
      [0, 1],
      [10, 1],
    ]);
    close(lines.getCoordinates()[1]!, [
      [0, 6],
      [10, 6],
    ]);
    const polygons = offsetGeometry(
      new MultiPolygon([
        [square],
        [
          [
            [20, 20],
            [21, 20],
            [21, 21],
            [20, 21],
            [20, 20],
          ],
        ],
      ]),
      -1,
    ) as MultiPolygon;
    expect(polygons.getPolygons()).toHaveLength(1); // the small square collapsed
    expect(polygons.getArea()).toBeCloseTo(64, 8);
    expect(offsetGeometry(new Point([1, 1]), 1)).toBeNull();
    expect(offsetGeometry(new LineString([[1, 1]]), 1)).toBeNull();
  });
});

describe('offsetSide', () => {
  it('reads left and right of a line and inside and outside of a polygon', () => {
    const line = new LineString([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(offsetSide(line, [5, 3])).toBe(1);
    expect(offsetSide(line, [5, -3])).toBe(-1);
    expect(offsetSide(line, [12, 5])).toBe(-1); // right of the second segment
    expect(offsetSide(line, [5, 0])).toBeNull();
    const polygon = new Polygon([square]);
    expect(offsetSide(polygon, [5, 5])).toBe(-1);
    expect(offsetSide(polygon, [15, 5])).toBe(1);
    expect(offsetSide(new Point([0, 0]), [1, 1])).toBeNull();
  });
});
