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
import { resolveLayer } from '../config/defaults';
import type { Command, UpdateGeometryCommand } from '../changes/commands';
import { Selection } from '../selection/Selection';
import { MODIFY_PROMPTS, ModifyTool, snapshot, submitGeometryChanges } from './modify';
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

const line = () =>
  new Feature(
    new LineString([
      [0, 0],
      [100, 0],
      [100, 100],
    ]),
  );

function setup(selected: Feature[] = [], updatable: (f: Feature) => boolean = () => true) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getView: () => ({ getResolution: () => 1 }),
  } as unknown as OlMap;
  const selection = new Selection(map, selectionConfig, () => {});
  selection.set(selected);
  const ctx = {
    map,
    layers: { list: () => [], layerOf: () => undefined },
    selection,
    execute: vi.fn((_command: Command) => true),
    getActiveLayer: () => null,
    getDraftLayer: () => null,
    hitTolerance: 4,
    canUpdate: updatable,
    promptChanged: vi.fn(),
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new ModifyTool();
  tool.activate(ctx);
  const active = () => interactions.getArray().map((i) => i.getActive());
  const event = (type: string, coordinate: number[], altKey = false) =>
    interactions
      .getArray()[1]!
      .handleEvent({ type, coordinate, originalEvent: { altKey } } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const lastGeometry = () => {
    const command = ctx.execute.mock.calls.at(-1)![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry');
    return (command.geometry as LineString).getCoordinates();
  };
  return { tool, ctx, interactions, layers, selection, active, event, preview, lastGeometry };
}

describe('ModifyTool', () => {
  it('asks for one object and starts editing once exactly one updatable object is selected', async () => {
    const { tool, ctx, selection, active, event } = setup();
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.select);
    expect(active()).toEqual([true, false]); // select on, pointer off
    expect(tool.handleInput([1, 1])).toBe(false);
    expect(tool.removeLastPoint()).toBe(false);
    tool.finish(); // nothing to finish
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.select);
    const a = line();
    const b = line();
    selection.set([a, b]);
    await tick();
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.select); // two objects: pick one
    selection.set([a]);
    await tick();
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    expect(active()).toEqual([false, true]);
    expect(ctx.promptChanged).toHaveBeenCalled();
    // Clicking empty map while idle changes nothing.
    expect(event('click', [50, 50])).toBe(false);
    expect(ctx.execute).not.toHaveBeenCalled();
  });

  it('starts idle with a single updatable selection, not with a read-only one', () => {
    expect(setup([line()]).tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    expect(setup([line()], () => false).tool.getPrompt()).toBe(MODIFY_PROMPTS.select);
  });

  it('picks up a vertex, previews it on the crosshair and places it as one command', () => {
    const feature = line();
    const { tool, ctx, event, preview, lastGeometry } = setup([feature]);
    expect(event('click', [101, 1])).toBe(false); // picks the vertex at [100, 0]
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.placing);
    expect(tool.referencePoint()).toEqual([100, 0]);
    expect(event('pointermove', [120, 20])).toBe(true);
    const ghost = preview().find((f) => !f.get(PREVIEW_VERTEX_PROPERTY))!;
    expect((ghost.getGeometry() as LineString).getCoordinates()[1]).toEqual([120, 20]);
    expect(preview().find((f) => f.get(PREVIEW_VERTEX_PROPERTY) === 'picked')).toBeDefined();
    expect(event('dblclick', [120, 20])).toBe(false);
    event('click', [130, 30]);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    expect(lastGeometry()).toEqual([
      [0, 0],
      [130, 30],
      [100, 100],
    ]);
    // The feature itself is untouched until the command is applied by the editor.
    expect((feature.getGeometry() as LineString).getCoordinates()[1]).toEqual([100, 0]);
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    expect(tool.referencePoint()).toBeNull();
    expect(preview()).toHaveLength(0);
  });

  it('places a typed point and drops a pick with Escape or Backspace', () => {
    const { tool, ctx, event, lastGeometry } = setup([line()]);
    event('click', [0, 0]);
    expect(tool.handleInput([5, 5])).toBe(true);
    expect(lastGeometry()[0]).toEqual([5, 5]);
    event('click', [0, 0]);
    tool.cancel();
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    event('click', [0, 0]);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
  });

  it('inserts a vertex from a segment click and removes one with Alt+click or Delete', () => {
    const { ctx, event, lastGeometry, tool } = setup([line()]);
    event('click', [50, 2]); // on the first segment: a new vertex at its foot [50, 0]
    expect(tool.referencePoint()).toEqual([50, 0]);
    event('click', [50, -10]);
    expect(lastGeometry()).toEqual([
      [0, 0],
      [50, -10],
      [100, 0],
      [100, 100],
    ]);
    event('click', [100, 0], true); // Alt+click removes
    expect(ctx.execute).toHaveBeenCalledTimes(2);
    expect(lastGeometry()).toEqual([
      [0, 0],
      [100, 100],
    ]);
    event('pointermove', [100, 101]); // hover a vertex, then Delete
    expect(tool.removeLastPoint()).toBe(true);
    expect(ctx.execute).toHaveBeenCalledTimes(3);
    event('pointermove', [50, 50]); // nothing hovered
    expect(tool.removeLastPoint()).toBe(false);
  });

  it('keeps a lone point and keeps rings closed', () => {
    const point = new Feature(new Point([0, 0]));
    const single = setup([point]);
    single.event('click', [0, 0], true);
    expect(single.ctx.execute).not.toHaveBeenCalled();
    single.event('click', [0, 0]);
    single.event('click', [7, 7]);
    const moved = single.ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect((moved.geometry as Point).getCoordinates()).toEqual([7, 7]);

    const ring = new Feature(
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
    const poly = setup([ring]);
    poly.event('click', [0, 0]);
    poly.event('click', [1, 1]);
    const command = poly.ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    const coordinates = (command.geometry as Polygon).getCoordinates()[0]!;
    expect(coordinates[0]).toEqual([1, 1]);
    expect(coordinates[4]).toEqual([1, 1]);
  });

  it('Enter clears the selection, deactivation keeps it, and losing the object drops back', async () => {
    const feature = line();
    const first = setup([feature]);
    first.tool.finish();
    expect(first.selection.get()).toEqual([]);
    expect(first.tool.getPrompt()).toBe(MODIFY_PROMPTS.select);
    await tick();
    expect(first.tool.getPrompt()).toBe(MODIFY_PROMPTS.select);

    const second = setup([feature]);
    second.event('click', [0, 0]);
    second.tool.deactivate();
    expect(second.selection.get()).toEqual([feature]);
    expect(second.interactions.getLength()).toBe(0);
    expect(second.layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);

    const third = setup([feature]);
    third.event('click', [0, 0]);
    third.selection.clear(); // deleted or undone elsewhere
    await tick();
    expect(third.tool.getPrompt()).toBe(MODIFY_PROMPTS.select);
    expect(third.tool.referencePoint()).toBeNull();
  });

  it('drops a pick when the geometry changes from outside, and pauses while suspended', () => {
    const feature = line();
    const { tool, event, active } = setup([feature]);
    event('click', [0, 0]);
    feature.setGeometry(
      new LineString([
        [0, 0],
        [1, 1],
      ]),
    );
    expect(tool.getPrompt()).toBe(MODIFY_PROMPTS.idle);
    tool.setSuspended(true);
    expect(active()).toEqual([false, false]);
    tool.setSuspended(false);
    expect(active()).toEqual([false, true]);
  });
});

