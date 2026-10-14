// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { PREVIEW_LAYER_PROPERTY } from './preview';
import { RECTANGLE_PROMPTS, RectangleTool, rectangleTarget } from './rectangle';
import type { ToolContext } from './Tool';

const selectionConfig = {
  strokeColor: 'red',
  strokeWidth: 2,
  fillColor: 'pink',
  pointRadius: 5,
  haloColor: 'white',
  haloWidth: 0,
  vertexSize: 0,
  inspect: true,
};
type Sourced = { getSource(): { getFeatures(): Feature[] } };

const layerConfigs: Record<string, ResolvedLayerConfig> = {
  parcels: { geometryType: 'Polygon' } as unknown as ResolvedLayerConfig,
  roads: { geometryType: 'LineString' } as unknown as ResolvedLayerConfig,
  draft: { geometryType: 'Any' } as unknown as ResolvedLayerConfig,
};

function setup(active: string | null, angle = 0, insertable = new Set(Object.keys(layerConfigs))) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
  } as unknown as OlMap;
  const selection = new Selection(map, selectionConfig, () => {});
  const ctx = {
    map,
    layers: {
      list: () => [],
      has: (id: string) => id in layerConfigs,
      canEdit: (id: string) => insertable.has(id),
      getConfig: (id: string) => layerConfigs[id]!,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => active,
    getDraftLayer: () => 'draft',
    hitTolerance: 4,
    canUpdate: () => true,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => angle,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new RectangleTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  return { tool, ctx, interactions, layers, selection, event, preview };
}

describe('rectangleTarget', () => {
  it('needs a layer that allows inserts and accepts polygons, falling back to the draft layer', () => {
    expect(rectangleTarget(setup('parcels').ctx)?.layerId).toBe('parcels');
    expect(rectangleTarget(setup(null).ctx)?.layerId).toBe('draft');
    expect(rectangleTarget(setup('roads').ctx)).toBeNull();
    expect(rectangleTarget(setup('parcels', 0, new Set()).ctx)).toBeNull();
    expect(setup('roads').tool.canActivate(setup('roads').ctx)).toBe(false);
    expect(setup('parcels').tool.canActivate(setup('parcels').ctx)).toBe(true);
  });
});

describe('RectangleTool', () => {
  it('takes two corners, previews the rectangle and inserts it selected, then starts over', () => {
    const { tool, ctx, event, preview, selection } = setup('parcels');
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.first);
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [10, 10])).toBe(false); // consumed
    expect(event('dblclick', [10, 10])).toBe(false);
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.second);
    expect(tool.referencePoint()).toEqual([10, 10]);
    event('pointermove', [14, 13]);
    const ghost = preview();
    expect(ghost).toHaveLength(1);
    expect((ghost[0]!.getGeometry() as Polygon).getCoordinates()[0]).toEqual([
      [10, 10],
      [14, 10],
      [14, 13],
      [10, 13],
      [10, 10],
    ]);
    expect(tool.handleInput([14, 13])).toBe(true);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    expect(command.layer).toBe('parcels');
    expect((command.feature.getGeometry() as Polygon).getCoordinates()[0]).toEqual([
      [10, 10],
      [14, 10],
      [14, 13],
      [10, 13],
      [10, 10],
    ]);
    expect(selection.get()).toEqual([command.feature]);
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.first);
    expect(preview()).toEqual([]);
  });

  it('follows the straightedge angle and ignores a degenerate opposite corner', () => {
    const { tool, ctx, event } = setup(null, 90);
    tool.activate(ctx);
    expect(tool.handleInput([0, 0])).toBe(true);
    event('click', [5, 0]); // along the rotated x axis only: no height
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.second);
    event('click', [2, 3]);
    const command = ctx.execute.mock.calls[0]![0] as InsertFeatureCommand;
    expect(command.layer).toBe('draft');
    const ring = (command.feature.getGeometry() as Polygon).getCoordinates()[0]!;
    expect(ring).toHaveLength(5);
    // A 90° straightedge swaps the axes; the ring still holds the four corners, counter-clockwise.
    const corners = ring.slice(0, 4).map((c) => c.map((v) => Math.round(v * 1e9) / 1e9 + 0)); // +0 drops -0
    expect(corners).toEqual(
      expect.arrayContaining([
        [0, 0],
        [2, 0],
        [2, 3],
        [0, 3],
      ]),
    );
    expect((command.feature.getGeometry() as Polygon).getArea()).toBeCloseTo(6, 9);
  });

  it('Escape and Backspace drop the first corner; deactivation removes the preview', () => {
    const { tool, ctx, event, layers, interactions } = setup('parcels');
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [1, 1]);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.first);
    event('click', [1, 1]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(RECTANGLE_PROMPTS.first);
    expect(tool.referencePoint()).toBeNull();
    event('click', [1, 1]);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    expect(ctx.execute).not.toHaveBeenCalled();
  });
});
