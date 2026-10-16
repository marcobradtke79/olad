// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import { resolveLayer } from '../config/defaults';
import type { ResolvedLayerConfig } from '../config/types';
import { circlePolygon } from '../geometry/circle';
import { Selection } from '../selection/Selection';
import { DimensionAngularTool } from './dimensionAngular';
import { DimensionRadialTool } from './dimensionRadial';
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

const configs: Record<string, ResolvedLayerConfig> = {
  dims: resolveLayer({
    id: 'dims',
    geometryType: 'Any',
    source: { features: [] },
    dimension: { preset: 'surveying' }, // gon
  }),
  shapes: resolveLayer({ id: 'shapes', geometryType: 'Any', source: { features: [] } }),
};

// Near the origin of Web Mercator one map unit is one metre.
function setup() {
  const interactions = new Collection<Interaction>();
  const layers = new Collection<BaseLayer>();
  const map = {
    addInteraction: (i: Interaction) => interactions.push(i),
    removeInteraction: (i: Interaction) => interactions.remove(i),
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getView: () => ({ getResolution: () => 0.1 }),
  } as unknown as OlMap;
  const sources: Record<string, VectorSource> = {
    dims: new VectorSource(),
    shapes: new VectorSource(),
  };
  const square = new Feature(
    new Polygon([
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
        [0, 0],
      ],
    ]),
  );
  const road = new Feature(
    new Polygon([
      [
        [40, 0],
        [50, 10],
        [49, 11],
        [39, 1],
        [40, 0],
      ],
    ]),
  );
  const circle = new Feature(circlePolygon([100, 100], 8, 0.01));
  sources.shapes!.addFeatures([square, road, circle]);
  const ctx = {
    map,
    layers: {
      list: () => [
        { id: 'dims', visible: true },
        { id: 'shapes', visible: true },
      ],
      has: (id: string) => id in configs,
      canEdit: () => true,
      getConfig: (id: string) => configs[id]!,
      getSource: (id: string) => sources[id]!,
    },
    selection: new Selection(map, selectionConfig, () => {}),
    execute: vi.fn(() => true),
    getActiveLayer: () => 'dims',
    getDraftLayer: () => null,
    hitTolerance: 4,
    canUpdate: () => true,
    promptChanged: vi.fn(),
    getStraightedgeAngle: () => 0,
    getProjection: () => 'EPSG:3857',
    getCurveTolerance: () => 0.01,
    getLengthUnit: () => 'm' as const,
    getLocale: () => 'de' as const,
    formatLength: (m: number) => `${m.toFixed(2)} m`,
  } as unknown as ToolContext & { execute: ReturnType<typeof vi.fn> };
  const click = (coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({
      type: 'click',
      coordinate,
      originalEvent: {},
      map: { getCoordinateFromPixel: () => coordinate },
      pixel: [0, 0],
    } as unknown as MapBrowserEvent);
  const move = (coordinate: number[]) =>
    interactions.getArray()[0]!.handleEvent({
      type: 'pointermove',
      coordinate,
      originalEvent: {},
      map: { getCoordinateFromPixel: () => coordinate },
      pixel: [0, 0],
    } as unknown as MapBrowserEvent);
  const inserted = (index = 0) =>
    (ctx.execute.mock.calls[index]![0] as InsertFeatureCommand).feature;
  const points = (feature: Feature) => (feature.getGeometry() as LineString).getCoordinates();
  return { ctx, click, move, inserted, points };
}

