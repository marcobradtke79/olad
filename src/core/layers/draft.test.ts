// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import type {
  CompositeCommand,
  DeleteFeatureCommand,
  InsertFeatureCommand,
} from '../changes/commands';
import type { GeometryType, ResolvedLayerConfig } from '../config/types';
import {
  draftTargets,
  layerAcceptsGeometry,
  moveDraftsCommand,
  type DraftMoveContext,
} from './draft';

const line = () =>
  new LineString([
    [0, 0],
    [10, 0],
  ]);

function setup(draftFeatures: Feature[] = []) {
  const configs: Record<string, Partial<ResolvedLayerConfig> & { geometryType: GeometryType }> = {
    roads: {
      geometryType: 'LineString',
      schema: { fields: [{ name: 'lanes', type: 'integer', default: 2 }] },
    } as never,
    rivers: { geometryType: 'MultiLineString', idProperty: 'id' },
    parcels: { geometryType: 'Polygon' },
    archive: { geometryType: 'LineString' }, // no inserts
    draft: { geometryType: 'Any', idProperty: 'fid' },
  };
  const ctx: DraftMoveContext = {
    layers: {
      list: () => Object.keys(configs).map((id) => ({ id })) as never,
      has: (id: string) => id in configs,
      canEdit: (id: string, op: string) => !(id === 'archive' && op === 'insert'),
      getConfig: (id: string) => configs[id] as ResolvedLayerConfig,
      layerOf: (f: Feature) => (draftFeatures.includes(f) ? 'draft' : undefined),
    } as unknown as DraftMoveContext['layers'],
    getDraftLayer: () => 'draft',
  };
  return ctx;
}

describe('layerAcceptsGeometry', () => {
  it('takes the same type, a single part for a multi-part layer, anything on Any', () => {
    expect(layerAcceptsGeometry('LineString', line())).toBe(true);
    expect(layerAcceptsGeometry('MultiLineString', line())).toBe(true);
    expect(layerAcceptsGeometry('LineString', new MultiLineString([line().getCoordinates()]))).toBe(
      false,
    );
    expect(layerAcceptsGeometry('Polygon', line())).toBe(false);
    expect(layerAcceptsGeometry('Any', new Point([0, 0]))).toBe(true);
  });
});

describe('draftTargets', () => {
  it('lists the layers that allow inserts and take the geometry, never the draft layer', () => {
    const drafted = new Feature(line());
    const ctx = setup([drafted]);
    expect(draftTargets(ctx, drafted)).toEqual(['roads', 'rivers']);
    const polygon = new Feature(
      new Polygon([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ]),
    );
    expect(draftTargets(setup([polygon]), polygon)).toEqual(['parcels']);
  });

  it('is empty for a feature outside the draft layer or without geometry', () => {
    const ctx = setup();
    expect(draftTargets(ctx, new Feature(line()))).toEqual([]);
    const empty = new Feature();
    expect(draftTargets(setup([empty]), empty)).toEqual([]);
  });
});

describe('moveDraftsCommand', () => {
  it('deletes the drafts and inserts copies with defaults under their own attributes', () => {
    const drafted = new Feature({ geometry: line(), fid: 7, lanes: 4, name: 'Bypass' });
    const ctx = setup([drafted]);
    const move = moveDraftsCommand(ctx, [drafted], 'roads')!;
    const command = move.command as CompositeCommand;
    expect(command.type).toBe('composite');
    const [remove, insert] = command.commands as [DeleteFeatureCommand, InsertFeatureCommand];
    expect(remove).toMatchObject({ type: 'delete', feature: drafted });
    expect(insert.type).toBe('insert');
    expect(insert.layer).toBe('roads');
    expect(move.features).toEqual([insert.feature]);
    expect(move.sources).toEqual([drafted]);
    const { geometry, ...properties } = insert.feature.getProperties();
    expect(properties).toEqual({ lanes: 4, name: 'Bypass' }); // the draft's id is dropped
    expect((geometry as LineString).getCoordinates()).toEqual(line().getCoordinates());
    expect(geometry).not.toBe(drafted.getGeometry());
  });

  it('moves only the drafts the layer takes, deletes first, in order', () => {
    const a = new Feature(line());
    const point = new Feature(new Point([5, 5]));
    const b = new Feature(line());
    const ctx = setup([a, point, b]);
    const move = moveDraftsCommand(ctx, [a, point, b], 'roads')!;
    expect(move.sources).toEqual([a, b]);
    const commands = (move.command as CompositeCommand).commands;
    expect(commands.map((c) => c.type)).toEqual(['delete', 'delete', 'insert', 'insert']);
    expect((commands[0] as DeleteFeatureCommand).feature).toBe(a);
    expect((commands[1] as DeleteFeatureCommand).feature).toBe(b);
    expect(commands.slice(2).map((c) => (c as InsertFeatureCommand).feature)).toEqual(
      move.features,
    );
  });

  it('applies schema defaults and wraps for a multi-part layer', () => {
    const drafted = new Feature(line());
    const ctx = setup([drafted]);
    expect(moveDraftsCommand(ctx, [drafted], 'roads')!.features[0]!.get('lanes')).toBe(2);
    const river = moveDraftsCommand(ctx, [drafted], 'rivers')!.features[0]!.getGeometry()!;
    expect(river.getType()).toBe('MultiLineString');
  });

  it('is null when the layer takes none of them', () => {
    const drafted = new Feature(line());
    const ctx = setup([drafted]);
    expect(moveDraftsCommand(ctx, [drafted], 'parcels')).toBeNull();
    expect(moveDraftsCommand(ctx, [drafted], 'archive')).toBeNull();
    expect(moveDraftsCommand(ctx, [drafted], 'draft')).toBeNull();
    expect(moveDraftsCommand(ctx, [], 'roads')).toBeNull();
  });
});
