import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  crsLengthUnit,
  formatArea,
  formatLength,
  fromMetres,
  isLengthUnit,
  LENGTH_UNITS,
  toMetres,
  unitFromText,
} from './units';

beforeAll(() => {
  proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
  proj4.defs(
    'EPSG:2263',
    '+proj=lcc +lat_0=40.1666666666667 +lon_0=-74 +lat_1=41.0333333333333 +lat_2=40.6666666666667 +x_0=300000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs',
  );
  proj4.defs(
    'TEST:FT',
    '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=0 +y_0=0 +ellps=GRS80 +units=ft +no_defs',
  );
  register(proj4);
});

describe('units', () => {
  it('takes the default unit from the CRS, metres for geographic and unknown ones', () => {
    expect(crsLengthUnit('EPSG:3857')).toBe('m');
    expect(crsLengthUnit('EPSG:25832')).toBe('m');
    expect(crsLengthUnit('EPSG:4326')).toBe('m');
    expect(crsLengthUnit('EPSG:2263')).toBe('us-ft');
    expect(crsLengthUnit('TEST:FT')).toBe('ft');
    expect(crsLengthUnit('EPSG:99999')).toBe('m');
  });

  it('converts between units and metres', () => {
    expect(toMetres(10, 'ft')).toBeCloseTo(3.048, 12);
    expect(toMetres(1, 'us-ft')).toBeCloseTo(0.3048006096, 10);
    expect(toMetres(1, 'mi')).toBe(1609.344);
    expect(toMetres(2, 'nmi')).toBe(3704);
    expect(toMetres(12, 'in')).toBeCloseTo(0.3048, 12);
    expect(fromMetres(0.9144, 'yd')).toBeCloseTo(1, 12);
    expect(fromMetres(1500, 'km')).toBe(1.5);
  });

  it('reads unit spellings case-insensitively', () => {
    expect(unitFromText('FT')).toBe('ft');
    expect(unitFromText('feet')).toBe('ft');
    expect(unitFromText("'")).toBe('ft');
    expect(unitFromText('"')).toBe('in');
    expect(unitFromText('US ft')).toBe('us-ft');
    expect(unitFromText('usft')).toBe('us-ft');
    expect(unitFromText('Metres')).toBe('m');
    expect(unitFromText('NM')).toBe('nmi');
    expect(unitFromText('furlong')).toBeNull();
    expect(LENGTH_UNITS.every((u) => isLengthUnit(u.id) && unitFromText(u.symbol) === u.id)).toBe(
      true,
    );
  });

  it('formats lengths in the unit system', () => {
    expect(formatLength(12.345)).toBe('12.35 m');
    expect(formatLength(1500)).toBe('1.500 km');
    expect(formatLength(3.048, 'ft')).toBe('10.00 ft');
    expect(formatLength(1609.344 * 2, 'ft')).toBe('2.000 mi');
    expect(formatLength(3.048, 'us-ft')).toBe('10.00 US ft');
    expect(formatLength(0.9144, 'yd')).toBe('1.00 yd');
    expect(formatLength(1852, 'nmi')).toBe('1.000 nmi');
    expect(formatLength(2.5, 'mm')).toBe('2500.0 mm');
  });

  it('formats areas in the unit system', () => {
    expect(formatArea(12.34)).toBe('12.3 m²');
    expect(formatArea(25000)).toBe('2.50 ha');
    expect(formatArea(3e6)).toBe('3.000 km²');
    expect(formatArea(0.09290304 * 100, 'ft')).toBe('100.0 ft²');
    expect(formatArea(4046.8564224 * 2, 'ft')).toBe('2.00 ac');
    expect(formatArea(4046.8564224 * 640 * 3, 'mi')).toBe('3.000 mi²');
    expect(formatArea(10, 'km')).toBe('10.0 m²'); // metric system
  });
});
