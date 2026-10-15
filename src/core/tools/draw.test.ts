import LineString from 'ol/geom/LineString';
import type MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it, vi } from 'vitest';
import { resolveLayer } from '../config/defaults';
import {
  defaultProperties,
  drawTarget,
  drawType,
  lineTarget,
  onDrawEnd,
  prepareInsert,
  sketchReference,
  wrapForLayer,
} from './draw';
import type { ToolContext } from './Tool';

const ring = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
];

describe('draw helpers', () => {
  it('maps layer types to drawable types', () => {
    expect(drawType('Point')).toBe('Point');
    expect(drawType('MultiPoint')).toBe('Point');
    expect(drawType('LineString')).toBe('LineString');
    expect(drawType('MultiLineString')).toBe('LineString');
    expect(drawType('Polygon')).toBe('Polygon');
    expect(drawType('MultiPolygon')).toBe('Polygon');
    expect(drawType('Any')).toBeNull();
  });

  it('drawTarget picks the active layer, else the draft layer, and resolves the type', () => {
    const roads = resolveLayer({
      id: 'roads',
      geometryType: 'LineString',
      source: { features: [] },
    });
    const draft = resolveLayer({ id: 'draft', geometryType: 'Any', source: { features: [] } });
    const configs: Record<string, typeof roads> = { roads, draft };
    const insertable = new Set(['roads', 'draft']);
    const ctx = (active: string | null, draftId: string | null) => ({
      getActiveLayer: () => active,
      getDraftLayer: () => draftId,
      layers: {
        has: (id: string) => id in configs,
        canEdit: (id: string) => insertable.has(id),
        getConfig: (id: string) => configs[id]!,
      } as unknown as ToolContext['layers'],
    });
    expect(drawTarget(ctx('roads', 'draft'))).toMatchObject({
      layerId: 'roads',
      type: 'LineString',
    });
    expect(drawTarget(ctx('roads', 'draft'), { type: 'LineString' })?.layerId).toBe('roads');
    // A fixed-type layer refuses another type.
    expect(drawTarget(ctx('roads', 'draft'), { type: 'Point' })).toBeNull();
    // No active layer: the draft layer with the requested type, points by default.
    expect(drawTarget(ctx(null, 'draft'))).toMatchObject({ layerId: 'draft', type: 'Point' });
    expect(drawTarget(ctx(null, 'draft'), { type: 'Polygon' })).toMatchObject({
      layerId: 'draft',
      type: 'Polygon',
    });
    expect(drawTarget(ctx(null, null))).toBeNull();
    expect(drawTarget(ctx('gone', 'draft'))).toBeNull();
    insertable.delete('draft');
    expect(drawTarget(ctx(null, 'draft'))).toBeNull();
    // Dimension layers take objects from the dimension tools only.
    configs.dims = resolveLayer({
      id: 'dims',
      geometryType: 'LineString',
      source: { features: [] },
      dimension: true,
    });
    insertable.add('dims');
    expect(drawTarget(ctx('dims', 'draft'))).toBeNull();
    expect(lineTarget(ctx('dims', 'draft'))).toBeNull();
  });

  it('wraps single parts for multi-part layers and leaves others alone', () => {
    expect(wrapForLayer(new Point([1, 2]), 'MultiPoint').getType()).toBe('MultiPoint');
    expect(
      wrapForLayer(
        new LineString([
          [0, 0],
          [1, 1],
        ]),
        'MultiLineString',
      ).getType(),
    ).toBe('MultiLineString');
    const multi = wrapForLayer(new Polygon([ring]), 'MultiPolygon') as MultiPolygon;
    expect(multi.getCoordinates()).toEqual([[ring]]);
    const polygon = new Polygon([ring]);
    expect(wrapForLayer(polygon, 'Polygon')).toBe(polygon);
    expect(wrapForLayer(polygon, 'MultiPoint')).toBe(polygon);
    expect(wrapForLayer(polygon, 'Any')).toBe(polygon);
  });

  it('applies schema defaults to new features', () => {
    const layer = resolveLayer({
      id: 'l',
      geometryType: 'MultiPoint',
      source: { features: [] },
      schema: {
        fields: [
          { name: 'usage', type: 'enum', values: ['a', 'b'], default: 'a' },
          { name: 'floors', type: 'integer', default: 1 },
          { name: 'owner', type: 'string', required: true },
        ],
      },
    });
    expect(defaultProperties(layer)).toEqual({ usage: 'a', floors: 1 });
    const feature = prepareInsert(layer, new Point([3, 4]));
    expect(feature.getGeometry()?.getType()).toBe('MultiPoint');
    expect(feature.get('usage')).toBe('a');
    expect(feature.get('owner')).toBeUndefined();
    const bare = resolveLayer({ id: 'x', geometryType: 'Point', source: { features: [] } });
    expect(defaultProperties(bare)).toEqual({});
  });

  it('sketchReference returns the last fixed vertex of a sketch', () => {
    expect(sketchReference(undefined)).toBeNull();
    expect(sketchReference(new Point([1, 1]))).toBeNull();
    expect(sketchReference(new LineString([[5, 5]]))).toBeNull(); // only the moving vertex
    expect(
      sketchReference(
        new LineString([
          [0, 0],
          [3, 3],
          [9, 9],
        ]),
      ),
    ).toEqual([3, 3]);
    // Polygon sketch: fixed v1, v2, then the moving vertex, then the closing copy of v1.
    expect(
      sketchReference(
        new Polygon([
          [
            [0, 0],
            [4, 0],
            [9, 9],
            [0, 0],
          ],
        ]),
      ),
    ).toEqual([4, 0]);
    expect(
      sketchReference(
        new Polygon([
          [
            [0, 0],
            [0, 0],
          ],
        ]),
      ),
    ).toBeNull();
  });

  it('onDrawEnd inserts through a command and selects the new feature', () => {
    const layer = resolveLayer({ id: 'h', geometryType: 'Point', source: { features: [] } });
    const selection = { set: vi.fn() };
    const accept = { execute: vi.fn(() => true), selection } as unknown as ToolContext;
    expect(onDrawEnd(accept, 'h', layer, new Point([1, 2]))).toBe(true);
    const command = (accept.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(command).toMatchObject({ type: 'insert', layer: 'h' });
    expect(selection.set).toHaveBeenCalledWith([command.feature]);
    const reject = { execute: vi.fn(() => false), selection: { set: vi.fn() } };
    expect(onDrawEnd(reject as unknown as ToolContext, 'h', layer, new Point([1, 2]))).toBe(false);
    expect(reject.selection.set).not.toHaveBeenCalled();
  });
});
