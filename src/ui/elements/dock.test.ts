// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Emitter } from '../../core/events';
import type { Editor, EditorEvents } from '../../core/Editor';
import type { ToolOptions } from '../../core/tools';
import {
  LONG_PRESS_MS,
  optionsMatch,
  TOOL_BUTTONS,
  toolbarControls,
  toolButtonIds,
} from './OlcadToolbar';
import { defineElements, OlcadPanel, type OlcadDock, type OlcadToolbar } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function mount(html: string): OlcadDock {
  document.body.innerHTML = html;
  return document.querySelector('olcad-dock')!;
}

function zoneOf(element: Element): string | undefined {
  return (element.parentElement as HTMLElement | null)?.dataset.zone;
}

describe('<olcad-dock>', () => {
  it('places panels by their dock attribute and other children in the centre', () => {
    const dock = mount(`
      <olcad-dock>
        <olcad-panel name="a" dock="left"></olcad-panel>
        <olcad-toolbar name="main"></olcad-toolbar>
        <olcad-panel name="f" dock="floating" x="20" y="30"></olcad-panel>
        <div id="map"></div>
      </olcad-dock>`);
    expect(zoneOf(dock.querySelector('[name="a"]')!)).toBe('left');
    expect(zoneOf(dock.querySelector('[name="main"]')!)).toBe('top');
    expect(zoneOf(dock.querySelector('[name="f"]')!)).toBe('floating');
    expect(zoneOf(dock.querySelector('#map')!)).toBe('center');
    const floating = dock.querySelector<OlcadPanel>('[name="f"]')!;
    expect(floating.style.getPropertyValue('--olcad-panel-x')).toBe('20px');
    expect(floating.style.getPropertyValue('--olcad-panel-y')).toBe('30px');
  });

  it('moves a panel when its dock attribute changes and emits olcad-layoutchange', () => {
    const dock = mount(`<olcad-dock><olcad-panel name="a" dock="left"></olcad-panel></olcad-dock>`);
    const panel = dock.querySelector<OlcadPanel>('[name="a"]')!;
    const layouts: unknown[] = [];
    dock.addEventListener('olcad-layoutchange', (e) => layouts.push((e as CustomEvent).detail));
    panel.dock = 'bottom';
    expect(zoneOf(panel)).toBe('bottom');
    expect(panel.getAttribute('orientation')).toBe('horizontal');
    panel.dock = 'right';
    expect(panel.getAttribute('orientation')).toBe('vertical');
    expect(layouts).toEqual([
      { a: { dock: 'bottom', x: 0, y: 0 } },
      { a: { dock: 'right', x: 0, y: 0 } },
    ]);
  });

  it('resets panels to their authored placement and overwrites the stored layout', () => {
    localStorage.setItem('k', JSON.stringify({ a: { dock: 'bottom', x: 0, y: 0 } }));
    const dock = mount(`<olcad-dock storage-key="k">
        <olcad-panel name="a" dock="left"></olcad-panel>
        <olcad-panel name="b" dock="floating" x="5" y="6"></olcad-panel>
      </olcad-dock>`);
    const a = dock.querySelector<OlcadPanel>('[name="a"]')!;
    const b = dock.querySelector<OlcadPanel>('[name="b"]')!;
    expect(a.dock).toBe('bottom'); // the stored layout applied
    expect(dock.defaultLayout()).toEqual({
      a: { dock: 'left', x: 0, y: 0 },
      b: { dock: 'floating', x: 5, y: 6 },
    });
    b.placement = { dock: 'top', x: 0, y: 0 };
    // A panel added later remembers the placement it arrived with.
    const c = document.createElement('olcad-panel') as OlcadPanel;
    c.setAttribute('name', 'c');
    c.setAttribute('dock', 'right');
    dock.append(c);
    c.dock = 'left';
    const events: unknown[] = [];
    dock.addEventListener('olcad-layoutchange', (e) => events.push((e as CustomEvent).detail));
    const result = dock.resetLayout();
    expect(result).toEqual({
      a: { dock: 'left', x: 0, y: 0 },
      b: { dock: 'floating', x: 5, y: 6 },
      c: { dock: 'right', x: 0, y: 0 },
    });
    expect(zoneOf(a)).toBe('left');
    expect(zoneOf(b)).toBe('floating');
    expect(zoneOf(c)).toBe('right');
    expect(events).toHaveLength(1); // one event for the whole reset
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual(result);
    // setLayout batches the same way.
    dock.setLayout({ a: { dock: 'top', x: 0, y: 0 }, b: { dock: 'top', x: 0, y: 0 } });
    expect(events).toHaveLength(2);
    expect(zoneOf(a)).toBe('top');
  });

  it('places panels that are upgraded after the dock', () => {
    // Simulate elements defined after parsing: create the subtree without upgrading it.
    const template = document.createElement('template');
    template.innerHTML = `<olcad-dock><olcad-panel name="a" dock="left"></olcad-panel><div id="m"></div></olcad-dock>`;
    const dock = template.content.firstElementChild as OlcadDock;
    const panel = dock.querySelector('olcad-panel')!;
    expect(panel instanceof OlcadPanel).toBe(false);
    document.body.append(template.content); // upgrades dock first, then its children
    expect(zoneOf(panel)).toBe('left');
    expect(zoneOf(dock.querySelector('#m')!)).toBe('center');
  });

  it('places children added later', async () => {
    const dock = mount(`<olcad-dock></olcad-dock>`);
    const panel = document.createElement('olcad-panel') as OlcadPanel;
    panel.setAttribute('dock', 'top');
    dock.append(panel);
    await Promise.resolve(); // MutationObserver callbacks are microtasks
    expect(zoneOf(panel)).toBe('top');
  });

  it('getLayout / setLayout round-trip through JSON', () => {
    const dock = mount(`
      <olcad-dock>
        <olcad-panel name="a" dock="left"></olcad-panel>
        <olcad-panel dock="top"></olcad-panel>
      </olcad-dock>`);
    expect(dock.getLayout()).toEqual({ a: { dock: 'left', x: 0, y: 0 } });
    dock.setLayout(
      JSON.parse(
        JSON.stringify({ a: { dock: 'floating', x: 5, y: 6 }, zzz: { dock: 'top', x: 0, y: 0 } }),
      ),
    );
    const panel = dock.querySelector<OlcadPanel>('[name="a"]')!;
    expect(panel.placement).toEqual({ dock: 'floating', x: 5, y: 6 });
    expect(zoneOf(panel)).toBe('floating');
  });

  it('persists the layout under storage-key and restores it on connect', () => {
    const dock = mount(
      `<olcad-dock storage-key="k"><olcad-panel name="a" dock="left"></olcad-panel></olcad-dock>`,
    );
    dock.querySelector<OlcadPanel>('[name="a"]')!.dock = 'bottom';
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ a: { dock: 'bottom', x: 0, y: 0 } });

    // Simulate a dock upgraded after parsing, as on a page that defines elements late.
    const template = document.createElement('template');
    template.innerHTML = `<olcad-dock storage-key="k"><olcad-panel name="a" dock="left"></olcad-panel></olcad-dock>`;
    document.body.append(template.content);
    const late = document.querySelector<OlcadPanel>('[name="a"]')!;
    expect(late.dock).toBe('bottom');
    expect(zoneOf(late)).toBe('bottom');
    document.body.replaceChildren();

    const again = mount(
      `<olcad-dock storage-key="k"><olcad-panel name="a" dock="left"></olcad-panel></olcad-dock>`,
    );
    const panel = again.querySelector<OlcadPanel>('[name="a"]')!;
    expect(panel.dock).toBe('bottom');
    expect(zoneOf(panel)).toBe('bottom');
  });

  it('computes the drop zone from the distance to the edges', () => {
    const dock = mount(`<olcad-dock></olcad-dock>`);
    dock.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300 }) as DOMRect;
    expect(dock.dropZoneAt(10, 150)).toBe('left');
    expect(dock.dropZoneAt(395, 150)).toBe('right');
    expect(dock.dropZoneAt(200, 5)).toBe('top');
    expect(dock.dropZoneAt(200, 290)).toBe('bottom');
    expect(dock.dropZoneAt(200, 150)).toBeNull();
    expect(dock.dropZoneAt(-5, 150)).toBeNull();
    expect(dock.dropZoneAt(5, 3)).toBe('top');
    dock.highlightZone('left');
    expect(dock.getAttribute('data-drop')).toBe('left');
    dock.highlightZone(null);
    expect(dock.hasAttribute('data-drop')).toBe(false);
  });
});

