// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type { CompositeCommand } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { TemplateStore } from '../templates/TemplateStore';
import { PREVIEW_LAYER_PROPERTY } from './preview';
import { TEMPLATE_COPY_PROMPTS, TemplateCopyTool } from './templateCopy';
import { TEMPLATE_INSERT_PROMPTS, TemplateInsertTool } from './templateInsert';
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

const configs: Record<string, Partial<ResolvedLayerConfig>> = {
  roads: { geometryType: 'LineString', idProperty: 'id' },
  hydrants: { geometryType: 'Point' },
  draft: { geometryType: 'Any' },
};

function setup(selected: Feature[] = [], layerOf = (f: Feature) => f.get('layer') as string) {
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
  const templates = new TemplateStore();
  const ctx = {
    map,
    layers: {
      list: () => [],
      has: (id: string) => id in configs,
      canEdit: () => true,
      getConfig: (id: string) => configs[id] as ResolvedLayerConfig,
      layerOf,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => null,
    getDraftLayer: () => 'draft',
    hitTolerance: 4,
    canUpdate: () => false, // read-only objects can still be copied
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
    templates,
    done: vi.fn(),
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    done: ReturnType<typeof vi.fn>;
    templates: TemplateStore;
  };
  const event = (index: number, type: string, coordinate: number[]) =>
    interactions.getArray()[index]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  return { ctx, selection, templates, interactions, layers, event, preview };
}

const road = () =>
  new Feature({
    layer: 'roads',
    id: 815,
    name: 'Main',
    geometry: new LineString([
      [0, 0],
      [100, 0],
    ]),
  });
const hydrant = () => new Feature({ layer: 'hydrants', geometry: new Point([50, 10]) });

describe('TemplateCopyTool', () => {
  it('asks for the objects, the base point and a name, then stores the template', async () => {
    const tool = new TemplateCopyTool();
    const { ctx, selection, templates, interactions, event } = setup();
    tool.activate(ctx);
    expect(tool.getPrompt()).toBe(TEMPLATE_COPY_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(interactions.getArray().map((i) => i.getActive())).toEqual([true, true, false]);
    tool.finish(); // nothing selected: stays
    expect(tool.getPrompt()).toBe(TEMPLATE_COPY_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    selection.set([road(), hydrant()]);
    await tick();
    tool.finish();
    expect(tool.getPrompt()).toContain('Base point');
    expect(interactions.getArray().map((i) => i.getActive())).toEqual([false, false, true]);
    event(2, 'click', [0, 0]);
    expect(tool.getPrompt()).toBe(
      'Template name <Template 1>: type a name, Enter keeps it; Escape goes back',
    );
    expect(tool.handleText('   ')).toBe(false);
    expect(tool.handleText(' Junction ')).toBe(true);
    expect(templates.list()).toEqual([
      expect.objectContaining({ name: 'Junction', featureCount: 2, layers: ['roads', 'hydrants'] }),
    ]);
    const stored = templates.get(templates.list()[0]!.id)!;
    expect(stored.base).toEqual([0, 0]);
    expect(stored.features[0]!.properties).not.toHaveProperty('id'); // the layer's id property
    expect(selection.get()).toEqual([]);
    expect(tool.getPrompt()).toBe(
      `${TEMPLATE_COPY_PROMPTS.stored.replace('{name}', 'Junction')} ${TEMPLATE_COPY_PROMPTS.select}`,
    );
    expect(ctx.execute).not.toHaveBeenCalled(); // copying changes no data
  });

  it('skips the selection step, keeps the suggested name on Enter and takes typed points', () => {
    const tool = new TemplateCopyTool();
    const { ctx, templates } = setup([hydrant()]);
    tool.activate(ctx);
    expect(tool.getPrompt()).toContain('Base point');
    expect(tool.handleText('ignored')).toBe(false); // not the name step
    expect(tool.handleInput([5, 5])).toBe(true);
    tool.finish();
    expect(templates.list()[0]!.name).toBe('Template 1');
    expect(templates.get(templates.list()[0]!.id)!.base).toEqual([5, 5]);
  });

  it('steps back with Escape and Backspace and keeps the selection on a tool switch', () => {
    const tool = new TemplateCopyTool();
    const { ctx, selection } = setup([hydrant()]);
    tool.activate(ctx);
    tool.handleInput([1, 1]);
    expect(tool.removeLastPoint()).toBe(true); // name → base
    expect(tool.getPrompt()).toContain('Base point');
    tool.cancel(); // base → select, clearing the selection
    expect(selection.get()).toEqual([]);
    expect(tool.getPrompt()).toBe(TEMPLATE_COPY_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.removeLastPoint()).toBe(false);
    selection.set([hydrant()]);
    tool.deactivate();
    expect(selection.get()).toHaveLength(1);
  });
});

describe('TemplateInsertTool', () => {
  function withTemplate() {
    const s = setup();
    const id = s.templates.create(
      [
        { feature: road(), layer: 'roads', idProperty: 'id' },
        { feature: hydrant(), layer: 'hydrants' },
      ],
      [0, 0],
      'Junction',
    );
    return { ...s, id };
  }

  it('can only start for a known template with a target layer', () => {
    const tool = new TemplateInsertTool();
    const { ctx, id } = withTemplate();
    expect(tool.canActivate(ctx, { template: id })).toBe(true);
    expect(tool.canActivate(ctx, { template: 'nope' })).toBe(false);
    expect(tool.canActivate(ctx)).toBe(false);
  });

  it('previews at the pointer and inserts one composite per click, selecting the copies', () => {
    const tool = new TemplateInsertTool();
    const { ctx, id, event, preview, selection } = withTemplate();
    tool.activate(ctx, { template: id });
    expect(tool.getPrompt()).toBe(TEMPLATE_INSERT_PROMPTS.place.replace('{name}', 'Junction'));
    expect(tool.referencePoint()).toBeNull();
    event(0, 'pointermove', [200, 0]);
    expect(preview()).toHaveLength(2);
    expect((preview()[0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [200, 0],
      [300, 0],
    ]);
    event(0, 'click', [200, 0]);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as CompositeCommand;
    expect(command.commands.map((c) => (c as { layer: string }).layer)).toEqual([
      'roads',
      'hydrants',
    ]);
    expect(selection.get()).toHaveLength(2);
    expect(tool.referencePoint()).toEqual([200, 0]);
    tool.handleInput([400, 0]);
    expect(ctx.execute).toHaveBeenCalledTimes(2);
    // A rejected insert says so in the prompt.
    ctx.execute.mockReturnValueOnce(false);
    event(0, 'click', [600, 0]);
    expect(tool.getPrompt()).toContain(TEMPLATE_INSERT_PROMPTS.rejected);
  });

  it('ends itself on Escape, Enter and Backspace', () => {
    const tool = new TemplateInsertTool();
    const { ctx, id, layers } = withTemplate();
    tool.activate(ctx, { template: id });
    tool.cancel();
    tool.finish();
    expect(tool.removeLastPoint()).toBe(true);
    expect(ctx.done).toHaveBeenCalledTimes(3);
    tool.deactivate();
    expect(layers.getLength()).toBe(1); // only the selection overlay is left
  });
});
