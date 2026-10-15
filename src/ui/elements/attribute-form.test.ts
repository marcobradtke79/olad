// @vitest-environment jsdom
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Command } from '../../core/changes/commands';
import { resolveLayer } from '../../core/config/defaults';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadAttributeForm } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

const hydrants = resolveLayer({
  id: 'hydrants',
  title: 'Hydrants',
  geometryType: 'Point',
  editable: { insert: true, update: true },
  source: { features: [] },
  schema: {
    fields: [
      { name: 'pressure', type: 'number', min: 0, max: 20 },
      { name: 'owner', type: 'string', required: true, label: 'Owner' },
      { name: 'usage', type: 'enum', values: ['a', 'b'] },
      { name: 'floors', type: 'integer' },
      { name: 'protected', type: 'boolean' },
      { name: 'surveyed', type: 'date' },
      { name: 'area', type: 'number', readOnly: true },
    ],
  },
});
const bare = resolveLayer({
  id: 'bare',
  title: 'Bare',
  geometryType: 'Point',
  editable: false,
  source: { features: [] },
});

const dims = resolveLayer({
  id: 'dims',
  title: 'Dimensions',
  geometryType: 'LineString',
  editable: true,
  source: { features: [] },
  dimension: true,
  schema: { fields: [{ name: 'note', type: 'string' }] },
});

const draft = resolveLayer({
  id: 'draft',
  title: 'Draft',
  geometryType: 'Any',
  editable: true,
  source: { features: [] },
});

