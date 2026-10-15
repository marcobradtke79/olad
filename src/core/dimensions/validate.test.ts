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
    expect(validateDimensionFeature(line, { dimType: 'station' })?.code).toBe('dimension-type');
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

describe('validateDimensionFeature: rotated', () => {
  it('needs a finite rotation', () => {
    expect(validateDimensionFeature(line, { dimType: 'rotated', rotation: 30 })).toBeNull();
    expect(validateDimensionFeature(line, { dimType: 'rotated' })?.params).toEqual({
      property: 'rotation',
    });
    expect(validateDimensionFeature(line, { dimType: 'aligned', rotation: 'x' })?.code).toBe(
      'dimension-value',
    );
  });
});

describe('validateDimensionFeature: tie and running', () => {
  it('accepts tie distances and needs a rotation for running dimensions', () => {
    expect(validateDimensionFeature(line, { dimType: 'tie' })).toBeNull();
    expect(
      validateDimensionFeature(line, { dimType: 'running', rotation: 0, chain: 'c-1' }),
    ).toBeNull();
    expect(validateDimensionFeature(line, { dimType: 'running' })?.params.property).toBe(
      'rotation',
    );
  });
});

describe('validateDimensionFeature: refs', () => {
  it('accepts well-formed references and rejects others', () => {
    const ref = { layer: 'parcels', id: 1, kind: 'vertex', path: [0, 2] };
    expect(validateDimensionFeature(line, { refs: [ref, null] })).toBeNull();
    expect(validateDimensionFeature(line, { refs: [ref] })?.params.property).toBe('refs');
    expect(validateDimensionFeature(line, { refs: 'x' })?.params.property).toBe('refs');
  });
});

describe('validateDimensionFeature: angular and radial', () => {
  const three = (points: number[][]) => new LineString(points);
  it('needs three points for angles and arcs, a radius for angles', () => {
    const angle = three([
      [10, 0],
      [0, 0],
      [0, 10],
    ]);
    expect(validateDimensionFeature(angle, { dimType: 'angular', offset: 4 })).toBeNull();
    expect(validateDimensionFeature(angle, { dimType: 'angular' })?.params.property).toBe('offset');
    expect(validateDimensionFeature(line, { dimType: 'angular', offset: 4 })?.code).toBe(
      'dimension-points',
    );
    expect(validateDimensionFeature(line, { dimType: 'radius' })).toBeNull();
    const fullArc = three([
      [0, 0],
      [5, 0],
      [5, 0],
    ]);
    expect(validateDimensionFeature(fullArc, { dimType: 'arc' })?.code).toBe('dimension-points');
  });
});
