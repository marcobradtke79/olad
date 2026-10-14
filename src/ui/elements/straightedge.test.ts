// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadStraightedge } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor(editMode = true) {
  const emitter = new Emitter<EditorEvents>();
  let angle = 0;
  let picking = false;
  const straightedge = {
    getAngle: () => angle,
    setAngle: vi.fn((deg: number) => {
      angle = ((deg % 360) + 360) % 360;
      emitter.emit('straightedgechange', { angle, color: '#1f2933' });
    }),
    pick: vi.fn(() => {
      picking = true;
      emitter.emit('straightedgepick', { picking });
    }),
    cancelPick: vi.fn(() => {
      picking = false;
      emitter.emit('straightedgepick', { picking });
    }),
    isPicking: () => picking,
  };
  const editor = {
    straightedge,
    isEditMode: () => editMode,
    setEditMode: (on: boolean) => {
      editMode = on;
      emitter.emit('editmodechange', { editMode: on });
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor;
  return { editor, straightedge };
}

function mount(): OlcadStraightedge {
  document.body.innerHTML = `<olcad-dock><olcad-straightedge name="se"></olcad-straightedge></olcad-dock>`;
  return document.querySelector<OlcadStraightedge>('olcad-straightedge')!;
}

const parts = (el: OlcadStraightedge) => ({
  input: el.querySelector<HTMLInputElement>('.olcad-straightedge__input')!,
  reset: el.querySelector<HTMLButtonElement>('.olcad-straightedge__reset')!,
  pick: el.querySelector<HTMLButtonElement>('.olcad-straightedge__pick')!,
});

describe('<olcad-straightedge>', () => {
  it('is a top-docked panel whose controls are disabled while unbound', () => {
    const el = mount();
    expect(el.dock).toBe('top');
    const { input, reset, pick } = parts(el);
    expect(input.disabled).toBe(true);
    expect(reset.disabled).toBe(true);
    expect(pick.disabled).toBe(true);
    expect(el.querySelector('.olcad-panel__title')!.textContent).toBe('Straightedge');
  });

  it('applies the typed angle on change and Enter, showing the normalised value', () => {
    const el = mount();
    const { editor, straightedge } = fakeEditor();
    el.editor = editor;
    const { input, reset } = parts(el);
    expect(input.value).toBe('0');
    input.value = '30';
    input.dispatchEvent(new Event('change'));
    expect(straightedge.setAngle).toHaveBeenCalledWith(30);
    expect(input.value).toBe('30');
    input.value = '-45';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(input.value).toBe('315');
    reset.click();
    expect(straightedge.setAngle).toHaveBeenLastCalledWith(0);
    expect(input.value).toBe('0');
    straightedge.setAngle(12.3456);
    expect(input.value).toBe('12.35');
  });

  it('toggles the reference pick and cancels with Escape', () => {
    const el = mount();
    const { editor, straightedge } = fakeEditor();
    el.editor = editor;
    const { pick } = parts(el);
    expect(pick.disabled).toBe(false);
    expect(pick.getAttribute('aria-pressed')).toBe('false');
    pick.click();
    expect(straightedge.pick).toHaveBeenCalledTimes(1);
    expect(pick.getAttribute('aria-pressed')).toBe('true');
    expect(el.hasAttribute('picking')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(straightedge.cancelPick).toHaveBeenCalledTimes(1);
    expect(pick.getAttribute('aria-pressed')).toBe('false');
    expect(el.hasAttribute('picking')).toBe(false);
    pick.click();
    pick.click();
    expect(straightedge.cancelPick).toHaveBeenCalledTimes(2);
  });

  it('switches edit mode on for a pick, shows a hint while picking and unbinds on destroy', () => {
    const el = mount();
    const { editor, straightedge } = fakeEditor(false);
    el.editor = editor;
    const { pick, input } = parts(el);
    expect(pick.disabled).toBe(false);
    expect(pick.getAttribute('aria-label')).toBe('Align to segment');
    expect(pick.querySelector('svg.olcad-icon')).not.toBeNull();
    expect(pick.getAttribute('data-tooltip')).toMatch(/Click a line or polygon/);
    const hint = el.querySelector<HTMLElement>('.olcad-straightedge__hint')!;
    expect(hint.hidden).toBe(true);
    pick.click();
    expect(editor.isEditMode()).toBe(true);
    expect(straightedge.pick).toHaveBeenCalledTimes(1);
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toMatch(/Click a line or polygon/);
    pick.click();
    expect(straightedge.cancelPick).toHaveBeenCalledTimes(1);
    expect(hint.hidden).toBe(true);
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(input.disabled).toBe(true);
  });
});