describe('DimensionAngularTool', () => {
  it('measures an angle by three points; the pointer picks the inner or the reflex angle', () => {
    const { ctx, click, move, inserted } = setup();
    const tool = new DimensionAngularTool();
    tool.activate(ctx);
    expect(tool.isIdle()).toBe(true);
    click([20, 0]);
    expect(tool.isIdle()).toBe(false);
    click([0, 0]);
    click([0, 20]);
    expect(tool.getInputRequest()).toBe('value');
    move([5, 5]); // inside the right angle
    click([5, 5]); // inserts
    const first = inserted();
    expect(first.get('dimType')).toBe('angular');
    expect(first.get('gisValue')).toBeCloseTo(90, 6);
    expect(first.get('fieldValue')).toBeNull(); // typed later by clicking the value
    expect(first.get('offset')).toBeCloseTo(Math.hypot(5, 5), 2);
    expect(tool.handleValue(100.01)).toBe(false);
    // The reflex angle: the pointer outside the right angle; the arc radius typed.
    click([20, 0]);
    click([0, 0]);
    click([0, 20]);
    move([-5, -5]);
    expect(tool.handleLength(4)).toBe(true);
    expect(inserted(1).get('gisValue')).toBeCloseTo(270, 6);
    expect(inserted(1).get('offset')).toBe(4);
  });

  it('measures the angle between two picked edges that meet outside them', () => {
    const { ctx, click, inserted, points } = setup();
    const tool = new DimensionAngularTool();
    tool.activate(ctx, { method: 'segments' });
    click([10, 0]); // the square's bottom edge (y = 0)
    click([45, 5]); // the road's edge from (40, 0) to (50, 10): 45° to the bottom edge
    expect(tool.referencePoint()).toEqual([40, 0]); // the vertex where the lines meet
    click([48, 2]); // between the bottom edge (east) and the road (north-east): inserts
    const angle = inserted();
    expect(angle.get('gisValue')).toBeCloseTo(45, 6);
    expect(points(angle)[1]).toEqual([40, 0]);
  });

  it('refuses parallel edges and steps back', () => {
    const { ctx, click } = setup();
    const tool = new DimensionAngularTool();
    tool.activate(ctx, { method: 'segments' });
    click([10, 0]);
    click([10, 20]); // the top edge, parallel
    expect(tool.getPrompt()).toContain('second edge');
    expect(tool.removeLastPoint()).toBe(true);
    expect(tool.getPrompt()).toContain('first edge');
  });
});

describe('DimensionRadialTool', () => {
  it('fits the circle of a clicked curve: radius, diameter, arc length', () => {
    const { ctx, click, move, inserted, points } = setup();
    const radius = new DimensionRadialTool();
    radius.activate(ctx);
    expect(radius.isIdle()).toBe(true);
    click([108, 100.05]); // on the circle of radius 8 around (100, 100)
    expect(radius.isIdle()).toBe(false);
    move([100, 115]); // the leader points north, 7 m beyond the circle
    click([100, 115]); // inserts
    const r = inserted();
    expect(r.get('dimType')).toBe('radius');
    expect(r.get('gisValue')).toBeCloseTo(8, 3);
    expect(r.get('offset')).toBeCloseTo(7, 1);
    expect(points(r)[1]![0]).toBeCloseTo(100, 3);
    expect(points(r)[1]![1]).toBeCloseTo(108, 3);

    radius.deactivate();
    const diameter = new DimensionRadialTool();
    diameter.activate(ctx, { method: 'diameter' });
    click([108, 100.05]);
    expect(diameter.handleLength(2)).toBe(true); // the offset: inserts
    expect(diameter.handleLength(16.02)).toBe(false);
    expect(inserted(1).get('gisValue')).toBeCloseTo(16, 3);
    expect(inserted(1).get('fieldValue')).toBeNull();

    diameter.deactivate();
    const arc = new DimensionRadialTool();
    arc.activate(ctx, { method: 'arc' });
    click([108, 100.05]); // picked east of the centre
    click([100, 92]); // start: south
    click([100, 108]); // end: north; the arc holding the east point
    arc.handleLength(1); // the distance outside: inserts
    const length = inserted(2);
    expect(length.get('gisValue')).toBeCloseTo(Math.PI * 8, 1);
    const [, start, end] = points(length);
    expect(start![1]).toBeLessThan(100); // counter-clockwise: south → east → north
    expect(end![1]).toBeGreaterThan(100);
  });

  it('falls back to three points on the arc where no circle is found', () => {
    const { ctx, click, inserted } = setup();
    const tool = new DimensionRadialTool();
    tool.activate(ctx);
    click([10, 0]); // a straight edge
    expect(tool.getPrompt()).toContain('three points');
    click([5, 0]);
    click([0, 5]);
    click([-5, 0]);
    tool.handleLength(0); // inserts
    expect(inserted().get('gisValue')).toBeCloseTo(5, 6);
  });
});
