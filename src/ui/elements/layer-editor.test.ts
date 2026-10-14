// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldConfig } from '../../core/config/types';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import type { LocalLayerDefinition } from '../../core/layers/local';
import { defineElements, type OlcadLayerEditor } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const layers = new Map<string, LocalLayerDefinition>();
  const localLayers = {
    has: (id: string) => layers.has(id),
    get: (id: string) => ({ id, ...layers.get(id)!, featureCount: 2 }),
    create: vi.fn((definition: LocalLayerDefinition) => {
      if (!definition.title.trim())
        throw new Error('Invalid config at definition.title: must not be empty');
      const id = `local-${layers.size + 1}`;
      layers.set(id, definition);
      return id;
    }),
    rename: vi.fn((id: string, title: string) => {
      layers.get(id)!.title = title;
    }),
    setFields: vi.fn((id: string, fields: FieldConfig[]) => {
      layers.get(id)!.fields = fields;
    }),
    remove: vi.fn((id: string) => layers.delete(id)),
  };
  return {
    localLayers,
    on: emitter.on.bind(emitter),
    layers,
  } as unknown as Editor & { localLayers: typeof localLayers; layers: typeof layers };
}

function mount(editor: Editor): OlcadLayerEditor {
  document.body.innerHTML = '<olcad-layer-editor></olcad-layer-editor>';
  const el = document.querySelector<OlcadLayerEditor>('olcad-layer-editor')!;
  el.editor = editor;
  return el;
}

const q = <T extends Element>(el: Element, selector: string) => el.querySelector<T>(selector)!;
const rows = (el: Element) =>
  Array.from(
    el.querySelectorAll<HTMLElement>(
      '.olcad-layer-editor__row:not(.olcad-layer-editor__row--head)',
    ),
  );
function setValue(control: HTMLInputElement | HTMLSelectElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('change'));
}
const submit = (el: Element) =>
  q<HTMLFormElement>(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));

describe('<olcad-layer-editor>', () => {
  it('creates a layer with a geometry type and attributes', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    el.open();
    expect(el.isOpen).toBe(true);
    expect(q(el, 'h2').textContent).toBe('New layer');
    setValue(q(el, '[name="title"]'), 'Trees');
    setValue(q(el, '[name="geometryType"]'), 'Point');
    q<HTMLButtonElement>(el, '.olcad-layer-editor__add').click();
    q<HTMLButtonElement>(el, '.olcad-layer-editor__add').click();
    q<HTMLButtonElement>(el, '.olcad-layer-editor__add').click(); // stays empty: ignored
    const [first, second] = rows(el);
    setValue(q(first!, '[data-part="name"]'), 'species');
    setValue(q(first!, '[data-part="label"]'), 'Species');
    q<HTMLInputElement>(first!, '[data-part="required"]').checked = true;
    setValue(q(second!, '[data-part="name"]'), 'kind');
    setValue(q(second!, '[data-part="type"]'), 'enum');
    expect(q<HTMLInputElement>(second!, '[data-part="values"]').disabled).toBe(false);
    setValue(q(second!, '[data-part="values"]'), 'oak, beech, ');
    setValue(q(second!, '[data-part="default"]'), 'oak');
    submit(el);
    expect(editor.localLayers.create).toHaveBeenCalledWith({
      title: 'Trees',
      geometryType: 'Point',
      fields: [
        { name: 'species', type: 'string', label: 'Species', required: true },
        { name: 'kind', type: 'enum', values: ['oak', 'beech'], default: 'oak' },
      ],
    });
    expect(el.isOpen).toBe(false);
  });

  it('shows validation errors and stays open', () => {
    const el = mount(fakeEditor());
    el.open();
    submit(el);
    const error = q<HTMLElement>(el, '.olcad-layer-editor__error');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Name: must not be empty');
    expect(el.isOpen).toBe(true);
    q<HTMLButtonElement>(el, '.olcad-layer-editor__add').click();
    setValue(q(rows(el)[0]!, '[data-part="name"]'), 'n');
    setValue(q(rows(el)[0]!, '[data-part="type"]'), 'integer');
    setValue(q(rows(el)[0]!, '[data-part="default"]'), '1.5');
    setValue(q(el, '[name="title"]'), 'X');
    submit(el);
    expect(error.textContent).toMatch(/default must be an integer/);
  });

  it('edits a local layer: prefilled, geometry fixed, renames tracked', () => {
    const editor = fakeEditor();
    editor.layers.set('local-1', {
      title: 'Trees',
      geometryType: 'Point',
      fields: [
        { name: 'species', type: 'string' },
        { name: 'height', type: 'number' },
      ],
    });
    const el = mount(editor);
    el.open('local-1');
    expect(q<HTMLInputElement>(el, '[name="title"]').value).toBe('Trees');
    expect(q<HTMLSelectElement>(el, '[name="geometryType"]').disabled).toBe(true);
    expect(rows(el)).toHaveLength(2);
    setValue(q(el, '[name="title"]'), 'Old trees');
    setValue(q(rows(el)[0]!, '[data-part="name"]'), 'kind');
    q<HTMLButtonElement>(rows(el)[1]!, '[data-action="remove-field"]').click();
    submit(el);
    expect(editor.localLayers.rename).toHaveBeenCalledWith('local-1', 'Old trees');
    expect(editor.localLayers.setFields).toHaveBeenCalledWith(
      'local-1',
      [{ name: 'kind', type: 'string' }],
      { renamed: { species: 'kind' } },
    );
  });

  it('deletes a layer only after a second click', () => {
    const editor = fakeEditor();
    editor.layers.set('local-1', { title: 'Trees', geometryType: 'Point', fields: [] });
    const el = mount(editor);
    el.open('local-1');
    const remove = q<HTMLButtonElement>(el, '[data-action="delete"]');
    remove.click();
    expect(editor.localLayers.remove).not.toHaveBeenCalled();
    expect(remove.textContent).toMatch(/Delete 2 objects and the layer\?/);
    remove.click();
    expect(editor.localLayers.remove).toHaveBeenCalledWith('local-1');
    expect(el.isOpen).toBe(false);
  });
});
