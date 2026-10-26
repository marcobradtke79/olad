// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { LayerManager } from '../../core/layers/LayerManager';
import { OverlayManager } from '../../core/layers/overlays';
import { defineElements, persistLayerStyles, type OlcadLayerStyleDialog } from '../index';

beforeAll(() => defineElements());
beforeEach(() => document.body.replaceChildren());

/** An editor facade over a real LayerManager (no map rendering needed). */
function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const collection = new Collection<BaseLayer>();
  const map = {
    addLayer: (l: BaseLayer) => collection.push(l),
    removeLayer: (l: BaseLayer) => collection.remove(l),
    getLayers: () => collection,
  } as unknown as OlMap;
  const lm = new LayerManager(map, () => 'EPSG:3857', {
    onChange: (event) =>
      event.raster
        ? emitter.emit('overlaychange', { id: event.id, type: 'style' })
        : emitter.emit('layerchange', { id: event.id, type: event.type }),
    onLoad: () => {},
    onError: () => {},
    onActiveChange: () => {},
  });
  const om = new OverlayManager(map, lm, () => 'EPSG:3857', {
    onChange: (event) => emitter.emit('overlaychange', event),
    onError: () => {},
  });
  lm.add({
    id: 'parcels',
    title: 'Parcels',
    geometryType: 'Polygon',
    source: { features: [] },
    schema: { fields: [{ name: 'owner', type: 'string' }] },
  });
  lm.add({ id: 'roads', title: 'Roads', geometryType: 'LineString', source: { features: [] } });
  lm.add({ id: 'trees', title: 'Trees', geometryType: 'Point', source: { features: [] } });
  const editor = {
    layers: {
      list: () => lm.list(),
      getOrder: () => lm.getOrder(),
      get: (id: string) => lm.info(id),
      getConfig: (id: string) => lm.getConfig(id),
      getStyle: (id: string) => lm.getStyle(id),
      setStyle: lm.setStyle.bind(lm),
      resetStyle: (id: string) => lm.resetStyle(id),
      resetStyles: () => lm.resetStyles(),
      isStyleCustomized: (id: string) => lm.isStyleCustomized(id),
      hasExpressionStyle: (id: string) => lm.hasExpressionStyle(id),
      moveLayer: (id: string, index: number) => lm.moveLayer(id, index),
      exportStyles: () => lm.exportStyles(),
      importStyles: (json: unknown) => lm.importStyles(json),
    },
    overlays: { has: (id: string) => om.has(id), get: (id: string) => om.info(id) },
    on: emitter.on.bind(emitter),
  } as unknown as Editor;
  return { editor, lm, om };
}

function mount(editor: Editor): OlcadLayerStyleDialog {
  document.body.innerHTML = '<olcad-layer-style-dialog></olcad-layer-style-dialog>';
  const el = document.querySelector<OlcadLayerStyleDialog>('olcad-layer-style-dialog')!;
  el.editor = editor;
  return el;
}

const names = (el: Element) =>
  Array.from(
    el.querySelectorAll('.olcad-layer-style-dialog__layer'),
    (li) => (li as HTMLElement).dataset.layerId,
  );
const control = <T extends HTMLElement>(el: Element, name: string) =>
  el.querySelector<T>(`[name="${name}"]`)!;
function set(el: Element, name: string, value: string, event = 'input') {
  const input = control<HTMLInputElement>(el, name);
  input.value = value;
  input.dispatchEvent(new Event(event));
}
const row = (el: Element, id: string) =>
  Array.from(el.querySelectorAll<HTMLElement>('.olcad-layer-style-dialog__layer')).find(
    (li) => li.dataset.layerId === id,
  )!;

