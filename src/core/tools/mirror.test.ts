// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import { describe, expect, it, vi } from 'vitest';
import type {
  CompositeCommand,
  InsertFeatureCommand,
  UpdateGeometryCommand,
} from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import { Selection } from '../selection/Selection';
import { MIRROR_PROMPTS, MirrorTool } from './mirror';
import { PREVIEW_LAYER_PROPERTY } from './preview';
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
  hydrants: {
    geometryType: 'MultiPoint',
    schema: { fields: [{ name: 'colour', type: 'string', default: 'red' }] },
  } as Partial<ResolvedLayerConfig>,
  tracks: { geometryType: 'LineString' },
  draft: { geometryType: 'Any' },
};
const insertable = new Set(['roads', 'hydrants', 'draft']);

const road = () =>
  new Feature({
    layer: 'roads',
    id: 815,
    name: 'Main',
    geometry: new LineString([
      [10, 0],
      [20, 0],
    ]),
  });
const hydrant = () => new Feature({ layer: 'hydrants', pressure: 4, geometry: new Point([5, 5]) });
const track = () =>
  new Feature({
    layer: 'tracks',
    geometry: new LineString([
      [1, 1],
      [2, 2],
    ]),
  });

function setup(selected: Feature[] = []) {
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
    layers: {
      list: () => [],
      has: (id: string) => id in configs,
      canEdit: (id: string) => insertable.has(id),
      getConfig: (id: string) => configs[id] as ResolvedLayerConfig,
      layerOf: (f: Feature) => f.get('layer') as string,
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => null,
    getDraftLayer: () => 'draft',
    hitTolerance: 4,
    canUpdate: (f: Feature) => f.get('layer') !== 'tracks',
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
    done: vi.fn(),
  } as unknown as ToolContext & { execute: ReturnType<typeof vi.fn> };
  const tool = new MirrorTool();
  tool.activate(ctx);
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[2]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const preview = () =>
    (layers.getArray().find((l) => l.get(PREVIEW_LAYER_PROPERTY) === true) as unknown as Sourced)
      .getSource()
      .getFeatures();
  const active = () => interactions.getArray().map((i) => i.getActive());
  return { tool, ctx, selection, event, preview, active };
}

/** The mirror line x = 0 (vertical through the origin). */
function drawAxis(tool: MirrorTool, event: ReturnType<typeof setup>['event']) {
  event('click', [0, -10]);
  expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.second);

  expect(tool.getInputRequest()).toBe(null);
  expect(tool.referencePoint()).toEqual([0, -10]);
  event('click', [0, 10]);
  expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.copy);

  expect(tool.getInputRequest()).toBe('text');
}

