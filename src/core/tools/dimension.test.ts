// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import { resolveLayer } from '../config/defaults';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import {
  DIMENSION_LINEAR_PROMPTS,
  dimensionLinearMethod,
  DimensionLinearTool,
  pickDimensionLayer,
} from './dimension';
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

const layerConfigs: Record<string, ResolvedLayerConfig> = {
  dims: resolveLayer({
    id: 'dims',
    geometryType: 'LineString',
    source: { features: [] },
    dimension: { preset: 'surveying' },
    schema: { fields: [{ name: 'note', type: 'string', default: 'checked' }] },
  }),
  roads: resolveLayer({ id: 'roads', geometryType: 'LineString', source: { features: [] } }),
};

// Near the origin of Web Mercator one map unit is one metre.
function setup(active: string | null, straightedge = 0) {
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
      list: () => Object.keys(layerConfigs).map((id) => ({ id })),
      has: (id: string) => id in layerConfigs,
      canEdit: () => true,
      getConfig: (id: string) => layerConfigs[id]!,
      getActive: () => active,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => active,
    getDraftLayer: () => 'draft',
    hitTolerance: 4,
    canUpdate: () => true,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => straightedge,
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    getLocale: () => 'de' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & { execute: ReturnType<typeof vi.fn> };
  const tool = new DimensionLinearTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const inserted = (index = 0) => {
    const command = ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
    expect(command.type).toBe('insert');
    expect(command.layer).toBe('dims');
    return command.feature;
  };
  return { tool, ctx, layers, selection, event, inserted };
}

describe('dimensionLinearMethod', () => {
  it('defaults to aligned and refuses unknown methods', () => {
    expect(dimensionLinearMethod()).toBe('aligned');
    expect(dimensionLinearMethod({ method: 'rotated' })).toBe('rotated');
    expect(dimensionLinearMethod({ method: 'chain' })).toBe('chain');
    expect(dimensionLinearMethod({ method: 'angular' })).toBeNull();
  });
});

