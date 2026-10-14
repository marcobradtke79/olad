// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import type { TemplateInfo } from '../../core/templates/TemplateStore';
import { defineElements, type OlcadTemplateList } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor(editMode = false) {
  const emitter = new Emitter<EditorEvents>();
  let templates: TemplateInfo[] = [
    { id: 'tpl-1', name: 'Junction', featureCount: 2, layers: ['roads', 'hydrants'] },
    { id: 'tpl-2', name: 'Tracks', featureCount: 1, layers: ['tracks'] },
  ];
  let active: string | null = null;
  let options: Record<string, unknown> = {};
  const toolchange = () => emitter.emit('toolchange', { id: active, options });
  const editor = {
    isEditMode: () => editMode,
    setEditMode: vi.fn((on: boolean) => {
      editMode = on;
      emitter.emit('editmodechange', { editMode: on });
    }),
    tools: {
      getActive: () => active,
      getActiveOptions: () => options,
      activate: vi.fn((id: string, opts: Record<string, unknown> = {}) => {
        active = id;
        options = opts;
        toolchange();
        return true;
      }),
      deactivate: vi.fn(() => {
        active = null;
        options = {};
        toolchange();
      }),
    },
    templates: {
      list: () => templates.map((t) => ({ ...t })),
      canInsert: (id: string) => id !== 'tpl-2', // tracks: no layer takes them
      rename: vi.fn((id: string, name: string) => {
        templates = templates.map((t) => (t.id === id ? { ...t, name } : t));
        emitter.emit('templatechange', { id, type: 'rename' });
      }),
      remove: vi.fn((id: string) => {
        templates = templates.filter((t) => t.id !== id);
        emitter.emit('templatechange', { id, type: 'remove' });
      }),
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
    emitter,
  };
  return editor as unknown as Editor & typeof editor;
}

function mount(editor: Editor): OlcadTemplateList {
  document.body.innerHTML = `<olcad-template-list></olcad-template-list>`;
  const el = document.querySelector<OlcadTemplateList>('olcad-template-list')!;
  el.editor = editor;
  return el;
}

const control = (el: HTMLElement, id: string, action: string) =>
  el.querySelector<HTMLButtonElement>(`[data-template-id="${id}"] [data-action="${action}"]`)!;

describe('<olcad-template-list>', () => {
  it('lists templates with their name, size and icon buttons', () => {
    const el = mount(fakeEditor());
    const row = el.querySelector('[data-template-id="tpl-1"]')!;
    expect(row.querySelector('.olcad-template-list__name')!.textContent).toBe('Junction');
    expect(row.querySelector('.olcad-template-list__meta')!.textContent).toBe(
      '2 objects · roads, hydrants',
    );
    expect(Array.from(row.querySelectorAll('button'), (b) => b.getAttribute('aria-label'))).toEqual(
      ['Insert Junction', 'Rename Junction', 'Remove Junction'],
    );
    expect(el.querySelector('.olcad-template-list__count')!.textContent).toBe('2 templates');
  });

  it('shows a hint while there are no templates', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    editor.templates.remove('tpl-1');
    editor.templates.remove('tpl-2');
    expect(el.querySelector('.olcad-template-list__empty')!.textContent).toContain(
      'Copy to template',
    );
  });

  it('starts the copy tool, switching edit mode on', () => {
    const editor = fakeEditor(false);
    const el = mount(editor);
    const copy = () => el.querySelector<HTMLButtonElement>('.olcad-template-list__copy')!;
    copy().click();
    expect(editor.setEditMode).toHaveBeenCalledWith(true);
    expect(editor.tools.activate).toHaveBeenCalledWith('template-copy');
    expect(copy().getAttribute('aria-pressed')).toBe('true');
    copy().click();
    expect(editor.tools.deactivate).toHaveBeenCalled();
  });

  it('starts and stops inserting a template; disabled when no layer takes it', () => {
    const editor = fakeEditor(true);
    const el = mount(editor);
    control(el, 'tpl-1', 'insert').click();
    expect(editor.tools.activate).toHaveBeenCalledWith('template-insert', { template: 'tpl-1' });
    expect(control(el, 'tpl-1', 'insert').getAttribute('aria-pressed')).toBe('true');
    control(el, 'tpl-1', 'insert').click();
    expect(editor.tools.deactivate).toHaveBeenCalledTimes(1);
    expect(control(el, 'tpl-2', 'insert').disabled).toBe(true);
    expect(control(el, 'tpl-2', 'insert').dataset.tooltip).toBe('No layer can take these objects');
  });

  it('renames in place: Enter saves, Escape cancels', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    control(el, 'tpl-1', 'rename').click();
    const input = () => el.querySelector<HTMLInputElement>('.olcad-template-list__name-input')!;
    expect(document.activeElement).toBe(input());
    input().value = 'Crossing';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(editor.templates.rename).toHaveBeenCalledWith('tpl-1', 'Crossing');
    expect(
      el.querySelector('[data-template-id="tpl-1"] .olcad-template-list__name')!.textContent,
    ).toBe('Crossing');
    expect(document.activeElement).toBe(control(el, 'tpl-1', 'rename'));
    control(el, 'tpl-1', 'rename').click();
    input().value = 'Other';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(editor.templates.rename).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.olcad-template-list__name-input')).toBeNull();
  });

  it('removes a template and keeps the focus in the list', () => {
    const editor = fakeEditor(true);
    const el = mount(editor);
    control(el, 'tpl-1', 'insert').click();
    control(el, 'tpl-2', 'insert').focus();
    control(el, 'tpl-1', 'remove').click();
    expect(editor.tools.deactivate).toHaveBeenCalled(); // inserting a removed template stops
    expect(editor.templates.remove).toHaveBeenCalledWith('tpl-1');
    expect(el.querySelector('[data-template-id="tpl-1"]')).toBeNull();
  });

  it('unbinds on destroy', () => {
    const editor = fakeEditor();
    const el = mount(editor);
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(el.children).toHaveLength(0);
  });
});
