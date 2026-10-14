// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { MeasurementStore } from '../../core/measure/MeasurementStore';
import { formatArea, formatLength, type LengthUnit } from '../../core/units';
import { defineElements, type OlcadMeasureResults } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  let unit: LengthUnit = 'm';
  const store = new MeasurementStore(
    () => 'EPSG:3857',
    {
      change: (measurements) => emitter.emit('measurechange', { measurements }),
      live: (measurement) => emitter.emit('measure', { measurement }),
    },
    () => unit,
  );
  const fit = vi.fn();
  const editor = {
    measurements: {
      list: () => store.list(),
      get: (id: string) => store.get(id),
      add: store.add.bind(store),
      remove: (id: string) => store.remove(id),
      clear: () => store.clear(),
      getLive: () => store.getLive(),
    },
    map: { getView: () => ({ fit, getZoom: () => 12 }) },
    units: {
      formatLength: (metres: number) => formatLength(metres, unit),
      formatArea: (squareMetres: number) => formatArea(squareMetres, unit),
      setLength(next: LengthUnit) {
        unit = next;
        store.relabel();
        emitter.emit('unitschange', { length: next, setting: next });
      },
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  };
  return { editor, store, fit };
}

function mount(editor: unknown): OlcadMeasureResults {
  document.body.innerHTML = '<olcad-measure-results></olcad-measure-results>';
  const el = document.querySelector<OlcadMeasureResults>('olcad-measure-results')!;
  el.editor = editor as Editor;
  return el;
}

describe('<olcad-measure-results>', () => {
  it('lists measurements with their values and removes or clears them', () => {
    const { editor, fit } = fakeEditor();
    const el = mount(editor);
    expect(el.textContent).toContain('No measurements');
    const clear = () => el.querySelector<HTMLButtonElement>('.olcad-measure-results__clear')!;
    expect(clear().disabled).toBe(true);
    editor.measurements.add('distance', [
      [0, 0],
      [30, 0],
      [30, 40],
    ]);
    editor.measurements.add('angle', [
      [10, 0],
      [0, 0],
      [0, 10],
    ]);
    const rows = () => Array.from(el.querySelectorAll<HTMLElement>('.olcad-measure-results__item'));
    expect(rows().map((r) => r.querySelector('.olcad-measure-results__name')!.textContent)).toEqual(
      ['Distance 1', 'Angle 1'],
    );
    expect(rows()[0]!.querySelector('.olcad-measure-results__value')!.textContent).toBe(
      '70.00 m · 2 segments',
    );
    expect(rows()[1]!.querySelector('.olcad-measure-results__value')!.textContent).toBe(
      '90.0° · reflex 270.0°',
    );
    expect(el.querySelector('.olcad-measure-results__count')!.textContent).toBe('2 measurements');
    rows()[0]!.querySelector<HTMLButtonElement>('.olcad-measure-results__show')!.click();
    expect(fit).toHaveBeenCalledWith([0, 0, 30, 40], expect.objectContaining({ duration: 250 }));
    rows()[0]!.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    expect(rows()).toHaveLength(1);
    expect(clear().disabled).toBe(false);
    clear().click();
    expect(rows()).toHaveLength(0);
    expect(el.textContent).toContain('No measurements');
  });

  it('shows the measurement in progress', () => {
    const { editor, store } = fakeEditor();
    const el = mount(editor);
    store.setLive('distance', [
      [0, 0],
      [3, 4],
    ]);
    const live = el.querySelector('.olcad-measure-results__live')!;
    expect(live.textContent).toBe('Distance (measuring): 5.00 m');
    expect(live.getAttribute('role')).toBe('status');
    store.setLive(null);
    expect(el.querySelector('.olcad-measure-results__live')).toBeNull();
  });

  it('shows values and labels in the default length unit and follows its changes', () => {
    const { editor, store } = fakeEditor();
    const el = mount(editor);
    editor.measurements.add('distance', [
      [0, 0],
      [30, 0],
      [30, 40],
    ]);
    const value = () => el.querySelector('.olcad-measure-results__value')!.textContent;
    expect(value()).toBe('70.00 m · 2 segments');
    editor.units.setLength('ft');
    expect(value()).toBe('229.66 ft · 2 segments');
    expect(store.list()[0]!.label).toBe('229.66 ft');
  });
});
