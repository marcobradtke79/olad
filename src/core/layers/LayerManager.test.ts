// @vitest-environment jsdom
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Collection from 'ol/Collection';
import { fromLonLat } from 'ol/proj';
import type OlMap from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import { describe, expect, it, vi } from 'vitest';
import type VectorLayer from 'ol/layer/Vector';
import type Style from 'ol/style/Style';
import { LAYER_HIGHLIGHT_PROPERTY, LAYER_HIGHLIGHT_Z_INDEX } from './highlight';
import { LayerManager } from './LayerManager';

/** A stand-in for ol/Map: only the layer collection is needed. */
function fakeMap() {
  const layers = new Collection<BaseLayer>();
  return {
    layers,
    map: {
      addLayer: (l: BaseLayer) => layers.push(l),
      removeLayer: (l: BaseLayer) => layers.remove(l),
      getLayers: () => layers,
    } as unknown as OlMap,
  };
}

function manager(projection = 'EPSG:3857') {
  const { map, layers } = fakeMap();
  const events = { onChange: vi.fn(), onLoad: vi.fn(), onError: vi.fn(), onActiveChange: vi.fn() };
  return { lm: new LayerManager(map, () => projection, events), events, layers };
}

const point = (x: number, y: number) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [x, y] },
});

describe('LayerManager', () => {
  it('adds, lists, updates and removes layers with events', () => {
    const { lm, events, layers } = manager();
    lm.add({
      id: 'a',
      geometryType: 'Point',
      source: { features: [point(8.4, 49)] },
      editable: { insert: true },
    });
    expect(layers.getLength()).toBe(1);
    expect(lm.list()).toEqual([
      {
        id: 'a',
        title: 'a',
        visible: true,
        geometryType: 'Point',
        editable: { insert: true, update: false, delete: false },
        snappable: true,
        featureCount: 0,
        active: false,
        highlighted: false,
        dataProjection: 'EPSG:4326',
        local: false,
      },
    ]);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'a', type: 'add' });

    lm.setVisible('a', false);
    expect(lm.info('a').visible).toBe(false);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'a', type: 'visible' });
    lm.setVisible('a', false);
    expect(events.onChange).toHaveBeenCalledTimes(2);

    lm.setEditable('a', true);
    expect(lm.info('a').editable).toEqual({ insert: true, update: true, delete: true });
    lm.setSnappable('a', false);
    expect(lm.snappableIds()).toEqual([]);

    lm.remove('a');
    expect(layers.getLength()).toBe(0);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'a', type: 'remove' });
    expect(() => lm.info('a')).toThrow('Unknown layer "a"');
  });

  it('tracks the active layer and resets it when that layer is removed', () => {
    const { lm, events } = manager();
    lm.add({ id: 'a', geometryType: 'Point', source: { features: [] } });
    lm.add({ id: 'b', geometryType: 'Point', source: { features: [] } });
    expect(lm.getActive()).toBeNull();
    expect(() => lm.setActive('nope')).toThrow(/Unknown layer/);
    lm.setActive('a');
    lm.setActive('a'); // no-op
    expect(lm.getActive()).toBe('a');
    expect(lm.info('a').active).toBe(true);
    expect(lm.info('b').active).toBe(false);
    expect(events.onActiveChange).toHaveBeenCalledTimes(1);
    expect(events.onActiveChange).toHaveBeenLastCalledWith({ id: 'a' });
    lm.remove('b');
    expect(lm.getActive()).toBe('a');
    lm.remove('a');
    expect(lm.getActive()).toBeNull();
    expect(events.onActiveChange).toHaveBeenLastCalledWith({ id: null });
    lm.setActive(null); // already null, no event
    expect(events.onActiveChange).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate ids and invalid configs', () => {
    const { lm } = manager();
    lm.add({ id: 'a', geometryType: 'Point', source: { features: [] } });
    expect(() => lm.add({ id: 'a', geometryType: 'Point', source: { features: [] } })).toThrow(
      'already exists',
    );
    expect(() =>
      lm.add({ id: 'b', geometryType: 'Blob' as never, source: { features: [] } }),
    ).toThrow('layer.geometryType');
  });

  it('applies editability flags and predicate', () => {
    const { lm } = manager();
    const feature = new Feature({ locked: true });
    lm.add({
      id: 'a',
      geometryType: 'Point',
      source: { features: [] },
      editable: { update: true, delete: true, predicate: (f) => !f.get('locked') },
    });
    expect(lm.canEdit('a', 'insert')).toBe(false);
    expect(lm.canEdit('a', 'update')).toBe(true);
    expect(lm.canEdit('a', 'update', feature)).toBe(false);
    expect(lm.canEdit('a', 'delete', new Feature())).toBe(true);
  });

  it('reprojects features from their original geometry', () => {
    const { lm } = manager();
    lm.add({ id: 'a', geometryType: 'Point', source: { features: [] } });
    const source = lm.getSource('a');
    const loaded = new Feature(new Point(fromLonLat([8.4, 49])));
    lm.originals.set(loaded, 'EPSG:4326', new Point([8.4, 49]));
    const drawn = new Feature(new Point(fromLonLat([8.4, 49])));
    source.addFeatures([loaded, drawn]);

    lm.reproject('EPSG:3857', 'EPSG:4326');
    const l = (loaded.getGeometry() as Point).getCoordinates();
    const d = (drawn.getGeometry() as Point).getCoordinates();
    expect(l).toEqual([8.4, 49]);
    expect(Math.abs(d[0]! - 8.4)).toBeLessThan(1e-6);
    expect(Math.abs(d[1]! - 49)).toBeLessThan(1e-6);
    expect(lm.layerOf(loaded)).toBe('a');
  });

  it('clears bbox-loaded layers on reprojection', () => {
    const { lm } = manager();
    lm.add({
      id: 'w',
      geometryType: 'Point',
      source: { format: 'wfs', url: '/wfs', typeName: 't' },
    });
    const source = lm.getSource('w');
    source.addFeature(new Feature(new Point([0, 0])));
    lm.reproject('EPSG:3857', 'EPSG:4326');
    expect(source.getFeatures()).toHaveLength(0);
  });

  it('highlights all objects of a layer on an overlay sharing its source', () => {
    const { map, layers } = fakeMap();
    const events = {
      onChange: vi.fn(),
      onLoad: vi.fn(),
      onError: vi.fn(),
      onActiveChange: vi.fn(),
    };
    const lm = new LayerManager(map, () => 'EPSG:3857', events, {
      strokeColor: 'orange',
      strokeWidth: 5,
      fillColor: 'yellow',
      pointRadius: 9,
    });
    lm.add({ id: 'a', geometryType: 'Point', source: { features: [point(8.4, 49)] } });
    lm.add({ id: 'b', geometryType: 'Point', source: { features: [] } });
    expect(lm.isHighlighted('a')).toBe(false);
    lm.setHighlighted('a', true);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'a', type: 'highlight' });
    expect(lm.info('a').highlighted).toBe(true);
    const overlay = layers.getArray()[2] as VectorLayer;
    expect(overlay.get(LAYER_HIGHLIGHT_PROPERTY)).toBe(true);
    expect(overlay.getZIndex()).toBe(LAYER_HIGHLIGHT_Z_INDEX);
    expect(overlay.getSource()).toBe(lm.getSource('a'));
    const style = overlay.getStyle() as Style;
    expect(style.getStroke()!.getColor()).toBe('orange');
    expect(style.getStroke()!.getWidth()).toBe(5);
    expect(style.getFill()!.getColor()).toBe('yellow');
    lm.setHighlighted('a', true); // unchanged: no event, no second overlay
    expect(layers.getLength()).toBe(3);
    expect(events.onChange).toHaveBeenCalledTimes(3);
    // Several layers at once; the overlay follows the layer's visibility.
    lm.setHighlighted('b', true);
    expect(layers.getLength()).toBe(4);
    lm.setVisible('a', false);
    expect(overlay.getVisible()).toBe(false);
    lm.setVisible('a', true);
    expect(overlay.getVisible()).toBe(true);
    lm.setHighlighted('a', false);
    expect(layers.getArray()).not.toContain(overlay);
    expect(lm.isHighlighted('a')).toBe(false);
    // Removing a highlighted layer drops its overlay; destroy removes the rest.
    lm.remove('b');
    expect(layers.getLength()).toBe(1);
    lm.setHighlighted('a', true);
    lm.destroy();
    expect(layers.getLength()).toBe(0);
    expect(() => lm.setHighlighted('x', true)).toThrow('Unknown layer');
  });

  it('starts hidden overlays for hidden layers', () => {
    const { lm, layers } = manager();
    lm.add({ id: 'a', geometryType: 'Point', visible: false, source: { features: [] } });
    lm.setHighlighted('a', true);
    expect((layers.getArray()[1] as VectorLayer).getVisible()).toBe(false);
  });
});

