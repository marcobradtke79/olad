// @vitest-environment jsdom
import Feature from 'ol/Feature';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import type { LayerInfo } from '../../core/layers/LayerManager';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadFeatureTable, type OlcadLayerList } from '../index';
import { persistLocalLayers } from '../localLayerStorage';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function layerInfo(id: string, editable: boolean): LayerInfo {
  return {
    id,
    title: id.toUpperCase(),
    visible: true,
    geometryType: 'Point',
    editable: { insert: editable, update: editable, delete: false },
    snappable: true,
    featureCount: 3,
    active: false,
    highlighted: false,
    dataProjection: 'EPSG:4326',
    local: false,
  };
}

function fakeEditor(editMode = false) {
  const emitter = new Emitter<EditorEvents>();
  const infos = [layerInfo('a', true), layerInfo('b', false)];
  let active: string | null = null;
  let selected: Feature[] = [];
  /** Feature → layer id; draft objects list the layers they fit. */
  const layerOf = new Map<Feature, string>();
  const fits = new Map<Feature, string[]>();
  const find = (id: string) => infos.find((i) => i.id === id)!;
  const editor = {
    tools: { getActive: () => null, activate: vi.fn(), deactivate: vi.fn() },
    isEditMode: () => editMode,
    setEditMode: vi.fn((on: boolean) => {
      editMode = on;
      emitter.emit('editmodechange', { editMode: on });
    }),
    basemaps: { list: () => [], setActive: vi.fn() },
    selection: {
      get: () => selected,
      set(features: Feature[]) {
        selected = features;
        emitter.emit('selectionchange', { features });
      },
    },
    layers: {
      list: () => infos.map((info) => ({ ...info, active: info.id === active })),
      getActive: () => active,
      setActive: vi.fn((id: string | null) => {
        active = id;
        emitter.emit('activelayerchange', { id });
      }),
      setVisible: vi.fn((id: string, visible: boolean) => {
        find(id).visible = visible;
        emitter.emit('layerchange', { id, type: 'visible' });
      }),
      setHighlighted: vi.fn((id: string, on: boolean) => {
        find(id).highlighted = on;
        emitter.emit('layerchange', { id, type: 'highlight' });
      }),
      getDraft: () => 'draft',
      layerOf: (f: Feature) => layerOf.get(f),
      draftTargets: (f: Feature) => fits.get(f) ?? [],
      moveDrafts: vi.fn(() => []),
      getFeatures: () => [],
      getConfig: (id: string) => ({ id }),
    },
    changes: { get: () => ({ version: 1, changes: [] }) },
    map: { getTargetElement: () => document.body },
    localLayers: {
      list: () => infos.filter((info) => info.local),
      export: () => ({ version: 1, layers: [] }),
      import: vi.fn(),
      has: (id: string) => find(id)?.local ?? false,
      get: (id: string) => ({
        id,
        title: find(id).title,
        geometryType: 'Point',
        fields: [],
        featureCount: 0,
      }),
    },
    /** Turn layer `b` into a local layer. */
    makeLocal() {
      find('b').local = true;
      emitter.emit('locallayerchange', { id: 'b', type: 'create' });
    },
    getProjection: () => 'EPSG:3857',
    /** A feature in `layer`; for the draft layer, `targets` are the layers it fits. */
    place(layer: string, targets: string[] = []) {
      const feature = new Feature();
      layerOf.set(feature, layer);
      if (layer === 'draft') fits.set(feature, targets);
      return feature;
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor & {
    setEditMode: ReturnType<typeof vi.fn>;
    layers: { moveDrafts: ReturnType<typeof vi.fn> };
    place(layer: string, targets?: string[]): Feature;
    makeLocal(): void;
  };
  return editor;
}

function mount(editor: Editor): OlcadLayerList {
  document.body.innerHTML = `<olcad-layer-list></olcad-layer-list>`;
  const el = document.querySelector<OlcadLayerList>('olcad-layer-list')!;
  el.editor = editor;
  return el;
}

const control = (el: HTMLElement, layer: string, action: string) =>
  el.querySelector<HTMLButtonElement>(`[data-layer-id="${layer}"] [data-action="${action}"]`)!;

describe('<olcad-layer-list> rows', () => {
  it('shows the name and icon buttons for visibility, highlight, table, edit and info', () => {
    const el = mount(fakeEditor());
    const row = el.querySelector('[data-layer-id="a"]')!;
    expect(row.querySelector('.olcad-layer-list__title')!.textContent).toBe('A');
    expect(row.querySelector('input')).toBeNull(); // no checkbox any more
    expect(Array.from(row.querySelectorAll('button'), (b) => b.getAttribute('aria-label'))).toEqual(
      ['Visible: A', 'Highlight A', 'Table of A', 'Edit A', 'Details of A'],
    );
    for (const button of row.querySelectorAll('button')) {
      expect(button.classList.contains('olcad-icon-button')).toBe(true);
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.dataset.tooltip).toBeTruthy();
    }
  });

  it('toggles visibility with the eye and dims hidden rows', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const eye = () => control(el, 'a', 'visible');
    expect(eye().getAttribute('aria-pressed')).toBe('true');
    const visibleIcon = eye().innerHTML;
    eye().click();
    expect(editor.layers.setVisible).toHaveBeenCalledWith('a', false);
    expect(eye().getAttribute('aria-pressed')).toBe('false');
    expect(eye().innerHTML).not.toBe(visibleIcon); // eye-off icon
    expect(el.querySelector('[data-layer-id="a"]')!.classList).toContain(
      'olcad-layer-list__layer--hidden',
    );
    eye().click();
    expect(editor.layers.setVisible).toHaveBeenLastCalledWith('a', true);
  });

  it('highlights a layer through the API', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    control(el, 'b', 'highlight').click(); // read-only layers can be highlighted too
    expect(editor.layers.setHighlighted).toHaveBeenCalledWith('b', true);
    expect(control(el, 'b', 'highlight').getAttribute('aria-pressed')).toBe('true');
    control(el, 'b', 'highlight').click();
    expect(editor.layers.setHighlighted).toHaveBeenLastCalledWith('b', false);
  });

  it('offers New layer beside the Layers heading, opening the layer dialog', () => {
    const el = mount(fakeEditor());
    const add = el.querySelector<HTMLButtonElement>(
      '.olcad-layer-list__heading-row [data-action="new-layer"]',
    )!;
    expect(add.getAttribute('aria-label')).toBe('New layer');
    add.click();
    const dialog = el.querySelector('olcad-layer-editor dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('h2')!.textContent).toBe('New layer');
    // The dialog survives re-renders of the list.
    el.editor!.layers.setVisible('a', false);
    expect(el.querySelector('olcad-layer-editor dialog')).toBe(dialog);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('gives local layers a settings button and a marker', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    expect(el.querySelector('[data-action="settings"]')).toBeNull();
    editor.makeLocal();
    expect(el.querySelector('[data-layer-id="b"]')!.classList).toContain(
      'olcad-layer-list__layer--local',
    );
    control(el, 'b', 'settings').click();
    expect(el.querySelector('olcad-layer-editor h2')!.textContent).toBe('Layer settings: B');
  });

  it('disables the table button while no table is bound to the editor', () => {
    const el = mount(fakeEditor());
    expect(control(el, 'a', 'table').disabled).toBe(true);
    expect(control(el, 'a', 'table').dataset.tooltip).toBe('No table panel on this page');
  });

  it('opens, switches and closes the bound feature table', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const panel = document.createElement('olcad-panel');
    panel.setAttribute('dock', 'bottom');
    const table = document.createElement('olcad-feature-table') as OlcadFeatureTable;
    panel.append(table);
    document.body.append(panel);
    table.editor = editor;
    expect(panel.hidden).toBe(true);
    expect(control(el, 'a', 'table').disabled).toBe(false);
    control(el, 'a', 'table').click();
    expect(table.layer).toBe('a');
    expect(panel.hidden).toBe(false);
    expect(control(el, 'a', 'table').getAttribute('aria-pressed')).toBe('true');
    control(el, 'b', 'table').click(); // another layer switches the table
    expect(table.layer).toBe('b');
    expect(control(el, 'a', 'table').getAttribute('aria-pressed')).toBe('false');
    control(el, 'b', 'table').click(); // the shown layer closes it
    expect(table.layer).toBeNull();
    expect(panel.hidden).toBe(true);
    table.editor = null;
    expect(control(el, 'a', 'table').disabled).toBe(true);
  });

  it('edit switches edit mode on and selects the layer without starting a tool', () => {
    const editor = fakeEditor(false);
    const el = mount(editor);
    expect(control(el, 'a', 'edit').dataset.tooltip).toMatch(/Switch on edit mode/);
    control(el, 'a', 'edit').click();
    expect(editor.setEditMode).toHaveBeenCalledWith(true);
    expect(editor.layers.setActive).toHaveBeenCalledWith('a');
    expect(editor.tools.activate).not.toHaveBeenCalled();
    expect(control(el, 'a', 'edit').getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-layer-id="a"]')!.classList).toContain(
      'olcad-layer-list__layer--active',
    );
    // A second press clears the active layer; edit mode stays on.
    control(el, 'a', 'edit').click();
    expect(editor.layers.setActive).toHaveBeenLastCalledWith(null);
    expect(editor.setEditMode).toHaveBeenCalledTimes(1);
    expect(control(el, 'a', 'edit').getAttribute('aria-pressed')).toBe('false');
  });

  it('edit on the active layer resumes editing while edit mode is off', () => {
    const editor = fakeEditor(true);
    const el = mount(editor);
    control(el, 'a', 'edit').click();
    expect(control(el, 'a', 'edit').getAttribute('aria-pressed')).toBe('true');
    // Edit mode switched off with the toolbar: the layer stays active, the button is not pressed.
    editor.setEditMode(false);
    expect(control(el, 'a', 'edit').getAttribute('aria-pressed')).toBe('false');
    expect(control(el, 'a', 'edit').dataset.tooltip).toMatch(/Switch on edit mode/);
    vi.mocked(editor.layers.setActive).mockClear();
    control(el, 'a', 'edit').click();
    expect(editor.isEditMode()).toBe(true);
    expect(editor.layers.setActive).not.toHaveBeenCalled();
    expect(control(el, 'a', 'edit').getAttribute('aria-pressed')).toBe('true');
  });

  it('says whether local layers are kept in this browser or lost on reload', async () => {
    const editor = fakeEditor();
    const el = mount(editor);
    editor.makeLocal();
    control(el, 'b', 'info').click();
    const storage = () =>
      el.querySelector('[data-layer-id="b"] [data-detail="storage"] dd')!.textContent;
    expect(storage()).toBe('memory (lost on reload)');
    expect(el.querySelector<HTMLButtonElement>('.olcad-layer-list__new')!.dataset.tooltip).toBe(
      'Create a local layer',
    );
    const persistence = persistLocalLayers(editor, {
      load: async () => undefined,
      save: async () => undefined,
    });
    expect(storage()).toBe('this browser');
    await persistence.stop();
    expect(storage()).toBe('memory (lost on reload)');
  });

  it('disables edit for read-only layers', () => {
    const el = mount(fakeEditor());
    expect(control(el, 'b', 'edit').disabled).toBe(true);
    expect(control(el, 'b', 'edit').dataset.tooltip).toBe('Read-only layer');
  });

  it('opens the details below the row and keeps them open across re-renders', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    const details = () =>
      el.querySelector<HTMLElement>('[data-layer-id="a"] .olcad-layer-list__details')!;
    expect(details().hidden).toBe(true);
    expect(control(el, 'a', 'info').getAttribute('aria-controls')).toBe(details().id);
    control(el, 'a', 'info').click();
    expect(details().hidden).toBe(false);
    expect(control(el, 'a', 'info').getAttribute('aria-expanded')).toBe('true');
    const value = (key: string) =>
      details().querySelector(`[data-detail="${key}"] dd`)!.textContent;
    expect(value('geometry')).toBe('Point');
    expect(value('editable')).toBe('insert update');
    expect(value('features')).toBe('3');
    expect(value('snappable')).toBe('yes');
    expect(value('projection')).toBe('EPSG:4326');
    expect(value('id')).toBe('a');
    expect(el.querySelector('[data-layer-id="b"] [data-detail="editable"] dd')!.textContent).toBe(
      'read-only',
    );
    editor.layers.setVisible('b', false); // any re-render
    expect(details().hidden).toBe(false);
    control(el, 'a', 'info').click();
    expect(details().hidden).toBe(true);
  });

  it('keeps the keyboard focus on the pressed control after the re-render', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    control(el, 'a', 'highlight').focus();
    control(el, 'a', 'highlight').click();
    expect(document.activeElement).toBe(control(el, 'a', 'highlight'));
    control(el, 'a', 'info').focus();
    control(el, 'a', 'info').click();
    expect(document.activeElement).toBe(control(el, 'a', 'info'));
  });

  it('unbinds on destroy', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(el.children).toHaveLength(0);
  });
});

