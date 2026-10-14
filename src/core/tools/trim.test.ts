// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import { describe, expect, it, vi } from 'vitest';
import type { Command, CompositeCommand, UpdateGeometryCommand } from '../changes/commands';
import { Selection } from '../selection/Selection';
import { EXTEND_PROMPTS, ExtendTool } from './extend';
import { PREVIEW_LAYER_PROPERTY } from './preview';
import type { ToolContext } from './Tool';
import { TRIM_PROMPTS, TrimTool } from './trim';

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

const line = (coordinates: number[][], properties: Record<string, unknown> = {}) =>
  new Feature({ ...properties, geometry: new LineString(coordinates) });

/** A horizontal road and a vertical wall crossing it at x = 50; one map unit per pixel. */
function setup(
  tool: TrimTool | ExtendTool,
  options: { selected?: 'wall' | 'none'; insertable?: boolean; updatable?: boolean } = {},
) {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getView: () => ({ getResolution: () => 1 }),
  } as unknown as OlMap;
  const roads = new VectorSource<Feature>();
  const walls = new VectorSource<Feature>();
  const road = line(
    [
      [0, 0],
      [100, 0],
    ],
    { id: 7, name: 'Main' },
  );
  road.setId(7);
  const wall = line([
    [50, -50],
    [50, 50],
  ]);
  roads.addFeature(road);
  walls.addFeature(wall);
  const sources: Record<string, VectorSource<Feature>> = { roads, walls };
  const selection = new Selection(map, selectionConfig, () => {});
  if (options.selected !== 'none') selection.set([wall]);
  const ctx = {
    map,
    layers: {
      list: () => [
        { id: 'roads', visible: true },
        { id: 'walls', visible: true },
      ],
      getSource: (id: string) => sources[id]!,
      canEdit: () => options.insertable ?? true,
      getConfig: () => ({ idProperty: 'id' }),
    },
    selection,
    execute: vi.fn(() => true),
    getActiveLayer: () => null,
    getDraftLayer: () => null,
    hitTolerance: 4,
    canUpdate: (f: Feature) => (options.updatable ?? true) && f !== wall,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    formatLength: (metres: number) => `${metres.toFixed(2)} m`,
  } as unknown as ToolContext & {
    execute: ReturnType<typeof vi.fn>;
    promptChanged: ReturnType<typeof vi.fn>;
  };
  tool.activate(ctx);
  const event = (type: string, coordinate: number[]) =>
    interactions.getArray()[1]!.handleEvent({ type, coordinate } as unknown as MapBrowserEvent);
  const previews = () =>
    layers
      .getArray()
      .filter((l) => l.get(PREVIEW_LAYER_PROPERTY) === true)
      .map((l) => (l as unknown as Sourced).getSource().getFeatures());
  const command = (index = 0) => ctx.execute.mock.calls[index]![0] as Command;
  return { ctx, interactions, selection, road, wall, roads, event, previews, command };
}

const coordinatesOf = (command: Command) =>
  ((command as UpdateGeometryCommand).geometry as LineString).getCoordinates();