describe('<olcad-panel>', () => {
  it('wraps its children in the content element and builds the header', () => {
    mount(
      `<olcad-dock><olcad-panel name="a" heading="Layers" dock="top"><p id="inner">x</p></olcad-panel></olcad-dock>`,
    );
    const panel = document.querySelector<OlcadPanel>('olcad-panel')!;
    expect(panel.content.querySelector('#inner')).not.toBeNull();
    expect(panel.querySelector('.olcad-panel__title')!.textContent).toBe('Layers');
    expect(panel.querySelector('.olcad-panel__grip')!.getAttribute('aria-label')).toBe(
      'Move Layers',
    );
    panel.heading = 'Other';
    expect(panel.querySelector('.olcad-panel__title')!.textContent).toBe('Other');
  });

  it('dock menu lists every position and selecting one re-docks', () => {
    mount(`<olcad-dock><olcad-panel name="a" dock="top"></olcad-panel></olcad-dock>`);
    const panel = document.querySelector<OlcadPanel>('olcad-panel')!;
    const button = panel.querySelector<HTMLButtonElement>('.olcad-panel__menu-button')!;
    const menu = panel.querySelector<HTMLElement>('.olcad-panel__menu')!;
    expect(menu.hidden).toBe(true);
    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    expect(Array.from(items, (i) => i.dataset.dock)).toEqual([
      'top',
      'right',
      'bottom',
      'left',
      'floating',
    ]);
    expect(items[0]!.getAttribute('aria-checked')).toBe('true');
    items[3]!.click();
    expect(panel.dock).toBe('left');
    expect(menu.hidden).toBe(true);
    expect(zoneOf(panel)).toBe('left');
    expect(items[3]!.getAttribute('aria-checked')).toBe('true');
  });

  it('closes the menu with Escape and moves focus with arrow keys', () => {
    mount(`<olcad-dock><olcad-panel name="a" dock="top"></olcad-panel></olcad-dock>`);
    const panel = document.querySelector<OlcadPanel>('olcad-panel')!;
    const button = panel.querySelector<HTMLButtonElement>('.olcad-panel__menu-button')!;
    const menu = panel.querySelector<HTMLElement>('.olcad-panel__menu')!;
    button.click();
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    expect(document.activeElement).toBe(items[0]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[4]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it('nudges a floating panel with arrow keys on the grip', () => {
    mount(
      `<olcad-dock><olcad-panel name="a" dock="floating" x="50" y="50"></olcad-panel></olcad-dock>`,
    );
    const panel = document.querySelector<OlcadPanel>('olcad-panel')!;
    const grip = panel.querySelector<HTMLButtonElement>('.olcad-panel__grip')!;
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    grip.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, shiftKey: true }),
    );
    expect(panel.placement).toEqual({ dock: 'floating', x: 60, y: 100 });
    panel.dock = 'top';
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panel.x).toBe(60);
  });

  it('floats while dragged and docks when dropped near an edge', () => {
    const dock = mount(`<olcad-dock><olcad-panel name="a" dock="top"></olcad-panel></olcad-dock>`);
    dock.getBoundingClientRect = () =>
      ({ left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300 }) as DOMRect;
    const panel = document.querySelector<OlcadPanel>('olcad-panel')!;
    panel.getBoundingClientRect = () =>
      ({ left: 100, top: 100, right: 300, bottom: 140, width: 200, height: 40 }) as DOMRect;
    const grip = panel.querySelector<HTMLButtonElement>('.olcad-panel__grip')!;
    const pointer = (type: string, x: number, y: number) =>
      grip.dispatchEvent(
        new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }) as PointerEvent,
      );
    Object.defineProperty(MouseEvent.prototype, 'pointerId', { value: 1, configurable: true });

    pointer('pointerdown', 110, 110);
    pointer('pointermove', 111, 110); // below threshold
    expect(panel.dock).toBe('top');
    pointer('pointermove', 300, 250);
    expect(panel.dock).toBe('floating');
    expect(panel.placement).toEqual({ dock: 'floating', x: 190, y: 140 });
    expect(zoneOf(panel)).toBe('floating');
    expect(dock.hasAttribute('data-drop')).toBe(false);
    pointer('pointermove', 490, 250);
    expect(dock.getAttribute('data-drop')).toBe('right');
    pointer('pointerup', 490, 250);
    expect(panel.dock).toBe('right');
    expect(dock.hasAttribute('data-drop')).toBe(false);

    // Drop in the middle: stays floating, clamped inside the dock.
    pointer('pointerdown', 110, 110);
    pointer('pointermove', 700, 250);
    pointer('pointerup', 700, 250);
    expect(panel.dock).toBe('floating');
    expect(panel.x).toBe(200); // 400 - 200
    expect(panel.y).toBe(140);

    // Escape during a drag restores the previous placement.
    pointer('pointerdown', 110, 110);
    pointer('pointermove', 300, 300);
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.placement).toEqual({ dock: 'floating', x: 200, y: 140 });
  });
});

