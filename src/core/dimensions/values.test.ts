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
