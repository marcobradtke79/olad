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
import { unitsPerMetre } from '../measure';
import { Selection } from '../selection/Selection';
import { PARALLEL_PROMPTS, ParallelTool } from './parallel';
import { PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
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
  hydrants: { geometryType: 'Point' } as unknown as ResolvedLayerConfig,
  draft: { geometryType: 'Any' } as unknown as ResolvedLayerConfig,
};
const PROJECTION = 'EPSG:3857'; // one unit is about one metre near the origin

const road = () =>
  new Feature(
    new LineString([
      [0, 0],
      [100, 0],
      [100, 100],
    ]),
  );

function setup(selected: Feature[] = [], active: string | null = null) {
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
      canEdit: () => true,
      getConfig: (id: string) => layerConfigs[id]!,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => active,
    getDraftLayer: () => 'draft',
    hitTolerance: 4,
    canUpdate: () => true,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => PROJECTION,
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & { execute: ReturnType<typeof vi.fn> };
  const tool = new ParallelTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[1]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const inserted = (index = 0) => {
    const command = ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    return { command, line: (command.feature.getGeometry() as LineString).getCoordinates() };
  };
  return { tool, ctx, interactions, layers, selection, event, preview, inserted };
}

describe('ParallelTool', () => {
  it('needs a layer that takes lines', () => {
    expect(new ParallelTool().canActivate(setup([], 'hydrants').ctx)).toBe(false);
    expect(new ParallelTool().canActivate(setup([], 'roads').ctx)).toBe(true);
    expect(new ParallelTool().canActivate(setup([], null).ctx)).toBe(true); // the draft layer
  });

  it('asks for an object, takes a suitable selection as the reference', async () => {
    const { tool, ctx, selection } = setup();
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.select);
    expect(tool.handleInput([1, 1])).toBe(false);
    selection.set([new Feature(new Point([0, 0]))]);
    await tick();
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.select); // points have no parallel
    selection.set([road()]);
    await tick();
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.start);
  });

  it('follows the reference through its bend from the start point to the pointer', () => {
    const { tool, ctx, event, preview, selection, inserted } = setup([road()], 'roads');
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.start); // a selection exists
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [20, 10])).toBe(false); // 10 left of travel, inside the bend
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.end);
    expect(tool.referencePoint()).toEqual([20, 10]);
    event('pointermove', [200, 50]); // beyond the bend, level with y 50
    const line = preview().find((f) => f.getGeometry()!.getType() === 'LineString')!;
    expect((line.getGeometry() as LineString).getCoordinates()).toEqual([
      [20, 10],
      [90, 10],
      [90, 50],
    ]);
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY))).toHaveLength(2);
    event('click', [200, 50]);
    const { command, line: drawn } = inserted();
    expect(command.layer).toBe('roads');
    expect(drawn).toEqual([
      [20, 10],
      [90, 10],
      [90, 50],
    ]);
    expect(selection.get()).toEqual([command.feature]);
    // The reference stays: the next click is a new start point.
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.start);
    event('click', [50, -5]); // the other side now
    event('click', [0, -50]);
    expect(inserted(1).line).toEqual([
      [50, -5],
      [0, -5],
    ]);
  });

  it('takes a typed length in metres in the direction the pointer pulls', () => {
    const { tool, ctx, event, inserted } = setup([road()]);
    tool.activate(ctx);
    expect(tool.handleLength(30)).toBe(false); // not the end step
    event('click', [20, 10]);
    expect(tool.handleLength(0)).toBe(true); // taken, ignored
    expect(ctx.execute).not.toHaveBeenCalled();
    event('pointermove', [5, 10]); // pulling backwards
    expect(tool.handleLength(10)).toBe(true);
    const length = 10 * unitsPerMetre(PROJECTION, [20, 10]);
    const { command, line } = inserted();
    expect(command.layer).toBe('draft');
    expect(line[0]).toEqual([20, 10]);
    expect(line[1]![0]).toBeCloseTo(20 - length, 9);
    expect(line[1]![1]).toBeCloseTo(10, 9);
  });

  it('runs around a polygon ring past the corner it started from', () => {
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
    const { tool, ctx, event, inserted } = setup([parcel]);
    tool.activate(ctx);
    event('click', [2, 5]); // 2 inside the left side, half way up
    // Down the left side, round the corner (the ring's start) and along the bottom.
    event('pointermove', [2, 3]);
    event('pointermove', [3, 2]);
    event('click', [6, 2]);
    expect(inserted().line).toEqual([
      [2, 5],
      [2, 2],
      [6, 2],
    ]);
  });

  it('skips a narrow notch on the object instead of refusing', () => {
    // A 1-wide, 5-deep notch on the right of the line; the parallel runs 10 to the left.
    const notched = new Feature(
      new LineString([
        [0, 0],
        [100, 0],
        [100, -5],
        [101, -5],
        [101, 0],
        [200, 0],
      ]),
    );
    const { tool, ctx, event, inserted } = setup([notched]);
    tool.activate(ctx);
    event('click', [20, 10]);
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.end);
    event('click', [180, 30]);
    expect(inserted().line).toEqual([
      [20, 10],
      [101, 10],
      [180, 10],
    ]);
  });

  it('goes past a pocket it cannot follow instead of crossing into it', () => {
    const pocketed = new Feature(
      new LineString([
        [0, 0],
        [100, 0],
        [90, -60],
        [160, -60],
        [110, 0],
        [200, 0],
      ]),
    );
    const { tool, ctx, event, preview, inserted } = setup([pocketed]);
    tool.activate(ctx);
    event('click', [50, 20]);
    event('pointermove', [190, 40]);
    const line = preview().find((f) => f.getGeometry()!.getType() === 'LineString')!;
    const shown = (line.getGeometry() as LineString).getCoordinates();
    expect(shown[0]).toEqual([50, 20]);
    expect(shown.at(-1)).toEqual([190, 20]);
    expect(shown.every(([, y]) => y === 20)).toBe(true);
    event('click', [190, 40]);
    expect(inserted().line.every(([, y]) => y === 20)).toBe(true);
  });

  it('refuses a start point that leaves no parallel, and steps back on Escape', () => {
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
    const { tool, ctx, event, selection, layers, interactions } = setup([parcel]);
    tool.activate(ctx);
    event('click', [5, 5]); // the centre: every side collapses
    expect(tool.getPrompt()).toBe(
      `No parallel at this distance: the object bends too tightly. ${PARALLEL_PROMPTS.start}`,
    );
    event('click', [5, 2]);
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.end);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.start);
    tool.cancel();
    expect(tool.getPrompt()).toBe(PARALLEL_PROMPTS.select);
    expect(selection.get()).toEqual([]);
    expect(tool.removeLastPoint()).toBe(false);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
  });
});
