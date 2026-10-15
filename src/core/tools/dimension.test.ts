// @vitest-environment jsdom
import Collection from 'ol/Collection';
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
import { DIMENSION_LINEAR_PROMPTS, dimensionLinearMethod, DimensionLinearTool } from './dimension';
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
  it('needs an active dimension layer', () => {
    expect(new DimensionLinearTool().canActivate(setup('dims').ctx)).toBe(true);
    expect(new DimensionLinearTool().canActivate(setup('roads').ctx)).toBe(false);
    expect(new DimensionLinearTool().canActivate(setup(null).ctx)).toBe(false);
  });

  it('measures two points, takes the line position from a click and keeps the GIS value on Enter', () => {
    const { tool, ctx, event, inserted, selection, layers } = setup('dims');
    const before = layers.getLength(); // the selection overlay
    tool.activate(ctx);
    expect(layers.getLength()).toBe(before + 2); // markers and the dimension preview
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.first);
    expect(event('click', [0, 0])).toBe(false);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('click', [0, 0]); // equal to the first point: ignored
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.second);
    event('click', [12.47, 0]);
    expect(tool.getInputRequest()).toBe('value');
    event('pointermove', [6, -3]);
    event('click', [6, -3]); // three metres right of p1 → p2
    expect(tool.getPrompt()).toContain('Enter keeps 12,47');
    tool.finish();
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
  });

  it('takes a typed offset on the pointer side and a typed field value', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx);
    event('click', [0, 0]);
    tool.handleInput([10, 0]);
    event('pointermove', [5, -1]);
    expect(tool.handleLength(2.5)).toBe(true);
    expect(tool.handleLength(0)).toBe(false); // a field value must be greater than 0
    expect(tool.handleLength(10.04)).toBe(true);
    expect(inserted().getProperties()).toMatchObject({ offset: -2.5, fieldValue: 10.04 });
  });

  it('inserts a free text with t <text> and passes other text on', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx);
    expect(tool.handleText('t later')).toBe(false); // not in the value step
    event('click', [0, 0]);
    event('click', [0, 8]);
    event('click', [-2, 4]);
    expect(tool.handleText('12.5')).toBe(false);
    expect(tool.handleText('t {value} lt. Bestand')).toBe(true);
    expect(inserted().getProperties()).toMatchObject({
      text: '{value} lt. Bestand',
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
    tool.finish();
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
    event('click', [5, 2]);
    expect(tool.removeLastPoint()).toBe(true);
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
    event('click', [5, -4]); // the chain's line 4 m south
    tool.finish(); // first span: keeps the GIS value
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.next);
    expect(tool.referencePoint()).toEqual([10, 0]);
    event('click', [16, 2]); // a bent outline: measured along the chain's line
    tool.finish();
    expect(tool.handleLength(9.98)).toBe(false); // waiting for a point, not a value
    event('click', [20, -1]);
    expect(tool.handleLength(4.02)).toBe(true);
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
    expect(spans[2]!.get('fieldValue')).toBe(4.02);
  });

  it('stacks baseline dimensions from the origin by the spacing', () => {
    const { tool, ctx, event, inserted } = setup('dims');
    tool.activate(ctx, { method: 'baseline' });
    expect(tool.getPrompt()).toBe(DIMENSION_LINEAR_PROMPTS.origin);
    event('click', [0, 0]);
    event('click', [5, 0]);
    event('click', [2, 3]);
    tool.finish();
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('click', [9, 1]);
    tool.finish();
    event('click', [14, 0]);
    tool.finish();
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
    tool.finish();
    event('click', [12, 2]);
    tool.finish();
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
    event('click', [3, 4]);
    expect(tool.getInputRequest()).toBe('value');
    expect(tool.handleLength(5.01)).toBe(true);
    expect(inserted().getProperties()).toMatchObject({
      dimType: 'tie',
      offset: 0,
      fieldValue: 5.01,
    });
    expect(inserted().get('rotation')).toBeUndefined();
    expect(inserted().get('chain')).toBeUndefined();
  });
});
