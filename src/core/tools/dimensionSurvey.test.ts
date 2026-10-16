// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import { describe, expect, it, vi } from 'vitest';
import type { InsertFeatureCommand } from '../changes/commands';
import { resolveLayer } from '../config/defaults';
import { layerFormFields } from '../dimensions/form';
import { Selection } from '../selection/Selection';
import { DimensionSurveyTool } from './dimensionSurvey';
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
const dims = resolveLayer({
  id: 'dims',
  geometryType: 'LineString',
  source: { features: [] },
  dimension: { preset: 'landscape' },
});

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
  const source = new VectorSource();
  const level = (id: number, x: number, height: number) => {
    const feature = new Feature({
      geometry: new LineString([
        [x, 0],
        [x + 1, 1],
      ]),
      dimType: 'level',
      fieldValue: height,
    });
    feature.setId(id);
    return feature;
  };
  source.addFeatures([level(1, 0, 101), level(2, 40, 100)]);
  const ctx = {
    map,
    layers: {
      list: () => [{ id: 'dims', visible: true }],
      has: (id: string) => id === 'dims',
      canEdit: () => true,
      getConfig: () => dims,
      getSource: () => source,
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
    getLocale: () => 'en' as const,
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
  const inserted = (index = 0) =>
    (ctx.execute.mock.calls[index]![0] as InsertFeatureCommand).feature;
  return { ctx, click, inserted };
}

describe('DimensionSurveyTool: orthogonal survey', () => {
  it('records points by station and offset on one measuring line, then the end measure', () => {
    const { ctx, click, inserted } = setup();
    const tool = new DimensionSurveyTool();
    tool.activate(ctx);
    expect(tool.isIdle()).toBe(true);
    click([0, 0]);
    expect(tool.isIdle()).toBe(false);
    click([30, 0]);
    expect(tool.isIdle()).toBe(true); // the line waits for points: a value click may edit
    click([12, -3]); // right of the line: recorded at once
    const first = inserted();
    expect(first.getProperties()).toMatchObject({ dimType: 'station', fieldValue: null });
    expect(first.get('gisValue')).toBeCloseTo(12, 6);
    expect(first.get('gisOffset')).toBeCloseTo(-3, 6);
    expect(tool.handleValue(20)).toBe(false); // the field values are typed on the value later
    // The same line takes the next point.
    expect(tool.referencePoint()).toEqual([0, 0]);
    click([20, 4]);
    expect(inserted(1).get('chain')).toBe(first.get('chain'));
    expect(inserted(1).get('gisOffset')).toBeCloseTo(4, 6);
    // Enter writes the end measure at the line's end, then the tool starts over.
    tool.finish();
    const end = inserted(2);
    expect((end.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 0],
      [30, 0],
      [30, 0],
    ]);
    expect(end.get('gisValue')).toBeCloseTo(30, 3);
    expect(tool.getPrompt()).toContain('Start of the measuring line');
  });
});

describe('DimensionSurveyTool: levels and slopes', () => {
  it('places a spot level with its label and a negative height', () => {
    const { ctx, click, inserted } = setup();
    const tool = new DimensionSurveyTool();
    tool.activate(ctx, { method: 'level' });
    click([5, 5]);
    tool.finish(); // the label beside the point
    expect(tool.handleValue(-0.15)).toBe(true);
    const level = inserted();
    expect(level.getProperties()).toMatchObject({
      dimType: 'level',
      fieldValue: -0.15,
      levelKind: 'existing',
    });
    expect((level.getGeometry() as LineString).getCoordinates()[0]).toEqual([5, 5]);
  });

  it('derives a slope from two levels, pointing downhill, with references to both', () => {
    const { ctx, click, inserted } = setup();
    const tool = new DimensionSurveyTool();
    tool.activate(ctx, { method: 'slope' });
    click([40, 0.5]); // the lower level (100 m) first
    click([0, 0.5]); // the upper level (101 m): inserts the derived slope
    const slope = inserted();
    expect(slope.get('fieldValue')).toBeNull();
    expect(slope.get('gisValue')).toBeCloseTo(2.5, 3); // 1 m over 40 m
    expect((slope.getGeometry() as LineString).getCoordinates()).toEqual([
      [0, 0],
      [40, 0],
    ]);
    expect(slope.get('refs').map((r: { id: number }) => r.id)).toEqual([1, 2]);
  });

  it('draws a free slope arrow that needs a typed percentage', () => {
    const { ctx, click, inserted } = setup();
    const tool = new DimensionSurveyTool();
    tool.activate(ctx, { method: 'slope' });
    click([10, 20]);
    click([20, 20]);
    tool.finish(); // nothing derived: Enter does not insert
    expect(ctx.execute).not.toHaveBeenCalled();
    expect(tool.handleValue(3)).toBe(true);
    expect(inserted().getProperties()).toMatchObject({ dimType: 'slope', fieldValue: 3 });
    expect(inserted().get('gisValue')).toBeUndefined();
  });

  it('offers the field offset for stations and the kind for levels in forms', () => {
    const names = (type: string) =>
      layerFormFields(dims, new Feature({ dimType: type })).map((f) => f.name);
    expect(names('station')).toEqual(['fieldValue', 'fieldOffset', 'text']);
    expect(names('level')).toEqual(['fieldValue', 'text', 'levelKind']);
    expect(names('aligned')).toEqual(['fieldValue', 'text']);
  });
});
