// @vitest-environment jsdom
import Collection from 'ol/Collection';
import { squaredDistanceToSegment } from 'ol/coordinate';
import type Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { bezierLineString, bezierPoint } from '../geometry/bezier';
import { Selection } from '../selection/Selection';
import { CURVE_PROMPTS, CurveTool } from './curve';
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
type Sourced = { getSource(): { getFeatures(): Feature[] } };

const layerConfigs: Record<string, ResolvedLayerConfig> = {
  roads: { geometryType: 'LineString' } as unknown as ResolvedLayerConfig,
  parcels: { geometryType: 'Polygon' } as unknown as ResolvedLayerConfig,
  draft: { geometryType: 'Any' } as unknown as ResolvedLayerConfig,
};

function setup(active: string | null) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getView: () => ({ getResolution: () => 1 }), // pick radius: 10 map units
  } as unknown as OlMap;
  const selection = new Selection(map, selectionConfig, () => {});
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
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new CurveTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const lines = () =>
    preview()
      .filter((f) => f.getGeometry()!.getType() === 'LineString')
      .map((f) => (f.getGeometry() as LineString).getCoordinates());
  const inserted = (index = 0) => {
    const command = ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    return { command, line: command.feature.getGeometry() as LineString };
  };
  return { tool, ctx, interactions, layers, selection, event, preview, lines, inserted };
}

describe('CurveTool', () => {
  it('activates only with a target layer accepting lines', () => {
    expect(setup('parcels').tool.canActivate(setup('parcels').ctx)).toBe(false);
    expect(setup('roads').tool.canActivate(setup('roads').ctx)).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx)).toBe(true); // the draft layer
  });

  it('takes start and end, shows the straight chord with two handles, and inserts on Enter', () => {
    const { tool, ctx, event, preview, lines, selection, inserted } = setup('roads');
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.start);
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [0, 0])).toBe(false); // consumed
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.end);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('pointermove', [50, 50]);
    expect(lines()).toEqual([
      [
        [0, 0],
        [50, 50],
      ],
    ]);
    event('click', [0, 0]); // the same point: no chord, ignored
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.end);
    expect(tool.handleInput([90, 0])).toBe(true);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.shape);
    expect(tool.referencePoint()).toBeNull();
    expect(tool.curve()).toEqual({
      start: [0, 0],
      startHandle: [30, 0],
      endHandle: [60, 0],
      end: [90, 0],
    });
    // The chord, two handle legs, two end markers and two handle points.
    expect(lines()).toEqual([
      [
        [0, 0],
        [90, 0],
      ],
      [
        [0, 0],
        [30, 0],
      ],
      [
        [90, 0],
        [60, 0],
      ],
    ]);
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'picked')).toHaveLength(2);
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'hover')).toHaveLength(0);
    expect(tool.handleInput([5, 5])).toBe(false); // the shape step wants a handle click
    tool.finish();
    const { command, line } = inserted();
    expect(command.layer).toBe('roads');
    expect(line.getCoordinates()).toEqual([
      [0, 0],
      [90, 0],
    ]);
    expect(selection.get()).toEqual([command.feature]);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.start);
    expect(preview()).toEqual([]);
  });

  it('picks a handle under the pointer, bends the curve while moving and places it', () => {
    const { tool, ctx, event, preview, lines, inserted } = setup('roads');
    tool.activate(ctx);
    event('click', [0, 0]);
    event('click', [90, 0]);
    event('pointermove', [31, 4]); // within 10 units of the start handle (30, 0)
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'hover')).toHaveLength(1);
    event('pointermove', [45, 40]); // away from both handles
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'hover')).toHaveLength(0);
    event('click', [45, 40]); // a click away from the handles does nothing
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.shape);
    event('click', [31, 4]);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.handle);
    expect(tool.referencePoint()).toEqual([0, 0]); // the handle's end point
    event('pointermove', [30, 60]);
    const curve = tool.curve()!;
    expect(curve.startHandle).toEqual([30, 60]);
    const bent = lines()[0]!;
    expect(bent.length).toBeGreaterThan(2);
    const mid = bezierPoint(curve, 0.5);
    let nearest = Infinity;
    for (let i = 1; i < bent.length; i++) {
      nearest = Math.min(nearest, squaredDistanceToSegment(mid, [bent[i - 1]!, bent[i]!]));
    }
    expect(Math.sqrt(nearest)).toBeLessThan(0.01);
    // Typed `@60<90` arrives as a point; it places the handle.
    expect(tool.handleInput([0, 60])).toBe(true);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.shape);
    expect(tool.curve()!.startHandle).toEqual([0, 60]);
    // The end handle can be adjusted too; Enter while placing keeps the pointer position.
    event('click', [60, 0]);
    event('pointermove', [90, -60]);
    tool.finish();
    const { line } = inserted();
    const expected = bezierLineString(
      { start: [0, 0], startHandle: [0, 60], endHandle: [90, -60], end: [90, 0] },
      0.01 * 1, // one unit is one metre at the origin
    );
    expect(line.getCoordinates()).toEqual(expected.getCoordinates());
    expect(line.getCoordinates().length).toBeGreaterThan(10);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.start);
  });

  it('steps back with Escape and Backspace, restoring a picked handle', () => {
    const { tool, ctx, event } = setup('roads');
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [0, 0]);
    event('click', [90, 0]);
    event('click', [30, 0]);
    event('pointermove', [30, 50]);
    expect(tool.curve()!.startHandle).toEqual([30, 50]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.shape);
    expect(tool.curve()!.startHandle).toEqual([30, 0]); // restored
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.end);
    expect(tool.curve()).toBeNull();
    expect(tool.referencePoint()).toEqual([0, 0]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.start);
    tool.finish(); // nothing to insert
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('keeps the shape when the insert is rejected and cleans up on deactivate', () => {
    const { tool, ctx, event, interactions, layers } = setup(null);
    tool.activate(ctx);
    event('click', [0, 0]);
    event('click', [50, 0]);
    ctx.execute.mockReturnValueOnce(false);
    tool.finish();
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.shape);
    tool.finish();
    expect(ctx.execute).toHaveBeenCalledTimes(2);
    expect((ctx.execute.mock.calls[1]![0] as InsertFeatureCommand).layer).toBe('draft');
    event('click', [0, 0]);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(CURVE_PROMPTS.start);
  });
});
