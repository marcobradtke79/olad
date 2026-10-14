// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import { describe, expect, it } from 'vitest';
import type { CompositeCommand, InsertFeatureCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { canInsertTemplate, templateInsertCommand, templateTarget } from './insert';
import { TemplateStore } from './TemplateStore';

const configs: Record<string, Partial<ResolvedLayerConfig>> = {
  roads: { geometryType: 'LineString' },
  hydrants: {
    geometryType: 'MultiPoint',
    schema: { fields: [{ name: 'colour', type: 'string', default: 'red' }] },
  } as Partial<ResolvedLayerConfig>,
  tracks: { geometryType: 'LineString' }, // read-only
  parcels: { geometryType: 'Polygon' },
  draft: { geometryType: 'Any' },
};
const insertable = new Set(['roads', 'hydrants', 'parcels', 'draft']);

function context(active: string | null = null, draft: string | null = 'draft') {
  return {
    layers: {
      has: (id: string) => id in configs,
      canEdit: (id: string) => insertable.has(id),
      getConfig: (id: string) => configs[id] as ResolvedLayerConfig,
    },
    getActiveLayer: () => active,
    getDraftLayer: () => draft,
    getProjection: () => 'EPSG:3857', // on the equator: no scaling
  };
}

const line = () =>
  new LineString([
    [0, 0],
    [10, 0],
  ]);

describe('templateTarget', () => {
  it('prefers the source layer, then the active layer, then the draft layer', () => {
    expect(templateTarget(context(), { layer: 'roads', geometry: line() })?.layerId).toBe('roads');
    expect(templateTarget(context(), { layer: 'tracks', geometry: line() })?.layerId).toBe('draft');
    expect(templateTarget(context('roads'), { layer: 'tracks', geometry: line() })?.layerId).toBe(
      'roads',
    );
    // The active layer must take the type; a removed source layer falls through.
    expect(templateTarget(context('parcels'), { layer: 'gone', geometry: line() })?.layerId).toBe(
      'draft',
    );
    expect(templateTarget(context(null, null), { layer: 'tracks', geometry: line() })).toBeNull();
  });
});

describe('templateInsertCommand', () => {
  it('builds one composite of inserts with copied attributes over schema defaults', () => {
    const store = new TemplateStore();
    const id = store.create(
      [
        { feature: new Feature({ name: 'Main', geometry: line() }), layer: 'roads' },
        { feature: new Feature({ pressure: 4, geometry: new Point([5, 5]) }), layer: 'hydrants' },
        { feature: new Feature({ geometry: new Point([1, 1]) }), layer: 'parcels' }, // no fit
      ],
      [0, 0],
    );
    const template = store.get(id)!;
    const ctx = context(null, null);
    expect(canInsertTemplate(ctx, template)).toBe(true);
    const result = templateInsertCommand(ctx, store, template, [100, 0])!;
    const command = result.command as CompositeCommand;
    expect(command).toMatchObject({ type: 'composite', label: 'template' });
    expect(command.commands).toHaveLength(2); // the point copied from parcels has no target
    const [road, hydrant] = command.commands as InsertFeatureCommand[];
    expect(road).toMatchObject({ type: 'insert', layer: 'roads', template: id });
    expect(road!.feature.get('name')).toBe('Main');
    expect((road!.feature.getGeometry() as LineString).getCoordinates()).toEqual([
      [100, 0],
      [110, 0],
    ]);
    expect(hydrant!.layer).toBe('hydrants');
    expect(hydrant!.feature.getProperties()).toMatchObject({ colour: 'red', pressure: 4 });
    // Wrapped for the multi-part layer.
    expect(hydrant!.feature.getGeometry()).toBeInstanceOf(MultiPoint);
    expect(result.features).toEqual([road!.feature, hydrant!.feature]);
    // Each insert gets fresh features and attributes.
    const again = templateInsertCommand(ctx, store, template, [0, 0])!;
    expect(again.features[0]).not.toBe(road!.feature);
  });

  it('is null when no object fits anywhere', () => {
    const store = new TemplateStore();
    const id = store.create([{ feature: new Feature(line()), layer: 'tracks' }], [0, 0]);
    const ctx = context(null, null);
    expect(canInsertTemplate(ctx, store.get(id)!)).toBe(false);
    expect(templateInsertCommand(ctx, store, store.get(id)!, [1, 1])).toBeNull();
  });
});
