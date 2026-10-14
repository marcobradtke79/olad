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
import { PREVIEW_LAYER_PROPERTY } from './preview';
import { ROTATE_PROMPTS, RotateTool, rotateFeatures, rotationAngle } from './rotate';
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

const close = (actual: number[][], expected: number[][]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((c, i) => {
    expect(c[0]).toBeCloseTo(expected[i]![0]!, 9);
    expect(c[1]).toBeCloseTo(expected[i]![1]!, 9);
  });
};

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
  const tool = new RotateTool();
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

describe('RotateTool', () => {
  it('asks for objects without a selection and continues on Enter', () => {
    const { tool, ctx, selection, active } = setup();
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.select);
    expect(active()).toEqual([true, true, false]); // select + box on, pointer off
    expect(tool.handleInput([1, 1])).toBe(false);
    expect(tool.removeLastPoint()).toBe(false);
    tool.finish(); // nothing selected: stays
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.select);
    selection.add(new Feature(new Point([0, 0])));
    tool.finish();
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.center);
    expect(active()).toEqual([false, false, true]);
    expect(ctx.promptChanged).toHaveBeenCalled();
  });

  it('rotates the selection around the centre by the angle between the two legs as one command', () => {
    const line = new Feature(
      new LineString([
        [0, 0],
        [10, 0],
      ]),
    );
    const readonly = new Feature(new Point([5, 5]));
    const { tool, ctx, event, preview } = setup([line, readonly], (f) => f === line);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.center); // a selection exists: no select step
    expect(tool.referencePoint()).toBeNull();
    expect(event('click', [0, 0])).toBe(false); // consumed
    expect(event('dblclick', [0, 0])).toBe(false); // two quick picks never zoom the map
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.start);
    expect(tool.referencePoint()).toEqual([0, 0]);
    // A first point on the centre has no direction and is ignored.
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.start);
    event('pointermove', [10, 0]);
    expect(preview()).toHaveLength(1); // the first leg follows the pointer
    event('click', [10, 0]);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.end);
    expect(tool.referencePoint()).toEqual([0, 0]);
    // The preview shows the rotated ghost and both legs.
    event('pointermove', [0, 10]);
    const ghosts = preview();
    expect(ghosts).toHaveLength(3);
    close((ghosts[0]!.getGeometry() as LineString).getCoordinates(), [
      [0, 0],
      [0, 10],
    ]);
    // Second point: one updateGeometry for the rotatable feature; the feature itself is put
    // back for the command to apply it.
    expect(tool.handleInput([0, 10])).toBe(true);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry');
    expect(command.feature).toBe(line);
    close((command.geometry as LineString).getCoordinates(), [
      [0, 0],
      [0, 10],
    ]);
    expect((line.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 0],
      [10, 0],
    ]);
    expect((readonly.getGeometry() as Point).getCoordinates()).toEqual([5, 5]);
    // Done: deselected, ready for the next objects.
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.select);
    expect(ctx.selection.get()).toEqual([]);
    expect(preview()).toEqual([]);
  });

  it('Escape and Backspace step back; deactivation keeps the selection', async () => {
    const point = new Feature(new Point([1, 1]));
    const { tool, selection, event, layers, interactions } = setup([point]);
    event('click', [0, 0]);
    event('click', [5, 0]);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.end);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.start);
    expect(tool.referencePoint()).toEqual([0, 0]);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.center);
    expect(tool.referencePoint()).toBeNull();
    expect(tool.removeLastPoint()).toBe(false);
    tool.cancel();
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.select);
    expect(selection.get()).toEqual([]);
    // A selection that disappears in a later step falls back to the select step.
    selection.add(point);
    tool.finish();
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.center);
    selection.clear();
    await tick();
    expect(tool.getPrompt()).toBe(ROTATE_PROMPTS.select);
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

describe('rotationAngle and rotateFeatures', () => {
  it('measure counter-clockwise from the first leg and rotate geometries in place', () => {
    expect(rotationAngle([0, 0], [1, 0], [0, 1])).toBeCloseTo(Math.PI / 2, 12);
    expect(rotationAngle([0, 0], [0, 1], [1, 0])).toBeCloseTo(-Math.PI / 2, 12);
    expect(rotationAngle([5, 5], [6, 5], [4, 5])).toBeCloseTo(Math.PI, 12);
    const a = new Feature(new Point([2, 1]));
    const b = new Feature();
    rotateFeatures([a, b], Math.PI / 2, [1, 1]);
    const [x, y] = (a.getGeometry() as Point).getCoordinates();
    expect(x).toBeCloseTo(1, 12);
    expect(y).toBeCloseTo(2, 12);
    expect(b.getGeometry()).toBeUndefined();
  });
});