describe('DimensionLinearTool', () => {
  it('needs a dimension layer that allows inserts, not necessarily the active one', () => {
    expect(new DimensionLinearTool().canActivate(setup('dims').ctx)).toBe(true);
    expect(new DimensionLinearTool().canActivate(setup('roads').ctx)).toBe(true);
    expect(new DimensionLinearTool().canActivate(setup(null).ctx)).toBe(true);
    const { ctx } = setup(null);
    Object.assign(ctx.layers, { canEdit: () => false });
    expect(new DimensionLinearTool().canActivate(ctx)).toBe(false);
  });

  it('picks the active dimension layer, else the first one in the list', () => {
    const layers = (active: string | null, ids: string[], insertable = () => true) => ({
      list: () => ids.map((id) => ({ id })),
      has: (id: string) => ids.includes(id),
      canEdit: insertable,
      getConfig: (id: string) => ({ dimension: id.startsWith('dim') ? {} : undefined }),
      getActive: () => active,
    });
    const pick = (l: ReturnType<typeof layers>) =>
      pickDimensionLayer(l as unknown as Parameters<typeof pickDimensionLayer>[0]);
    expect(pick(layers(null, ['roads', 'dims', 'dims2']))).toBe('dims');
    expect(pick(layers('dims2', ['roads', 'dims', 'dims2']))).toBe('dims2');
    expect(pick(layers('roads', ['roads', 'dims']))).toBe('dims');
    expect(pick(layers('dims', ['roads', 'dims'], () => false))).toBeNull();
    expect(pick(layers(null, ['roads']))).toBeNull();
  });

  it('measures two points and inserts with the GIS value when the line is placed', () => {
    const { tool, ctx, event, inserted, selection, layers } = setup('dims');
    const before = layers.getLength(); // the selection overlay
    tool.activate(ctx);
    expect(layers.getLength()).toBe(before + 2); // markers and the dimension preview
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.first);
    expect(event('click', [0, 0])).toBe(false);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('click', [0, 0]); // equal to the first point: ignored
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.second);
    expect(tool.isIdle()).toBe(false);
    event('click', [12.47, 0]);
    expect(tool.getInputRequest()).toBe('value');
    event('pointermove', [6, -3]);
    event('click', [6, -3]); // three metres right of p1 → p2: inserts
    const feature = inserted();
    expect((feature.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 0],
      [12.47, 0],
    ]);
    expect(feature.getProperties()).toMatchObject({
      dimType: 'aligned',
      offset: -3,
      fieldValue: null,
      text: null,
      note: 'checked', // schema default
    });
    expect(feature.get('gisValue')).toBeCloseTo(12.47, 2);
    expect(selection.get()).toEqual([feature]);
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.first); // ready for the next one
    expect(tool.isIdle()).toBe(true);
  });

  it('takes a typed offset on the pointer side and inserts', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx);
    event('click', [0, 0]);
    tool.handleInput([10, 0]);
    event('pointermove', [5, -1]);
    expect(tool.handleLength(2.5)).toBe(true);
    expect(inserted().getProperties()).toMatchObject({ offset: -2.5, fieldValue: null });
    expect(tool.handleLength(10.04)).toBe(false); // the field value is not typed into the tool
    expect(tool.handleText('t later')).toBe(false);
  });

  it('places the line left of the measured direction with a positive offset', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx);
    event('click', [0, 0]);
    event('click', [0, 8]);
    event('click', [-2, 4]);
    expect(inserted().getProperties()).toMatchObject({
      text: null,
      fieldValue: null,
      offset: 2, // left of p1 → p2 (northwards) is west
    });
  });

  it('measures a rotated dimension along the straightedge', () => {
    const { tool, ctx, event, inserted } = setup('dims', 0);
    tool.activate(ctx, { method: 'rotated' });
    expect(tool.getOptions().method).toBe('rotated');
    event('click', [0, 0]);
    event('click', [0, 5]); // nothing along the straightedge: waits
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.second);
    event('click', [8, 6]);
    event('click', [4, 9]);
    const feature = inserted();
    expect(feature.getProperties()).toMatchObject({ dimType: 'rotated', rotation: 0, offset: 9 });
    expect(feature.get('gisValue')).toBeCloseTo(8, 2); // horizontal distance only
  });

  it('steps back with Backspace and drops the dimension with Escape', () => {
    const { tool, ctx, event } = setup('dims');
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [0, 0]);
    event('click', [10, 0]);
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.line);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.second);
    tool.cancel();
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.first);
    expect(tool.referencePoint()).toBeNull();
    tool.deactivate();
  });

  it('draws a chain on one line in the first span’s direction, until Enter', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx, { method: 'chain' });
    event('click', [0, 0]);
    event('click', [10, 0]);
    event('click', [5, -4]); // the chain's line 4 m south: the first span is inserted
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.next);
    expect(tool.isIdle()).toBe(false);
    expect(tool.referencePoint()).toEqual([10, 0]);
    event('click', [16, 2]); // a bent outline: measured along the chain's line
    expect(tool.handleLength(9.98)).toBe(false); // waiting for a point, not a value
    event('click', [20, -1]);
    tool.finish(); // Enter while waiting for a point ends the chain
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.first);
    const spans = [0, 1, 2].map((i) => inserted(i));
    const chain = spans[0]!.get('chain') as string;
    expect(chain).toMatch(/^c-/);
    for (const span of spans) {
      expect(span.getProperties()).toMatchObject({ dimType: 'rotated', rotation: 0, chain });
    }
    // Every span's line lies 4 m south of the first point: offset = -4 - (start y).
    expect(spans.map((f) => f.get('offset'))).toEqual([-4, -4, -6]);
    expect(spans.map((f) => Math.round(f.get('gisValue') as number))).toEqual([10, 6, 4]);
    expect(spans.map((f) => f.get('fieldValue'))).toEqual([null, null, null]);
  });

  it('stacks baseline dimensions from the origin by the spacing', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx, { method: 'baseline' });
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.origin);
    event('click', [0, 0]);
    event('click', [5, 0]);
    event('click', [2, 3]);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('click', [9, 1]);
    event('click', [14, 0]);
    tool.cancel();
    // Surveying preset at 1:500: 8 mm spacing is 4 m on the ground.
    expect([0, 1, 2].map((i) => inserted(i).get('offset'))).toEqual([3, 7, 11]);
    expect([0, 1, 2].map((i) => Math.round(inserted(i).get('gisValue') as number))).toEqual([
      5, 9, 14,
    ]);
    expect((inserted(2).getGeometry() as LineString).getCoordinates()[0]).toEqual([0, 0]);
  });

  it('draws running dimensions on one line from the origin', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx, { method: 'running' });
    event('click', [0, 0]);
    event('click', [5, 0]);
    event('click', [2, 3]);
    event('click', [12, 2]);
    expect(tool.removeLastPoint()).toBe(true); // Backspace while waiting ends the set too
    const [first, second] = [inserted(0), inserted(1)];
    expect(first.getProperties()).toMatchObject({ dimType: 'running', offset: 3, rotation: 0 });
    expect(second.getProperties()).toMatchObject({ dimType: 'running', offset: 3 });
    expect(Math.round(second.get('gisValue') as number)).toBe(12);
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.origin);
  });

  it('measures a tie distance without a dimension line step', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx, { method: 'tie' });
    event('click', [0, 0]);
    event('click', [3, 4]); // inserts at once
    expect(inserted().getProperties()).toMatchObject({
      dimType: 'tie',
      offset: 0,
      fieldValue: null,
    });
    expect(inserted().get('gisValue')).toBeCloseTo(5, 2);
    expect(inserted().get('rotation')).toBeUndefined();
    expect(inserted().get('chain')).toBeUndefined();
  });

  it('records what each point was snapped to as references', () => {
    const { tool, ctx, event, inserted } = setup('dims');
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
    parcel.setId(4);
    let snap: { coordinate: number[]; mode: string; layer?: string; feature?: Feature } | null =
      null;
    Object.assign(ctx, { getSnap: () => snap });
    tool.activate(ctx, { method: 'chain' });
    snap = { coordinate: [0, 0], mode: 'vertex', layer: 'parcels', feature: parcel };
    event('click', [0, 0]);
    snap = { coordinate: [10, 0], mode: 'vertex', layer: 'parcels', feature: parcel };
    event('click', [10, 0]);
    snap = null;
    event('click', [5, -3]);
    event('click', [16, 0]); // a free point: no reference
    expect(inserted(0).get('refs')).toEqual([
      { layer: 'parcels', id: 4, kind: 'vertex', path: [0, 0] },
      { layer: 'parcels', id: 4, kind: 'vertex', path: [0, 1] },
    ]);
    // The next span starts where the last one ended, with that point's reference.
    expect(inserted(1).get('refs')).toEqual([
      { layer: 'parcels', id: 4, kind: 'vertex', path: [0, 1] },
      null,
    ]);
  });
});
