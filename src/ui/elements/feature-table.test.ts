// @vitest-environment jsdom
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeSet } from '../../core/changes/exportChangeSet';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { formatArea, formatLength } from '../../core/units';
import { defineElements, featureTablesOf, type OlcadFeatureTable } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function feature(
  id: string | number,
  props: Record<string, unknown>,
  geometry: Geometry = new Point([0, 0]),
) {
  const f = new Feature({ geometry, ...props });
  f.setId(id);
  return f;
}

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  let unit: 'm' | 'ft' = 'm';
  let selected: Feature[] = [];
  const features = [
    feature(1, { owner: 'Bauer', usage: 'commercial', active: true }),
    feature(2, { owner: 'Adler', usage: 'residential', active: false }),
    feature('tmp-1', { owner: 'Zander' }),
  ];
  let changeSet: ChangeSet = { version: 1, changes: [] };
  const select = (next: Feature[]) => {
    selected = next;
    emitter.emit('selectionchange', { features: next });
  };
  const fit = vi.fn();
  const editor = {
    layers: {
      list: () => [{ id: 'parcels', title: 'Parcels' }],
      getFeatures: () => features,
      getConfig: () => ({
        id: 'parcels',
        idProperty: 'fid',
        schema: {
          fields: [
            { name: 'owner', type: 'string', label: 'Owner' },
            { name: 'usage', type: 'enum' },
            { name: 'active', type: 'boolean' },
          ],
        },
      }),
    },
    selection: {
      get: () => selected,
      set: (next: Feature[]) => select(next),
      add: (f: Feature) => select([...selected, f]),
      remove: (f: Feature) => select(selected.filter((s) => s !== f)),
      clear: () => select([]),
    },
    changes: { get: () => changeSet },
    getProjection: () => 'EPSG:3857',
    units: {
      formatLength: (metres: number) => formatLength(metres, unit),
      formatArea: (squareMetres: number) => formatArea(squareMetres, unit),
    },
    setUnit(next: 'm' | 'ft') {
      unit = next;
      emitter.emit('unitschange', { length: next, setting: next });
    },
    map: { getView: () => ({ fit, getZoom: () => 10 }) },
    on: emitter.on.bind(emitter),
    emitChange(next: ChangeSet) {
      changeSet = next;
      emitter.emit('change', next);
    },
    features,
    fit,
    destroy: () => emitter.emit('destroy', undefined),
  };
  return editor as unknown as Editor & typeof editor;
}

function mount(editor: Editor): { panel: HTMLElement; table: OlcadFeatureTable } {
  document.body.innerHTML = `<olcad-panel dock="bottom"><olcad-feature-table></olcad-feature-table></olcad-panel>`;
  const panel = document.querySelector<HTMLElement>('olcad-panel')!;
  const table = document.querySelector<OlcadFeatureTable>('olcad-feature-table')!;
  table.editor = editor;
  return { panel, table };
}

const headers = (table: HTMLElement) =>
  Array.from(table.querySelectorAll('th'), (th) => th.textContent!.replace(/ [▲▼]$/, ''));
const column = (table: HTMLElement, index: number) =>
  Array.from(table.querySelectorAll('tbody tr'), (tr) => tr.children[index]!.textContent);
const row = (table: HTMLElement, id: string) =>
  Array.from(table.querySelectorAll<HTMLElement>('tbody tr')).find((tr) => tr.dataset.row === id)!;

