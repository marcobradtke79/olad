// @vitest-environment jsdom
import { fromLonLat, toLonLat } from 'ol/proj';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { registerProjections } from '../projections/register';
import { distanceMetres, offsetMetres, unitsPerMetre } from './index';

registerProjections(
  [{ code: 'EPSG:25832', def: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs' }],
  proj4,
);

const LON = 8.4;
const LAT = 49.0;

describe('measure', () => {
  it('scales metres by 1 / cos(latitude) in Web Mercator', () => {
    const start = fromLonLat([LON, LAT]);
    const expected = 1 / Math.cos((LAT * Math.PI) / 180);
    expect(unitsPerMetre('EPSG:3857', start)).toBeCloseTo(expected, 6);
    const moved = offsetMetres('EPSG:3857', start, 100, 50);
    expect(moved[0]! - start[0]!).toBeCloseTo(100 * expected, 6);
    expect(moved[1]! - start[1]!).toBeCloseTo(50 * expected, 6);
    expect(distanceMetres('EPSG:3857', start, moved)).toBeCloseTo(Math.hypot(100, 50), 2);
  });

  it('is close to planar in UTM', () => {
    const start = proj4('EPSG:4326', 'EPSG:25832', [LON, LAT]) as [number, number];
    const moved = offsetMetres('EPSG:25832', start, 100, 0);
    expect(Math.abs(moved[0]! - start[0]! - 100)).toBeLessThan(0.3); // spherical estimate
    expect(Math.abs(moved[1]! - start[1]!)).toBeLessThan(1e-6);
    expect(distanceMetres('EPSG:25832', start, moved)).toBeCloseTo(100, 1);
  });

  it('moves along the sphere in a geographic projection', () => {
    const moved = offsetMetres('EPSG:4326', [LON, LAT], 1000, 0);
    expect(moved[1]).toBeCloseTo(LAT, 5);
    const degPerMetre = 1 / (111_320 * Math.cos((LAT * Math.PI) / 180));
    expect(moved[0]! - LON).toBeCloseTo(1000 * degPerMetre, 4);
    expect(distanceMetres('EPSG:4326', [LON, LAT], moved)).toBeCloseTo(1000, 0);
    const north = offsetMetres('EPSG:4326', [LON, LAT], 0, 1000);
    expect(north[0]).toBeCloseTo(LON, 6);
    expect(north[1]).toBeGreaterThan(LAT);
    expect(offsetMetres('EPSG:4326', [LON, LAT], 0, 0)).toEqual([LON, LAT]);
    expect(unitsPerMetre('EPSG:4326', [LON, LAT])).toBeCloseTo(degPerMetre, 7);
  });

  it('agrees across projections', () => {
    const start = fromLonLat([LON, LAT]);
    const viaMercator = toLonLat(offsetMetres('EPSG:3857', start, 100, 0));
    const viaSphere = offsetMetres('EPSG:4326', [LON, LAT], 100, 0);
    expect(viaMercator[0]).toBeCloseTo(viaSphere[0]!, 5); // sphere vs. ellipsoid: ~0.1 m
    expect(viaMercator[1]).toBeCloseTo(viaSphere[1]!, 5);
  });
});
