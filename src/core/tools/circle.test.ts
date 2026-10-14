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
import { circleSegmentCount } from '../geometry/circle';
import { unitsPerMetre } from '../measure';
import { Selection } from '../selection/Selection';
import { CIRCLE_PROMPTS, circleMethod, CircleTool } from './circle';
import { polygonTarget } from './draw';
import { PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
import type { ToolContext, ToolOptions } from './Tool';

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

// Near the origin of Web Mercator one map unit is one metre, so radii can be checked directly.
const PROJECTION = 'EPSG:3857';

function setup(active: string | null, tolerance = 0.01) {
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
    getProjection: () => PROJECTION,
    getCurveTolerance: () => tolerance,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new CircleTool();
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

function expectOnCircle(ring: number[][], center: number[], radius: number): void {
  for (const [x, y] of ring) {
    expect(Math.hypot(x! - center[0]!, y! - center[1]!)).toBeCloseTo(radius, 6);
  }
}

describe('circleMethod', () => {
  it('defaults to centre-radius and rejects unknown methods', () => {
    expect(circleMethod()).toBe('centre-radius');
    expect(circleMethod({ method: 'three-point' })).toBe('three-point');
    expect(circleMethod({ method: 'diameter' })).toBeNull();
  });
});

describe('CircleTool', () => {
  it('activates only with a polygon-capable target and a known method', () => {
    expect(setup('roads').tool.canActivate(setup('roads').ctx)).toBe(false);
    expect(setup('parcels').tool.canActivate(setup('parcels').ctx)).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { method: 'centre-point' })).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { method: 'nope' })).toBe(false);
    expect(polygonTarget(setup(null).ctx)?.layerId).toBe('draft');
  });

  it('reports the method in effect', () => {
    const { tool, ctx } = setup('parcels');
    tool.activate(ctx);
    expect(tool.getOptions()).toEqual({ method: 'centre-radius' });
    tool.deactivate();
    tool.activate(ctx, { method: 'three-point' } as ToolOptions);
    expect(tool.getOptions()).toEqual({ method: 'three-point' });
  });

  it('centre and radius: previews the circle with a radius leg and inserts it selected', () => {
    const { tool, ctx, event, preview, selection, inserted } = setup('parcels');
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [100, 200])).toBe(false); // consumed
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.radius);

    expect(tool.getInputRequest()).toBe('value');
    expect(tool.referencePoint()).toEqual([100, 200]);
    event('pointermove', [130, 240]);
    const ghost = preview();
    const polygon = ghost.find((f) => f.getGeometry()!.getType() === 'Polygon')!;
    expectOnCircle((polygon.getGeometry() as Polygon).getCoordinates()[0]!, [100, 200], 50);
    const leg = ghost.find((f) => f.getGeometry()!.getType() === 'LineString')!;
    expect((leg.getGeometry() as LineString).getCoordinates()).toEqual([
      [100, 200],
      [130, 240],
    ]);
    expect(ghost.find((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'picked')).toBeDefined();
    // A typed radius arrives as a point 50 m from the centre (resolved by the editor).
    expect(tool.handleInput([150, 200])).toBe(true);
    const { command, ring } = inserted();
    expect(command.layer).toBe('parcels');
    expect(ring).toHaveLength(circleSegmentCount(50, 0.01) + 1);
    expectOnCircle(ring, [100, 200], 50);
    expect(ring[0]).toEqual([150, 200]);
    expect(selection.get()).toEqual([command.feature]);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(preview()).toEqual([]);
  });

  it('centre and point: marks the hovered point and uses its distance as the radius', () => {
    const { tool, ctx, event, preview, inserted } = setup('parcels');
    tool.activate(ctx, { method: 'centre-point' });
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.point);

    expect(tool.getInputRequest()).toBe(null);
    event('pointermove', [3, 4]);
    const ghost = preview();
    expect(ghost.some((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'hover')).toBe(true);
    expect(ghost.some((f) => f.getGeometry()!.getType() === 'LineString')).toBe(false);
    event('click', [3, 4]);
    expectOnCircle(inserted().ring, [0, 0], 5);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('three points: previews a line, then the circumcircle, and inserts it', () => {
    const { tool, ctx, event, preview, inserted } = setup('parcels');
    tool.activate(ctx, { method: 'three-point' });
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.second);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('pointermove', [10, 0]);
    expect(preview().filter((f) => f.getGeometry()!.getType() === 'LineString')).toHaveLength(1);
    expect(preview().some((f) => f.getGeometry()!.getType() === 'Polygon')).toBe(false);
    event('click', [10, 0]);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.third);
    expect(tool.referencePoint()).toEqual([10, 0]);
    event('pointermove', [20, 0]); // collinear: no circle yet, the line continues
    expect(preview().some((f) => f.getGeometry()!.getType() === 'Polygon')).toBe(false);
    expect(preview().filter((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'picked')).toHaveLength(2);
    event('pointermove', [5, 5]);
    const circle = preview().find((f) => f.getGeometry()!.getType() === 'Polygon')!;
    expectOnCircle((circle.getGeometry() as Polygon).getCoordinates()[0]!, [5, 0], 5);
    event('click', [20, 0]); // collinear: ignored
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.third);
    event('click', [5, 5]);
    expectOnCircle(inserted().ring, [5, 0], 5);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('ignores a zero radius', () => {
    const { tool, ctx, event } = setup('parcels');
    tool.activate(ctx);
    event('click', [1, 1]);
    event('click', [1, 1]);
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.radius);

    expect(tool.getInputRequest()).toBe('value');
  });

  it('steps back with Escape and Backspace', () => {
    const { tool, ctx, event, preview } = setup('parcels');
    tool.activate(ctx, { method: 'three-point' });
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [0, 0]);
    event('click', [4, 0]);
    event('pointermove', [2, 2]);
    expect(preview().length).toBeGreaterThan(0);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.second);
    expect(tool.referencePoint()).toEqual([0, 0]);
    expect(preview()).toEqual([]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    tool.cancel();
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('linearizes with the configured tolerance converted at the centre', () => {
    const coarse = setup('parcels', 1);
    coarse.tool.activate(coarse.ctx);
    coarse.event('click', [0, 0]);
    coarse.event('click', [100, 0]);
    const fine = setup('parcels', 0.001);
    fine.tool.activate(fine.ctx);
    fine.event('click', [0, 0]);
    fine.event('click', [100, 0]);
    expect(fine.inserted().ring.length).toBeGreaterThan(coarse.inserted().ring.length);
    expect(coarse.inserted().ring).toHaveLength(
      circleSegmentCount(100, 1 * unitsPerMetre(PROJECTION, [0, 0])) + 1,
    );
  });

  it('inserts into the draft layer without an active layer and cleans up on deactivate', () => {
    const { tool, ctx, event, interactions, layers, inserted } = setup(null);
    tool.activate(ctx);
    event('click', [0, 0]);
    expect(interactions.getLength()).toBe(1);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(CIRCLE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null); // the centre was dropped
    event('click', [0, 0]);
    event('click', [10, 0]);
    expect(inserted().command.layer).toBe('draft');
  });
});
