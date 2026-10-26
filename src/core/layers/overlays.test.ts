// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { describe, expect, it, vi } from 'vitest';
import type { OverlayConfig } from '../config/types';
import { LayerManager } from './LayerManager';
import { OverlayManager, OVERLAY_ID_PROPERTY } from './overlays';
import { LAYER_ID_PROPERTY } from './vector';

function setup() {
  const layers = new Collection<BaseLayer>();
  const map = {
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getLayers: () => layers,
  } as unknown as OlMap;
  const lmEvents = {
    onChange: vi.fn(),
    onLoad: vi.fn(),
    onError: vi.fn(),
    onActiveChange: vi.fn(),
  };
  const lm = new LayerManager(map, () => 'EPSG:3857', lmEvents);
  const events = { onChange: vi.fn(), onError: vi.fn() };
  const om = new OverlayManager(map, lm, () => 'EPSG:3857', events);
  return { lm, om, layers, events, lmEvents };
}

const wms = (id: string, extra: Partial<Extract<OverlayConfig, { type: 'wms' }>> = {}) =>
  ({ id, type: 'wms', url: 'https://example.org/wms', params: { LAYERS: id }, ...extra }) as const;
const vector = (id: string) => ({
  id,
  geometryType: 'Point' as const,
  source: { features: [] as Record<string, unknown>[] },
});

