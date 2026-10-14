// @vitest-environment jsdom
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { getArea } from 'ol/sphere';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { registerProjections } from '../projections/register';
import { offsetMetres } from './index';
import {
  formatAngle,
  formatArea,
  formatLength,
  measureAngle,
  measureArea,
  measureLength,
} from './measurements';

registerProjections(
  [{ code: 'EPSG:25832', def: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs' }],
  proj4,
);

const LON = 8.4;
const LAT = 49.0;

/** A square of `side` metres, counter-clockwise, starting at `origin`. */
function square(projection: string, origin: number[], side: number): number[][] {
  const east = offsetMetres(projection, origin, side, 0);
  const north = offsetMetres(projection, origin, 0, side);
  const corner = offsetMetres(projection, origin, side, side);
  return [origin, east, corner, north, origin];
}

describe('measureLength', () => {
  it('sums the segments in metres, also in Web Mercator', () => {
    const start = fromLonLat([LON, LAT]);
    const a = offsetMetres('EPSG:3857', start, 100, 0);
    const b = offsetMetres('EPSG:3857', a, 0, 50);
    const { total, segments } = measureLength('EPSG:3857', [start, a, b]);
    expect(segments[0]).toBeCloseTo(100, 1);
    expect(segments[1]).toBeCloseTo(50, 1);
    expect(total).toBeCloseTo(150, 1);
    // The map units differ from metres by 1 / cos φ.
    expect(a[0]! - start[0]!).toBeCloseTo(100 / Math.cos((LAT * Math.PI) / 180), 3);
    expect(measureLength('EPSG:3857', [start])).toEqual({ total: 0, segments: [] });
  });

  it('is planar in UTM', () => {
    const { total } = measureLength('EPSG:25832', [
      [450000, 5430000],
      [450300, 5430400],
    ]);
    expect(total).toBeCloseTo(500, 9); // grid metres
  });
});

describe('measureArea', () => {
  it('measures a 100 m square in UTM and in Web Mercator', () => {
    const utm = proj4('EPSG:4326', 'EPSG:25832', [LON, LAT]) as number[];
    const planar = measureArea('EPSG:25832', [square('EPSG:25832', utm, 100)]);
    expect(planar.area / 10000).toBeCloseTo(1, 2); // grid metres
    expect(planar.perimeter).toBeCloseTo(400, 0);
    const mercator = measureArea('EPSG:3857', [square('EPSG:3857', fromLonLat([LON, LAT]), 100)]);
    expect(Math.abs(mercator.area - 10000) / 10000).toBeLessThan(0.001);
    expect(Math.abs(mercator.perimeter - 400) / 400).toBeLessThan(0.001);
  });

  it('subtracts holes and stays close to ol/sphere in Web Mercator', () => {
    const outer = square('EPSG:3857', fromLonLat([LON, LAT]), 200);
    const hole = square('EPSG:3857', offsetMetres('EPSG:3857', outer[0]!, 50, 50), 50).reverse();
    const { area } = measureArea('EPSG:3857', [outer, hole]);
    expect(Math.abs(area - (40000 - 2500)) / 37500).toBeLessThan(0.001);
    // ol/sphere uses the mean earth radius, not the projection's: 0.22 % apart.
    const sphere = getArea(new Polygon([outer, hole]), { projection: 'EPSG:3857' });
    expect(Math.abs(area - sphere) / area).toBeLessThan(0.003);
  });

  it('is exact on the projection sphere for a large Mercator polygon', () => {
    // One degree of latitude by one of longitude at 49° N on a sphere of radius 6378137:
    // R² · Δλ · (sin φ2 − sin φ1).
    const R = 6378137;
    const ring = [
      fromLonLat([8, 49]),
      fromLonLat([9, 49]),
      fromLonLat([9, 50]),
      fromLonLat([8, 50]),
      fromLonLat([8, 49]),
    ];
    const rad = Math.PI / 180;
    const expected = R * R * rad * (Math.sin(50 * rad) - Math.sin(49 * rad));
    expect(measureArea('EPSG:3857', [ring]).area / expected).toBeCloseTo(1, 9);
  });

  it('closes open rings and gives 0 for fewer than three corners', () => {
    const open = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    const utm = open.map(([x, y]) => [450000 + x!, 5430000 + y!]);
    expect(measureArea('EPSG:25832', [utm]).area).toBeCloseTo(10000, 6);
    expect(measureArea('EPSG:25832', [utm.slice(0, 2)]).area).toBe(0);
  });
});

describe('measureAngle', () => {
  it('gives the angle at the vertex and its reflex', () => {
    expect(measureAngle([10, 0], [0, 0], [0, 10])).toEqual({ angle: 90, reflex: 270 });
    expect(measureAngle([0, 10], [0, 0], [10, 0]).angle).toBeCloseTo(90, 12);
    expect(measureAngle([10, 0], [0, 0], [10, 10]).angle).toBeCloseTo(45, 12);
    expect(measureAngle([10, 0], [0, 0], [-10, 0]).angle).toBeCloseTo(180, 12);
    expect(measureAngle([10, 0], [0, 0], [10, -10]).angle).toBeCloseTo(45, 12);
  });
});

describe('formatting', () => {
  it('switches units at the thresholds', () => {
    expect(formatLength(12.345)).toBe('12.35 m');
    expect(formatLength(999.994)).toBe('999.99 m');
    expect(formatLength(1234.5)).toBe('1.234 km');
    expect(formatArea(950.04)).toBe('950.0 m²');
    expect(formatArea(12500)).toBe('1.25 ha');
    expect(formatArea(2_500_000)).toBe('2.500 km²');
    expect(formatAngle(45)).toBe('45.0°');
  });
});
