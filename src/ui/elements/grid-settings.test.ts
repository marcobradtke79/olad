// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadGridSettings } from '../index';
import { unitLabel } from './OlcadGridSettings';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor(units = 'm') {
  const emitter = new Emitter<EditorEvents>();
  const state = { enabled: false, spacing: 10, origin: [0, 0] as [number, number], visible: true };
  const emit = () => emitter.emit('gridchange', { ...state });
  const grid = {
    isEnabled: () => state.enabled,
    setEnabled: vi.fn((on: boolean) => {
      state.enabled = on;
      emit();
    }),
    getSpacing: () => state.spacing,
    setSpacing: vi.fn((spacing: number) => {
      state.spacing = spacing;
      emit();
    }),
    getOrigin: () => state.origin,
    setOrigin: vi.fn(),
    isVisible: () => state.visible,
    setVisible: vi.fn((visible: boolean) => {
      state.visible = visible;
      emit();
    }),
  };
  const projection = { getUnits: () => units };
  const editor = {
    grid,
    map: { getView: () => ({ getProjection: () => projection }) },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
    setUnits: (u: string) => {
      units = u;
      emitter.emit('projectionchange', { from: 'a', to: 'b' });
    },
  } as unknown as Editor & { setUnits(u: string): void };
  return { editor, grid, state };
}

function mount(): OlcadGridSettings {
  document.body.innerHTML = `<olcad-dock><olcad-grid-settings name="grid"></olcad-grid-settings></olcad-dock>`;
  return document.querySelector<OlcadGridSettings>('olcad-grid-settings')!;
}

const parts = (el: OlcadGridSettings) => ({
  toggle: el.querySelector<HTMLButtonElement>('.olcad-grid-settings__toggle')!,
  spacing: el.querySelector<HTMLInputElement>('.olcad-grid-settings__spacing')!,
  unit: el.querySelector<HTMLSpanElement>('.olcad-grid-settings__unit')!,
  show: el.querySelector<HTMLInputElement>('.olcad-grid-settings__show input')!,
});

describe('unitLabel', () => {
  it('maps projection units to short labels', () => {
    expect(unitLabel('m')).toBe('m');
    expect(unitLabel('degrees')).toBe('°');
    expect(unitLabel('ft')).toBe('ft');
    expect(unitLabel('pixels')).toBe('pixels');
    expect(unitLabel(undefined)).toBe('');
  });
});

describe('<olcad-grid-settings>', () => {
  it('toggles grid snap with one click and reflects the state', () => {
    const el = mount();
    const { toggle, unit } = parts(el);
    expect(el.dock).toBe('top');
    expect(toggle.disabled).toBe(true);
    expect(unit.textContent).toBe('');
    const { editor, grid } = fakeEditor();
    el.editor = editor;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(el.hasAttribute('grid')).toBe(false);
    toggle.click();
    expect(grid.setEnabled).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(el.hasAttribute('grid')).toBe(true);
    toggle.click();
    expect(grid.setEnabled).toHaveBeenLastCalledWith(false);
    expect(el.hasAttribute('grid')).toBe(false);
  });

  it('applies the spacing, shows the unit and toggles the display', () => {
    const el = mount();
    const { editor, grid } = fakeEditor();
    el.editor = editor;
    const { spacing, unit, show } = parts(el);
    expect(spacing.value).toBe('10');
    expect(unit.textContent).toBe('m');
    spacing.value = '2.5';
    spacing.dispatchEvent(new Event('change'));
    expect(grid.setSpacing).toHaveBeenCalledWith(2.5);
    spacing.value = '0';
    spacing.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(grid.setSpacing).toHaveBeenCalledTimes(1); // rejected, value restored
    expect(spacing.value).toBe('2.5');
    editor.setUnits('degrees');
    expect(unit.textContent).toBe('°');
    expect(show.checked).toBe(true);
    show.checked = false;
    show.dispatchEvent(new Event('change'));
    expect(grid.setVisible).toHaveBeenCalledWith(false);
    expect(show.checked).toBe(false);
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(parts(el).toggle.disabled).toBe(true);
    expect(parts(el).unit.textContent).toBe('');
  });
});
