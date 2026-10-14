// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, EXPORT_EVENT, type OlcadExportDialog } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const result = {
    content: '{}',
    mimeType: 'application/geo+json',
    extension: 'geojson',
    filename: 'Parcels.geojson',
    featureCount: 2,
    skipped: 0,
  };
  return {
    layers: {
      list: () => [
        { id: 'parcels', title: 'Parcels', featureCount: 2 },
        { id: 'roads', title: 'Roads', featureCount: 0 },
      ],
    },
    config: {
      view: { projection: 'EPSG:3857' },
      projections: [{ code: 'EPSG:25832', title: 'UTM 32N' }],
    },
    exportLayers: vi.fn(() => result),
    on: emitter.on.bind(emitter),
  } as unknown as Editor & { exportLayers: ReturnType<typeof vi.fn> };
}

function mount(editor: Editor): OlcadExportDialog {
  document.body.innerHTML = '<olcad-export-dialog></olcad-export-dialog>';
  const el = document.querySelector<OlcadExportDialog>('olcad-export-dialog')!;
  el.editor = editor;
  el.open();
  return el;
}

const q = <T extends Element>(el: Element, selector: string) => el.querySelector<T>(selector)!;
const boxes = (el: Element) =>
  Array.from(el.querySelectorAll<HTMLInputElement>('input[name="layer"]'));
function choose(el: Element, format: string) {
  const radio = q<HTMLInputElement>(el, `input[name="format"][value="${format}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change'));
}

describe('<olcad-export-dialog>', () => {
  it('lists the layers, pre-checks those with objects and offers the formats', () => {
    const el = mount(fakeEditor());
    expect(el.isOpen).toBe(true);
    expect(boxes(el).map((b) => [b.value, b.checked])).toEqual([
      ['parcels', true],
      ['roads', false],
    ]);
    expect(
      Array.from(el.querySelectorAll<HTMLInputElement>('input[name="format"]'), (r) => r.value),
    ).toEqual(['geojson', 'kml', 'gml', 'gpx']);
    const crs = q<HTMLSelectElement>(el, 'select[name="projection"]');
    expect(Array.from(crs.options, (o) => o.value)).toContain('EPSG:25832');
    expect(crs.value).toBe('EPSG:4326');
  });

  it('fixes the CRS for KML and GPX and notes what GPX skips', () => {
    const el = mount(fakeEditor());
    const crs = q<HTMLSelectElement>(el, 'select[name="projection"]');
    const note = q<HTMLElement>(el, '.olcad-export-dialog__note');
    expect(crs.disabled).toBe(false);
    expect(note.hidden).toBe(true);
    choose(el, 'kml');
    expect(crs.disabled).toBe(true);
    expect(note.textContent).toMatch(/always written in EPSG:4326/);
    choose(el, 'gpx');
    expect(note.textContent).toMatch(/polygons/);
    choose(el, 'gml');
    expect(crs.disabled).toBe(false);
  });

  it('disables Export without layers; All and None toggle the boxes', () => {
    const el = mount(fakeEditor());
    const exportButton = q<HTMLButtonElement>(el, '[data-action="export"]');
    q<HTMLButtonElement>(el, '[data-action="none"]').click();
    expect(exportButton.disabled).toBe(true);
    q<HTMLButtonElement>(el, '[data-action="all"]').click();
    expect(boxes(el).every((b) => b.checked)).toBe(true);
    expect(exportButton.disabled).toBe(false);
  });

  it('exports the chosen layers in the chosen format and CRS, downloads and fires the event', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const listener = vi.fn();
    el.addEventListener(EXPORT_EVENT, listener);
    q<HTMLButtonElement>(el, '[data-action="all"]').click();
    choose(el, 'gml');
    const crs = q<HTMLSelectElement>(el, 'select[name="projection"]');
    crs.value = 'EPSG:25832';
    crs.dispatchEvent(new Event('change'));
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(editor.exportLayers).toHaveBeenCalledWith(['parcels', 'roads'], {
      format: 'gml',
      projection: 'EPSG:25832',
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail.filename).toBe('Parcels.geojson');
    expect(el.isOpen).toBe(false);
    // KML: no projection passed; the choice is remembered for the next opening.
    el.open();
    expect(q<HTMLInputElement>(el, 'input[value="gml"]').checked).toBe(true);
    choose(el, 'kml');
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(editor.exportLayers).toHaveBeenLastCalledWith(['parcels'], { format: 'kml' });
  });

  it('shows an export error and stays open', () => {
    const editor = fakeEditor();
    editor.exportLayers.mockImplementation(() => {
      throw new Error('Unknown projection EPSG:9999');
    });
    const el = mount(editor);
    q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(q<HTMLElement>(el, '.olcad-export-dialog__error').textContent).toBe(
      'Unknown projection EPSG:9999',
    );
    expect(el.isOpen).toBe(true);
  });
});
