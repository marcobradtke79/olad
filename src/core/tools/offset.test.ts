// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { isOffsetable, OFFSET_PROMPTS, OffsetTool, offsetTarget } from './offset';
import { PREVIEW_LAYER_PROPERTY } from './preview';
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
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
type Sourced = { getSource(): { getFeatures(): Feature[] } };

const layerConfigs: Record<string, ResolvedLayerConfig> = {
  roads: { geometryType: 'LineString' } as unknown as ResolvedLayerConfig,
  tracks: { geometryType: 'LineString' } as unknown as ResolvedLayerConfig, // read-only
  parcels: { geometryType: 'Polygon' } as unknown as ResolvedLayerConfig,
  draft: { geometryType: 'Any' } as unknown as ResolvedLayerConfig,
};
const insertable = new Set(['roads', 'parcels', 'draft']);

const road = () =>
  new LineString([
    [0, 0],
    [100, 0],
  ]);

function setup(
  selected: Feature[] = [],
  layerOf: (f: Feature) => string | undefined = () => 'roads',
  active: string | null = null,
  draft: string | null = 'draft',
) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
  } as unknown as OlMap;
  const selection = new Selection(map, selectionConfig, () => {});
  selection.set(selected);
  const ctx = {
    map,
    layers: {
      list: () => [],
      has: (id: string) => id in layerConfigs,
      canEdit: (id: string) => insertable.has(id),
      getConfig: (id: string) => layerConfigs[id]!,
      layerOf,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => active,
    getDraftLayer: () => draft,
    hitTolerance: 4,
    canUpdate: () => true,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => 'EPSG:3857', // one unit is one metre near the origin
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new OffsetTool();
  tool.activate(ctx);
  const active_ = () => interactions.getArray().map((i) => i.getActive());
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[1]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const inserted = (index = 0) => {
    const command = ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    return { command, geometry: command.feature.getGeometry()! };
  };
  return { tool, ctx, interactions, layers, selection, active: active_, event, preview, inserted };
}

describe('offsetTarget', () => {
  it('prefers the source layer, then the active layer, then the draft layer, when they fit', () => {
    const { ctx } = setup();
    const line = road();
    expect(offsetTarget(ctx, 'roads', line)?.layerId).toBe('roads');
    expect(offsetTarget(ctx, 'tracks', line)?.layerId).toBe('draft'); // read-only source
    expect(offsetTarget(setup([], () => 'tracks', 'roads').ctx, 'tracks', line)?.layerId).toBe(
      'roads',
    );
    expect(offsetTarget(setup([], () => 'tracks', 'parcels').ctx, 'tracks', line)?.layerId).toBe(
      'draft',
    ); // a line does not fit the active polygon layer
    expect(offsetTarget(setup([], () => 'tracks', 'parcels', null).ctx, 'tracks', line)).toBeNull();
    expect(isOffsetable(new Feature(new Point([0, 0])))).toBe(false);
    expect(isOffsetable(new Feature(road()))).toBe(true);
  });
});

describe('OffsetTool', () => {
  it('starts selecting without a usable selection and at the distance with one line selected', () => {
    const empty = setup();
    expect(empty.tool.getPrompt()).toBe(OFFSET_PROMPTS.select);
    expect(empty.active()).toEqual([true, false]);
    const point = setup([new Feature(new Point([1, 1]))]);
    expect(point.tool.getPrompt()).toBe(OFFSET_PROMPTS.select);
    const line = setup([new Feature(road())]);
    expect(line.tool.getPrompt()).toBe(OFFSET_PROMPTS.distance);
    expect(line.active()).toEqual([false, false]);
    expect(line.tool.referencePoint()).toBeNull();
  });

  it('takes a typed distance, previews the side under the pointer and inserts the copy selected', async () => {
    const source = new Feature(road());
    const { tool, ctx, event, preview, selection, inserted, active } = setup([source]);
    expect(tool.handleLength(0)).toBe(false);
    expect(tool.handleLength(-3)).toBe(false);
    expect(tool.handleInput([5, 5])).toBe(false); // no point wanted yet
    expect(tool.handleLength(10)).toBe(true);
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.side);

    expect(tool.getInputRequest()).toBe(null);
    expect(active()).toEqual([false, true]);
    event('pointermove', [50, 30]);
    expect((preview()[0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 10],
      [100, 10],
    ]);
    event('pointermove', [50, -30]);
    expect((preview()[0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, -10],
      [100, -10],
    ]);
    expect(event('click', [50, -30])).toBe(false); // consumed
    const { command, geometry } = inserted();
    expect(command.layer).toBe('roads');
    expect((geometry as LineString).getCoordinates()).toEqual([
      [0, -10],
      [100, -10],
    ]);
    expect(selection.get()).toEqual([command.feature]);
    await tick();
    // The copy is the next source; the distance is remembered.
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.distanceAgain.replaceAll('{distance}', '10.00 m'));
    expect(tool.getDistance()).toBe(10);
    expect(preview()).toEqual([]);
    tool.finish();
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.side);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.handleInput([50, -40])).toBe(true);
    expect((inserted(1).geometry as LineString).getCoordinates()).toEqual([
      [0, -20],
      [100, -20],
    ]);
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('offsets a polygon inwards or outwards and ignores a collapsing or ambiguous side', () => {
    const parcel = new Feature(
      new Polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
    );
    const { tool, ctx, event, inserted } = setup([parcel], () => 'parcels');
    tool.handleLength(1);
    event('click', [5, 5]); // inside: shrink
    expect((inserted().geometry as Polygon).getArea()).toBeCloseTo(64, 6);
    expect(inserted().command.layer).toBe('parcels');
    // A fresh tool on the original parcel again: outside grows.
    const grow = setup([parcel], () => 'parcels');
    grow.tool.handleLength(1);
    grow.event('click', [20, 5]);
    expect((grow.inserted().geometry as Polygon).getArea()).toBeCloseTo(144, 6);
    // Shrinking past the size collapses: nothing inserted, still asking for the side.
    const collapse = setup([parcel], () => 'parcels');
    collapse.tool.handleLength(6);
    collapse.event('click', [5, 5]);
    expect(collapse.ctx.execute).not.toHaveBeenCalled();
    expect(collapse.tool.getPrompt()).toBe(OFFSET_PROMPTS.side);
    // A point on the line of a segment has no side.
    const ambiguous = setup([new Feature(road())]);
    ambiguous.tool.handleLength(1);
    ambiguous.event('click', [50, 0]);
    expect(ambiguous.ctx.execute).not.toHaveBeenCalled();
    expect(ctx.execute).toHaveBeenCalledTimes(1);
  });

  it('keeps the side step when the insert is rejected or no layer takes the copy', () => {
    const rejected = setup([new Feature(road())]);
    rejected.ctx.execute.mockReturnValue(false);
    rejected.tool.handleLength(5);
    rejected.event('click', [50, 5]);
    expect(rejected.ctx.execute).toHaveBeenCalledTimes(1);
    expect(rejected.tool.getPrompt()).toBe(OFFSET_PROMPTS.side);
    const nowhere = setup([new Feature(road())], () => 'tracks', 'parcels', null);
    nowhere.tool.handleLength(5);
    nowhere.event('click', [50, 5]);
    expect(nowhere.ctx.execute).not.toHaveBeenCalled();
    expect(nowhere.tool.getPrompt()).toBe(OFFSET_PROMPTS.side);
  });

  it('steps back with Escape and Backspace, clearing the selection on the way to select', async () => {
    const source = new Feature(road());
    const { tool, selection, active } = setup([source]);
    expect(tool.removeLastPoint()).toBe(true); // distance → select, dropping the selection
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(selection.get()).toEqual([]);
    expect(active()).toEqual([true, false]);
    selection.set([source]);
    await tick();
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.distance);

    expect(tool.getInputRequest()).toBe('value');
    tool.handleLength(3);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.distanceAgain.replaceAll('{distance}', '3.00 m'));
    tool.cancel();
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.removeLastPoint()).toBe(false);
    // Losing the source mid-way returns to select.
    selection.set([source]);
    await tick();
    tool.finish();
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.side);

    expect(tool.getInputRequest()).toBe(null);
    selection.clear();
    await tick();
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('remembers the distance across activations and cleans up on deactivate', () => {
    const { tool, ctx, interactions, layers } = setup([new Feature(road())]);
    tool.handleLength(7);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(OFFSET_PROMPTS.distanceAgain.replaceAll('{distance}', '7.00 m'));
    tool.setSuspended(true);
    expect(interactions.getArray().map((i) => i.getActive())).toEqual([false, false]);
    tool.setSuspended(false);
    tool.deactivate();
  });
});