function fakeEditor(editMode = true) {
  const emitter = new Emitter<EditorEvents>();
  let selected: Feature[] = [];
  const stale = new Set<Feature>();
  const layerOf = new Map<Feature, string>();
  const configs = { hydrants, bare, draft, dims };
  const editor = {
    isEditMode: () => editMode,
    dimensions: {
      isStale: (f: Feature) => stale.has(f),
      update: vi.fn(() => true),
      detach: vi.fn(() => true),
    },
    markStale(f: Feature) {
      stale.add(f);
      emitter.emit('dimensionstale', { features: [...stale] });
    },
    canEdit: (_op: string, f: Feature) =>
      configs[layerOf.get(f) as keyof typeof configs].editable.update,
    execute: vi.fn((_command: Command) => true),
    selection: {
      get: () => selected,
      set(features: Feature[]) {
        selected = features;
        emitter.emit('selectionchange', { features });
      },
    },
    layers: {
      layerOf: (f: Feature) => layerOf.get(f),
      getConfig: (id: keyof typeof configs) => configs[id],
      get: (id: keyof typeof configs) => ({ id, title: configs[id].title }),
      getDraft: () => 'draft',
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
    emitter,
    place(layer: keyof typeof configs, properties: Record<string, unknown>, id = 1) {
      const feature = new Feature({ geometry: new Point([0, 0]), ...properties });
      feature.setId(id);
      layerOf.set(feature, layer);
      return feature;
    },
    /** The feature leaves its layer (undo, discard). */
    unplace(feature: Feature) {
      layerOf.delete(feature);
    },
  };
  return editor;
}

function mount(editor: ReturnType<typeof fakeEditor>): OlcadAttributeForm {
  document.body.innerHTML = `<olcad-attribute-form></olcad-attribute-form>`;
  const el = document.querySelector<OlcadAttributeForm>('olcad-attribute-form')!;
  el.editor = editor as unknown as Editor;
  return el;
}

const control = (el: HTMLElement, name: string) =>
  el.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${name}"] [name]`)!;

describe('<olcad-attribute-form>', () => {
  it('shows hints without a single selected feature or without a schema', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    expect(el.textContent).toContain('Select one feature');
    editor.selection.set([editor.place('hydrants', {}), editor.place('hydrants', {}, 2)]);
    expect(el.textContent).toContain('Select one feature');
    editor.selection.set([editor.place('bare', {})]);
    expect(el.textContent).toContain('No attributes configured for Bare');
    expect(el.querySelector('form')).toBeNull();
  });

  it('renders a control per field type, pre-filled, with read-only and required flags', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const feature = editor.place('hydrants', {
      pressure: 4.5,
      owner: 'City',
      usage: 'b',
      protected: true,
      surveyed: '2026-10-11T00:00:00Z',
      area: 12,
    });
    editor.selection.set([feature]);
    expect(el.querySelector('.olcad-attribute-form__title')!.textContent).toBe('Hydrants #1');
    const pressure = control(el, 'pressure') as HTMLInputElement;
    expect(pressure.type).toBe('number');
    expect(pressure.step).toBe('any');
    expect(pressure.min).toBe('0');
    expect(pressure.value).toBe('4.5');
    const owner = control(el, 'owner') as HTMLInputElement;
    expect(owner.required).toBe(true);
    expect(owner.value).toBe('City');
    expect(el.querySelector('[data-field="owner"] .olcad-attribute-form__label')!.textContent).toBe(
      'Owner *',
    );
    const usage = control(el, 'usage') as HTMLSelectElement;
    expect(usage.tagName).toBe('SELECT');
    expect(Array.from(usage.options, (o) => o.value)).toEqual(['', 'a', 'b']);
    expect(usage.value).toBe('b');
    expect((control(el, 'floors') as HTMLInputElement).step).toBe('1');
    expect((control(el, 'protected') as HTMLInputElement).checked).toBe(true);
    expect((control(el, 'surveyed') as HTMLInputElement).value).toBe('2026-10-11');
    expect((control(el, 'area') as HTMLInputElement).disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('.olcad-attribute-form__apply')!.disabled).toBe(
      false,
    );
  });

  it('applies only changed values with the right types and removes emptied ones', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const feature = editor.place('hydrants', { pressure: 4.5, owner: 'City', floors: 2 });
    editor.selection.set([feature]);
    (control(el, 'pressure') as HTMLInputElement).value = '6';
    (control(el, 'floors') as HTMLInputElement).value = '';
    (control(el, 'protected') as HTMLInputElement).checked = true;
    (control(el, 'usage') as HTMLSelectElement).value = 'a';
    el.querySelector('form')!.requestSubmit();
    expect(editor.execute).toHaveBeenCalledTimes(1);
    const command = editor.execute.mock.calls[0]![0];
    expect(command).toMatchObject({
      type: 'updateProperties',
      properties: { pressure: 6, floors: undefined, protected: true, usage: 'a' },
    });
    expect(command.type === 'updateProperties' && 'owner' in command.properties).toBe(false);
    // Nothing changed: no command.
    el.querySelector('form')!.requestSubmit();
    expect(editor.execute).toHaveBeenCalledTimes(1);
  });

  it('offers the field value and the free text for dimension layers', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const feature = editor.place('dims', { fieldValue: 12.47, note: 'x' });
    editor.selection.set([feature]);
    expect(
      Array.from(el.querySelectorAll<HTMLElement>('[data-field]'), (f) => f.dataset.field),
    ).toEqual(['fieldValue', 'text', 'note']);
    expect((control(el, 'fieldValue') as HTMLInputElement).value).toBe('12.47');
    (control(el, 'fieldValue') as HTMLInputElement).value = '';
    (control(el, 'text') as HTMLInputElement).value = '{value} lt. Bestand';
    el.querySelector('form')!.requestSubmit();
    expect(editor.execute.mock.calls[0]![0]).toMatchObject({
      type: 'updateProperties',
      properties: { fieldValue: undefined, text: '{value} lt. Bestand' },
    });
  });

  it('offers Update and Detach for a stale dimension', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const feature = editor.place('dims', {});
    editor.selection.set([feature]);
    expect(el.querySelector('.olcad-attribute-form__notice')).toBeNull();
    editor.markStale(feature);
    const notice = el.querySelector('.olcad-attribute-form__notice')!;
    expect(notice.textContent).toContain('A measured object changed');
    notice.querySelector<HTMLButtonElement>('[data-action="update-dimension"]')!.click();
    expect(editor.dimensions.update).toHaveBeenCalledWith(feature);
    el.querySelector<HTMLButtonElement>('[data-action="detach-dimension"]')!.click();
    expect(editor.dimensions.detach).toHaveBeenCalledWith(feature);
  });

  it('blocks submit on native validation errors and shows core rejections', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const feature = editor.place('hydrants', { owner: 'City' });
    editor.selection.set([feature]);
    (control(el, 'owner') as HTMLInputElement).value = '';
    const form = el.querySelector('form')!;
    form.reportValidity = vi.fn(() => false);
    form.requestSubmit();
    expect(editor.execute).not.toHaveBeenCalled();
    editor.emitter.emit('validationerror', {
      code: 'x',
      message: 'Nope',
      command: { type: 'updateProperties', feature, properties: {} },
    });
    expect(el.querySelector('.olcad-attribute-form__error')!.textContent).toBe('Nope');
  });

  it('disables inputs outside edit mode or without update rights and resets drafts', () => {
    const editor = fakeEditor(false);
    const el = mount(editor);
    const feature = editor.place('hydrants', { pressure: 1 });
    editor.selection.set([feature]);
    expect((control(el, 'pressure') as HTMLInputElement).disabled).toBe(true);
    expect(el.textContent).toContain('Switch on edit mode');
    const editable = fakeEditor();
    const el2 = mount(editable);
    const f2 = editable.place('hydrants', { pressure: 1 });
    editable.selection.set([f2]);
    (control(el2, 'pressure') as HTMLInputElement).value = '9';
    el2.querySelector<HTMLButtonElement>('.olcad-attribute-form__reset')!.click();
    expect((control(el2, 'pressure') as HTMLInputElement).value).toBe('1');
    // A change event re-renders when the user is not typing.
    f2.set('pressure', 3);
    editable.emitter.emit('change', { version: 1, changes: [] });
    expect((control(el2, 'pressure') as HTMLInputElement).value).toBe('3');
    editable.destroy();
    expect(el2.editor).toBeNull();
  });
});

