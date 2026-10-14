// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadAngleLock } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  const state = { enabled: false, step: 90 };
  const emit = () => emitter.emit('constraintschange', { angle: { ...state } });
  const constraints = {
    isAngleLocked: () => state.enabled,
    setAngleLocked: vi.fn((on: boolean) => {
      state.enabled = on;
      emit();
    }),
    getAngleStep: () => state.step,
    setAngleStep: vi.fn((step: number) => {
      state.step = step;
      emit();
    }),
  };
  const editor = {
    constraints,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor;
  return { editor, constraints };
}

function mount(): OlcadAngleLock {
  document.body.innerHTML = `<olcad-dock><olcad-angle-lock name="angle"></olcad-angle-lock></olcad-dock>`;
  return document.querySelector<OlcadAngleLock>('olcad-angle-lock')!;
}

const parts = (el: OlcadAngleLock) => ({
  toggle: el.querySelector<HTMLButtonElement>('.olcad-angle-lock__toggle')!,
  preset: (step: number) =>
    el.querySelector<HTMLButtonElement>(`.olcad-angle-lock__preset[data-step="${step}"]`)!,
  step: el.querySelector<HTMLInputElement>('.olcad-angle-lock__step')!,
});

describe('<olcad-angle-lock>', () => {
  it('toggles the lock with one click and reflects the state', () => {
    const el = mount();
    const { toggle } = parts(el);
    expect(el.dock).toBe('top');
    expect(toggle.disabled).toBe(true);
    const { editor, constraints } = fakeEditor();
    el.editor = editor;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    expect(constraints.setAngleLocked).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(el.hasAttribute('locked')).toBe(true);
    toggle.click();
    expect(el.hasAttribute('locked')).toBe(false);
  });

  it('sets the step through presets and the input', () => {
    const el = mount();
    const { editor, constraints } = fakeEditor();
    el.editor = editor;
    const { preset, step } = parts(el);
    expect(step.value).toBe('90');
    expect(preset(90).getAttribute('aria-pressed')).toBe('true');
    expect(preset(45).getAttribute('aria-pressed')).toBe('false');
    preset(45).click();
    expect(constraints.setAngleStep).toHaveBeenCalledWith(45);
    expect(preset(45).getAttribute('aria-pressed')).toBe('true');
    expect(step.value).toBe('45');
    step.value = '30';
    step.dispatchEvent(new Event('change'));
    expect(constraints.setAngleStep).toHaveBeenLastCalledWith(30);
    expect(preset(45).getAttribute('aria-pressed')).toBe('false');
    step.value = '400';
    step.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(constraints.setAngleStep).toHaveBeenCalledTimes(2); // rejected
    expect(step.value).toBe('30');
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(parts(el).toggle.disabled).toBe(true);
  });
});
