// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents, InputResult } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadInputBar } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor(units = 'm') {
  const emitter = new Emitter<EditorEvents>();
  const state = {
    editMode: false,
    tool: null as string | null,
    prompt: null as string | null,
    request: null as 'text' | 'value' | null,
    /** The dimension the command line edits (`dimensions.inputTarget`). */
    dimension: null as object | null,
  };
  const tools = {
    getActive: () => state.tool,
    getPrompt: () => state.prompt,
    getInputRequest: () => state.request,
    finish: vi.fn(),
    cancel: vi.fn(),
  };
  const input = vi.fn((text: string): InputResult => {
    const result: InputResult =
      text === 'bad'
        ? { ok: false, text, code: 'input-invalid', error: 'Not a coordinate' }
        : text === '5'
          ? { ok: true, text, value: 5 }
          : text === '12.5'
            ? { ok: true, text, fieldValue: 12.5 }
            : text === '-'
              ? { ok: true, text, fieldValue: null }
              : { ok: true, text, coordinate: [1.2345, 6.789] };
    emitter.emit('input', result);
    return result;
  });
  const editor = {
    tools,
    input,
    isEditMode: () => state.editMode,
    dimensions: { inputTarget: () => state.dimension, values: () => null },
    units: { getLength: () => 'm', formatLength: (m: number) => `${m.toFixed(2)} m` },
    layers: { get: (id: string) => ({ title: id === 'roads' ? 'Roads' : id }) },
    map: { getView: () => ({ getProjection: () => ({ getUnits: () => units }) }) },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
    emitter,
    state,
  } as unknown as Editor & { emitter: Emitter<EditorEvents>; state: typeof state };
  return { editor, tools, input };
}

function mount(): OlcadInputBar {
  document.body.innerHTML = `<olcad-dock><olcad-input-bar name="input"></olcad-input-bar></olcad-dock>`;
  return document.querySelector<OlcadInputBar>('olcad-input-bar')!;
}

const parts = (el: OlcadInputBar) => ({
  output: el.querySelector<HTMLElement>('.olcad-input-bar__output')!,
  input: el.querySelector<HTMLInputElement>('.olcad-input-bar__input')!,
});

const key = (input: HTMLInputElement, k: string) =>
  input.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));

describe('<olcad-input-bar>', () => {
  it('shows prompts for the active tool and editor messages', () => {
    const el = mount();
    const { output, input } = parts(el);
    expect(el.dock).toBe('bottom');
    expect(input.disabled).toBe(true);
    const { editor } = fakeEditor();
    el.editor = editor;
    expect(input.disabled).toBe(false);
    expect(output.textContent).toContain('Switch on edit mode');
    expect(output.dataset.kind).toBe('prompt');
    editor.state.editMode = true;
    editor.state.tool = 'draw';
    editor.emitter.emit('toolchange', { id: 'draw', options: {} });
    expect(output.textContent).toContain('type a point');
    editor.emitter.emit('validationerror', {
      code: 'self-intersection',
      message: 'The ring intersects itself',
      path: '',
    } as never);
    expect(output.textContent).toBe('The ring intersects itself');
    expect(output.dataset.kind).toBe('error');
    editor.emitter.emit('projectionchange', { from: 'EPSG:3857', to: 'EPSG:25832' });
    expect(output.textContent).toBe('Projection: EPSG:25832');
    editor.emitter.emit('featureinsert', { layer: 'roads', feature: {} as never });
    expect(output.textContent).toBe('Inserted into Roads');
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(parts(el).input.disabled).toBe(true);
  });

  it('sends typed input to the editor and echoes the result', () => {
    const el = mount();
    const { editor, tools, input: editorInput } = fakeEditor();
    el.editor = editor;
    const { output, input } = parts(el);
    input.value = ' @100,0 ';
    key(input, 'Enter');
    expect(editorInput).toHaveBeenCalledWith('@100,0');
    expect(output.textContent).toBe('@100,0 → 1.23, 6.79');
    expect(output.dataset.kind).toBe('info');
    expect(input.value).toBe('');
    input.value = '5'; // taken as a value (number of sides), not a point
    key(input, 'Enter');
    expect(output.textContent).toBe('5 → 5');
    expect(input.value).toBe('');
    input.value = 'bad';
    key(input, 'Enter');
    expect(output.textContent).toBe('Not a coordinate');
    expect(output.dataset.kind).toBe('error');
    expect(input.value).toBe('bad'); // kept for correction
    key(input, 'Escape');
    expect(tools.cancel).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
    key(input, 'Enter');
    expect(tools.finish).toHaveBeenCalledTimes(1);
    expect(editorInput).toHaveBeenCalledTimes(3);
  });

  it('uses six decimals in a geographic projection and shows headless input', () => {
    const el = mount();
    const { editor } = fakeEditor('degrees');
    el.editor = editor;
    editor.input('8.4,49');
    expect(parts(el).output.textContent).toBe('8.4,49 → 1.234500, 6.789000');
    el.show('custom', 'error');
    expect(el.message).toBe('custom');
  });
});

