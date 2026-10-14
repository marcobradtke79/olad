import { describe, expect, it } from 'vitest';
import type { StyleError } from './style';
import {
  flatFromStyle,
  parseColor,
  rgba,
  styleFromFlat,
  styleSections,
  validateStyle,
  type LayerStyle,
} from './style';

describe('layer styles', () => {
  it('parses CSS colours into #rrggbb and alpha', () => {
    expect(parseColor('#abc')).toEqual({ hex: '#aabbcc', alpha: 1 });
    expect(parseColor('#B45309')).toEqual({ hex: '#b45309', alpha: 1 });
    expect(parseColor('#00000080')!.alpha).toBeCloseTo(0.502, 3);
    expect(parseColor('rgba(245, 158, 11, 0.2)')).toEqual({ hex: '#f59e0b', alpha: 0.2 });
    expect(parseColor('rgb(0,0,255)')).toEqual({ hex: '#0000ff', alpha: 1 });
    expect(parseColor([255, 0, 0, 0.5])).toEqual({ hex: '#ff0000', alpha: 0.5 });
    expect(parseColor('white')).toEqual({ hex: '#ffffff', alpha: 1 });
    expect(parseColor('hsl(1,2%,3%)')).toBeNull();
    expect(rgba('#f59e0b', 0.2)).toBe('rgba(245, 158, 11, 0.2)');
  });

  it('knows which sections a geometry type uses', () => {
    expect(styleSections('Point')).toEqual({ point: true, stroke: false, fill: false });
    expect(styleSections('MultiLineString')).toEqual({ point: false, stroke: true, fill: false });
    expect(styleSections('Polygon')).toEqual({ point: false, stroke: true, fill: true });
    expect(styleSections('Any')).toEqual({ point: true, stroke: true, fill: true });
  });

  it('reads a literal flat style and writes it back', () => {
    const flat = {
      'stroke-color': '#b45309',
      'stroke-width': 2,
      'fill-color': 'rgba(245, 158, 11, 0.2)',
    };
    const style = styleFromFlat(flat, 'Polygon')!;
    expect(style).toEqual({
      opacity: 1,
      stroke: { color: '#b45309', width: 2, dash: 'solid' },
      fill: { color: '#f59e0b', opacity: 0.2 },
      label: null,
    });
    expect(flatFromStyle(style, 'Polygon')).toEqual(flat);
    const dashed = styleFromFlat(
      { 'stroke-color': '#000', 'stroke-line-dash': [6, 4] },
      'LineString',
    )!;
    expect(dashed.stroke!.dash).toBe('dashed');
    expect(styleFromFlat({ 'stroke-line-dash': [1, 3] }, 'LineString')!.stroke!.dash).toBe(
      'dotted',
    );
  });

  it('returns null for expression, rule and multi styles', () => {
    expect(styleFromFlat({ 'stroke-color': ['get', 'color'] }, 'LineString')).toBeNull();
    expect(styleFromFlat([{ 'stroke-color': '#000' }], 'LineString')).toBeNull();
  });

  it('writes points, dashes and labels and reads labels back', () => {
    const style: LayerStyle = {
      opacity: 0.8,
      point: { radius: 6, fill: '#ff0000', strokeColor: '#ffffff', strokeWidth: 2 },
      label: { field: 'name', size: 14, color: '#111111', halo: '#ffffff' },
    };
    const flat = flatFromStyle(style, 'Point') as Record<string, unknown>;
    expect(flat).toMatchObject({
      'circle-radius': 6,
      'circle-fill-color': '#ff0000',
      'text-value': ['to-string', ['get', 'name']],
      'text-font': '14px sans-serif',
      'text-fill-color': '#111111',
      'text-stroke-color': '#ffffff',
    });
    expect(flat['text-offset-y']).toBeLessThan(0);
    expect(styleFromFlat(flat as never, 'Point')!.label).toEqual(style.label);
    const line = flatFromStyle(
      {
        opacity: 1,
        stroke: { color: '#000000', width: 4, dash: 'dashed' },
        label: { ...style.label! },
      },
      'LineString',
    ) as Record<string, unknown>;
    expect(line['stroke-line-dash']).toEqual([16, 12]);
    expect(line['text-placement']).toBe('line');
  });

  it('validates styles and names the offending path', () => {
    const ok = validateStyle({
      opacity: 0.5,
      stroke: { color: '#ABCDEF', width: 3 },
      minZoom: 10,
      maxZoom: 18,
    });
    expect(ok).toEqual({
      opacity: 0.5,
      stroke: { color: '#abcdef', width: 3, dash: 'solid' },
      label: null,
      minZoom: 10,
      maxZoom: 18,
    });
    const path = (style: unknown) => {
      try {
        validateStyle(style);
      } catch (e) {
        return (e as StyleError).path;
      }
      return null;
    };
    expect(path({ opacity: 2 })).toBe('style.opacity');
    expect(path({ opacity: 1, stroke: { color: 'red', width: 1 } })).toBe('style.stroke.color');
    expect(path({ opacity: 1, fill: { color: '#000000', opacity: -1 } })).toBe(
      'style.fill.opacity',
    );
    expect(
      path({ opacity: 1, label: { field: '', size: 12, color: '#000000', halo: '#ffffff' } }),
    ).toBe('style.label.field');
    expect(path({ opacity: 1, minZoom: 12, maxZoom: 10 })).toBe('style.maxZoom');
  });
});
