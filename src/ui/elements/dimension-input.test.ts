// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadDimensionInput } from '../index';

beforeAll(() => defineElements());
beforeEach(() => document.body.replaceChildren());

function fakeEditor(values: Record<string, unknown>, angleUnit: 'deg' | 'gon' = 'deg') {
  const emitter = new Emitter<EditorEvents>();
  const map = { addOverlay: vi.fn(), removeOverlay: vi.fn() };
  const input = vi.fn((_feature: Feature, text: string) =>
    text === 'bad'
      ? { ok: false as const, text, code: 'input-invalid', error: 'Not a value' }
      : { ok: true as const, text, fieldValue: 1, unit: 'm' as const },
  );
  const editor = {
    map,
    on: emitter.on.bind(emitter),
    dimensions: {
      values: () => values,
      input,
      isDimension: () => true,
    },
    units: { fromMetres: (m: number) => m, getLength: () => 'm' },
    layers: { layerOf: () => 'dims', getConfig: () => ({ dimension: { angleUnit } }) },
  };
  return { editor: editor as unknown as Editor, emitter, map, input };
}

const dimension = (properties: Record<string, unknown> = {}) =>
  new Feature({
    geometry: new LineString([
      [0, 0],
      [10, 0],
    ]),
    ...properties,
  });

function mount(editor: Editor): OlcadDimensionInput {
  document.body.innerHTML = '<olcad-dimension-input></olcad-dimension-input>';
  const el = document.querySelector<OlcadDimensionInput>('olcad-dimension-input')!;
  el.editor = editor;
  return el;
}

const click = (feature: Feature, text = '10.00', align: 'left' | 'center' = 'center') => ({
  layer: 'dims',
  feature,
  label: {
    kind: 'value' as const,
    at: [5, 0.1],
    direction: [1, 0],
    screen: false,
    align,
    baseline: 'bottom' as const,
    text,
    computed: true,
  },
  coordinate: [5, 0.1],
  pixel: [100, 100],
});

const key = (input: HTMLInputElement, key: string) =>
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('<olcad-dimension-input>', () => {
  it('opens at the clicked value with the GIS value as placeholder and hands Enter to the editor', () => {
    const { editor, emitter, map, input } = fakeEditor({ unit: 'm', type: 'aligned', field: null });
    const el = mount(editor);
    const box = el.querySelector<HTMLElement>('.olcad-dimension-input__box')!;
    const field = box.querySelector<HTMLInputElement>('.olcad-dimension-input__field')!;
    expect(box.hidden).toBe(true);
    const feature = dimension();
    emitter.emit('dimensionvalueclick', click(feature, '⚠ 10.00'));
    expect(el.isOpen).toBe(true);
    expect(map.addOverlay).toHaveBeenCalledTimes(1);
    expect(box.hidden).toBe(false);
    expect(field.value).toBe('');
    expect(field.placeholder).toBe('10.00');
    expect(box.querySelector('.olcad-dimension-input__unit')!.textContent).toBe('m');
    field.value = '10.04';
    key(field, 'Enter');
    expect(input).toHaveBeenCalledWith(feature, '10.04');
    expect(el.isOpen).toBe(false);
    expect(box.hidden).toBe(true);
    // An empty box clears the field value.
    emitter.emit('dimensionvalueclick', click(feature));
    field.value = '  ';
    key(field, 'Enter');
    expect(input).toHaveBeenLastCalledWith(feature, '-');
  });

  it('pre-fills the field value in the layer unit, a free text and a station pair', () => {
    // The box moves into the map's overlay container on the first open: query it before.
    const opened = (
      values: Record<string, unknown>,
      properties: Record<string, unknown> = {},
      angleUnit: 'deg' | 'gon' = 'deg',
    ) => {
      const { editor, emitter } = fakeEditor(values, angleUnit);
      const el = mount(editor);
      const field = el.querySelector<HTMLInputElement>('.olcad-dimension-input__field')!;
      const unit = el.querySelector('.olcad-dimension-input__unit')!;
      emitter.emit('dimensionvalueclick', click(dimension(properties)));
      return { value: field.value, unit: unit.textContent };
    };
    expect(opened({ unit: 'm', type: 'aligned', field: 12.5 }, { fieldValue: 12.5 })).toEqual({
      value: '12.5',
      unit: 'm',
    });
    expect(opened({ unit: 'deg', type: 'angular', field: 90 }, {}, 'gon')).toEqual({
      value: '100',
      unit: 'gon',
    });
    expect(opened({ unit: 'm', type: 'aligned', field: null }, { text: 'lt. Bestand' }).value).toBe(
      't lt. Bestand',
    );
    expect(
      opened({ unit: 'm', type: 'station', field: 12.47, second: { field: -3.05 } }).value,
    ).toBe('12.47 3.05');
    expect(opened({ unit: '%', type: 'slope', field: 2.5 })).toEqual({ value: '2.5', unit: '%' });
  });

  it('shows an error and stays open, closes on Escape, a selection or tool change', () => {
    const { editor, emitter, input } = fakeEditor({ unit: 'm', type: 'aligned', field: null });
    const el = mount(editor);
    const box = el.querySelector<HTMLElement>('.olcad-dimension-input__box')!;
    const field = box.querySelector<HTMLInputElement>('.olcad-dimension-input__field')!;
    const feature = dimension();
    emitter.emit('dimensionvalueclick', click(feature));
    field.value = 'bad';
    key(field, 'Enter');
    expect(box.dataset.error).toBe('Not a value');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(el.isOpen).toBe(true);
    key(field, 'Escape');
    expect(el.isOpen).toBe(false);
    expect(box.dataset.error).toBeUndefined();
    emitter.emit('dimensionvalueclick', click(feature));
    emitter.emit('selectionchange', { features: [feature] }); // the same one: stays
    expect(el.isOpen).toBe(true);
    emitter.emit('selectionchange', { features: [] });
    expect(el.isOpen).toBe(false);
    emitter.emit('dimensionvalueclick', click(feature));
    emitter.emit('toolchange', { id: 'select', options: {} });
    expect(el.isOpen).toBe(false);
    expect(input).toHaveBeenCalledTimes(1);
  });
});