describe('OverlayManager', () => {
  it('adds, lists, switches and removes overlays with events', () => {
    const { om, layers, events } = setup();
    om.add(wms('o1', { title: 'One', opacity: 0.7, minZoom: 8, attribution: 'me' }));
    om.add(wms('o2', { visible: false, tiled: false }));
    expect(layers.getLength()).toBe(2);
    const layer = om.getOlLayer('o1');
    expect(layer.get(OVERLAY_ID_PROPERTY)).toBe('o1');
    expect(layer.get(LAYER_ID_PROPERTY)).toBeUndefined();
    expect(om.list()).toEqual([
      {
        id: 'o1',
        title: 'One',
        type: 'wms',
        visible: true,
        opacity: 0.7,
        minZoom: 8,
        legendUrl: expect.stringMatching(/REQUEST=GetLegendGraphic/),
        attribution: 'me',
      },
      {
        id: 'o2',
        title: 'o2',
        type: 'wms',
        visible: false,
        opacity: 1,
        legendUrl: expect.stringMatching(/LAYER=o2/),
      },
    ]);
    expect(events.onChange.mock.calls.map((c) => c[0])).toEqual([
      { id: 'o1', type: 'add' },
      { id: 'o2', type: 'add' },
    ]);
    om.setVisible('o2', true);
    om.setVisible('o2', true);
    expect(om.info('o2').visible).toBe(true);
    expect(om.getConfig('o2').visible).toBe(true);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'o2', type: 'visible' });
    expect(events.onChange).toHaveBeenCalledTimes(3);
    om.remove('o1');
    expect(layers.getLength()).toBe(1);
    expect(om.has('o1')).toBe(false);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'o1', type: 'remove' });
    expect(() => om.info('o1')).toThrow(/Unknown overlay/);
  });

  it('shares the drawing order with the vector layers: overlays start below them', () => {
    const { lm, om } = setup();
    om.add(wms('o1'));
    lm.add(vector('a'));
    om.add(wms('o2'));
    lm.add(vector('b'));
    expect(lm.getOrder()).toEqual(['o1', 'o2', 'a', 'b']);
    expect(lm.ids()).toEqual(['a', 'b']);
    expect(lm.list().map((l) => l.id)).toEqual(['a', 'b']);
    expect(om.ids()).toEqual(['o1', 'o2']);
    const zIndex = (id: string) =>
      (lm.isRaster(id) ? om.getOlLayer(id) : lm.getOlLayer(id)).getZIndex();
    expect(['o1', 'o2', 'a', 'b'].map(zIndex)).toEqual([1, 2, 3, 4]);
    expect(lm.isOrderCustomized()).toBe(false);
    lm.moveLayer('o2', 2);
    expect(lm.getOrder()).toEqual(['o1', 'a', 'o2', 'b']);
    expect(['o1', 'a', 'o2', 'b'].map(zIndex)).toEqual([1, 2, 3, 4]);
    expect(lm.isOrderCustomized()).toBe(true);
    expect(om.ids()).toEqual(['o1', 'o2']);
    // Ids not named keep their place: overlays below, vector layers above.
    lm.setOrder(['b']);
    expect(lm.getOrder()).toEqual(['o1', 'o2', 'b', 'a']);
    lm.resetOrder();
    expect(lm.getOrder()).toEqual(['o1', 'o2', 'a', 'b']);
    om.remove('o1');
    expect(lm.getOrder()).toEqual(['o2', 'a', 'b']);
    expect(zIndex('o2')).toBe(1);
  });

  it('styles overlays with opacity and zoom range only, through the layer manager', () => {
    const { lm, om, lmEvents } = setup();
    om.add(wms('o1', { opacity: 0.7, minZoom: 8 }));
    expect(lm.getStyle('o1')).toEqual({ opacity: 0.7, minZoom: 8 });
    expect(lm.isStyleCustomized('o1')).toBe(false);
    expect(lm.hasExpressionStyle('o1')).toBe(false);
    lm.setStyle('o1', { opacity: 0.3, minZoom: 5, maxZoom: 15 });
    const layer = om.getOlLayer('o1');
    expect(layer.getOpacity()).toBe(0.3);
    expect(layer.getMinZoom()).toBe(5);
    expect(layer.getMaxZoom()).toBe(15);
    expect(lm.isStyleCustomized('o1')).toBe(true);
    expect(lmEvents.onChange).toHaveBeenLastCalledWith({ id: 'o1', type: 'style', raster: true });
    expect(om.info('o1')).toMatchObject({ opacity: 0.3, minZoom: 5, maxZoom: 15 });
    expect(() =>
      lm.setStyle('o1', { opacity: 1, stroke: { color: '#ff0000', width: 1, dash: 'solid' } }),
    ).toThrow(/opacity, minZoom and maxZoom only/);
    expect(lm.exportStyles()).toEqual({
      version: 1,
      order: [],
      styles: { o1: { opacity: 0.3, minZoom: 5, maxZoom: 15 } },
    });
    lm.resetStyle('o1');
    expect(layer.getOpacity()).toBe(0.7);
    expect(layer.getMinZoom()).toBe(8);
    expect(layer.getMaxZoom()).toBe(Infinity);
    expect(lm.isStyleCustomized('o1')).toBe(false);
  });

  it('applies a stored style and order to overlays added later', () => {
    const { lm, om } = setup();
    lm.importStyles({ version: 1, order: ['a', 'o1'], styles: { o1: { opacity: 0.2 } } });
    lm.add(vector('a'));
    om.add(wms('o1'));
    om.add(wms('o2'));
    expect(lm.getOrder()).toEqual(['o2', 'a', 'o1']);
    expect(om.getOlLayer('o1').getOpacity()).toBe(0.2);
    expect(lm.exportStyles().order).toEqual(['o2', 'a', 'o1']);
  });

  it('keeps overlays below the layers of a stored vector-only order', () => {
    const { lm, om } = setup();
    om.add(wms('o1'));
    lm.add(vector('a'));
    lm.add(vector('b'));
    lm.importStyles({ version: 1, order: ['b', 'a'], styles: {} });
    expect(lm.getOrder()).toEqual(['o1', 'b', 'a']);
  });

  it('shares one id space with the vector layers and tells them apart', () => {
    const { lm, om } = setup();
    lm.add(vector('x'));
    om.add(wms('y'));
    expect(() => om.add(wms('x'))).toThrow(/already exists/);
    expect(() => lm.add(vector('y'))).toThrow(/already exists/);
    expect(() => lm.info('y')).toThrow(/is an overlay/);
    expect(() => lm.setVisible('y', false)).toThrow(/is an overlay/);
    expect(lm.isRaster('y')).toBe(true);
    expect(lm.isRaster('x')).toBe(false);
  });

  it('derives the legend URL of WMS overlays and prefers a configured one', () => {
    const { om } = setup();
    om.add(wms('o1'));
    om.add(wms('o2', { legendUrl: 'https://legends.example.org/o2.png' }));
    om.add({ id: 'o3', type: 'xyz', url: 'https://t/{z}/{x}/{y}.png' });
    expect(om.getLegendUrl('o1')).toMatch(/^https:\/\/example\.org\/wms\?/);
    expect(om.getLegendUrl('o1')).toMatch(/LAYER=o1/);
    expect(om.getLegendUrl('o1', 10)).toMatch(/SCALE=/);
    expect(om.getLegendUrl('o2')).toBe('https://legends.example.org/o2.png');
    expect(om.getLegendUrl('o3')).toBeUndefined();
    expect(om.info('o3').legendUrl).toBeUndefined();
  });

  it('knows a configured extent, transformed into the view projection', () => {
    const { om } = setup();
    om.add(wms('o1', { extent: [8.39, 49.0, 8.41, 49.02] }));
    om.add(wms('o2'));
    const extent = om.getExtent('o1')!;
    expect(extent[0]).toBeCloseTo(933971, -1);
    expect(extent[2]).toBeCloseTo(936197, -1);
    expect(om.getExtent('o2')).toBeNull();
  });

  it('destroy removes every overlay from the map and the order', () => {
    const { lm, om, layers } = setup();
    om.add(wms('o1'));
    lm.add(vector('a'));
    om.destroy();
    expect(layers.getLength()).toBe(1);
    expect(lm.getOrder()).toEqual(['a']);
  });
});
