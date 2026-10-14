// @vitest-environment jsdom
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import type MultiPoint from 'ol/geom/MultiPoint';
import Style from 'ol/style/Style';
import { describe, expect, it, vi } from 'vitest';
import {
  createHighlightStyle,
  HIGHLIGHT_LAYER_PROPERTY,
  Selection,
  vertexPoints,
} from './Selection';

const config = {
  strokeColor: 'red',
  strokeWidth: 2,
  fillColor: 'pink',
  pointRadius: 5,
  haloColor: 'white',
  haloWidth: 3,
  vertexSize: 6,
  inspect: true,
};
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

function fakeMap() {
  const layers = new Collection<BaseLayer>();
  return {
    layers,
    map: {
      addLayer: (l: BaseLayer) => layers.push(l),
      removeLayer: (l: BaseLayer) => layers.remove(l),
    } as unknown as OlMap,
  };
}

const square = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
  [0, 0],
];

describe('Selection', () => {
  it('adds, toggles and clears, emitting one change per batch', async () => {
    const onChange = vi.fn();
    const selection = new Selection(fakeMap().map, config, onChange);
    const a = new Feature(new Point([0, 0]));
    const b = new Feature(new Point([1, 1]));
    selection.add(a);
    selection.add(a); // no duplicate
    selection.add(b);
    expect(selection.get()).toEqual([a, b]);
    expect(onChange).not.toHaveBeenCalled();
    await tick();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([a, b]);
    selection.set([b]);
    await tick();
    expect(selection.get()).toEqual([b]);
    expect(selection.has(a)).toBe(false);
    selection.clear();
    await tick();
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('draws the highlight on its own layer and leaves the features alone', async () => {
    const { map, layers } = fakeMap();
    const selection = new Selection(map, config, vi.fn());
    expect(layers.getLength()).toBe(1);
    expect(selection.layer.get(HIGHLIGHT_LAYER_PROPERTY)).toBe(true);
    expect(selection.layer.get('olcad:layer')).toBeUndefined(); // not an editor layer
    expect(selection.layer.getZIndex()).toBe(1000);
    const own = new Style();
    const styled = new Feature(new Point([0, 0]));
    styled.setStyle(own);
    const plain = new Feature(new Point([1, 1]));
    selection.set([styled, plain]);
    expect(styled.getStyle()).toBe(own);
    expect(plain.getStyle()).toBeFalsy();
    const source = selection.layer.getSource()!;
    expect(source.getFeatures()).toEqual([styled, plain]);
    selection.prune((f) => f === plain);
    expect(source.getFeatures()).toEqual([plain]);
    selection.destroy();
    expect(source.getFeatures()).toEqual([]);
    expect(layers.getLength()).toBe(0);
    await tick();
  });
});

describe('createHighlightStyle', () => {
  it('builds halo, main style and vertex grips from the config', () => {
    const styles = createHighlightStyle(config);
    expect(styles).toHaveLength(3);
    expect(styles[0]!.getStroke()!.getWidth()).toBe(2 + 2 * 3);
    expect(styles[0]!.getStroke()!.getColor()).toBe('white');
    expect(styles[1]!.getStroke()!.getColor()).toBe('red');
    expect(styles[1]!.getStroke()!.getWidth()).toBe(2);
    expect(styles[1]!.getFill()!.getColor()).toBe('pink');
    const grips = styles[2]!;
    const polygon = new Feature(new Polygon([square]));
    const geometry = grips.getGeometryFunction()(polygon) as MultiPoint;
    expect(geometry.getCoordinates()).toEqual(square.slice(0, -1));
    expect(grips.getGeometryFunction()(new Feature(new Point([1, 1])))).toBeUndefined();
  });

  it('drops the halo and the grips when their size is 0', () => {
    const styles = createHighlightStyle({ ...config, haloWidth: 0, vertexSize: 0 });
    expect(styles).toHaveLength(1);
    expect(styles[0]!.getStroke()!.getColor()).toBe('red');
  });
});

describe('vertexPoints', () => {
  it('collects the vertices of lines, polygons and multi-geometries', () => {
    expect(vertexPoints(undefined)).toBeNull();
    expect(vertexPoints(new Point([1, 2]))).toBeNull();
    expect(
      vertexPoints(
        new LineString([
          [0, 0],
          [1, 1],
        ]),
      )!.getCoordinates(),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
    const hole = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 1],
    ];
    expect(vertexPoints(new Polygon([square, hole]))!.getCoordinates()).toHaveLength(4 + 3);
    expect(vertexPoints(new MultiPolygon([[square], [square]]))!.getCoordinates()).toHaveLength(8);
  });
});