describe('LayerManager styles and order', () => {
  const setup = () => {
    const { lm, events, layers } = manager();
    lm.add({
      id: 'parcels',
      geometryType: 'Polygon',
      source: { features: [] },
      style: {
        'stroke-color': '#b45309',
        'stroke-width': 2,
        'fill-color': 'rgba(245, 158, 11, 0.2)',
      },
    });
    lm.add({ id: 'roads', geometryType: 'LineString', source: { features: [] }, minZoom: 5 });
    lm.add({ id: 'labels', geometryType: 'Point', source: { features: [] }, text: true });
    lm.add({
      id: 'expr',
      geometryType: 'LineString',
      source: { features: [] },
      style: { 'stroke-color': ['get', 'c'] } as never,
    });
    const olLayer = (id: string) =>
      layers.getArray().find((l) => l.get('olcad:layer') === id) as VectorLayer;
    return { lm, events, olLayer };
  };

  it('reads the configured style and tells expression styles apart', () => {
    const { lm } = setup();
    expect(lm.getStyle('parcels')).toEqual({
      opacity: 1,
      stroke: { color: '#b45309', width: 2, dash: 'solid' },
      fill: { color: '#f59e0b', opacity: 0.2 },
      label: null,
    });
    expect(lm.getStyle('roads').minZoom).toBe(5);
    expect(lm.getStyle('labels').text).toEqual({ color: '#111827', halo: '#ffffff' });
    expect(lm.hasExpressionStyle('expr')).toBe(true);
    expect(lm.hasExpressionStyle('parcels')).toBe(false);
    expect(lm.getStyle('expr').stroke).toEqual({ color: '#2563eb', width: 2, dash: 'solid' });
  });

  it('applies and resets a user style on the OpenLayers layer', () => {
    const { lm, events, olLayer } = setup();
    const style = { ...lm.getStyle('parcels'), opacity: 0.5, minZoom: 12 };
    style.fill = { color: '#ff0000', opacity: 0.4 };
    lm.setStyle('parcels', style);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'parcels', type: 'style' });
    expect(lm.isStyleCustomized('parcels')).toBe(true);
    expect(olLayer('parcels').getStyle()).toMatchObject({ 'fill-color': 'rgba(255, 0, 0, 0.4)' });
    expect(olLayer('parcels').getOpacity()).toBe(0.5);
    expect(olLayer('parcels').getMinZoom()).toBe(12);
    expect(() => lm.setStyle('parcels', { opacity: 3 })).toThrow(/opacity/);
    lm.resetStyle('parcels');
    expect(lm.isStyleCustomized('parcels')).toBe(false);
    expect(olLayer('parcels').getStyle()).toMatchObject({
      'fill-color': 'rgba(245, 158, 11, 0.2)',
    });
    expect(olLayer('parcels').getOpacity()).toBe(1);
    expect(olLayer('parcels').getMinZoom()).toBe(-Infinity);
  });

  it('keeps text layers drawing texts with the user colours', () => {
    const { lm, olLayer } = setup();
    lm.setStyle('labels', {
      ...lm.getStyle('labels'),
      text: { color: '#ff0000', halo: '#000000' },
    });
    expect(typeof olLayer('labels').getStyle()).toBe('function');
    expect(lm.getStyle('labels').text).toEqual({ color: '#ff0000', halo: '#000000' });
  });

  it('knows a layer extent from the configuration or from the loaded features', () => {
    const { lm } = manager();
    lm.add({
      id: 'configured',
      geometryType: 'Point',
      source: { features: [] },
      extent: [8.39, 49.0, 8.41, 49.02],
    });
    const extent = lm.getExtent('configured')!;
    expect(extent[0]).toBeCloseTo(933971, -1);
    expect(extent[3]).toBeCloseTo(6278256, -1);
    lm.add({ id: 'empty', geometryType: 'Point', source: { features: [] } });
    expect(lm.getExtent('empty')).toBeNull();
    lm.add({ id: 'loaded', geometryType: 'Point', source: { features: [] } });
    lm.getSource('loaded').addFeature(new Feature(new Point([10, 20])));
    lm.getSource('loaded').addFeature(new Feature(new Point([30, 5])));
    expect(lm.getExtent('loaded')).toEqual([10, 5, 30, 20]);
  });

  it('draws a layer with its configured opacity and attribution and resets to them', () => {
    const { lm } = manager();
    lm.add({
      id: 'a',
      geometryType: 'Point',
      source: { features: [] },
      opacity: 0.6,
      attribution: '&copy; test',
    });
    const layer = lm.getOlLayer('a');
    expect(layer.getOpacity()).toBe(0.6);
    expect(lm.getStyle('a').opacity).toBe(0.6);
    expect(layer.getSource()!.getAttributions()).toBeTypeOf('function');
    lm.setStyle('a', { ...lm.getStyle('a'), opacity: 0.2 });
    expect(layer.getOpacity()).toBe(0.2);
    lm.resetStyle('a');
    expect(layer.getOpacity()).toBe(0.6);
  });

  it('orders layers bottom first and sets their zIndex', () => {
    const { lm, events, olLayer } = setup();
    expect(lm.ids()).toEqual(['parcels', 'roads', 'labels', 'expr']);
    expect(olLayer('parcels').getZIndex()).toBe(1);
    lm.moveLayer('parcels', 3); // to the top
    expect(lm.ids()).toEqual(['roads', 'labels', 'expr', 'parcels']);
    expect(lm.list().map((l) => l.id)).toEqual(['roads', 'labels', 'expr', 'parcels']);
    expect(olLayer('parcels').getZIndex()).toBe(4);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'roads', type: 'order' });
    expect(lm.isOrderCustomized()).toBe(true);
    lm.setOrder(['labels', 'roads']);
    expect(lm.ids()).toEqual(['labels', 'roads', 'expr', 'parcels']);
    lm.resetOrder();
    expect(lm.ids()).toEqual(['parcels', 'roads', 'labels', 'expr']);
    expect(lm.isOrderCustomized()).toBe(false);
  });

  it('exports and imports styles and order, keeping entries for layers added later', () => {
    const a = setup();
    a.lm.setStyle('roads', { ...a.lm.getStyle('roads'), opacity: 0.3 });
    a.lm.moveLayer('roads', 0);
    a.lm.moveLayer('parcels', 3);
    const json = JSON.parse(JSON.stringify(a.lm.exportStyles()));
    json.styles['local-1'] = { opacity: 0.7, label: null };
    json.order.splice(1, 0, 'local-1');
    expect(json.order).toEqual(['roads', 'local-1', 'labels', 'expr', 'parcels']);

    const b = setup();
    b.lm.importStyles(json);
    expect(b.lm.getStyle('roads').opacity).toBe(0.3);
    expect(b.lm.ids()).toEqual(['roads', 'labels', 'expr', 'parcels']);
    // Exported again before the local layer exists: nothing is lost.
    expect(b.lm.exportStyles()).toEqual(json);
    b.lm.add({ id: 'local-1', geometryType: 'Point', source: { features: [] } });
    expect(b.lm.ids()).toEqual(['roads', 'local-1', 'labels', 'expr', 'parcels']);
    expect(b.olLayer('local-1').getOpacity()).toBe(0.7);
    expect(() =>
      b.lm.importStyles({ version: 1, order: [], styles: { roads: { opacity: 9 } } }),
    ).toThrow(/styles\.styles\.roads\.opacity/);
    b.lm.resetStyles();
    expect(b.lm.exportStyles()).toEqual({ version: 1, order: [], styles: {} });
  });
});