function fakeEditor(editMode = false) {
  const emitter = new Emitter<EditorEvents>();
  let active: string | null = null;
  let history = { canUndo: false, canRedo: false };
  let activeTool: string | null = null;
  let activeOptions: ToolOptions = {};
  const selected: unknown[] = [];
  // The draw tool: the active layer is a polygon layer, without one the draft layer takes any type.
  const canDraw = (options: ToolOptions = {}) =>
    active === null || options.type === undefined || options.type === 'Polygon';
  const editor = {
    deleteSelection: vi.fn(),
    measurements: { list: () => [], clear: vi.fn() },
    selection: { get: () => selected },
    tools: {
      getActive: () => activeTool,
      getActiveOptions: () => activeOptions,
      canActivate: (id: string, options?: ToolOptions) =>
        editMode && (id !== 'draw' || canDraw(options)),
      activate: vi.fn((id: string, options: ToolOptions = {}) => {
        activeTool = id;
        activeOptions = id === 'draw' ? { type: 'Point', ...options } : options;
        emitter.emit('toolchange', { id, options: activeOptions });
        return true;
      }),
      deactivate: vi.fn(() => {
        activeTool = null;
        activeOptions = {};
        emitter.emit('toolchange', { id: null, options: {} });
      }),
    },
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
    undo: vi.fn(),
    redo: vi.fn(),
    setHistory(state: { canUndo: boolean; canRedo: boolean }) {
      history = state;
      emitter.emit('historychange', state);
    },
    layers: {
      getActive: () => active,
      list: () => (active ? [{ id: active, title: active.toUpperCase(), active: true }] : []),
      setActive: (id: string | null) => {
        active = id;
        emitter.emit('activelayerchange', { id });
      },
    },
    isEditMode: () => editMode,
    setEditMode: vi.fn((on: boolean) => {
      if (on === editMode) return;
      editMode = on;
      emitter.emit('editmodechange', { editMode });
    }),
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor;
  return editor;
}

describe('<olcad-toolbar>', () => {
  it('defaults to the top, exposes a toolbar role and the edit-mode toggle', () => {
    mount(
      `<olcad-dock><olcad-toolbar name="main"><button id="extra">x</button></olcad-toolbar></olcad-dock>`,
    );
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    expect(toolbar.dock).toBe('top');
    expect(toolbar.content.getAttribute('role')).toBe('toolbar');
    expect(toolbar.content.getAttribute('aria-orientation')).toBe('horizontal');
    const toggle = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__edit-toggle')!;
    expect(toggle.disabled).toBe(true);
    expect(toggle.nextElementSibling?.className).toBe('olcad-toolbar__active-layer');
    expect(toolbar.querySelector('.olcad-toolbar__tool--delete')?.nextElementSibling?.id).toBe(
      'extra',
    );
    toolbar.dock = 'left';
    expect(toolbar.content.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('toggles edit mode through the editor and reflects external changes', () => {
    mount(`<olcad-dock><olcad-toolbar name="main"></olcad-toolbar></olcad-dock>`);
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    const editor = fakeEditor();
    toolbar.editor = editor;
    const toggle = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__edit-toggle')!;
    expect(toggle.disabled).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    expect(editor.setEditMode).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toolbar.hasAttribute('edit-mode')).toBe(true);
    editor.setEditMode(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toolbar.hasAttribute('edit-mode')).toBe(false);
    editor.destroy();
    expect(toolbar.editor).toBeNull();
    expect(toggle.disabled).toBe(true);
  });

  it('shows the active layer', () => {
    mount(`<olcad-dock><olcad-toolbar name="main"></olcad-toolbar></olcad-dock>`);
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    const status = toolbar.querySelector<HTMLElement>('.olcad-toolbar__active-layer')!;
    expect(status.hidden).toBe(true);
    const editor = fakeEditor();
    toolbar.editor = editor;
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe('No layer selected');
    editor.layers.setActive('parcels');
    expect(status.textContent).toBe('Layer: PARCELS');
    editor.layers.setActive(null);
    expect(status.textContent).toBe('No layer selected');
  });

  it('enables undo and redo from the history state', () => {
    mount(`<olcad-dock><olcad-toolbar name="main"></olcad-toolbar></olcad-dock>`);
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    const undo = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__undo')!;
    const redo = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__redo')!;
    expect(undo.disabled).toBe(true);
    const editor = fakeEditor() as unknown as Editor & {
      setHistory(state: { canUndo: boolean; canRedo: boolean }): void;
      undo: ReturnType<typeof vi.fn>;
    };
    toolbar.editor = editor;
    editor.setHistory({ canUndo: true, canRedo: false });
    expect(undo.disabled).toBe(false);
    expect(redo.disabled).toBe(true);
    undo.click();
    expect(editor.undo).toHaveBeenCalledTimes(1);
    editor.setHistory({ canUndo: false, canRedo: true });
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(false);
  });

  it('greys out tool buttons by preconditions and toggles tools', () => {
    mount(`<olcad-dock><olcad-toolbar name="main" no-keyboard></olcad-toolbar></olcad-dock>`);
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    const button = (id: string) =>
      toolbar.querySelector<HTMLButtonElement>(`.olcad-toolbar__tool--${id}`)!;
    expect(
      Array.from(toolbar.querySelectorAll('[data-tool]'), (b) => (b as HTMLElement).dataset.tool),
    ).toEqual([
      'select',
      'draw',
      'draw',
      'draw',
      'rectangle',
      'circle',
      'ellipse',
      'regular-polygon',
      'curve',
      'parallel',
      'text',
      'dimension-linear',
      'dimension-angular',
      'dimension-radial',
      'dimension-survey',
      'modify',
      'move',
      'rotate',
      'scale',
      'offset',
      'trim',
      'extend',
      'mirror',
      'template-copy',
      'measure-distance',
      'measure-area',
      'measure-angle',
      'measure-clear',
      'delete',
    ]);
    expect(
      Array.from(toolbar.querySelectorAll('[data-type]'), (b) => (b as HTMLElement).dataset.type),
    ).toEqual(['Point', 'LineString', 'Polygon']);
    const editor = fakeEditor(false) as unknown as Editor & {
      tools: { activate: ReturnType<typeof vi.fn>; deactivate: ReturnType<typeof vi.fn> };
    };
    toolbar.editor = editor;
    expect(button('select').disabled).toBe(true); // edit mode off
    editor.setEditMode(true);
    expect(button('select').disabled).toBe(false);
    // No active layer: every draw button targets the draft layer.
    expect(button('draw-point').disabled).toBe(false);
    expect(button('draw-line').disabled).toBe(false);
    expect(button('draw-polygon').disabled).toBe(false);
    expect(button('regular-polygon').disabled).toBe(false); // the draft layer takes polygons
    expect(button('curve').disabled).toBe(false); // and lines
    expect(button('delete').disabled).toBe(true); // nothing selected
    editor.layers.setActive('parcels'); // a polygon layer
    expect(button('draw-point').disabled).toBe(true);
    expect(button('draw-line').disabled).toBe(true);
    expect(button('draw-polygon').disabled).toBe(false);
    button('draw-polygon').click();
    expect(editor.tools.activate).toHaveBeenCalledWith('draw', { type: 'Polygon' });
    expect(button('draw-polygon').getAttribute('aria-pressed')).toBe('true');
    expect(button('draw-line').getAttribute('aria-pressed')).toBe('false');
    button('draw-polygon').click();
    expect(editor.tools.deactivate).toHaveBeenCalled();
    expect(button('draw-polygon').getAttribute('aria-pressed')).toBe('false');
    // Activated elsewhere (the layer list's Insert button): the button of the type in effect
    // is pressed, and the other draw buttons are not.
    editor.layers.setActive(null);
    editor.tools.activate('draw');
    expect(button('draw-point').getAttribute('aria-pressed')).toBe('true');
    expect(button('draw-polygon').getAttribute('aria-pressed')).toBe('false');
    expect(button('draw-polygon').disabled).toBe(false);
    button('draw-line').click();
    expect(editor.tools.activate).toHaveBeenLastCalledWith('draw', { type: 'LineString' });
    expect(button('draw-line').getAttribute('aria-pressed')).toBe('true');
    button('delete').click();
    expect(editor.deleteSelection).not.toHaveBeenCalled(); // disabled
  });

  it('offers the circle constructions in a flyout and mirrors the active variant', () => {
    mount(`<olcad-dock><olcad-toolbar name="main" no-keyboard></olcad-toolbar></olcad-dock>`);
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    const editor = fakeEditor(true) as unknown as Editor & {
      tools: { activate: ReturnType<typeof vi.fn>; deactivate: ReturnType<typeof vi.fn> };
    };
    toolbar.editor = editor;
    const button = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__tool--circle')!;
    const flyout = toolbar.querySelector<HTMLElement>('.olcad-toolbar__flyout--circle')!;
    const toggle = flyout.querySelector<HTMLButtonElement>('.olcad-toolbar__flyout-toggle')!;
    const menu = flyout.querySelector<HTMLElement>('.olcad-toolbar__flyout-menu')!;
    expect(flyout.contains(button)).toBe(true);
    expect(button.dataset.tool).toBe('circle');
    expect(button.dataset.variant).toBe('centre-radius');
    expect(button.dataset.method).toBe('centre-radius');
    expect(button.getAttribute('aria-label')).toBe('Circle: centre and radius');
    expect(button.disabled).toBe(false);
    expect(toggle.getAttribute('aria-haspopup')).toBe('menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.tabIndex).toBe(-1);
    expect(menu.hidden).toBe(true);
    expect(menu.getAttribute('role')).toBe('menu');
    // A plain click activates the variant shown.
    button.click();
    expect(editor.tools.activate).toHaveBeenLastCalledWith('circle', { method: 'centre-radius' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    // The triangle opens the flyout with the current variant checked and focused.
    toggle.click();
    expect(toolbar.isFlyoutOpen('circle')).toBe(true);
    expect(menu.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    expect(items.map((item) => item.dataset.variant)).toEqual([
      'centre-radius',
      'centre-point',
      'three-point',
    ]);
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(items[0]!.textContent).toBe('Circle: centre and radius');
    expect(document.activeElement).toBe(items[0]);
    // Arrow keys move inside the menu and do not reach the toolbar's roving focus.
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    // Choosing a variant shows it on the button, activates it and closes the flyout.
    items[2]!.click();
    expect(editor.tools.activate).toHaveBeenLastCalledWith('circle', { method: 'three-point' });
    expect(menu.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(button.dataset.variant).toBe('three-point');
    expect(button.dataset.method).toBe('three-point');
    expect(button.getAttribute('aria-label')).toBe('Circle: three points');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(items[2]!.getAttribute('aria-checked')).toBe('true');
    expect(items[0]!.getAttribute('aria-checked')).toBe('false');
    expect(toolbar.currentVariant('circle')?.id).toBe('three-point');
    expect(document.activeElement).toBe(button);
    // Escape closes and refocuses the button; the event does not bubble to the shortcuts.
    toggle.click();
    expect(document.activeElement).toBe(items[2]);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const reachedDocument = vi.fn();
    document.addEventListener('keydown', reachedDocument);
    menu.dispatchEvent(escape);
    document.removeEventListener('keydown', reachedDocument);
    expect(reachedDocument).not.toHaveBeenCalled();
    expect(escape.defaultPrevented).toBe(true);
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    // A pointer down outside closes it; one inside does not.
    toggle.click();
    menu.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.hidden).toBe(false);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.hidden).toBe(true);
    // Right-click on the button opens the flyout too.
    const contextmenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    button.dispatchEvent(contextmenu);
    expect(contextmenu.defaultPrevented).toBe(true);
    expect(menu.hidden).toBe(false);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    // A variant activated elsewhere is mirrored; deactivating keeps it shown.
    editor.tools.activate('circle', { method: 'centre-point' });
    expect(button.dataset.method).toBe('centre-point');
    expect(button.getAttribute('aria-label')).toBe('Circle: centre and point');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    editor.tools.deactivate();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.dataset.method).toBe('centre-point');
    // Pressed again, the button deactivates the tool.
    editor.tools.activate('circle', { method: 'centre-point' });
    button.click();
    expect(editor.tools.deactivate).toHaveBeenCalledTimes(2);
  });

  it('opens the flyout on a long press without activating the tool', () => {
    vi.useFakeTimers();
    try {
      mount(`<olcad-dock><olcad-toolbar name="main" no-keyboard></olcad-toolbar></olcad-dock>`);
      const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
      const editor = fakeEditor(true) as unknown as Editor & {
        tools: { activate: ReturnType<typeof vi.fn> };
      };
      toolbar.editor = editor;
      const button = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__tool--circle')!;
      const menu = toolbar.querySelector<HTMLElement>('.olcad-toolbar__flyout-menu')!;
      const down = (b: HTMLElement) =>
        b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      const up = (b: HTMLElement) =>
        b.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      // A short press is an ordinary click.
      down(button);
      vi.advanceTimersByTime(LONG_PRESS_MS / 2);
      up(button);
      button.click();
      expect(menu.hidden).toBe(true);
      expect(editor.tools.activate).toHaveBeenCalledTimes(1);
      editor.tools.deactivate();
      // A long press opens the flyout and swallows the click that ends it.
      down(button);
      vi.advanceTimersByTime(LONG_PRESS_MS);
      expect(menu.hidden).toBe(false);
      up(button);
      button.click();
      expect(editor.tools.activate).toHaveBeenCalledTimes(1);
      expect(toolbar.isFlyoutOpen('circle')).toBe(true);
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      // The next ordinary click works again.
      button.click();
      expect(editor.tools.activate).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders the flyout alone with tools="circle"', () => {
    mount(`<olcad-dock><olcad-toolbar name="main" tools="circle"></olcad-toolbar></olcad-dock>`);
    expect(document.querySelectorAll('olcad-toolbar [data-tool]')).toHaveLength(1);
    expect(document.querySelector('olcad-toolbar .olcad-toolbar__flyout--circle')).not.toBeNull();
    expect(TOOL_BUTTONS.circle!.variants!.map((v) => v.id)).toEqual([
      'centre-radius',
      'centre-point',
      'three-point',
    ]);
  });

  it('restricts the buttons to the tools attribute; draw stands for the three draw buttons', () => {
    mount(
      `<olcad-dock><olcad-toolbar name="main" tools="select delete"></olcad-toolbar></olcad-dock>`,
    );
    expect(document.querySelectorAll('olcad-toolbar [data-tool]')).toHaveLength(2);
    expect(toolButtonIds('select draw delete')).toEqual([
      'select',
      'draw-point',
      'draw-line',
      'draw-polygon',
      'delete',
    ]);
    expect(toolButtonIds('draw-line nope draw-line')).toEqual(['draw-line']);
    expect(toolButtonIds(null)).toEqual(Object.keys(TOOL_BUTTONS));
    expect(optionsMatch(undefined, { type: 'Point' })).toBe(true);
    expect(optionsMatch({ type: 'Point' }, { type: 'Point' })).toBe(true);
    expect(optionsMatch({ type: 'Point' }, {})).toBe(false);
  });

  it('renders only the requested controls, with separators between the groups', () => {
    expect(toolbarControls(null)).toEqual(['edit', 'layer', 'history']);
    expect(toolbarControls('')).toEqual([]);
    expect(toolbarControls('history edit nope')).toEqual(['edit', 'history']);
    mount(`<olcad-dock>
      <olcad-toolbar name="modify" heading="Modify" controls="" tools="modify move rotate" no-keyboard></olcad-toolbar>
      <olcad-toolbar name="main" controls="edit history" tools="select" no-keyboard></olcad-toolbar>
    </olcad-dock>`);
    const modify = document.querySelector<OlcadToolbar>('[name="modify"]')!;
    expect(modify.content.getAttribute('aria-label')).toBe('Modify');
    expect(modify.querySelector('.olcad-toolbar__edit-toggle')).toBeNull();
    expect(modify.querySelector('.olcad-toolbar__active-layer')).toBeNull();
    expect(modify.querySelector('.olcad-toolbar__undo')).toBeNull();
    expect(modify.querySelectorAll('.olcad-toolbar__separator')).toHaveLength(0);
    expect(
      Array.from(modify.querySelectorAll('[data-tool]'), (b) => (b as HTMLElement).dataset.tool),
    ).toEqual(['modify', 'move', 'rotate']);
    const editor = fakeEditor(false);
    modify.editor = editor;
    const move = modify.querySelector<HTMLButtonElement>('.olcad-toolbar__tool--move')!;
    expect(move.disabled).toBe(true); // edit mode off: still greyed out without the toggle
    editor.setEditMode(true);
    expect(move.disabled).toBe(false);
    expect(modify.hasAttribute('edit-mode')).toBe(true);
    const main = document.querySelector<OlcadToolbar>('[name="main"]')!;
    expect(main.querySelector('.olcad-toolbar__edit-toggle')).not.toBeNull();
    expect(main.querySelector('.olcad-toolbar__active-layer')).toBeNull();
    expect(main.querySelector('.olcad-toolbar__undo')).not.toBeNull();
    expect(main.querySelectorAll('.olcad-toolbar__separator')).toHaveLength(2); // edit | history | tools
  });

  it('binds the keyboard shortcuts once per editor, shared by its toolbars', () => {
    mount(`<olcad-dock>
      <olcad-toolbar name="main" tools="select"></olcad-toolbar>
      <olcad-toolbar name="draw" controls="" tools="draw"></olcad-toolbar>
      <olcad-toolbar name="silent" controls="" tools="move" no-keyboard></olcad-toolbar>
    </olcad-dock>`);
    const editor = fakeEditor(true) as unknown as Editor & { undo: ReturnType<typeof vi.fn> };
    const toolbars = ['main', 'draw', 'silent'].map((name) =>
      document.querySelector<OlcadToolbar>(`[name="${name}"]`)!,
    );
    for (const toolbar of toolbars) toolbar.editor = editor;
    const undo = () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
      );
    undo();
    expect(editor.undo).toHaveBeenCalledTimes(1);
    toolbars[0]!.editor = null; // the draw toolbar keeps the shared binding alive
    undo();
    expect(editor.undo).toHaveBeenCalledTimes(2);
    toolbars[1]!.editor = null;
    undo();
    expect(editor.undo).toHaveBeenCalledTimes(2); // released; the no-keyboard toolbar never bound
    toolbars[1]!.editor = editor;
    undo();
    expect(editor.undo).toHaveBeenCalledTimes(3);
  });

  it('moves focus between buttons with arrow keys', () => {
    mount(
      `<olcad-dock><olcad-toolbar name="main"><button id="b1">1</button><button id="b2">2</button></olcad-toolbar></olcad-dock>`,
    );
    const toolbar = document.querySelector<OlcadToolbar>('olcad-toolbar')!;
    toolbar.editor = fakeEditor();
    const toggle = toolbar.querySelector<HTMLButtonElement>('.olcad-toolbar__edit-toggle')!;
    toggle.focus();
    toolbar.content.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(document.activeElement?.id).toBe('b1');
    toolbar.content.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    toolbar.content.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(document.activeElement?.id).toBe('b2');
  });
});

describe('<olcad-panel flyout>', () => {
  const html = `<olcad-dock>
      <olcad-panel name="layers" heading="Layers" dock="right" flyout><button id="in-a">A</button></olcad-panel>
      <olcad-panel name="attributes" heading="Attributes" dock="right" flyout><p>B</p></olcad-panel>
      <olcad-panel name="plain" heading="Plain" dock="right"><p>C</p></olcad-panel>
      <div id="map"></div>
    </olcad-dock>`;
  const tab = (panel: OlcadPanel) => panel.querySelector<HTMLElement>('.olcad-panel__title')!;

  it('collapses side-docked flyouts to a tab and opens one at a time', () => {
    mount(html);
    const [layers, attributes, plain] = Array.from(
      document.querySelectorAll<OlcadPanel>('olcad-panel'),
    ) as [OlcadPanel, OlcadPanel, OlcadPanel];
    expect(layers.hasAttribute('data-flyout')).toBe(true);
    expect(plain.hasAttribute('data-flyout')).toBe(false);
    expect(tab(layers).getAttribute('role')).toBe('button');
    expect(tab(layers).getAttribute('aria-expanded')).toBe('false');
    expect(tab(layers).getAttribute('aria-controls')).toBe(layers.content.id);
    expect(tab(plain).getAttribute('role')).toBeNull();
    const events: unknown[] = [];
    document.addEventListener('olcad-flyouttoggle', (e) => events.push((e as CustomEvent).detail));
    tab(layers).click();
    expect(layers.open).toBe(true);
    expect(tab(layers).getAttribute('aria-expanded')).toBe('true');
    tab(attributes).click();
    expect(attributes.open).toBe(true);
    expect(layers.open).toBe(false); // one per zone
    tab(attributes).click();
    expect(attributes.open).toBe(false);
    expect(events).toEqual([
      { name: 'layers', open: true },
      { name: 'layers', open: false }, // closed before the other opens
      { name: 'attributes', open: true },
      { name: 'attributes', open: false },
    ]);
  });

  it('is keyboard operable and ignores flyout mode while floating', () => {
    mount(html);
    const layers = document.querySelector<OlcadPanel>('olcad-panel[name="layers"]')!;
    tab(layers).focus();
    tab(layers).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(layers.open).toBe(true);
    expect(document.activeElement?.id).toBe('in-a'); // focus moves into the content
    document
      .getElementById('in-a')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    expect(layers.open).toBe(false);
    expect(document.activeElement).toBe(tab(layers));
    layers.toggleFlyout(true);
    layers.dock = 'floating';
    expect(layers.hasAttribute('data-flyout')).toBe(false); // shows normally
    expect(tab(layers).getAttribute('role')).toBeNull();
    layers.dock = 'left';
    expect(layers.hasAttribute('data-flyout')).toBe(true);
    expect(layers.open).toBe(true); // the state is kept
    layers.flyout = false;
    expect(layers.hasAttribute('data-flyout')).toBe(false);
  });
});

describe('<olcad-panel compact>', () => {
  const html = `<olcad-dock>
      <olcad-toolbar name="main"></olcad-toolbar>
      <olcad-toolbar name="wide" compact="false"></olcad-toolbar>
      <olcad-panel name="crs" heading="CRS" dock="bottom" compact><select></select></olcad-panel>
      <olcad-panel name="layers" heading="Layers" dock="right" flyout compact><p>L</p></olcad-panel>
      <div id="map"></div>
    </olcad-dock>`;
  const grip = (panel: OlcadPanel) => panel.querySelector<HTMLButtonElement>('.olcad-panel__grip')!;
  const menu = (panel: OlcadPanel) => panel.querySelector<HTMLElement>('.olcad-panel__menu')!;

  it('toolboxes are compact by default, hosts opt panels in or out', () => {
    mount(html);
    const main = document.querySelector<OlcadToolbar>('[name="main"]')!;
    const wide = document.querySelector<OlcadToolbar>('[name="wide"]')!;
    const crs = document.querySelector<OlcadPanel>('[name="crs"]')!;
    expect(main.compact).toBe(true);
    expect(main.hasAttribute('data-compact')).toBe(true);
    expect(wide.compact).toBe(false);
    expect(wide.hasAttribute('data-compact')).toBe(false);
    expect(crs.hasAttribute('data-compact')).toBe(true);
    // The heading names the content group instead of a visible title.
    expect(crs.content.getAttribute('role')).toBe('group');
    expect(crs.content.getAttribute('aria-label')).toBe('CRS');
    expect(main.content.getAttribute('role')).toBe('toolbar'); // the subclass's role is kept
    expect(main.content.getAttribute('aria-label')).toBe('Tools');
    expect(grip(crs).getAttribute('data-tooltip')).toMatch(/CRS: drag to move/);
    crs.compact = false;
    expect(crs.hasAttribute('data-compact')).toBe(false);
    expect(crs.content.getAttribute('role')).toBeNull();
    expect(grip(crs).getAttribute('data-tooltip')).toBe('Drag to move, arrow keys to nudge');
  });

  it('is not applied to a side-docked flyout whose title is the tab', () => {
    mount(html);
    const layers = document.querySelector<OlcadPanel>('[name="layers"]')!;
    expect(layers.hasAttribute('data-flyout')).toBe(true);
    expect(layers.hasAttribute('data-compact')).toBe(false);
    layers.dock = 'floating';
    expect(layers.hasAttribute('data-flyout')).toBe(false);
    expect(layers.hasAttribute('data-compact')).toBe(true);
  });

  it('the grip opens the dock menu on click and keyboard, and gets focus back', () => {
    mount(html);
    const crs = document.querySelector<OlcadPanel>('[name="crs"]')!;
    const g = grip(crs);
    expect(menu(crs).hidden).toBe(true);
    g.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }) as PointerEvent);
    g.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0 }) as PointerEvent);
    expect(menu(crs).hidden).toBe(false);
    menu(crs).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu(crs).hidden).toBe(true);
    expect(document.activeElement).toBe(g);
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(menu(crs).hidden).toBe(false);
    menu(crs).querySelector<HTMLElement>('[data-dock="top"]')!.click();
    expect(crs.dock).toBe('top');
    expect(menu(crs).hidden).toBe(true);
    expect(document.activeElement).toBe(g);
    // Non-compact panels keep the menu button; a grip click does nothing there.
    const wide = document.querySelector<OlcadToolbar>('[name="wide"]')!;
    grip(wide).dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }) as PointerEvent,
    );
    grip(wide).dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, button: 0 }) as PointerEvent,
    );
    expect(menu(wide).hidden).toBe(true);
  });
});

