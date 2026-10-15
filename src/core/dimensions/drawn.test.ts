// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { describe, expect, it } from 'vitest';
import { resolveDimension } from '../config/defaults';
import { drawnDimensions } from './drawn';

const config = resolveDimension({ preset: 'architecture', referenceScale: 100 })!;

describe('drawnDimensions', () => {
  it('turns a dimension into lines, terminators and a text with rotation and height', () => {
    const dimension = new Feature({
      geometry: new LineString([
        [0, 0],
        [0, 10],
      ]),
      dimType: 'aligned',
      offset: 2,
    });
    dimension.setId('d1');
    const parts = drawnDimensions([dimension], config, 'EPSG:3857');
    const kinds = new Set(parts.map((p) => p.get('part')));
    expect(kinds.has('line')).toBe(true);
    expect(kinds.has('text')).toBe(true);
    for (const part of parts) {
      expect(part.get('dimension')).toBe('d1');
      expect(part.get('dimType')).toBe('aligned');
    }
    const text = parts.find((p) => p.get('part') === 'text')!;
    expect(text.getGeometry()).toBeInstanceOf(Point);
    expect(text.get('text')).toMatch(/10/);
    expect(Math.abs(text.get('rotation'))).toBeCloseTo(90, 6); // reads along the vertical line
    expect(text.get('height')).toBeCloseTo((config.textSize / 1000) * 100, 9);
  });

  it('passes other objects through unchanged', () => {
    const plain = new Feature(new Point([1, 2]));
    expect(drawnDimensions([plain], config, 'EPSG:3857')).toEqual([plain]);
  });
});