describe('<olcad-attribute-form popup>', () => {
  function mountPopup(editor: ReturnType<typeof fakeEditor>): OlcadAttributeForm {
    document.body.innerHTML = `<olcad-attribute-form popup></olcad-attribute-form>`;
    const el = document.querySelector<OlcadAttributeForm>('olcad-attribute-form')!;
    el.editor = editor as unknown as Editor;
    return el;
  }

  it('opens on featureinsert, saves on submit and closes', () => {
    const editor = fakeEditor();
    const el = mountPopup(editor);
    const dialog = () => el.querySelector<HTMLDialogElement>('dialog.olcad-attribute-form__dialog');
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false);
    // Selection alone does not open the popup.
    editor.selection.set([editor.place('hydrants', {}, 5)]);
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false);
    // Copies inserted from a template carry their attributes: no popup either.
    editor.emitter.emit('featureinsert', {
      layer: 'hydrants',
      feature: editor.place('hydrants', {}, 7),
      template: 'tpl-1',
    });
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false);
    // Imported objects bring their attributes from the file: no popup.
    editor.emitter.emit('featureinsert', {
      layer: 'hydrants',
      feature: editor.place('hydrants', {}, 8),
      imported: true,
    });
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false);
    const feature = editor.place('hydrants', {}, 9);
    editor.emitter.emit('featureinsert', { layer: 'hydrants', feature });
    expect(dialog()!.hasAttribute('open')).toBe(true);
    expect(dialog()!.querySelector('.olcad-attribute-form__title')!.textContent).toBe(
      'Hydrants #9',
    );
    expect(dialog()!.querySelector('.olcad-attribute-form__apply')!.textContent).toBe('Save');
    (control(el, 'pressure') as HTMLInputElement).value = '3';
    (control(el, 'owner') as HTMLInputElement).value = 'Works';
    dialog()!.querySelector('form')!.requestSubmit();
    expect(editor.execute).toHaveBeenCalledTimes(1);
    expect(editor.execute.mock.calls[0]![0]).toMatchObject({
      properties: { pressure: 3, owner: 'Works' },
    });
    expect(dialog()!.hasAttribute('open')).toBe(false);
  });

  it('Later closes without changes; a gone feature closes too', () => {
    const editor = fakeEditor();
    const el = mountPopup(editor);
    const feature = editor.place('hydrants', {}, 9);
    editor.emitter.emit('featureinsert', { layer: 'hydrants', feature });
    const dialog = el.querySelector<HTMLDialogElement>('dialog')!;
    dialog.querySelector<HTMLButtonElement>('.olcad-attribute-form__later')!.click();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(editor.execute).not.toHaveBeenCalled();
    const gone = new Feature(new Point([0, 0])); // not in any layer
    editor.emitter.emit('featureinsert', { layer: 'hydrants', feature: gone });
    expect(dialog.hasAttribute('open')).toBe(false);
    // A layer without attributes (the draft layer) opens no dialog.
    const bare = editor.place('bare', {}, 2);
    editor.emitter.emit('featureinsert', { layer: 'bare', feature: bare });
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('steps through several inserted objects one after another', () => {
    const editor = fakeEditor();
    const el = mountPopup(editor);
    const [a, b, c] = [11, 12, 13].map((id) => editor.place('hydrants', {}, id));
    for (const feature of [a!, b!, c!]) {
      editor.emitter.emit('featureinsert', { layer: 'hydrants', feature });
    }
    const dialog = el.querySelector<HTMLDialogElement>('dialog')!;
    const title = () => dialog.querySelector('.olcad-attribute-form__title')!.textContent;
    const progress = () => dialog.querySelector('.olcad-attribute-form__progress')?.textContent;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(title()).toBe('Hydrants #11 1 of 3');
    expect(progress()).toBe('1 of 3');
    // Save applies to the first and shows the second.
    (control(el, 'owner') as HTMLInputElement).value = 'Works';
    dialog.querySelector('form')!.requestSubmit();
    expect(editor.execute.mock.calls[0]![0]).toMatchObject({
      feature: a,
      properties: { owner: 'Works' },
    });
    expect(progress()).toBe('2 of 3');
    expect(title()).toContain('#12');
    // A feature that is gone meanwhile is skipped.
    editor.unplace(c!);
    dialog.querySelector<HTMLButtonElement>('.olcad-attribute-form__later')!.click();
    expect(dialog.hasAttribute('open')).toBe(false);
    // Closing the dialog (Escape) drops every waiting feature.
    for (const id of [21, 22]) {
      editor.emitter.emit('featureinsert', {
        layer: 'hydrants',
        feature: editor.place('hydrants', {}, id),
      });
    }
    expect(progress()).toBe('1 of 2');
    dialog.dispatchEvent(new Event('close'));
    el.closePopup(); // nothing left to show
    expect(dialog.hasAttribute('open')).toBe(false);
    // A single insert shows no progress.
    editor.emitter.emit('featureinsert', {
      layer: 'hydrants',
      feature: editor.place('hydrants', {}, 31),
    });
    expect(title()).toBe('Hydrants #31');
    el.closeAll();
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});

describe('<olcad-attribute-form reveal>', () => {
  function mountInFlyout(editor: ReturnType<typeof fakeEditor>, reveal = true) {
    document.body.innerHTML = `<olcad-dock>
        <olcad-panel name="attributes" heading="Attributes" dock="right" flyout>
          <olcad-attribute-form ${reveal ? 'reveal' : ''}></olcad-attribute-form>
        </olcad-panel>
        <div id="map"></div>
      </olcad-dock>`;
    const el = document.querySelector<OlcadAttributeForm>('olcad-attribute-form')!;
    el.editor = editor as unknown as Editor;
    return { el, panel: document.querySelector('olcad-panel')! };
  }

  it('opens the enclosing flyout on a single selection outside edit mode only', () => {
    const editor = fakeEditor(false);
    const { el, panel } = mountInFlyout(editor);
    expect(el.reveal).toBe(true);
    expect(panel.hasAttribute('open')).toBe(false);
    editor.selection.set([editor.place('hydrants', {}), editor.place('hydrants', {}, 2)]);
    expect(panel.hasAttribute('open')).toBe(false); // two features: nothing to show
    editor.selection.set([editor.place('hydrants', { owner: 'City' }, 3)]);
    expect(panel.hasAttribute('open')).toBe(true);
    expect(el.textContent).toContain('Switch on edit mode');
    // It never closes the panel.
    editor.selection.set([]);
    expect(panel.hasAttribute('open')).toBe(true);
  });

  it('does nothing in edit mode, without the attribute or outside a flyout', () => {
    const inEdit = fakeEditor(true);
    const a = mountInFlyout(inEdit);
    inEdit.selection.set([inEdit.place('hydrants', {})]);
    expect(a.panel.hasAttribute('open')).toBe(false);
    const plain = fakeEditor(false);
    const b = mountInFlyout(plain, false);
    plain.selection.set([plain.place('hydrants', {})]);
    expect(b.panel.hasAttribute('open')).toBe(false);
    const loose = fakeEditor(false);
    const el = mount(loose);
    el.setAttribute('reveal', '');
    expect(() => loose.selection.set([loose.place('hydrants', {})])).not.toThrow();
  });

  it('points a draft object to the Layers panel and opens after a draft move', () => {
    const editor = fakeEditor(true);
    const { el, panel } = mountInFlyout(editor);
    const drafted = editor.place('draft', {});
    editor.selection.set([drafted]);
    expect(panel.hasAttribute('open')).toBe(false); // drafts do not open the attributes
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('Move it to a layer in the Layers panel');
    // A move selects the copy and announces it: the panel opens on its fields, ready to type.
    const copy = editor.place('hydrants', {}, 9);
    editor.unplace(drafted);
    editor.selection.set([copy]);
    expect(panel.hasAttribute('open')).toBe(false);
    editor.emitter.emit('draftmove', { layer: 'hydrants', features: [copy], sources: [drafted] });
    expect(panel.hasAttribute('open')).toBe(true);
    expect(el.querySelector('.olcad-attribute-form__title')!.textContent).toBe('Hydrants #9');
    expect(document.activeElement).toBe(control(el, 'pressure'));
  });
});
