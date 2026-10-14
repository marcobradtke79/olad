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
import type { UpdateGeometryCommand } from '../changes/commands';
import { Selection } from '../selection/Selection';
import { MOVE_PROMPTS, MoveTool, PREVIEW_LAYER_PROPERTY, translateFeatures } from './move';
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

function setup(selected: Feature[] = [], updatable: (f: Feature) => boolean = () => true) {
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
  const ctx = {
    map,
    layers: { list: () => [] },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => null,
    getDraftLayer: () => null,
    hitTolerance: 4,
    canUpdate: updatable,
    promptChanged: vi.fn(),
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  const tool = new MoveTool();
  tool.activate(ctx);
  const active = () => interactions.getArray().map((i) => i.getActive());
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[2]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  return { tool, ctx, interactions, layers, selection, active, event, preview };
}

describe('MoveTool', () => {
  it('asks for objects without a selection and continues on Enter', () => {
    const { tool, ctx, selection, active } = setup();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.select);
    expect(active()).toEqual([true, true, false]); // select + box on, pointer off
    expect(tool.handleInput([1, 1])).toBe(false);
    tool.finish(); // nothing selected: stays
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.select);
    selection.add(new Feature(new Point([0, 0])));
    tool.finish();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.base);
    expect(active()).toEqual([false, false, true]);
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('moves the selection by the vector between base and second point as one command', () => {
    const line = new Feature(
      new LineString([
        [0, 0],
        [10, 0],
      ]),
    );
    const readonly = new Feature(new Point([5, 5]));
    const { tool, ctx, event, preview } = setup([line, readonly], (f) => f === line);
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.base); // a selection exists: no select step
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [2, 3])).toBe(false); // consumed
    expect(event('dblclick', [2, 3])).toBe(false); // two quick picks never zoom the map
    expect(event('pointerdown', [2, 3])).toBe(true);
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.target);
    expect(tool.referencePoint()).toEqual([2, 3]);
    // The preview follows the pointer: a ghost of the movable line and the vector.
    event('pointermove', [12, 8]);
    const ghosts = preview();
    expect(ghosts).toHaveLength(2);
    expect((ghosts[0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [10, 5],
      [20, 5],
    ]);
    expect((ghosts[1]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [2, 3],
      [12, 8],
    ]);
    // Second point: one updateGeometry for the movable feature; the feature itself is put
    // back for the command to apply it.
    expect(tool.handleInput([12, 8])).toBe(true);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry');
    expect(command.feature).toBe(line);
    expect((command.geometry as LineString).getCoordinates()).toEqual([
      [10, 5],
      [20, 5],
    ]);
    expect((line.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 0],
      [10, 0],
    ]);
    expect((readonly.getGeometry() as Point).getCoordinates()).toEqual([5, 5]);
    // Done: deselected, ready for the next objects.
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.select);
    expect(ctx.selection.get()).toEqual([]);
    expect(preview()).toEqual([]);
  });

  it('Escape and Backspace step back; deactivation keeps the selection', async () => {
    const point = new Feature(new Point([1, 1]));
    const { tool, selection, event, layers, interactions } = setup([point]);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.target);
    tool.removeLastPoint();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.base);
    expect(tool.referencePoint()).toBeNull();
    tool.cancel();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.select);
    expect(selection.get()).toEqual([]);
    // A selection that disappears in a later step falls back to the select step.
    selection.add(point);
    tool.finish();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.base);
    selection.clear();
    await tick();
    expect(tool.getPrompt()).toBe(MOVE_PROMPTS.select);
    selection.add(point);
    tool.finish();
    tool.deactivate();
    expect(selection.get()).toEqual([point]);
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
  });

  it('suspension pauses the interactions of the current step only', () => {
    const { tool, active } = setup([new Feature(new Point([1, 1]))]);
    expect(active()).toEqual([false, false, true]);
    tool.setSuspended(true);
    expect(active()).toEqual([false, false, false]);
    tool.setSuspended(false);
    expect(active()).toEqual([false, false, true]);
  });
});

describe('translateFeatures', () => {
  it('moves every geometry in place', () => {
    const a = new Feature(new Point([1, 2]));
    const b = new Feature();
    translateFeatures([a, b], 3, -1);
    expect((a.getGeometry() as Point).getCoordinates()).toEqual([4, 1]);
    expect(b.getGeometry()).toBeUndefined();
  });
});