describe('<olcad-input-bar> selected dimension', () => {
  it('asks for the field value of a selected dimension and echoes the result', () => {
    const el = mount();
    const { output, input } = parts(el);
    const { editor } = fakeEditor();
    el.editor = editor;
    editor.state.editMode = true;
    editor.state.dimension = {};
    editor.emitter.emit('selectionchange', { features: [] });
    expect(output.textContent).toBe('Field value of the selected dimension in m; - clears it');
    input.value = '12.5';
    key(input, 'Enter');
    expect(output.textContent).toBe('Field value 12.50 m');
    input.value = '-';
    key(input, 'Enter');
    expect(output.textContent).toBe('Field value cleared');
    editor.state.dimension = null;
    editor.emitter.emit('selectionchange', { features: [] });
    expect(output.textContent).toContain('Switch on edit mode');
  });
});

describe('<olcad-input-bar> tool prompts', () => {
  it("shows a tool's own prompt and follows toolprompt", () => {
    const el = mount();
    const { output } = parts(el);
    const { editor } = fakeEditor();
    el.editor = editor;
    editor.state.editMode = true;
    editor.state.tool = 'move';
    editor.emitter.emit('toolchange', { id: 'move', options: {} });
    expect(output.textContent).toContain('Select the objects to move'); // default per tool
    editor.state.prompt = 'Base point: click on the map';
    editor.emitter.emit('toolprompt', { id: 'move', text: editor.state.prompt, input: null });
    expect(output.textContent).toBe('Base point: click on the map');
    expect(output.dataset.kind).toBe('prompt');
    editor.state.prompt = null;
    editor.emitter.emit('toolprompt', { id: 'move', text: null, input: null });
    expect(output.textContent).toContain('Select the objects to move');
  });
});

describe('<olcad-input-bar> typed-input steps', () => {
  const ask = (
    editor: ReturnType<typeof fakeEditor>['editor'],
    request: 'text' | 'value' | null,
  ) => {
    editor.state.request = request;
    editor.emitter.emit('toolprompt', { id: 'text', text: 'Text:', input: request });
  };

  it('focuses, selects and highlights the input while a step expects typing', () => {
    const el = mount();
    const { input } = parts(el);
    const { editor } = fakeEditor();
    el.editor = editor;
    editor.state.editMode = true;
    editor.state.tool = 'text';
    input.value = 'old';
    ask(editor, 'value');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(3); // typing replaces it
    expect(el.classList.contains('olcad-input-bar--awaiting')).toBe(true);
    expect(el.dataset.input).toBe('value');
    expect(input.placeholder).toBe('Type a value and press Enter');
    ask(editor, 'text');
    expect(el.dataset.input).toBe('text');
    expect(input.placeholder).toBe('Type the text and press Enter');
    // The step takes clicks again: highlight off, the focus goes back to the page.
    ask(editor, null);
    expect(el.classList.contains('olcad-input-bar--awaiting')).toBe(false);
    expect(el.dataset.input).toBeUndefined();
    expect(input.placeholder).toBe('x,y · @dx,dy · @d<a · d');
    expect(document.activeElement).not.toBe(input);
  });

  it('keeps a user-focused input for point steps and never steals the focus from a dialog or field', () => {
    const el = mount();
    const { input } = parts(el);
    const { editor } = fakeEditor();
    el.editor = editor;
    editor.state.editMode = true;
    editor.state.tool = 'rectangle';
    input.focus(); // the user types a point
    ask(editor, null);
    expect(document.activeElement).toBe(input);

    const other = document.createElement('input');
    document.body.append(other);
    other.focus();
    ask(editor, 'text');
    expect(document.activeElement).toBe(other); // typing elsewhere: highlight only
    expect(el.classList.contains('olcad-input-bar--awaiting')).toBe(true);
    ask(editor, null);

    other.blur();
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    ask(editor, 'value');
    expect(document.activeElement).not.toBe(input);
  });

  it('shows the prompt of a read-only tool while edit mode is off', () => {
    const el = mount();
    const { output } = parts(el);
    const { editor } = fakeEditor();
    el.editor = editor;
    editor.state.tool = 'measure-distance';
    editor.state.prompt = 'First point of the distance';
    editor.emitter.emit('toolchange', { id: 'measure-distance', options: {} });
    expect(output.textContent).toBe('First point of the distance');
  });
});
