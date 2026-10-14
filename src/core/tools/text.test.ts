// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type MultiPoint from 'ol/geom/MultiPoint';
import type Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import { resolveLayer } from '../config/defaults';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { PREVIEW_LAYER_PROPERTY } from './preview';
import { TEXT_PROMPTS, TextTool, textTarget } from './text';
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

const layer = (id: string, geometryType: string, text?: unknown, schema?: unknown) =>
  resolveLayer({
    id,
    geometryType,
    source: { features: [] },
    editable: true,
    ...(text !== undefined ? { text } : {}),
    ...(schema ? { schema } : {}),
  } as never);
const configs: Record<string, ResolvedLayerConfig> = {
  labels: layer(
    'labels',
    'Point',
    { height: 5 },
    {
      fields: [{ name: 'kind', type: 'string', default: 'street' }],
    },
  ),
  multi: layer('multi', 'MultiPoint', { property: 'label' }),
  hydrants: layer('hydrants', 'Point'),
  roads: layer('roads', 'LineString'),
  draft: layer('draft', 'Any', true),
};

function setup(active: string | null, angle = 0) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getView: () => ({ getResolution: () => 0.5 }),
  } as unknown as OlMap;
  const selection = new Selection(map, selectionConfig, () => {});
  const ctx = {
    map,
    layers: {
      has: (id: string) => id in configs,
      canEdit: () => true,
      getConfig: (id: string) => configs[id]!,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => active,
    getDraftLayer: () => 'draft',
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => angle,
    getProjection: () => 'EPSG:3857',
    getLengthUnit: () => 'm',
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & { execute: ReturnType<typeof vi.fn> };
  const tool = new TextTool();
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const inserted = (index = 0) => ctx.execute.mock.calls[index]![0] as InsertFeatureCommand;
  return { tool, ctx, event, preview, inserted, selection, interactions, layers };
}

describe('textTarget', () => {
  it('takes the active text layer, else the draft layer; never a non-text layer', () => {
    expect(textTarget(setup('labels').ctx)?.layerId).toBe('labels');
    expect(textTarget(setup(null).ctx)?.layerId).toBe('draft');
    expect(textTarget(setup('hydrants').ctx)).toBeNull(); // points, but not a text layer
    expect(textTarget(setup('roads').ctx)).toBeNull();
    expect(new TextTool().canActivate(setup('roads').ctx)).toBe(false);
    expect(new TextTool().canActivate(setup('labels').ctx)).toBe(true);
  });
});

describe('TextTool', () => {
  it('takes a point, a height and the text, and inserts the text selected', () => {
    const { tool, ctx, event, preview, inserted, selection } = setup('labels', 30);
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.point);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.handleLength(3)).toBe(false); // no value before the point
    expect(tool.handleText('early')).toBe(false);
    expect(event('click', [100, 200])).toBe(false);
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.height.replace('{height}', '5.00 m')); // the layer's height
    expect(tool.getInputRequest()).toBe('value');
    expect(tool.handleInput([1, 1])).toBe(false); // the point is set
    expect(tool.handleLength(0)).toBe(true); // taken, refused
    expect(tool.getPrompt()).toBe(
      `The text height must be greater than 0. ${TEXT_PROMPTS.height.replace('{height}', '5.00 m')}`,
    );
    expect(tool.handleLength(4)).toBe(true);
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.text);

    expect(tool.getInputRequest()).toBe('text');
    // A marker and a sample text at 4 m (8 px at resolution 0.5 near the origin).
    const sample = preview().find((f) => f.getStyle());
    expect(sample).toBeDefined();
    expect(tool.handleText('   ')).toBe(false); // empty: not taken
    expect(tool.handleText(' 42 Main Street ')).toBe(true);
    const command = inserted();
    expect(command.layer).toBe('labels');
    const { geometry, ...properties } = command.feature.getProperties();
    expect(properties).toEqual({
      kind: 'street',
      text: '42 Main Street',
      textHeight: 4,
      textRotation: 30,
    });
    expect((geometry as Point).getCoordinates()).toEqual([100, 200]);
    expect(selection.get()).toEqual([command.feature]);
    // Ready for the next text; the height is remembered.
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.point);

    expect(tool.getInputRequest()).toBe(null);
    expect(preview()).toEqual([]);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.height.replace('{height}', '4.00 m'));
    tool.finish(); // Enter keeps 4
    tool.handleText('second');
    expect(inserted(1).feature.get('textHeight')).toBe(4);
  });

  it('uses the layer property names and wraps for a multi-point layer', () => {
    const { tool, ctx, inserted } = setup('multi');
    tool.activate(ctx);
    tool.handleInput([5, 5]);
    tool.finish(); // the default 2.5 m
    tool.handleText('A');
    const feature = inserted().feature;
    expect(feature.get('label')).toBe('A');
    expect(feature.get('textHeight')).toBe(2.5);
    expect((feature.getGeometry() as MultiPoint).getType()).toBe('MultiPoint');
  });

  it('steps back with Escape and Backspace and cleans up', () => {
    const { tool, ctx, event, layers, interactions } = setup(null);
    tool.activate(ctx);
    expect(tool.removeLastPoint()).toBe(false);
    event('click', [0, 0]);
    tool.finish();
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.text);

    expect(tool.getInputRequest()).toBe('text');
    tool.cancel();
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.height.replace('{height}', '2.50 m'));
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(TEXT_PROMPTS.point);

    expect(tool.getInputRequest()).toBe(null);
    tool.deactivate();
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
  });
});