describe('<olcad-layer-style-dialog>', () => {
  it('lists the layers top first and reorders them with the arrows', () => {
    const { editor, lm } = fakeEditor();
    const el = mount(editor);
    el.open();
    expect(el.isOpen).toBe(true);
    expect(names(el)).toEqual(['trees', 'roads', 'parcels']);
    expect(row(el, 'trees').getAttribute('aria-selected')).toBe('true');
    expect(row(el, 'trees').querySelector<HTMLButtonElement>('[data-action="up"]')!.disabled).toBe(
      true,
    );
    row(el, 'parcels').querySelector<HTMLButtonElement>('[data-action="up"]')!.click();
    expect(lm.ids()).toEqual(['roads', 'parcels', 'trees']);
    expect(names(el)).toEqual(['trees', 'parcels', 'roads']);
    row(el, 'trees').querySelector<HTMLButtonElement>('[data-action="down"]')!.click();
    expect(names(el)).toEqual(['parcels', 'trees', 'roads']);
  });

  it('reorders by drag and drop: the dropped layer is drawn right above the target', () => {
    const { editor, lm } = fakeEditor();
    const el = mount(editor);
    el.open();
    row(el, 'parcels').dispatchEvent(new Event('dragstart'));
    row(el, 'trees').dispatchEvent(new Event('drop', { cancelable: true }));
    expect(lm.ids()).toEqual(['roads', 'trees', 'parcels']);
  });

  it('shows the sections of the selected layer and applies changes live', () => {
    const { editor, lm } = fakeEditor();
    const el = mount(editor);
    el.open('parcels');
    const legends = () => Array.from(el.querySelectorAll('legend'), (l) => l.textContent);
    expect(legends()).toEqual(['Line', 'Fill', 'Label', 'Layer']);
    set(el, 'stroke-color', '#ff0000');
    set(el, 'fill-opacity', '0.5');
    expect(lm.getStyle('parcels').stroke!.color).toBe('#ff0000');
    expect(lm.getStyle('parcels').fill!.opacity).toBe(0.5);
    expect(
      row(el, 'parcels').querySelector('.olcad-layer-style-dialog__name--custom'),
    ).not.toBeNull();
    // The label attribute comes from the schema.
    const field = control<HTMLSelectElement>(el, 'label-field');
    expect(Array.from(field.options, (o) => o.value)).toEqual(['', 'owner']);
    field.value = 'owner';
    field.dispatchEvent(new Event('change'));
    expect(lm.getStyle('parcels').label).toMatchObject({ field: 'owner', size: 12 });
    set(el, 'min-zoom', '12', 'change');
    expect(lm.getStyle('parcels').minZoom).toBe(12);
    // Another layer: its own sections.
    row(el, 'trees').querySelector<HTMLButtonElement>('[data-action="select"]')!.click();
    expect(legends()).toEqual(['Points', 'Label', 'Layer']);
    expect(control<HTMLInputElement>(el, 'label-field').type).toBe('text');
  });

  it('shows invalid input and resets one layer or all', () => {
    const { editor, lm } = fakeEditor();
    const el = mount(editor);
    el.open('roads');
    set(el, 'min-zoom', '15', 'change');
    set(el, 'max-zoom', '10', 'change');
    const error = el.querySelector<HTMLElement>('.olcad-layer-style-dialog__error')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/maxZoom/);
    set(el, 'stroke-width', '6', 'change');
    set(el, 'max-zoom', '', 'change');
    expect(lm.getStyle('roads').stroke!.width).toBe(6);
    el.querySelector<HTMLButtonElement>('[data-action="reset-layer"]')!.click();
    expect(lm.isStyleCustomized('roads')).toBe(false);
    expect(control<HTMLInputElement>(el, 'stroke-width').value).toBe('2');
    lm.moveLayer('trees', 0);
    set(el, 'opacity', '0.3');
    el.querySelector<HTMLButtonElement>('[data-action="reset-all"]')!.click();
    expect(lm.exportStyles()).toEqual({ version: 1, order: [], styles: {} });
    expect(names(el)).toEqual(['trees', 'roads', 'parcels']);
  });
});

