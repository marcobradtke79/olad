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
    expect(dimensionLinearMethod({ method: 'chain' })).toBeNull();
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
});