describe('MirrorTool', () => {
  it('asks for the objects first and continues on Enter', async () => {
    const { tool, selection, active } = setup();
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(active()).toEqual([true, true, false]);
    tool.finish(); // nothing selected
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    selection.set([road()]);
    await tick();
    tool.finish();
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    expect(active()).toEqual([false, false, true]);
  });

  it('previews the mirrored objects and the line, and mirrors in place on Enter', () => {
    const main = road();
    const { tool, ctx, selection, event, preview } = setup([main]);
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null); // the selection skips the first step
    event('click', [0, -10]);
    event('click', [0, -10]); // the same point gives no line
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.second);

    expect(tool.getInputRequest()).toBe(null);
    event('pointermove', [0, 10]);
    const [ghost, axis] = preview();
    expect((ghost!.getGeometry() as LineString).getCoordinates()).toEqual([
      [-10, 0],
      [-20, 0],
    ]);
    const ends = (axis!.getGeometry() as LineString).getCoordinates();
    expect(ends.every(([x]) => x === 0)).toBe(true);
    expect(Math.abs(ends[1]![1]! - ends[0]![1]!)).toBeGreaterThan(20);
    event('click', [0, 10]);
    expect(preview()).toHaveLength(2); // still shown while asking about the copy
    tool.finish(); // Enter: no copy
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    const command = ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry');
    expect(command.feature).toBe(main);
    expect((command.geometry as LineString).getCoordinates()).toEqual([
      [-10, 0],
      [-20, 0],
    ]);
    expect((main.getGeometry() as LineString).getFirstCoordinate()).toEqual([10, 0]); // untouched
    expect(selection.get()).toEqual([]);
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.select);

    expect(tool.getInputRequest()).toBe(null);
    expect(preview()).toHaveLength(0);
  });

  it('skips read-only objects without a copy and says so', () => {
    const { tool, ctx, event } = setup([road(), track()]);
    drawAxis(tool, event);
    expect(tool.handleText('N')).toBe(true);
    const command = ctx.execute.mock.calls[0]![0] as UpdateGeometryCommand;
    expect(command.type).toBe('updateGeometry'); // one object: no composite
    expect(tool.getPrompt()).toBe(
      `1 object could not be changed (read-only). ${MIRROR_PROMPTS.select}`,
    );
    // Only read-only objects: nothing to execute.
    const other = setup([track()]);
    drawAxis(other.tool, other.event);
    other.event('click', [3, 3]); // a click answers "no"
    expect(other.ctx.execute).not.toHaveBeenCalled();
    expect(other.tool.getPrompt()).toContain('could not be changed');
  });

  it('inserts mirrored copies with their attributes when the answer is yes', () => {
    const { tool, ctx, selection, event } = setup([road(), hydrant(), track()]);
    drawAxis(tool, event);
    expect(tool.handleText('maybe')).toBe(false);
    expect(tool.handleText(' Ja ')).toBe(true);
    const command = ctx.execute.mock.calls[0]![0] as CompositeCommand;
    expect(command).toMatchObject({ type: 'composite', label: 'mirror' });
    const [roadCopy, hydrantCopy, trackCopy] = command.commands as InsertFeatureCommand[];
    expect(roadCopy).toMatchObject({ type: 'insert', layer: 'roads' });
    expect(roadCopy!.template).toBeUndefined(); // the attribute popup opens for copies
    expect(roadCopy!.feature.get('name')).toBe('Main');
    expect(roadCopy!.feature.get('id')).toBeUndefined();
    expect((roadCopy!.feature.getGeometry() as LineString).getCoordinates()).toEqual([
      [-10, 0],
      [-20, 0],
    ]);
    expect(hydrantCopy!.layer).toBe('hydrants');
    expect(hydrantCopy!.feature.getProperties()).toMatchObject({ colour: 'red', pressure: 4 });
    expect(hydrantCopy!.feature.getGeometry()).toBeInstanceOf(MultiPoint);
    // The read-only track is copied into the draft layer.
    expect(trackCopy!.layer).toBe('draft');
    expect(selection.get()).toEqual([]);
  });

  it('keeps the copy question when the command is rejected', () => {
    const { tool, ctx, event, selection } = setup([road()]);
    drawAxis(tool, event);
    ctx.execute.mockReturnValueOnce(false);
    tool.finish();
    expect(tool.getPrompt()).toBe(`The mirrored objects are not valid. ${MIRROR_PROMPTS.copy}`);
    expect(selection.get()).toHaveLength(1);
  });

  it('steps back with Escape and Backspace, keeps the selection on a tool switch', () => {
    const { tool, selection, event } = setup([road()]);
    drawAxis(tool, event);
    tool.cancel();
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.second);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.first);

    expect(tool.getInputRequest()).toBe(null);
    expect(tool.handleText('y')).toBe(false); // not the copy step
    selection.set([road()]);
    tool.deactivate();
    expect(selection.get()).toHaveLength(1);
    const again = setup([road()]);
    again.tool.cancel(); // first → select, clearing the selection
    expect(again.selection.get()).toEqual([]);
    expect(again.tool.getPrompt()).toBe(MIRROR_PROMPTS.select);
    expect(again.tool.removeLastPoint()).toBe(false);
  });

  it('takes typed points for the line', () => {
    const { tool } = setup([road()]);
    expect(tool.handleInput([0, 0])).toBe(true);
    expect(tool.handleInput([0, 5])).toBe(true);
    expect(tool.getPrompt()).toBe(MIRROR_PROMPTS.copy);

    expect(tool.getInputRequest()).toBe('text');
    expect(tool.handleInput([1, 1])).toBe(false);
  });
});