describe('submitGeometryChanges', () => {
  it('restores the originals and submits the new geometries as commands', () => {
    const a = new Feature(new Point([0, 0]));
    const b = new Feature(new Point([5, 5]));
    const before = snapshot([a, b]);
    (a.getGeometry() as Point).setCoordinates([1, 1]); // what an interaction would do
    (b.getGeometry() as Point).setCoordinates([6, 6]);
    const execute = vi.fn((command: Command) => {
      expect((a.getGeometry() as Point).getCoordinates()).toEqual([0, 0]); // restored first
      expect(command.type).toBe('composite');
      if (command.type === 'composite') {
        expect(command.commands.map((c) => c.type)).toEqual(['updateGeometry', 'updateGeometry']);
        const first = command.commands[0];
        if (first?.type === 'updateGeometry') {
          expect((first.geometry as Point).getCoordinates()).toEqual([1, 1]);
        }
      }
      return true;
    });
    expect(submitGeometryChanges({ execute } as unknown as ToolContext, [a, b], before)).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(before.size).toBe(0);
  });

  it('submits a single command for one feature and nothing for none', () => {
    const a = new Feature(new Point([0, 0]));
    const before = snapshot([a]);
    const execute = vi.fn((_command: Command) => true);
    submitGeometryChanges({ execute } as unknown as ToolContext, [a], before);
    expect(execute.mock.calls[0]![0]).toMatchObject({ type: 'updateGeometry' });
    expect(submitGeometryChanges({ execute } as unknown as ToolContext, [], new Map())).toBe(false);
  });
});

describe('ModifyTool: dimension grips', () => {
  it('moves the dimension line, the value and a definition point through grips', () => {
    const dim = new Feature({
      geometry: new LineString([
        [0, 0],
        [100, 0],
      ]),
      dimType: 'aligned',
      offset: 10,
    });
    const { ctx, event, preview } = setup([dim]);
    Object.assign(ctx, {
      layers: {
        list: () => [],
        layerOf: () => 'dims',
        getConfig: () =>
          resolveLayer({
            id: 'dims',
            geometryType: 'LineString',
            source: { features: [] },
            dimension: true,
          }),
      },
      getProjection: () => 'EPSG:3857', // near the origin one map unit is one metre
      getLocale: () => 'en',
    });
    event('pointermove', [20, 10]);
    expect(preview().length).toBe(4); // two points, the line and the value
    // The line grip (a fifth along the dimension line) sets the offset.
    event('click', [20, 10]);
    event('pointermove', [30, 25]);
    event('click', [30, 25]);
    expect(ctx.execute.mock.calls.at(-1)![0]).toMatchObject({
      type: 'updateProperties',
      properties: { offset: 25 },
    });
    // The value grip moves the text along the line.
    event('click', [50, 10]);
    event('click', [60, 10]);
    expect(ctx.execute.mock.calls.at(-1)![0]).toMatchObject({ properties: { textPosition: 10 } });
    // A point grip moves the definition point; the GIS value follows.
    event('click', [100, 0]);
    event('click', [120, 0]);
    const [geometry, properties] = (
      ctx.execute.mock.calls.at(-1)![0] as {
        commands: { geometry?: LineString; properties?: Record<string, number> }[];
      }
    ).commands;
    expect(geometry!.geometry!.getCoordinates()).toEqual([
      [0, 0],
      [120, 0],
    ]);
    expect(properties!.properties!.gisValue).toBeCloseTo(120, 3);
  });
});