describe('<olcad-layer-style-dialog> overlays', () => {
  it('lists overlays in the shared order with the Layer section only and reorders them', () => {
    const { editor, lm, om } = fakeEditor();
    om.add({
      id: 'ortho',
      type: 'wms',
      title: 'Ortho',
      url: '/wms',
      params: { LAYERS: 'o' },
      opacity: 0.8,
    });
    const el = mount(editor);
    el.open('ortho');
    expect(names(el)).toEqual(['trees', 'roads', 'parcels', 'ortho']);
    expect(row(el, 'ortho').dataset.kind).toBe('overlay');
    expect(row(el, 'trees').dataset.kind).toBe('layer');
    expect(Array.from(el.querySelectorAll('legend'), (l) => l.textContent)).toEqual(['Layer']);
    expect(control<HTMLInputElement>(el, 'opacity').value).toBe('0.8');
    set(el, 'opacity', '0.3');
    expect(lm.getStyle('ortho')).toEqual({ opacity: 0.3 });
    expect(om.getOlLayer('ortho').getOpacity()).toBe(0.3);
    set(el, 'max-zoom', '15', 'change');
    expect(lm.getStyle('ortho').maxZoom).toBe(15);
    expect(
      row(el, 'ortho').querySelector('.olcad-layer-style-dialog__name--custom'),
    ).not.toBeNull();
    row(el, 'ortho').querySelector<HTMLButtonElement>('[data-action="up"]')!.click();
    expect(lm.getOrder()).toEqual(['parcels', 'ortho', 'roads', 'trees']);
    expect(names(el)).toEqual(['trees', 'roads', 'ortho', 'parcels']);
    el.querySelector<HTMLButtonElement>('[data-action="reset-all"]')!.click();
    expect(lm.getOrder()).toEqual(['ortho', 'parcels', 'roads', 'trees']);
    expect(lm.isStyleCustomized('ortho')).toBe(false);
    expect(om.getOlLayer('ortho').getOpacity()).toBe(0.8);
  });
});

describe('persistLayerStyles', () => {
  it('restores stored styles and saves every style or order change', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const first = fakeEditor();
    persistLayerStyles(first.editor, { storage });
    first.lm.setStyle('roads', { ...first.lm.getStyle('roads'), opacity: 0.4 });
    first.lm.moveLayer('roads', 2);
    expect(JSON.parse(store.get('olcad-layer-styles')!)).toMatchObject({
      order: ['parcels', 'trees', 'roads'],
      styles: { roads: { opacity: 0.4 } },
    });
    const second = fakeEditor();
    persistLayerStyles(second.editor, { storage });
    expect(second.lm.ids()).toEqual(['parcels', 'trees', 'roads']);
    expect(second.lm.getStyle('roads').opacity).toBe(0.4);
    store.set('olcad-layer-styles', '{ broken');
    expect(() => persistLayerStyles(fakeEditor().editor, { storage })).not.toThrow();
  });

  it('saves overlay style changes and restores them', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const wms = { id: 'ortho', type: 'wms', url: '/wms', params: { LAYERS: 'o' } } as const;
    const first = fakeEditor();
    first.om.add(wms);
    const stop = persistLayerStyles(first.editor, { storage });
    first.lm.setStyle('ortho', { opacity: 0.5 });
    expect(JSON.parse(store.get('olcad-layer-styles')!)).toMatchObject({
      styles: { ortho: { opacity: 0.5 } },
    });
    stop();
    first.lm.setStyle('ortho', { opacity: 0.9 });
    expect(JSON.parse(store.get('olcad-layer-styles')!).styles.ortho.opacity).toBe(0.5);
    const second = fakeEditor();
    persistLayerStyles(second.editor, { storage });
    second.om.add(wms);
    expect(second.om.getOlLayer('ortho').getOpacity()).toBe(0.5);
  });
});
