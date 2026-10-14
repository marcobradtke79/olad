import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import { validateGeometry } from './validity';

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const code = (issue: ReturnType<typeof validateGeometry>) => issue?.code ?? null;

describe('validateGeometry', () => {
  it('accepts valid geometries of every type', () => {
    expect(validateGeometry(new Point([1, 2]), 'Point')).toBeNull();
    expect(
      validateGeometry(
        new LineString([
          [0, 0],
          [1, 1],
        ]),
        'LineString',
      ),
    ).toBeNull();
    expect(validateGeometry(new Polygon([square]), 'Polygon')).toBeNull();
    expect(validateGeometry(new MultiPoint([[1, 2]]), 'MultiPoint')).toBeNull();
    expect(
      validateGeometry(
        new MultiLineString([
          [
            [0, 0],
            [1, 1],
          ],
        ]),
        'MultiLineString',
      ),
    ).toBeNull();
    expect(validateGeometry(new MultiPolygon([[square]]), 'MultiPolygon')).toBeNull();
    // A polygon with a hole: the hole ring is checked like the outer ring.
    const hole = [
      [2, 2],
      [4, 2],
      [4, 4],
      [2, 4],
      [2, 2],
    ];
    expect(validateGeometry(new Polygon([square, hole]), 'Polygon')).toBeNull();
  });

  it("'Any' accepts every layer type and still checks validity", () => {
    expect(validateGeometry(new Point([1, 2]), 'Any')).toBeNull();
    expect(validateGeometry(new MultiPolygon([[square]]), 'Any')).toBeNull();
    expect(code(validateGeometry(new LineString([[0, 0]]), 'Any'))).toBe('too-few-vertices');
    expect(validateGeometry(new GeometryCollection([]), 'Any')).toEqual({
      code: 'geometry-type',
      params: { expected: 'Any', actual: 'GeometryCollection' },
    });
  });

  it('reports type mismatches and empty geometries', () => {
    const issue = validateGeometry(new Point([0, 0]), 'Polygon');
    expect(issue).toEqual({
      code: 'geometry-type',
      params: { expected: 'Polygon', actual: 'Point' },
    });
    expect(validateGeometry(new GeometryCollection([]), 'Point')?.params.actual).toBe(
      'GeometryCollection',
    );
    expect(code(validateGeometry(undefined, 'Point'))).toBe('empty-geometry');
    expect(code(validateGeometry(new LineString([]), 'LineString'))).toBe('empty-geometry');
    expect(code(validateGeometry(new Polygon([]), 'Polygon'))).toBe('empty-geometry');
    expect(code(validateGeometry(new MultiPoint([]), 'MultiPoint'))).toBe('empty-geometry');
    expect(code(validateGeometry(new MultiPolygon([]), 'MultiPolygon'))).toBe('empty-geometry');
  });

  it('requires minimum vertex counts', () => {
    expect(validateGeometry(new LineString([[0, 0]]), 'LineString')).toEqual({
      code: 'too-few-vertices',
      params: { minimum: 2, actual: 1 },
    });
    expect(
      validateGeometry(
        new Polygon([
          [
            [0, 0],
            [1, 0],
            [0, 0],
          ],
        ]),
        'Polygon',
      ),
    ).toEqual({ code: 'too-few-vertices', params: { minimum: 4, actual: 3 } });
  });

  it('requires closed rings', () => {
    const open = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(code(validateGeometry(new Polygon([open]), 'Polygon'))).toBe('ring-not-closed');
  });

  it('rejects zero-length segments', () => {
    expect(
      validateGeometry(
        new LineString([
          [0, 0],
          [0, 0],
          [1, 1],
        ]),
        'LineString',
      ),
    ).toEqual({ code: 'zero-length-segment', params: { segment: 0 } });
    const ring = [
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 10],
      [0, 0],
    ];
    expect(code(validateGeometry(new Polygon([ring]), 'Polygon'))).toBe('zero-length-segment');
  });

  it('rejects self-intersecting rings but allows self-crossing lines', () => {
    const bowtie = [
      [0, 0],
      [10, 10],
      [10, 0],
      [0, 10],
      [0, 0],
    ];
    expect(validateGeometry(new Polygon([bowtie]), 'Polygon')).toEqual({
      code: 'self-intersection',
      params: { segment: 0, other: 2 },
    });
    expect(code(validateGeometry(new MultiPolygon([[square], [bowtie]]), 'MultiPolygon'))).toBe(
      'self-intersection',
    );
    expect(validateGeometry(new LineString(bowtie), 'LineString')).toBeNull();
  });
});
