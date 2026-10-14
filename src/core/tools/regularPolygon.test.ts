// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import type Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
import {
  DEFAULT_REGULAR_POLYGON_SIDES,
  REGULAR_POLYGON_PROMPTS,
  RegularPolygonTool,
} from './regularPolygon';
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

const prompt = (step: keyof typeof REGULAR_POLYGON_PROMPTS, sides: number) =>
  REGULAR_POLYGON_PROMPTS[step].replaceAll('{sides}', String(sides));

function setup(active: string | null) {
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
  const tool = new RegularPolygonTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const inserted = (index = 0) => {
    const command = ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    return { command, ring: (command.feature.getGeometry() as Polygon).getCoordinates()[0]! };
  };
  return { tool, ctx, interactions, layers, selection, event, preview, inserted };
}

function expectRegular(ring: number[][], centre: number[], radius: number, sides: number): void {
  expect(ring).toHaveLength(sides + 1);
  expect(ring[sides]).toEqual(ring[0]);
  const edge = 2 * radius * Math.sin(Math.PI / sides);
  for (let i = 0; i < sides; i++) {
    const [x, y] = ring[i]!;
    expect(Math.hypot(x! - centre[0]!, y! - centre[1]!)).toBeCloseTo(radius, 6);
    const [nx, ny] = ring[i + 1]!;
    expect(Math.hypot(nx! - x!, ny! - y!)).toBeCloseTo(edge, 6);
  }
}

describe('RegularPolygonTool', () => {
  it('activates only with a polygon-capable target and a valid side count option', () => {
    expect(setup('roads').tool.canActivate(setup('roads').ctx)).toBe(false);
    expect(setup('parcels').tool.canActivate(setup('parcels').ctx)).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { sides: 8 })).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { sides: 2 })).toBe(false);
    expect(setup(null).tool.canActivate(setup(null).ctx, { sides: 4.5 })).toBe(false);
  });

  it('asks for the number of sides, takes a typed count and refuses invalid ones', () => {
    const { tool, ctx } = setup('parcels');
    tool.activate(ctx);
    expect(DEFAULT_REGULAR_POLYGON_SIDES).toBe(6);
    expect(tool.getPrompt()).toBe(prompt('sides', 6));
    expect(tool.getPrompt()).toContain('Number of sides <6>');
    expect(tool.getInputRequest()).toBe('value');
    expect(tool.referencePoint()).toBeNull();
    expect(tool.handleValue(2)).toBe(false);
    expect(tool.handleValue(4.5)).toBe(false);
    expect(tool.handleValue(1025)).toBe(false);
    expect(tool.getPrompt()).toBe(prompt('sides', 6));
    expect(tool.handleValue(5)).toBe(true);
    expect(tool.getSides()).toBe(5);
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.handleValue(7)).toBe(false); // not asked for now: a number is a distance here
    expect(tool.getSides()).toBe(5);
  });

  it('Enter keeps the count; a click in the sides step sets the centre directly', () => {
    const { tool, ctx, event } = setup('parcels');
    tool.activate(ctx);
    tool.finish();
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    tool.finish(); // nothing to confirm
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    tool.cancel();
    expect(tool.getPrompt()).toBe(prompt('sides', 6));
    expect(event('click', [10, 10])).toBe(false); // consumed
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.vertex);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toEqual([10, 10]);
  });

  it('previews the polygon through the pointer and inserts it selected, then asks for the next centre', () => {
    const { tool, ctx, event, preview, selection, inserted } = setup('parcels');
    tool.activate(ctx);
    tool.handleValue(5);
    event('click', [100, 200]);
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.vertex);

    expect(tool.getInputRequest()).toBe(null);
    event('pointermove', [130, 240]);
    const ghost = preview();
    const polygon = ghost.find((f) => f.getGeometry()!.getType() === 'Polygon')!;
    expectRegular((polygon.getGeometry() as Polygon).getCoordinates()[0]!, [100, 200], 50, 5);
    const leg = ghost.find((f) => f.getGeometry()!.getType() === 'LineString')!;
    expect((leg.getGeometry() as LineString).getCoordinates()).toEqual([
      [100, 200],
      [130, 240],
    ]);
    expect(ghost.some((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'picked')).toBe(true);
    expect(ghost.some((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'hover')).toBe(true);
    // A typed radius arrives as a point 40 m from the centre (resolved by the editor).
    expect(tool.handleInput([140, 200])).toBe(true);
    const { command, ring } = inserted();
    expect(command.layer).toBe('parcels');
    expectRegular(ring, [100, 200], 40, 5);
    expect(ring[0]).toEqual([140, 200]); // the reference point is the first vertex
    expect(selection.get()).toEqual([command.feature]);
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(preview()).toEqual([]);
    // The next polygon keeps the count.
    event('click', [0, 0]);
    event('click', [0, 3]);
    expectRegular(inserted(1).ring, [0, 0], 3, 5);
  });

  it('ignores a vertex on the centre', () => {
    const { tool, ctx, event } = setup('parcels');
    tool.activate(ctx, { sides: 4 });
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null); // the option skips the question
    event('click', [1, 1]);
    event('click', [1, 1]);
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.vertex);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('steps back with Escape and Backspace', () => {
    const { tool, ctx, event, preview } = setup('parcels');
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    tool.handleValue(3);
    event('click', [0, 0]);
    event('pointermove', [2, 2]);
    expect(preview().length).toBeGreaterThan(0);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(REGULAR_POLYGON_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(preview()).toEqual([]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(prompt('sides', 3));
    tool.cancel();
    expect(tool.getPrompt()).toBe(prompt('sides', 3));
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('remembers the count across activations, inserts into the draft layer and cleans up', () => {
    const { tool, ctx, event, interactions, layers, inserted } = setup(null);
    tool.activate(ctx);
    tool.handleValue(8);
    event('click', [0, 0]);
    expect(interactions.getLength()).toBe(1);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(prompt('sides', 8)); // the centre was dropped, the count kept
    tool.finish();
    event('click', [0, 0]);
    event('click', [10, 0]);
    const { command, ring } = inserted();
    expect(command.layer).toBe('draft');
    expectRegular(ring, [0, 0], 10, 8);
  });
});