describe('<olcad-dock> panel visibility', () => {
  const html = `
    <olcad-dock storage-key="layout">
      <olcad-toolbar name="main" heading="Main"></olcad-toolbar>
      <olcad-panel name="layers" heading="Layers" dock="right"></olcad-panel>
      <olcad-panel heading="Unnamed" dock="left"></olcad-panel>
      <olcad-panel name="table" heading="Table" dock="bottom" no-toggle hidden></olcad-panel>
      <div id="map"></div>
    </olcad-dock>`;

  it('lists the named, toggleable panels with their headings', () => {
    const dock = mount(html);
    expect(dock.listPanels()).toEqual([
      { name: 'main', heading: 'Main', hidden: false },
      { name: 'layers', heading: 'Layers', hidden: false },
    ]);
  });

  it('hides and shows panels, persists it and emits one layout change each', () => {
    const dock = mount(html);
    const listener = vi.fn();
    dock.addEventListener('olcad-layoutchange', listener);
    dock.setPanelVisible('layers', false);
    const layers = dock.querySelector<OlcadPanel>('[name="layers"]')!;
    expect(layers.hidden).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('layout')!).layers).toEqual({
      dock: 'right',
      x: 0,
      y: 0,
      hidden: true,
    });
    dock.setAllPanelsVisible(false);
    expect(dock.listPanels().every((p) => p.hidden)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    // The table panel keeps its own visibility; it is never stored.
    const table = dock.querySelector<OlcadPanel>('[name="table"]')!;
    table.hidden = false;
    dock.setAllPanelsVisible(false);
    expect(table.hidden).toBe(false);
    expect(JSON.parse(localStorage.getItem('layout')!).table.hidden).toBeUndefined();
    dock.setAllPanelsVisible(true);
    expect(dock.listPanels().some((p) => p.hidden)).toBe(false);
    expect(JSON.parse(localStorage.getItem('layout')!).layers.hidden).toBeUndefined();
  });

  it('restoring one panel does not overwrite what is stored for the others', () => {
    const stored = {
      main: { dock: 'top', x: 0, y: 0, hidden: true },
      layers: { dock: 'floating', x: 40, y: 50, hidden: true },
    };
    localStorage.setItem('layout', JSON.stringify(stored));
    const dock = mount(html);
    expect(dock.querySelector<OlcadPanel>('[name="layers"]')!.placement).toEqual(stored.layers);
    expect(JSON.parse(localStorage.getItem('layout')!)).toEqual(stored);
  });

  it('restores hidden panels from the stored layout; older layouts stay visible', () => {
    localStorage.setItem(
      'layout',
      JSON.stringify({
        main: { dock: 'top', x: 0, y: 0, hidden: true },
        layers: { dock: 'left', x: 0, y: 0 },
      }),
    );
    const dock = mount(html);
    expect(dock.querySelector<OlcadPanel>('[name="main"]')!.hidden).toBe(true);
    expect(dock.querySelector<OlcadPanel>('[name="layers"]')!.hidden).toBe(false);
    dock.resetLayout();
    expect(dock.listPanels().some((p) => p.hidden)).toBe(false);
  });
});
