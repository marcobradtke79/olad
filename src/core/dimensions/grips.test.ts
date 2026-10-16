// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { describe, expect, it } from 'vitest';
import { dimensionGrips, moveGrip } from './grips';
import { dimensionValues } from './values';

// Near the origin of Web Mercator one map unit is one metre.
const projection = 'EPSG:3857';
const config = { tolerance: 0.05 };
/** 1 mm of paper is 0.1 m: the value label stands 0.1 m above the line. */
const scale = { referenceScale: 100 };

function setup(points: number[][], properties: Record<string, unknown>) {
  const feature = new Feature({ geometry: new LineString(points), ...properties });
  const values = dimensionValues(feature, config, projection)!;
  return { feature, values, grips: dimensionGrips(feature, values, projection, scale) };
}

const close = (a: number[], b: number[]) => {
  expect(a[0]).toBeCloseTo(b[0]!, 3);
  expect(a[1]).toBeCloseTo(b[1]!, 3);
};

describe('dimensionGrips / moveGrip', () => {
  it('gives an aligned dimension point, line and text grips and moves them', () => {
    const { feature, values, grips } = setup(
      [
        [0, 0],
        [10, 0],
      ],
      { dimType: 'aligned', offset: 2, textPosition: 1 },
    );
    expect(grips.map((g) => g.kind)).toEqual(['point', 'point', 'line', 'text']);
    close(grips[2]!.at, [2, 2]);
    close(grips[3]!.at, [6, 2.1]); // at the label: 0.1 m above the line
    expect(moveGrip(feature, values, grips[2]!, [3, -4], projection)!.properties).toEqual({
      offset: -4,
    });
    expect(moveGrip(feature, values, grips[3]!, [2, 2], projection)!.properties).toEqual({
      textPosition: -3,
    });
    const moved = moveGrip(feature, values, grips[1]!, [12, 0], projection)!;
    expect(moved.geometry!.getCoordinates()).toEqual([
      [0, 0],
      [12, 0],
    ]);
    expect(moved.properties).toEqual({});
  });

  it('replaces the moved point reference and keeps the others', () => {
    const ref = { layer: 'shapes', id: 1, kind: 'vertex' as const, path: [0, 0] };
    const { feature, values, grips } = setup(
      [
        [0, 0],
        [10, 0],
      ],
      { dimType: 'aligned', refs: [ref, ref] },
    );
    expect(moveGrip(feature, values, grips[0]!, [1, 1], projection)!.properties.refs).toEqual([
      null,
      ref,
    ]);
    const cleared = moveGrip(feature, values, grips[1]!, [9, 0], projection, null)!;
    const twice = new Feature({
      geometry: cleared.geometry,
      dimType: 'aligned',
      refs: [null, ref],
    });
    const again = dimensionValues(twice, config, projection)!;
    const last = moveGrip(
      twice,
      again,
      dimensionGrips(twice, again, projection, scale)[1]!,
      [8, 0],
      projection,
    )!;
    expect(last.properties.refs).toBeUndefined();
  });

  it('moves the arc of an angle and the leader of a radius', () => {
    const angle = setup(
      [
        [10, 0],
        [0, 0],
        [0, 10],
      ],
      { dimType: 'angular', offset: 4 },
    );
    const arc = angle.grips.find((g) => g.kind === 'line')!;
    expect(Math.hypot(arc.at[0]!, arc.at[1]!)).toBeCloseTo(4, 6);
    expect(
      moveGrip(angle.feature, angle.values, arc, [6, 0], projection)!.properties.offset,
    ).toBeCloseTo(6, 3);
    expect(moveGrip(angle.feature, angle.values, arc, [0, 0], projection)).toBeNull();

    const radius = setup(
      [
        [0, 0],
        [5, 0],
      ],
      { dimType: 'radius', offset: 2 },
    );
    const leader = radius.grips.find((g) => g.kind === 'line')!;
    close(leader.at, [7, 0]);
    expect(moveGrip(radius.feature, radius.values, leader, [0, 8], projection)!.properties).toEqual(
      { offset: 3 },
    );
    expect(moveGrip(radius.feature, radius.values, leader, [1, 0], projection)!.properties).toEqual(
      { offset: 0 },
    );
  });
});
