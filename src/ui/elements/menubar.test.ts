// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineElements, type OlcadMenu, type OlcadMenubar } from '../index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function mount() {
  document.body.innerHTML = `
    <olcad-menubar>
      <olcad-menu label="File">
        <button id="save" type="button">Save</button>
        <button id="discard" type="button" disabled>Discard</button>
        <label><input id="fail" type="checkbox" /> Simulate failure</label>
        <hr />
        <button id="reset" type="button">Reset server</button>
      </olcad-menu>
      <olcad-menu label="Edit">
        <button id="undo" type="button">Undo</button>
      </olcad-menu>
    </olcad-menubar>
    <button id="outside" type="button">Outside</button>`;
  const bar = document.querySelector<OlcadMenubar>('olcad-menubar')!;
  const [file, edit] = bar.menus() as [OlcadMenu, OlcadMenu];
  return { bar, file, edit };
}

const key = (target: Element, k: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('<olcad-menubar>', () => {
  it('assigns roles and opens and closes with the button', () => {
    const { bar, file } = mount();
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(bar.getAttribute('aria-label')).toBe('Main menu');
    expect(file.button.textContent).toBe('File');
    expect(file.button.getAttribute('aria-haspopup')).toBe('menu');
    expect(file.popup.getAttribute('role')).toBe('menu');
    expect(file.popup.hidden).toBe(true);
    expect(document.getElementById('save')!.getAttribute('role')).toBe('menuitem');
    expect(document.getElementById('fail')!.closest('label')!.getAttribute('role')).toBe(
      'menuitemcheckbox',
    );
    expect(document.querySelector('hr')!.getAttribute('role')).toBe('separator');
    expect(file.items().map((i) => i.id || i.tagName)).toEqual(['save', 'LABEL', 'reset']); // disabled skipped
    file.button.click();
    expect(file.open).toBe(true);
    expect(file.button.getAttribute('aria-expanded')).toBe('true');
    file.button.click();
    expect(file.open).toBe(false);
  });

  it('runs the host handler and closes on an item click, keeps checkbox items open', async () => {
    const { file } = mount();
    const onSave = vi.fn();
    document.getElementById('save')!.addEventListener('click', onSave);
    file.button.click();
    document.getElementById('save')!.click();
    expect(onSave).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(file.open).toBe(false);
    expect(document.activeElement).toBe(file.button);
    file.show();
    const fail = document.getElementById('fail') as HTMLInputElement;
    const label = fail.closest('label')!;
    expect(label.getAttribute('aria-checked')).toBe('false');
    fail.click();
    expect(fail.checked).toBe(true);
    expect(label.getAttribute('aria-checked')).toBe('true');
    expect(file.open).toBe(true);
  });

  it('is keyboard operable', () => {
    const { bar, file, edit } = mount();
    file.button.focus();
    key(file.button, 'ArrowDown');
    expect(file.open).toBe(true);
    expect(document.activeElement?.id).toBe('save');
    key(file.popup, 'ArrowDown');
    expect(document.activeElement).toBe(document.getElementById('fail')!.closest('label'));
    key(file.popup, 'ArrowDown');
    expect(document.activeElement?.id).toBe('reset');
    key(file.popup, 'ArrowDown');
    expect(document.activeElement?.id).toBe('save'); // wraps
    key(file.popup, 'End');
    expect(document.activeElement?.id).toBe('reset');
    key(file.popup, 's');
    expect(document.activeElement?.id).toBe('save'); // type-ahead
    const onReset = vi.fn();
    document.getElementById('reset')!.addEventListener('click', onReset);
    key(file.popup, 'r');
    key(file.popup, 'Enter');
    expect(onReset).toHaveBeenCalledTimes(1);
    file.show('first');
    key(file.popup, 'ArrowRight');
    expect(file.open).toBe(false);
    expect(edit.open).toBe(true);
    expect(document.activeElement?.id).toBe('undo');
    key(edit.popup, 'Escape');
    expect(edit.open).toBe(false);
    expect(document.activeElement).toBe(edit.button);
    key(edit.button, 'ArrowLeft'); // closed: moves focus only
    expect(document.activeElement).toBe(file.button);
    expect(file.open).toBe(false);
    expect(bar.openMenu()).toBeNull();
  });

  it('closes on an outside pointerdown and when focus leaves', () => {
    const { bar, file } = mount();
    file.show('first');
    document
      .getElementById('outside')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(file.open).toBe(false);
    file.show('first');
    document.getElementById('outside')!.focus();
    bar.dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: document.getElementById('outside') }),
    );
    expect(file.open).toBe(false);
  });
});
