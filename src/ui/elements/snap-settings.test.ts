// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnapMode } from '../../core/config/types';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadSnapSettings } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const state = {
    enabled: true,
    tolerancePx: 12,
    modes: ['vertex', 'midpoint', 'perpendicular'] as SnapMode[],
  };
  const emit = () => emitter.emit('snappingchange', { ...state });
  const snapping = {
    isEnabled: () => state.enabled,
    setEnabled: vi.fn((on: boolean) => {
      state.enabled = on;
      emit();
    }),
    getTolerance: () => state.tolerancePx,
    setTolerance: vi.fn((px: number) => {
      state.tolerancePx = px;
      emit();
    }),
    getModes: () => state.modes.slice(),
    setModes: vi.fn((modes: SnapMode[]) => {
      state.modes = modes;
      emit();
    }),
  };
  const editor = {
    snapping,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor;
  return { editor, snapping, state };
}

function mount(): OlcadSnapSettings {
  document.body.innerHTML = `<olcad-dock><olcad-snap-settings name="snap"></olcad-snap-settings></olcad-dock>`;
  return document.querySelector<OlcadSnapSettings>('olcad-snap-settings')!;
}

const parts = (el: OlcadSnapSettings) => ({
  toggle: el.querySelector<HTMLButtonElement>('.olcad-snap-settings__toggle')!,
  tolerance: el.querySelector<HTMLInputElement>('.olcad-snap-settings__tolerance')!,
  mode: (mode: string) =>
    el.querySelector<HTMLInputElement>(`.olcad-snap-settings__mode[data-mode="${mode}"] input`)!,
});

describe('<olcad-snap-settings>', () => {
  it('toggles snapping with one click and reflects the state', () => {
    const el = mount();
    const { toggle } = parts(el);
    expect(el.dock).toBe('top');
    expect(toggle.disabled).toBe(true);
    const { editor, snapping } = fakeEditor();
    el.editor = editor;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(el.hasAttribute('snapping')).toBe(true);
    toggle.click();
    expect(snapping.setEnabled).toHaveBeenCalledWith(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(el.hasAttribute('snapping')).toBe(false);
    toggle.click();
    expect(snapping.setEnabled).toHaveBeenLastCalledWith(true);
  });

  it('applies the radius and the modes, keeping at least one mode', () => {
    const el = mount();
    const { editor, snapping } = fakeEditor();
    el.editor = editor;
    // Modes are icon toggles: the label carries the pressed class and the icon, the input the name.
    const vertexLabel = parts(el).mode('vertex').parentElement!;
    expect(vertexLabel.classList.contains('olcad-icon-toggle--on')).toBe(true);
    expect(vertexLabel.querySelector('svg.olcad-icon')).not.toBeNull();
    expect(parts(el).mode('vertex').getAttribute('aria-label')).toBe('Points');
    const { tolerance, mode } = parts(el);
    expect(tolerance.value).toBe('12');
    tolerance.value = '20';
    tolerance.dispatchEvent(new Event('change'));
    expect(snapping.setTolerance).toHaveBeenCalledWith(20);
    tolerance.value = '0';
    tolerance.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(snapping.setTolerance).toHaveBeenCalledTimes(1); // rejected, value restored
    expect(tolerance.value).toBe('20');
    expect(mode('vertex').checked).toBe(true);
    expect(mode('perpendicular').checked).toBe(true);
    mode('vertex').checked = false;
    mode('vertex').dispatchEvent(new Event('change'));
    expect(snapping.setModes).toHaveBeenLastCalledWith(['midpoint', 'perpendicular']);
    mode('perpendicular').checked = false;
    mode('perpendicular').dispatchEvent(new Event('change'));
    expect(snapping.setModes).toHaveBeenLastCalledWith(['midpoint']);
    mode('midpoint').checked = false;
    mode('midpoint').dispatchEvent(new Event('change'));
    expect(snapping.setModes).toHaveBeenCalledTimes(2); // the last mode cannot be removed
    expect(mode('midpoint').checked).toBe(true);
    mode('vertex').checked = true;
    mode('vertex').dispatchEvent(new Event('change'));
    expect(snapping.setModes).toHaveBeenLastCalledWith(['vertex', 'midpoint']);
    expect(mode('tangent').checked).toBe(false); // not in the defaults
    expect(mode('tangent').getAttribute('aria-label')).toBe('Tangent');
    mode('tangent').checked = true;
    mode('tangent').dispatchEvent(new Event('change'));
    expect(snapping.setModes).toHaveBeenLastCalledWith(['vertex', 'midpoint', 'tangent']);
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(parts(el).toggle.disabled).toBe(true);
  });
});