describe('TrimTool', () => {
  it('asks for the boundary first and takes the picked line', async () => {
    const tool = new TrimTool();
    const { selection, wall, interactions } = setup(tool, { selected: 'none' });
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.boundary);
    expect(interactions.getArray().map((i) => i.getActive())).toEqual([true, false]);
    selection.set([new Feature(new Point([1, 1]))]); // no segments: not a boundary
    await tick();
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.boundary);
    selection.set([wall]);
    await tick();
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.target);
    expect(tool.getBoundary()).toEqual([wall]);
    expect(interactions.getArray().map((i) => i.getActive())).toEqual([false, true]);
  });

  it('removes the clicked end piece and clears the selection, keeping the boundary', () => {
    const tool = new TrimTool();
    const { ctx, selection, event, command, previews, road } = setup(tool);
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.target); // the selection is the boundary
    expect(previews()[0]).toHaveLength(1); // the boundary is drawn
    event('pointermove', [80, 3]);
    expect((previews()[1]![0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [50, 0],
      [100, 0],
    ]);
    event('click', [80, 3]);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    expect((command() as UpdateGeometryCommand).feature).toBe(road);
    expect(coordinatesOf(command())).toEqual([
      [0, 0],
      [50, 0],
    ]);
    expect(selection.get()).toEqual([]);
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.target);
    expect(tool.getBoundary()).toHaveLength(1);
    // A second click is another command against the same boundary.
    event('click', [20, -2]);
    expect(ctx.execute).toHaveBeenCalledTimes(2);
    expect(coordinatesOf(command(1))).toEqual([
      [50, 0],
      [100, 0],
    ]);
  });

  it('splits a line when an interior piece is cut out, copying the attributes', () => {
    const tool = new TrimTool();
    const { selection, wall, event, command, road } = setup(tool, { selected: 'none' });
    const second = line([
      [80, -50],
      [80, 50],
    ]);
    selection.set([wall, second]);
    event('click', [65, 2]); // still in the boundary step: ignored
    return tick().then(() => {
      event('click', [65, 2]);
      const split = command() as CompositeCommand;
      expect(split.type).toBe('composite');
      const [update, insert] = split.commands as [UpdateGeometryCommand, Command];
      expect(update.feature).toBe(road);
      expect(coordinatesOf(update)).toEqual([
        [0, 0],
        [50, 0],
      ]);
      expect(insert.type).toBe('insert');
      const copy = (insert as unknown as { feature: Feature }).feature;
      expect(copy.get('name')).toBe('Main');
      expect(copy.get('id')).toBeUndefined();
      expect((copy.getGeometry() as LineString).getCoordinates()).toEqual([
        [80, 0],
        [100, 0],
      ]);
    });
  });

  it('cuts a multi-line part into two parts of the same object', () => {
    const tool = new TrimTool();
    const { selection, wall, roads, road, event, command } = setup(tool, { selected: 'none' });
    roads.removeFeature(road);
    const multi = new Feature(
      new MultiLineString([
        [
          [0, 0],
          [100, 0],
        ],
        [
          [0, 30],
          [10, 30],
        ],
      ]),
    );
    roads.addFeature(multi);
    selection.set([
      wall,
      line([
        [80, -50],
        [80, 50],
      ]),
    ]);
    return tick().then(() => {
      event('click', [65, 0]);
      const geometry = (command() as UpdateGeometryCommand).geometry as MultiLineString;
      expect(geometry.getCoordinates()).toEqual([
        [
          [0, 0],
          [50, 0],
        ],
        [
          [80, 0],
          [100, 0],
        ],
        [
          [0, 30],
          [10, 30],
        ],
      ]);
    });
  });

  it('explains clicks that change nothing', () => {
    const tool = new TrimTool();
    const { ctx, event } = setup(tool);
    event('click', [300, 300]);
    expect(tool.getPrompt()).toBe(`${TRIM_PROMPTS.miss} ${TRIM_PROMPTS.target}`);
    expect(ctx.execute).not.toHaveBeenCalled();
    ctx.execute.mockReturnValueOnce(false);
    event('click', [80, 0]);
    expect(tool.getPrompt()).toContain(TRIM_PROMPTS.rejected);
  });

  it('refuses a split without insert rights and lines that cannot be changed', async () => {
    const tool = new TrimTool();
    const { ctx, selection, wall, event } = setup(tool, { selected: 'none', insertable: false });
    selection.set([
      wall,
      line([
        [80, -50],
        [80, 50],
      ]),
    ]);
    await tick();
    event('click', [65, 0]);
    expect(tool.getPrompt()).toContain(TRIM_PROMPTS.noInsert);
    const readOnly = new TrimTool();
    const other = setup(readOnly, { updatable: false });
    other.event('click', [80, 0]);
    expect(readOnly.getPrompt()).toContain(TRIM_PROMPTS.readOnly);
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(other.ctx.execute).not.toHaveBeenCalled();
  });

  it('Enter, Escape and Backspace go back to picking a boundary', () => {
    const tool = new TrimTool();
    const { selection } = setup(tool);
    tool.finish();
    expect(tool.getPrompt()).toBe(TRIM_PROMPTS.boundary);
    expect(selection.get()).toEqual([]);
    expect(tool.removeLastPoint()).toBe(false);
    const again = new TrimTool();
    setup(again);
    expect(again.removeLastPoint()).toBe(true);
    expect(again.getPrompt()).toBe(TRIM_PROMPTS.boundary);
    const third = new TrimTool();
    setup(third);
    third.cancel();
    expect(third.getPrompt()).toBe(TRIM_PROMPTS.boundary);
  });

  it('keeps the selection when switching tools', () => {
    const tool = new TrimTool();
    const { selection, interactions } = setup(tool);
    tool.deactivate();
    expect(selection.get()).toHaveLength(1);
    expect(interactions.getLength()).toBe(0);
  });
});

describe('ExtendTool', () => {
  it('extends the clicked end of a line onto the boundary', () => {
    const tool = new ExtendTool();
    const { ctx, roads, road, selection, event, command, previews } = setup(tool);
    roads.removeFeature(road);
    const short = line([
      [0, 10],
      [30, 10],
    ]);
    roads.addFeature(short);
    expect(tool.getPrompt()).toBe(EXTEND_PROMPTS.target);
    event('pointermove', [25, 11]);
    expect((previews()[1]![0]!.getGeometry() as LineString).getCoordinates()).toEqual([
      [30, 10],
      [50, 10],
    ]);
    event('click', [25, 11]);
    expect((command() as UpdateGeometryCommand).feature).toBe(short);
    expect(coordinatesOf(command())).toEqual([
      [0, 10],
      [50, 10],
    ]);
    expect(selection.get()).toEqual([]);
    // The far end points away from the wall: nothing to extend.
    event('click', [3, 10]);
    expect(ctx.execute).toHaveBeenCalledTimes(1);
    expect(tool.getPrompt()).toBe(`${EXTEND_PROMPTS.noResult} ${EXTEND_PROMPTS.target}`);
  });
});
