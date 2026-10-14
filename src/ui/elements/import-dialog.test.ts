// @vitest-environment jsdom
import Feature from 'ol/Feature';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import type { ImportPreview } from '../../core/import/readImport';
import { defineElements, IMPORT_EVENT, type OlcadImportDialog } from '../index';

beforeAll(() => defineElements());
beforeEach(() => document.body.replaceChildren());

const preview: ImportPreview = {
  format: 'kml',
  dataProjection: 'EPSG:4326',
  skipped: 1,
  groups: [
    {
      key: '0',
      name: 'Parcels',
      geometryType: 'Polygon',
      features: [new Feature(), new Feature()],
      fields: [],
      invalid: 1,
    },
    {
      key: '1',
      name: 'Roads',
      geometryType: 'LineString',
      features: [new Feature()],
      fields: [],
      invalid: 0,
    },
  ],
};

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const result = { created: ['local-1'], inserted: 3, skipped: 1, droppedAttributes: [] };
  return {
    import: {
      read: vi.fn((text: string) => {
        if (text === 'bad') throw new Error('The file is not valid XML');
        return preview;
      }),
      targetsFor: vi.fn((group: { key: string }) => (group.key === '0' ? ['parcels'] : [])),
      apply: vi.fn(() => result),
    },
    layers: { get: (id: string) => ({ id, title: id.toUpperCase() }) },
    on: emitter.on.bind(emitter),
  } as unknown as Editor & {
    import: { read: ReturnType<typeof vi.fn>; apply: ReturnType<typeof vi.fn> };
  };
}

function mount(editor: Editor): OlcadImportDialog {
  document.body.innerHTML = '<olcad-import-dialog></olcad-import-dialog>';
  const el = document.querySelector<OlcadImportDialog>('olcad-import-dialog')!;
  el.editor = editor;
  el.open();
  return el;
}

const q = <T extends Element>(el: Element, s: string) => el.querySelector<T>(s)!;
const submit = (el: Element) =>
  q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
const row = (el: Element, key: string) => q<HTMLTableRowElement>(el, `tr[data-group="${key}"]`);

describe('<olcad-import-dialog>', () => {
  it('starts empty with a file input for the supported formats', () => {
    const el = mount(fakeEditor());
    expect(el.isOpen).toBe(true);
    const input = q<HTMLInputElement>(el, 'input[type="file"]');
    expect(input.accept).toBe('.geojson,.json,.topojson,.kml,.gml,.xml,.gpx');
    expect(el.querySelector('table')).toBeNull();
    expect(q<HTMLButtonElement>(el, '[data-action="import"]').disabled).toBe(true);
  });

  it('reads a file and lists its groups with targets', async () => {
    const editor = fakeEditor();
    const el = mount(editor);
    await el.load(new File(['<kml/>'], 'site.kml'));
    expect(editor.import.read).toHaveBeenCalledWith('<kml/>', { filename: 'site.kml' });
    expect(q(el, '.olcad-import-dialog__summary').textContent).toBe(
      'KML in EPSG:4326: 3 objects, 1 without usable geometry',
    );
    const cells = Array.from(row(el, '0').cells, (c) => c.textContent);
    expect(cells.slice(1)).toEqual(['Polygons', '2 (+1 invalid)', expect.any(String)]);
    expect(q<HTMLInputElement>(row(el, '0'), 'input').value).toBe('Parcels');
    expect(Array.from(q<HTMLSelectElement>(row(el, '0'), 'select').options, (o) => o.text)).toEqual(
      ['New local layer', 'Into PARCELS', 'Skip'],
    );
    expect(
      Array.from(q<HTMLSelectElement>(row(el, '1'), 'select').options, (o) => o.value),
    ).toEqual(['new', 'skip']);
  });

  it('applies the chosen targets and fires the event', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const listener = vi.fn();
    el.addEventListener(IMPORT_EVENT, listener);
    el.loadText('<kml/>', 'site.kml');
    const target = q<HTMLSelectElement>(row(el, '0'), 'select');
    target.value = 'layer:parcels';
    target.dispatchEvent(new Event('change'));
    expect(q<HTMLInputElement>(row(el, '0'), 'input').disabled).toBe(true);
    q<HTMLInputElement>(row(el, '1'), 'input').value = 'Paths';
    submit(el);
    expect(editor.import.apply).toHaveBeenCalledWith(preview, {
      '0': { type: 'layer', id: 'parcels' },
      '1': { type: 'new', title: 'Paths' },
    });
    expect(listener.mock.calls[0]![0].detail.inserted).toBe(3);
    expect(el.isOpen).toBe(false);
  });

  it('disables Import when every group is skipped', () => {
    const el = mount(fakeEditor());
    el.loadText('<kml/>', 'site.kml');
    for (const key of ['0', '1']) {
      const select = q<HTMLSelectElement>(row(el, key), 'select');
      select.value = 'skip';
      select.dispatchEvent(new Event('change'));
    }
    expect(q<HTMLButtonElement>(el, '[data-action="import"]').disabled).toBe(true);
  });

  it('shows read and apply errors in the dialog', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    el.loadText('bad', 'x.kml');
    expect(q(el, '.olcad-import-dialog__error').textContent).toBe('The file is not valid XML');
    el.loadText('<kml/>', 'site.kml');
    expect(q<HTMLElement>(el, '.olcad-import-dialog__error').hidden).toBe(true);
    editor.import.apply.mockImplementation(() => {
      throw new Error('The import was rejected by validation');
    });
    submit(el);
    expect(q(el, '.olcad-import-dialog__error').textContent).toMatch(/rejected/);
    expect(el.isOpen).toBe(true);
  });
});
