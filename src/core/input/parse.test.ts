import { describe, expect, it } from 'vitest';
import { parseInput } from './parse';

describe('parseInput', () => {
  it('parses absolute coordinates with any separator', () => {
    expect(parseInput('935000,6270000')).toEqual({ kind: 'absolute', x: 935000, y: 6270000 });
    expect(parseInput(' 12.5 ; -3 ')).toEqual({ kind: 'absolute', x: 12.5, y: -3 });
    expect(parseInput('1 2')).toEqual({ kind: 'absolute', x: 1, y: 2 });
    expect(parseInput('8.1,   .5')).toEqual({ kind: 'absolute', x: 8.1, y: 0.5 });
    expect(parseInput('1e3, 2E-1')).toEqual({ kind: 'absolute', x: 1000, y: 0.2 });
  });

  it('parses relative and polar input', () => {
    expect(parseInput('@100,0')).toEqual({ kind: 'relative', dx: 100, dy: 0 });
    expect(parseInput('@ -5.5 ; 2')).toEqual({ kind: 'relative', dx: -5.5, dy: 2 });
    expect(parseInput('@50<90')).toEqual({ kind: 'polar', distance: 50, angle: 90 });
    expect(parseInput('@ 12.5 < -45 ')).toEqual({ kind: 'polar', distance: 12.5, angle: -45 });
  });

  it('parses a single number as a length', () => {
    expect(parseInput('75')).toEqual({ kind: 'length', distance: 75, value: 75, unit: null });
    expect(parseInput('  0.25')).toEqual({
      kind: 'length',
      distance: 0.25,
      value: 0.25,
      unit: null,
    });
    expect(parseInput('-10')).toEqual({ kind: 'length', distance: -10, value: -10, unit: null });
  });

  it('rejects everything else', () => {
    for (const text of [
      '',
      '   ',
      'abc',
      '1,',
      ',1',
      '1,2,3',
      '@',
      '@5',
      '@1<2<3',
      '50<90',
      '1,,2',
      '--1,2',
    ]) {
      expect(parseInput(text), text).toBeNull();
    }
  });

  it('reads units after lengths and converts them to metres', () => {
    expect(parseInput('5ft')).toEqual({
      kind: 'length',
      distance: expect.closeTo(1.524, 9),
      value: 5,
      unit: 'ft',
    });
    expect(parseInput('5 FT')).toMatchObject({ distance: expect.closeTo(1.524, 9), unit: 'ft' });
    expect(parseInput("3'")).toMatchObject({ distance: expect.closeTo(0.9144, 9), unit: 'ft' });
    expect(parseInput('2 mi')).toMatchObject({ distance: expect.closeTo(3218.688, 9), unit: 'mi' });
    expect(parseInput('12.5 m')).toMatchObject({ distance: 12.5, unit: 'm' });
    expect(parseInput('1 km')).toMatchObject({ distance: 1000, unit: 'km' });
    expect(parseInput('10 usft')!).toMatchObject({ unit: 'us-ft' });
    expect(parseInput('@3ft,4ft')).toEqual({
      kind: 'relative',
      dx: expect.closeTo(0.9144, 9),
      dy: expect.closeTo(1.2192, 9),
    });
    expect(parseInput('@3 ft 4')).toEqual({
      kind: 'relative',
      dx: expect.closeTo(0.9144, 9),
      dy: 4,
    });
    expect(parseInput('@10 yd<45')).toEqual({
      kind: 'polar',
      distance: expect.closeTo(9.144, 9),
      angle: 45,
    });
  });

  it('uses the default unit for lengths without one, never for coordinates', () => {
    expect(parseInput('10', 'ft')).toEqual({
      kind: 'length',
      distance: expect.closeTo(3.048, 9),
      value: 10,
      unit: null,
    });
    expect(parseInput('2 m', 'ft')).toMatchObject({ distance: 2, unit: 'm' });
    expect(parseInput('@1,2', 'ft')).toEqual({
      kind: 'relative',
      dx: expect.closeTo(0.3048, 9),
      dy: expect.closeTo(0.6096, 9),
    });
    expect(parseInput('100,200', 'ft')).toEqual({ kind: 'absolute', x: 100, y: 200 });
  });

  it('refuses units on absolute coordinates and unknown units', () => {
    expect(parseInput('100 m, 200 m')).toBeNull();
    expect(parseInput('5 furlongs')).toBeNull();
    expect(parseInput('5 mx')).toBeNull();
  });
});