describe('<olcad-layer-list> moving drafts', () => {
  const moveButton = (el: HTMLElement, layer: string) =>
    el.querySelector<HTMLButtonElement>(`[data-layer-id="${layer}"] [data-action="move-draft"]`);

  it('offers a move button on the rows of the layers the selected drafts fit', () => {
    const editor = fakeEditor(true);
    const el = mount(editor);
    expect(moveButton(el, 'a')).toBeNull(); // nothing selected
    editor.selection.set([editor.place('a')]);
    expect(moveButton(el, 'a')).toBeNull(); // an ordinary object
    const one = editor.place('draft', ['a']);
    editor.selection.set([one]);
    const button = moveButton(el, 'a')!;
    expect(button.getAttribute('aria-label')).toBe('Move selected draft to A');
    expect(button.classList.contains('olcad-layer-list__move-draft')).toBe(true);
    expect(button.disabled).toBe(false);
    expect(moveButton(el, 'b')).toBeNull(); // b does not take it
    // Edit, then move, then info in the row.
    const row = el.querySelector('[data-layer-id="a"]')!;
    expect(Array.from(row.querySelectorAll('button'), (b) => b.dataset.action)).toEqual([
      'visible',
      'highlight',
      'table',
      'edit',
      'move-draft',
      'info',
    ]);
    // Several drafts: the button moves the ones that fit.
    const two = editor.place('draft', ['a']);
    const other = editor.place('draft', ['b']);
    editor.selection.set([one, two, other]);
    expect(moveButton(el, 'a')!.getAttribute('aria-label')).toBe('Move 2 selected drafts to A');
    expect(moveButton(el, 'b')!.getAttribute('aria-label')).toBe('Move selected draft to B');
    moveButton(el, 'a')!.click();
    expect(editor.layers.moveDrafts).toHaveBeenCalledWith([one, two], 'a');
  });

  it('disables the move outside edit mode', () => {
    const editor = fakeEditor(false);
    const el = mount(editor);
    editor.selection.set([editor.place('draft', ['a'])]);
    expect(moveButton(el, 'a')!.disabled).toBe(true);
  });

  it('with reveal, opens its flyout when drafts are selected', () => {
    const editor = fakeEditor(true);
    document.body.innerHTML = `<olcad-dock>
        <olcad-panel name="layers" heading="Layers" dock="right" flyout>
          <olcad-layer-list reveal></olcad-layer-list>
        </olcad-panel>
        <div id="map"></div>
      </olcad-dock>`;
    const el = document.querySelector<OlcadLayerList>('olcad-layer-list')!;
    el.editor = editor;
    const panel = document.querySelector('olcad-panel')!;
    expect(el.reveal).toBe(true);
    editor.selection.set([editor.place('a')]);
    expect(panel.hasAttribute('open')).toBe(false); // an ordinary object
    editor.selection.set([editor.place('draft', ['a'])]);
    expect(panel.hasAttribute('open')).toBe(true);
    editor.selection.set([]);
    expect(panel.hasAttribute('open')).toBe(true); // never closes it
  });
});
