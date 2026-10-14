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
import { circleSegmentCount } from '../geometry/circle';
import type { EllipseDefinition } from '../geometry/ellipse';
import { unitsPerMetre } from '../measure';
import { Selection } from '../selection/Selection';
import { ELLIPSE_PROMPTS, ellipseMethod, EllipseTool } from './ellipse';
import { PREVIEW_LAYER_PROPERTY } from './preview';
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

// Near the origin of Web Mercator one map unit is one metre, so half-axes can be checked directly.
const PROJECTION = 'EPSG:3857';

function setup(active: string | null, tolerance = 0.01, straightedge = 0) {
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
    getStraightedgeAngle: () => straightedge,
    getProjection: () => PROJECTION,
    getCurveTolerance: () => tolerance,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new EllipseTool();
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

/** Every vertex satisfies the ellipse equation. */
function expectOnEllipse(ring: number[][], e: EllipseDefinition): void {
  for (const [x, y] of ring) {
    const dx = x! - e.center[0]!;
    const dy = y! - e.center[1]!;
    const u = dx * Math.cos(e.rotation) + dy * Math.sin(e.rotation);
    const v = -dx * Math.sin(e.rotation) + dy * Math.cos(e.rotation);
    expect((u / e.a) ** 2 + (v / e.b) ** 2).toBeCloseTo(1, 6);
  }
}

describe('ellipseMethod', () => {
  it('defaults to centre-axis and rejects unknown methods', () => {
    expect(ellipseMethod()).toBe('centre-axis');
    expect(ellipseMethod({ method: 'box' })).toBe('box');
    expect(ellipseMethod({ method: 'foci' })).toBeNull();
  });
});

describe('EllipseTool', () => {
  it('activates only with a polygon-capable target and a known method; reports the method', () => {
    expect(setup('roads').tool.canActivate(setup('roads').ctx)).toBe(false);
    expect(setup('parcels').tool.canActivate(setup('parcels').ctx)).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { method: 'axis' })).toBe(true);
    expect(setup(null).tool.canActivate(setup(null).ctx, { method: 'nope' })).toBe(false);
    const { tool, ctx } = setup('parcels');
    tool.activate(ctx, { method: 'box' } as ToolOptions);
    expect(tool.getOptions()).toEqual({ method: 'box' });
  });

  it('centre and axes: the other half-axis by a point across the axis, inserted selected', () => {
    const { tool, ctx, event, preview, selection, inserted } = setup('parcels');
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [100, 200])).toBe(false); // consumed
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS['axis-end']);
    expect(tool.referencePoint()).toEqual([100, 200]);
    event('click', [100, 200]); // on the centre: no axis, ignored
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS['axis-end']);
    event('pointermove', [140, 200]);
    expect(preview().some((f) => f.getGeometry()!.getType() === 'LineString')).toBe(true);
    expect(preview().some((f) => f.getGeometry()!.getType() === 'Polygon')).toBe(false);
    event('click', [140, 200]);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS['half-axis']);
    expect(tool.getInputRequest()).toBe('value');
    expect(tool.referencePoint()).toEqual([100, 200]);
    const expected = { center: [100, 200], a: 40, b: 10, rotation: 0 };
    event('pointermove', [120, 210]); // 10 across the axis
    const ghost = preview().find((f) => f.getGeometry()!.getType() === 'Polygon')!;
    expectOnEllipse((ghost.getGeometry() as Polygon).getCoordinates()[0]!, expected);
    event('click', [100, 200]); // on the axis: no ellipse
    expect(ctx.execute).not.toHaveBeenCalled();
    event('click', [120, 210]);
    const { command, ring } = inserted();
    expect(command.layer).toBe('parcels');
    expect(ring).toHaveLength(circleSegmentCount(40, 0.01) + 1);
    expectOnEllipse(ring, expected);
    expect(ring[0]).toEqual([140, 200]);
    expect(selection.get()).toEqual([command.feature]);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    expect(preview()).toEqual([]);
  });

  it('takes a typed half-axis in metres, and refuses values that are not greater than 0', () => {
    const { tool, ctx, event, inserted } = setup('parcels');
    tool.activate(ctx);
    expect(tool.handleLength(5)).toBe(false); // not the half-axis step
    event('click', [0, 0]);
    event('click', [0, 30]); // the first axis points north
    expect(tool.handleLength(0)).toBe(true);
    expect(tool.handleLength(-3)).toBe(true);
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.handleLength(12)).toBe(true);
    const b = 12 * unitsPerMetre(PROJECTION, [0, 0]);
    expectOnEllipse(inserted().ring, { center: [0, 0], a: 30, b, rotation: Math.PI / 2 });
  });

  it('axis ends: centres the ellipse between them', () => {
    const { tool, ctx, event, inserted } = setup('parcels');
    tool.activate(ctx, { method: 'axis' });
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.second);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('click', [20, 0]);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS['half-axis']);
    expect(tool.referencePoint()).toEqual([10, 0]); // the centre
    event('click', [3, -6]);
    expectOnEllipse(inserted().ring, { center: [10, 0], a: 10, b: 6, rotation: 0 });
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('box: fills the box along the straightedge and previews the box', () => {
    const { tool, ctx, event, preview, inserted } = setup('parcels', 0.01, 90);
    tool.activate(ctx, { method: 'box' });
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.corner);

    expect(tool.getInputRequest()).toBe(null);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.opposite);
    event('pointermove', [-8, 20]);
    expect(preview().filter((f) => f.getGeometry()!.getType() === 'Polygon')).toHaveLength(2);
    event('click', [0, 20]); // no width across a 90° straightedge
    expect(ctx.execute).not.toHaveBeenCalled();
    event('click', [-8, 20]);
    expectOnEllipse(inserted().ring, { center: [-4, 10], a: 10, b: 4, rotation: Math.PI / 2 });
  });

  it('steps back with Escape and Backspace and cleans up on deactivate', () => {
    const { tool, ctx, event, preview, interactions, layers, inserted } = setup(null);
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [0, 0]);
    event('click', [5, 0]);
    event('pointermove', [2, 2]);
    expect(preview().length).toBeGreaterThan(0);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS['axis-end']);
    expect(preview()).toEqual([]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(ELLIPSE_PROMPTS.centre);

    expect(tool.getInputRequest()).toBe(null);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
    tool.activate(ctx);
    event('click', [0, 0]);
    event('click', [5, 0]);
    event('click', [0, 2]);
    expect(inserted().command.layer).toBe('draft');
  });
});
