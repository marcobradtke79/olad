// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { offsetMetres } from '../measure';
import { registerProjections } from '../projections/register';
import { dimensionValues } from './values';

registerProjections(
  [{ code: 'EPSG:25832', def: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs' }],
  proj4,
);

const config = { tolerance: 0.05 };

function dimension(projection: string, metres: number, properties: Record<string, unknown> = {}) {
  // UTM: grid metres, as surveyors measure; Web Mercator: true metres at the location.
  const start = projection === 'EPSG:3857' ? fromLonLat([8.4, 49]) : [457000, 5428000];
  const end =
    projection === 'EPSG:3857'
      ? offsetMetres(projection, start, metres, 0)
      : [start[0]! + metres, start[1]!];
  return new Feature({ geometry: new LineString([start, end]), ...properties });
}

describe('dimensionValues', () => {
  it('measures the GIS value planar in UTM and scale-corrected in Web Mercator', () => {
    expect(dimensionValues(dimension('EPSG:25832', 12.47), config, 'EPSG:25832')!.gis).toBeCloseTo(
      12.47,
      6,
    );
    expect(dimensionValues(dimension('EPSG:3857', 12.47), config, 'EPSG:3857')!.gis).toBeCloseTo(
      12.47,
      3,
    );
  });

  it('shows the field value when set and checks it against the tolerance', () => {
    const computed = dimensionValues(dimension('EPSG:25832', 10), config, 'EPSG:25832')!;
    expect(computed).toMatchObject({
      field: null,
      value: computed.gis,
      computed: true,
      status: 'ok',
    });
    const within = dimensionValues(
      dimension('EPSG:25832', 10, { fieldValue: 10.04 }),
      config,
      'EPSG:25832',
    )!;
    expect(within).toMatchObject({ field: 10.04, value: 10.04, computed: false, status: 'ok' });
    const off = dimensionValues(
      dimension('EPSG:25832', 10, { fieldValue: 10.2 }),
      config,
      'EPSG:25832',
    )!;
    expect(off.status).toBe('deviates');
  });

  it('ignores features that are not aligned two-point dimensions', () => {
    expect(dimensionValues(new Feature(new Point([0, 0])), config, 'EPSG:25832')).toBeNull();
    const three = new Feature(
      new LineString([
        [0, 0],
        [1, 0],
        [2, 0],
      ]),
    );
    expect(dimensionValues(three, config, 'EPSG:25832')).toBeNull();
    expect(
      dimensionValues(dimension('EPSG:25832', 5, { dimType: 'angular' }), config, 'EPSG:25832'),
    ).toBeNull();
  });
});

describe('dimensionValues: rotated', () => {
  it('measures the distance projected onto the rotation', () => {
    const at = [457000, 5428000];
    const feature = (rotation: unknown) =>
      new Feature({
        geometry: new LineString([at, [at[0]! + 8, at[1]! + 6]]),
        dimType: 'rotated',
        rotation,
      });
    expect(dimensionValues(feature(0), config, 'EPSG:25832')!.gis).toBeCloseTo(8, 6);
    expect(dimensionValues(feature(90), config, 'EPSG:25832')!.gis).toBeCloseTo(6, 6);
    const values = dimensionValues(feature(90), config, 'EPSG:25832')!;
    expect(values.direction[0]).toBeCloseTo(0);
    expect(values.direction[1]).toBeCloseTo(1);
    expect(dimensionValues(feature(undefined), config, 'EPSG:25832')).toBeNull();
  });
});

describe('dimensionValues: tie and running', () => {
  it('measures a tie like an aligned and a running like a rotated dimension', () => {
    const at = [457000, 5428000];
    const line = new LineString([at, [at[0]! + 3, at[1]! + 4]]);
    const tie = new Feature({ geometry: line.clone(), dimType: 'tie' });
    expect(dimensionValues(tie, config, 'EPSG:25832')!.gis).toBeCloseTo(5, 6);
    const running = new Feature({ geometry: line.clone(), dimType: 'running', rotation: 0 });
    expect(dimensionValues(running, config, 'EPSG:25832')!.gis).toBeCloseTo(3, 6);
  });
});

describe('dimensionValues: angular and radial', () => {
  const o = [457000, 5428000];
  const at = (x: number, y: number) => [o[0]! + x, o[1]! + y];
  const dim = (type: string, points: number[][], properties: Record<string, unknown> = {}) =>
    new Feature({ geometry: new LineString(points), dimType: type, offset: 2, ...properties });

  it('measures the angle counter-clockwise from the first to the second leg, in degrees', () => {
    const right = dim('angular', [at(10, 0), at(0, 0), at(0, 10)]);
    expect(dimensionValues(right, config, 'EPSG:25832')).toMatchObject({ unit: 'deg' });
    expect(dimensionValues(right, config, 'EPSG:25832')!.gis).toBeCloseTo(90, 9);
    const reflex = dim('angular', [at(0, 10), at(0, 0), at(10, 0)]);
    expect(dimensionValues(reflex, config, 'EPSG:25832')!.gis).toBeCloseTo(270, 9);
    // The angle tolerance is in the layer's unit: 0.1 gon = 0.09°.
    const field = dim('angular', [at(10, 0), at(0, 0), at(0, 10)], { fieldValue: 90.1 });
    const gon = { tolerance: 0.05, angleTolerance: 0.1, angleUnit: 'gon' as const };
    expect(dimensionValues(field, gon, 'EPSG:25832')!.status).toBe('deviates');
    expect(dimensionValues(field, { ...gon, angleUnit: 'deg' }, 'EPSG:25832')!.status).toBe('ok');
  });

  it('measures radius, diameter and arc length in metres', () => {
    expect(
      dimensionValues(dim('radius', [at(0, 0), at(3, 4)]), config, 'EPSG:25832')!.gis,
    ).toBeCloseTo(5, 9);
    expect(
      dimensionValues(dim('diameter', [at(0, 0), at(3, 4)]), config, 'EPSG:25832')!.gis,
    ).toBeCloseTo(10, 9);
    const quarter = dim('arc', [at(0, 0), at(5, 0), at(0, 5)]);
    expect(dimensionValues(quarter, config, 'EPSG:25832')!.gis).toBeCloseTo((5 * Math.PI) / 2, 9);
    expect(dimensionValues(dim('arc', [at(0, 0), at(5, 0)]), config, 'EPSG:25832')).toBeNull();
  });
});

describe('dimensionValues: station, level and slope', () => {
  const o = [457000, 5428000];
  const at = (x: number, y: number) => [o[0]! + x, o[1]! + y];
  const dim = (type: string, points: number[][], properties: Record<string, unknown> = {}) =>
    new Feature({ geometry: new LineString(points), dimType: type, ...properties });

  it('measures the station along the line and the signed offset', () => {
    const left = dimensionValues(
      dim('station', [at(0, 0), at(30, 0), at(12, 3)]),
      config,
      'EPSG:25832',
    )!;
    expect(left.gis).toBeCloseTo(12, 9);
    expect(left.second!.gis).toBeCloseTo(3, 9);
    const right = dimensionValues(
      dim('station', [at(0, 0), at(30, 0), at(12, -4)]),
      config,
      'EPSG:25832',
    )!;
    expect(right.second!.gis).toBeCloseTo(-4, 9);
    const end = dimensionValues(
      dim('station', [at(0, 0), at(30, 0), at(30, 0)]),
      config,
      'EPSG:25832',
    )!;
    expect(end.gis).toBeCloseTo(30, 9);
    expect(end.second!.gis).toBeCloseTo(0, 9);
    const offsetOff = dimensionValues(
      dim('station', [at(0, 0), at(30, 0), at(12, 3)], { fieldValue: 12, fieldOffset: 3.2 }),
      config,
      'EPSG:25832',
    )!;
    expect(offsetOff.status).toBe('deviates');
  });

  it('shows typed heights and slopes; a derived slope keeps its stored GIS value', () => {
    const level = dimensionValues(
      dim('level', [at(0, 0), at(1, 1)], { fieldValue: -0.15 }),
      config,
      'EPSG:25832',
    )!;
    expect(level).toMatchObject({ gis: null, field: -0.15, value: -0.15, computed: false });
    expect(dimensionValues(dim('level', [at(0, 0), at(1, 1)]), config, 'EPSG:25832')).toBeNull();
    const derived = dimensionValues(
      dim('slope', [at(0, 0), at(10, 0)], { gisValue: 2.5 }),
      config,
      'EPSG:25832',
    )!;
    expect(derived).toMatchObject({ unit: '%', gis: 2.5, value: 2.5, computed: true });
    const free = dimensionValues(
      dim('slope', [at(0, 0), at(10, 0)], { fieldValue: 4 }),
      config,
      'EPSG:25832',
    )!;
    expect(free).toMatchObject({ gis: null, value: 4, computed: false });
  });
});