describe('<olcad-feature-table>', () => {
  it('hides its panel until a layer is shown and registers with the editor', () => {
    const editor = fakeEditor();
    const { panel, table } = mount(editor);
    expect(panel.hidden).toBe(true);
    expect(panel.hasAttribute('no-toggle')).toBe(true); // the View menu leaves it alone
    expect(featureTablesOf(editor)).toEqual([table]);
    table.show('parcels');
    expect(panel.hidden).toBe(false);
    table.close();
    expect(panel.hidden).toBe(true);
    table.editor = null;
    expect(featureTablesOf(editor)).toEqual([]);
  });

  it('shows the id, the schema fields and the geometry as columns', () => {
    const editor = fakeEditor();
    editor.features[0]!.setGeometry(
      new LineString([
        [0, 0],
        [30, 40],
      ]),
    );
    editor.features[1]!.setGeometry(
      new Polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
    );
    const { table } = mount(editor);
    table.show('parcels');
    expect(headers(table)).toEqual(['fid', 'Owner', 'usage', 'active', 'Geometry']);
    expect(column(table, 0)).toEqual(['1', '2', 'tmp-1']);
    expect(column(table, 3)).toEqual(['yes', 'no', '']);
    expect(column(table, 4)[0]).toMatch(/^LineString · 50(\.0+)? m$/);
    expect(column(table, 4)[1]).toMatch(/^Polygon · 100(\.0+)? m²$/);
    expect(column(table, 4)[2]).toBe('Point');
    editor.setUnit('ft'); // the geometry column follows the default length unit
    expect(column(table, 4)[0]).toMatch(/^LineString · 164\.04 ft$/);
    expect(column(table, 4)[1]).toMatch(/^Polygon · 1076\.4 ft²$/);
    expect(table.querySelector('.olcad-feature-table__title')!.textContent).toBe('Parcels');
    expect(table.querySelector('.olcad-feature-table__count')!.textContent).toBe('3 objects');
  });

  it('sorts by a header click: ascending, descending, off', () => {
    const { table } = mount(fakeEditor());
    table.show('parcels');
    const sort = () => table.querySelector<HTMLButtonElement>('[data-sort="owner"]')!;
    sort().click();
    expect(column(table, 1)).toEqual(['Adler', 'Bauer', 'Zander']);
    expect(sort().closest('th')!.getAttribute('aria-sort')).toBe('ascending');
    sort().click();
    expect(column(table, 1)).toEqual(['Zander', 'Bauer', 'Adler']);
    sort().click();
    expect(column(table, 1)).toEqual(['Bauer', 'Adler', 'Zander']);
  });

  it('filters the rows by text in any column', () => {
    const { table } = mount(fakeEditor());
    table.show('parcels');
    const input = table.querySelector<HTMLInputElement>('.olcad-feature-table__filter')!;
    input.value = 'resid';
    input.dispatchEvent(new Event('input'));
    expect(column(table, 1)).toEqual(['Adler']);
    expect(table.querySelector('.olcad-feature-table__count')!.textContent).toBe('1 of 3');
    input.value = 'nothing';
    input.dispatchEvent(new Event('input'));
    expect(table.querySelector('.olcad-feature-table__empty')!.textContent).toMatch(/filter/);
  });

  it('selects rows: click, Ctrl toggles, Shift selects a range; map selections mark rows', () => {
    const editor = fakeEditor();
    const { table } = mount(editor);
    table.show('parcels');
    const [a, b, c] = editor.features;
    row(table, '1').click();
    expect(editor.selection.get()).toEqual([a]);
    expect(row(table, '1').getAttribute('aria-selected')).toBe('true');
    row(table, 'tmp-1').dispatchEvent(new MouseEvent('click', { shiftKey: true }));
    expect(editor.selection.get()).toEqual([a, b, c]);
    row(table, '2').dispatchEvent(new MouseEvent('click', { ctrlKey: true }));
    expect(editor.selection.get()).toEqual([a, c]);
    editor.selection.set([b!]);
    expect(row(table, '2').getAttribute('aria-selected')).toBe('true');
    expect(row(table, '1').getAttribute('aria-selected')).toBe('false');
  });

  it('zooms to an object on double click', () => {
    const editor = fakeEditor();
    const { table } = mount(editor);
    table.show('parcels');
    row(table, '2').dispatchEvent(new MouseEvent('dblclick'));
    expect(editor.fit).toHaveBeenCalledTimes(1);
  });

  it('marks inserted and updated objects from the change set', () => {
    const editor = fakeEditor();
    const { table } = mount(editor);
    table.show('parcels');
    editor.emitChange({
      version: 1,
      changes: [
        {
          op: 'insert',
          layer: 'parcels',
          crs: 'EPSG:4326',
          tempId: 'tmp-1',
          geometry: null,
          properties: {},
        },
        { op: 'update', layer: 'parcels', crs: 'EPSG:4326', id: 2, changed: ['owner'] },
        { op: 'update', layer: 'roads', crs: 'EPSG:4326', id: 1, changed: ['name'] },
      ],
    } as ChangeSet);
    expect(row(table, 'tmp-1').dataset.state).toBe('inserted');
    expect(row(table, '2').dataset.state).toBe('updated');
    expect(row(table, '1').dataset.state).toBeUndefined();
  });

  it('closes when its layer disappears', () => {
    const editor = fakeEditor();
    const { panel, table } = mount(editor);
    table.show('unknown');
    expect(table.layer).toBeNull();
    expect(panel.hidden).toBe(true);
  });
});
