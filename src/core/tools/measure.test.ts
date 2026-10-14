// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import { describe, expect, it, vi } from 'vitest';
import { MeasurementStore } from '../measure/MeasurementStore';
import { MEASURE_PROMPTS, MeasureTool } from './measure';
import type { ToolContext } from './Tool';

// Near the origin of Web Mercator one map unit is about one metre.
const road = new Feature(
  new LineString([
    [0, 0],
    [300, 0],
    [300, 400],
  ]),
);
road.setId(815);
const parcel = new Feature(
  new Polygon([
    [
      [1000, 0],
      [1200, 0],
      [1200, 100],
      [1000, 100],
      [1000, 0],
    ],
    [
      [1050, 25],
      [1050, 75],
      [1100, 75],
      [1100, 25],
      [1050, 25],
    ],
  ]),
);
parcel.setId(1);

function setup(kind: 'distance' | 'area' | 'angle') {
  const interactions = new Collection<Interaction>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    getView: () => ({ getResolution: () => 1 }),
  } as unknown as OlMap;
  const sources: Record<string, VectorSource<Feature>> = {
    roads: new VectorSource({ features: [road] }),
    parcels: new VectorSource({ features: [parcel] }),
  };
  const change = vi.fn();
  const live = vi.fn();
  const measurements = new MeasurementStore(() => 'EPSG:3857', { change, live });
  const ctx = {
    map,
    layers: {
      list: () => [
        { id: 'roads', visible: true },
        { id: 'parcels', visible: true },
      ],
      getSource: (id: string) => sources[id]!,
    },
    hitTolerance: 4,
    promptChanged: vi.fn(),
    measurements,
  } as unknown as ToolContext;
  const tool = new MeasureTool(kind);
  tool.activate(ctx);
  const event = (type: string, coordinate: number[], altKey = false) =>
    interactions
      .getArray()[0]!
      .handleEvent({ type, coordinate, originalEvent: { altKey } } as unknown as MapBrowserEvent);
  return { tool, ctx, measurements, change, live, event, interactions };
}

describe('MeasureTool', () => {
  it('is read-only and has one id per kind', () => {
    const { tool } = setup('distance');
    expect(tool.readOnly).toBe(true);
    expect(tool.id).toBe('measure-distance');
    expect(new MeasureTool('angle').id).toBe('measure-angle');
  });

  it('measures a polyline live and stores it on Enter; Backspace drops a point', () => {
    const { tool, measurements, live, event } = setup('distance');
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.distance.first);
    tool.finish(); // nothing yet
    expect(measurements.list()).toEqual([]);
    expect(event('click', [0, 0])).toBe(false);
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.distance.next);
    expect(tool.referencePoint()).toEqual([0, 0]);
    event('pointermove', [30, 40]);
    expect(live).toHaveBeenLastCalledWith(expect.objectContaining({ label: '50.00 m' }));
    event('click', [30, 40]);
    event('click', [30, 40]); // the same point again is ignored
    tool.handleInput([30, 140]); // a typed point
    expect(tool.removeLastPoint()).toBe(true);
    tool.handleInput([90, 40]);
    tool.finish();
    const [stored] = measurements.list();
    expect(stored!.kind).toBe('distance');
    expect(stored!.values.length).toBeCloseTo(110, 2);
    expect(stored!.coordinates).toEqual([
      [0, 0],
      [30, 40],
      [90, 40],
    ]);
    expect(live).toHaveBeenLastCalledWith(null);
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.distance.first); // ready for the next
    expect(tool.removeLastPoint()).toBe(false);
  });

  it('needs three corners for an area; Escape drops only the one in progress', () => {
    const { tool, measurements, event } = setup('area');
    event('click', [0, 0]);
    event('click', [100, 0]);
    tool.finish(); // two corners: not yet
    expect(measurements.list()).toEqual([]);
    event('click', [100, 100]);
    tool.finish();
    expect(measurements.list()[0]!.values.area).toBeCloseTo(5000, 0);
    event('click', [0, 0]);
    tool.cancel();
    expect(measurements.getLive()).toBeNull();
    expect(measurements.list()).toHaveLength(1); // the finished one stays
  });

  it('finishes an angle on the third point', () => {
    const { tool, measurements, event } = setup('angle');
    event('click', [10, 0]);
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.angle.vertex);
    event('click', [0, 0]);
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.angle.second);
    tool.finish(); // Enter does nothing for an angle
    event('click', [10, 10]);
    expect(measurements.list()[0]!.values.angle).toBeCloseTo(45, 9);
    expect(tool.getPrompt()).toBe(MEASURE_PROMPTS.angle.first);
  });

  it('measures an existing line or polygon on Alt+click', () => {
    const distance = setup('distance');
    distance.event('click', [150, 3], true); // beside the road
    const line = distance.measurements.list()[0]!;
    expect(line.values.length).toBeCloseTo(700, 1);
    expect(line.source).toEqual({ layer: 'roads', featureId: 815 });
    distance.event('click', [1150, 50], true); // inside the parcel: its perimeter
    expect(distance.measurements.list()[1]!.values.length).toBeCloseTo(600, 1);
    distance.event('click', [600, 600], true); // nothing there
    expect(distance.tool.getPrompt()).toBe(
      `Alt+click a line or polygon to measure it. ${MEASURE_PROMPTS.distance.first}`,
    );

    const area = setup('area');
    area.event('click', [150, 3], true); // a line has no area
    expect(area.measurements.list()).toEqual([]);
    area.event('click', [1010, 10], true);
    const measured = area.measurements.list()[0]!;
    expect(measured.values.area).toBeCloseTo(20000 - 2500, -1); // minus the hole
    expect(measured.source).toEqual({ layer: 'parcels', featureId: 1 });
  });

  it('cleans up on deactivate', () => {
    const { tool, measurements, event, interactions } = setup('distance');
    event('click', [0, 0]);
    event('pointermove', [5, 5]);
    tool.deactivate();
    expect(measurements.getLive()).toBeNull();
    expect(interactions.getLength()).toBe(0);
  });
});
