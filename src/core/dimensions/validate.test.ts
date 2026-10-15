// @vitest-environment jsdom
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { describe, expect, it } from 'vitest';
import { validateDimensionFeature } from './validate';

const line = new LineString([
  [0, 0],
  [10, 0],
]);

describe('validateDimensionFeature', () => {
  it('accepts an aligned dimension with valid properties', () => {
    expect(validateDimensionFeature(line, {})).toBeNull();
    expect(
      validateDimensionFeature(line, {
        dimType: 'aligned',
        offset: -2,
        fieldValue: 10.01,
        text: '{value}',
        textPosition: null,
      }),
    ).toBeNull();
  });

  it('rejects unknown and not yet supported types', () => {
    expect(validateDimensionFeature(line, { dimType: 'fancy' })?.code).toBe('dimension-type');
    expect(validateDimensionFeature(line, { dimType: 'angular' })?.code).toBe('dimension-type');
  });

  it('needs two distinct points', () => {
    const issue = validateDimensionFeature(new Point([0, 0]), {});
    expect(issue).toEqual({ code: 'dimension-points', params: { expected: 2, actual: 0 } });
    expect(
      validateDimensionFeature(
        new LineString([
          [1, 1],
          [1, 1],
        ]),
        {},
      )?.code,
    ).toBe('dimension-points');
  });

  it('checks the property types', () => {
    expect(validateDimensionFeature(line, { fieldValue: -1 })?.params).toEqual({
      property: 'fieldValue',
    });
    expect(validateDimensionFeature(line, { fieldValue: '12' })?.code).toBe('dimension-value');
    expect(validateDimensionFeature(line, { offset: Number.NaN })?.params.property).toBe('offset');
    expect(validateDimensionFeature(line, { text: 5 })?.params.property).toBe('text');
  });
});
