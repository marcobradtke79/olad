import { describe, expect, it } from 'vitest';
import {
  applyDefaults,
  DIMENSION_DEFAULTS,
  resolveDimension,
  resolveLayer,
  resolveText,
  TEXT_DEFAULTS,
} from './defaults';

describe('applyDefaults', () => {
  it('fills view defaults and keeps extra view fields', () => {
    const resolved = applyDefaults({ target: 'map', view: { minZoom: 3 } });
    expect(resolved.editMode).toBe(false);
    expect(applyDefaults({ target: 'map', editMode: true }).editMode).toBe(true);
    expect(resolved.cursor).toEqual({
      crosshair: true,
      pickBoxSize: 8,
      color: '#1f2933',
      pickColor: '#facc15',
      angle: 0,
    });
    expect(resolved.changes).toEqual({ fullFeatures: false });
    expect(resolved.locale).toBe('en');
    expect(resolved.messages).toEqual({});
    expect(resolved.selection).toEqual({
      strokeColor: '#22d3ee',
      strokeWidth: 3,
      fillColor: 'rgba(34, 211, 238, 0.15)',
      pointRadius: 8,
      haloColor: 'rgba(255, 255, 255, 0.6)',
      haloWidth: 3,
      vertexSize: 6,
      inspect: true,
    });
    expect(resolved.layerHighlight).toEqual({
      strokeColor: '#f59e0b',
      strokeWidth: 3,
      fillColor: 'rgba(245, 158, 11, 0.2)',
      pointRadius: 7,
    });
    expect(resolved.snapping).toEqual({
      enabled: true,
      tolerancePx: 12,
      modes: ['vertex', 'midpoint', 'perpendicular'],
    });
    expect(resolved.grid).toEqual({ enabled: false, spacing: 10, origin: [0, 0], visible: true });
    expect(resolved.curves).toEqual({ tolerance: 0.01 });
    expect(resolved.constraints).toEqual({ angle: { enabled: false, step: 90 } });
    expect(resolved.draft).toEqual({ enabled: true, id: 'draft', title: 'Draft' });
    expect(
      applyDefaults({ target: 'map', draft: { enabled: false, id: 'scratch' } }).draft,
    ).toEqual({ enabled: false, id: 'scratch', title: 'Draft' });
    expect(
      applyDefaults({ target: 'map', constraints: { angle: { step: 45 } } }).constraints,
    ).toEqual({ angle: { enabled: false, step: 45 } });
    expect(applyDefaults({ target: 'map', grid: { spacing: 2.5, origin: [1, 2] } }).grid).toEqual({
      enabled: false,
      spacing: 2.5,
      origin: [1, 2],
      visible: true,
    });
    expect(applyDefaults({ target: 'map', snapping: { modes: ['midpoint'] } }).snapping).toEqual({
      enabled: true,
      tolerancePx: 12,
      modes: ['midpoint'],
    });
    expect(
      applyDefaults({ target: 'map', selection: { strokeWidth: 1 } }).selection.strokeWidth,
    ).toBe(1);
    expect(
      applyDefaults({
        target: 'map',
        changes: { precision: 3 },
        locale: 'de',
        messages: { a: 'b' },
      }),
    ).toMatchObject({
      changes: { fullFeatures: false, precision: 3 },
      locale: 'de',
      messages: { a: 'b' },
    });
    expect(applyDefaults({ target: 'map', cursor: { pickBoxSize: 12, angle: 45 } }).cursor).toEqual(
      { crosshair: true, pickBoxSize: 12, color: '#1f2933', pickColor: '#facc15', angle: 45 },
    );
    expect(resolved.view).toEqual({ projection: 'EPSG:3857', center: [0, 0], zoom: 2, minZoom: 3 });
  });

  it('makes the first basemap visible when none is', () => {
    const resolved = applyDefaults({
      target: 'map',
      basemaps: [
        { id: 'a', type: 'osm' },
        { id: 'b', type: 'xyz', url: 'u' },
      ],
    });
    expect(resolved.basemaps.map((b) => [b.id, b.title, b.visible])).toEqual([
      ['a', 'a', true],
      ['b', 'b', false],
    ]);
  });

  it('keeps an explicit visible basemap', () => {
    const resolved = applyDefaults({
      target: 'map',
      basemaps: [
        { id: 'a', type: 'osm' },
        { id: 'b', type: 'osm', visible: true, title: 'B' },
      ],
    });
    expect(resolved.basemaps.map((b) => b.visible)).toEqual([false, true]);
    expect(resolved.basemaps[1]!.title).toBe('B');
  });

  it('does not mutate the input', () => {
    const input = { target: 'map', basemaps: [{ id: 'a', type: 'osm' as const }] };
    applyDefaults(input);
    expect(input.basemaps[0]).toEqual({ id: 'a', type: 'osm' });
  });
});

describe('resolveText', () => {
  it('resolves text layers with the defaults and leaves others without', () => {
    expect(resolveText(undefined)).toBeUndefined();
    expect(resolveText(false)).toBeUndefined();
    expect(resolveText(true)).toEqual(TEXT_DEFAULTS);
    expect(resolveText({ height: 5, property: 'label' })).toEqual({
      ...TEXT_DEFAULTS,
      height: 5,
      property: 'label',
    });
    const resolved = resolveLayer({
      id: 'labels',
      geometryType: 'Point',
      source: { features: [] },
      text: true,
    });
    expect(resolved.text).toEqual(TEXT_DEFAULTS);
    expect(
      'text' in resolveLayer({ id: 'x', geometryType: 'Point', source: { features: [] } }),
    ).toBe(false);
  });
});

describe('resolveDimension', () => {
  it('resolves the preset defaults and lets the layer override them', () => {
    expect(resolveDimension(undefined)).toBeUndefined();
    expect(resolveDimension(false)).toBeUndefined();
    expect(resolveDimension(true)).toEqual({
      ...DIMENSION_DEFAULTS,
      preset: 'surveying',
      referenceScale: 500,
      terminator: 'arrow',
      angleUnit: 'gon',
    });
    expect(resolveDimension({ preset: 'architecture' })).toMatchObject({
      referenceScale: 100,
      terminator: 'tick',
      showComputed: 'plain',
      computedColor: '#6b7280',
    });
    expect(resolveDimension({ preset: 'landscape', terminator: 'arrow' })).toMatchObject({
      referenceScale: 250,
      terminator: 'arrow',
    });
    const resolved = resolveLayer({
      id: 'dims',
      geometryType: 'LineString',
      source: { features: [] },
      dimension: { preset: 'architecture', referenceScale: 50 },
    });
    expect(resolved.dimension).toMatchObject({ preset: 'architecture', referenceScale: 50 });
    expect(
      'dimension' in resolveLayer({ id: 'x', geometryType: 'Point', source: { features: [] } }),
    ).toBe(false);
  });
});
