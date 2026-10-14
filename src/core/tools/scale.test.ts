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
import type { CompositeCommand, UpdateGeometryCommand } from '../changes/commands';
import { Selection } from '../selection/Selection';
import { PREVIEW_LAYER_PROPERTY } from './preview';
import { SCALE_PROMPTS, ScaleTool } from './scale';
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
  const tool = new ScaleTool();
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

describe('ScaleTool', () => {
  it('asks for objects without a selection and continues on Enter', () => {
    const { tool, selection, active } = setup();
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(active()).toEqual([true, true, false]);
    expect(tool.handleInput([1, 1])).toBe(false);
    expect(tool.handleValue(2)).toBe(false);
    tool.finish();
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    selection.add(new Feature(new Point([0, 0])));
    tool.finish();
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.base);

    expect(tool.getInputRequest()).toBe(null);
    expect(active()).toEqual([false, false, true]);
  });

  it('scales the updatable objects around the base point by a typed factor as one command', () => {
    const line = new Feature(
      new LineString([
        [1, 1],
        [3, 1],
      ]),
    );
    const point = new Feature(new Point([1, 3]));
    const readonly = new Feature(new Point([5, 5]));
    const { tool, ctx, event, selection } = setup([line, point, readonly], (f) => f !== readonly);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.base);

    expect(tool.getInputRequest()).toBe(null); // a selection exists
    expect(tool.handleValue(2)).toBe(false); // no factor before the base point
    event('click', [1, 1]);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.factor);

    expect(tool.getInputRequest()).toBe('value');
    expect(tool.referencePoint()).toEqual([1, 1]);
    // Not greater than 0: taken (never read as a distance) but only a notice.
    expect(tool.handleValue(0)).toBe(true);
    expect(tool.handleValue(-1)).toBe(true);
    expect(tool.getPrompt()).toBe(
      `The scale factor must be greater than 0. ${SCALE_PROMPTS.factor}`,
    );
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.handleValue(2)).toBe(true);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as CompositeCommand;
    expect(command.type).toBe('composite');
    const updates = command.commands as UpdateGeometryCommand[];
    expect(updates.map((c) => c.feature)).toEqual([line, point]);
    close((updates[0]!.geometry as LineString).getCoordinates(), [
      [1, 1],
      [5, 1],
    ]);
    expect((updates[1]!.geometry as Point).getCoordinates()).toEqual([1, 5]);
    // The features themselves are untouched until the command applies.
    expect((line.getGeometry() as LineString).getCoordinates()).toEqual([
      [1, 1],
      [3, 1],
    ]);
    expect(selection.get()).toEqual([]);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
  });

  it('takes the factor from a reference and a target point', () => {
    const line = new Feature(
      new LineString([
        [0, 0],
        [10, 0],
      ]),
    );
    const { tool, ctx, event, preview } = setup([line]);
    event('click', [0, 0]);
    event('pointermove', [5, 5]);
    expect(preview()).toHaveLength(1); // the reference leg follows the pointer
    event('click', [0, 0]); // on the base: no length, ignored
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.factor);

    expect(tool.getInputRequest()).toBe('value');
    expect(tool.handleInput([10, 0])).toBe(true); // a typed reference point
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.target);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toEqual([0, 0]);
    // The preview shows the scaled ghost and both legs.
    event('pointermove', [0, 5]);
    const ghosts = preview();
    expect(ghosts).toHaveLength(3);
    close((ghosts[0]!.getGeometry() as LineString).getCoordinates(), [
      [0, 0],
      [5, 0],
    ]);
    // A target on the base would collapse the objects: notice only.
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(
      `The scale factor must be greater than 0. ${SCALE_PROMPTS.target}`,
    );
    expect(ctx.execute).not.toHaveBeenCalled();
    event('click', [0, 25]);
    const command = ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry');
    close((command.geometry as LineString).getCoordinates(), [
      [0, 0],
      [25, 0],
    ]);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(preview()).toEqual([]);
  });

  it('Escape and Backspace step back; deactivation keeps the selection', () => {
    const point = new Feature(new Point([1, 1]));
    const { tool, selection, event, layers, interactions } = setup([point]);
    event('click', [0, 0]);
    event('click', [5, 0]);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.target);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.factor);

    expect(tool.getInputRequest()).toBe('value');
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.base);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.referencePoint()).toBeNull();
    expect(tool.removeLastPoint()).toBe(false);
    tool.cancel();
    expect(tool.getPrompt()).toBe(SCALE_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(selection.get()).toEqual([]);
    selection.add(point);
    tool.finish();
    tool.deactivate();
    expect(selection.get()).toEqual([point]);
    expect(interactions.getLength()).toBe(0);
    expect(layers.getArray().some((l) => l.get(PREVIEW_LAYER_PROPERTY))).toBe(false);
  });
});
