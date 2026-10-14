// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  bindPanelMenu,
  defineElements,
  type OlcadDock,
  type OlcadMenu,
  type OlcadPanel,
} from './index';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function mount() {
  document.body.innerHTML = `
    <olcad-menubar>
      <olcad-menu label="View"><button type="button" id="reset">Reset layout</button></olcad-menu>
    </olcad-menubar>
    <olcad-dock>
      <olcad-toolbar name="main" heading="Main"></olcad-toolbar>
      <olcad-toolbar name="draw" heading="Draw"></olcad-toolbar>
      <olcad-panel name="layers" heading="Layers" dock="right"></olcad-panel>
      <div id="map"></div>
    </olcad-dock>`;
  const menu = document.querySelector<OlcadMenu>('olcad-menu')!;
  const dock = document.querySelector<OlcadDock>('olcad-dock')!;
  return { menu, dock, unbind: bindPanelMenu(menu, dock) };
}

const box = (menu: OlcadMenu, name: string) =>
  menu.querySelector<HTMLInputElement>(`input[data-panel="${name}"]`)!;
const panel = (name: string) => document.querySelector<OlcadPanel>(`[name="${name}"]`)!;

describe('bindPanelMenu', () => {
  it('adds show all, hide all and a checkbox per panel as menu items', () => {
    const { menu } = mount();
    const items = Array.from(menu.popup.children, (el) => [
      el.getAttribute('role'),
      el.textContent!.trim(),
    ]);
    expect(items).toEqual([
      ['menuitem', 'Reset layout'],
      ['separator', ''],
      ['menuitem', 'Show all toolbars and panels'],
      ['menuitem', 'Hide all toolbars and panels'],
      ['menuitemcheckbox', 'Main'],
      ['menuitemcheckbox', 'Draw'],
      ['menuitemcheckbox', 'Layers'],
    ]);
    expect(box(menu, 'draw').closest('label')!.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles single panels and all of them', () => {
    const { menu } = mount();
    const draw = box(menu, 'draw');
    draw.checked = false;
    draw.dispatchEvent(new Event('change', { bubbles: true }));
    expect(panel('draw').hidden).toBe(true);
    expect(box(menu, 'draw')).toBe(draw); // updated in place, focus survives
    expect(draw.closest('label')!.getAttribute('aria-checked')).toBe('false');
    menu.querySelector<HTMLButtonElement>('[data-panel-action="hide-all"]')!.click();
    expect(['main', 'draw', 'layers'].every((n) => panel(n).hidden)).toBe(true);
    expect(box(menu, 'main').checked).toBe(false);
    menu.querySelector<HTMLButtonElement>('[data-panel-action="show-all"]')!.click();
    expect(['main', 'draw', 'layers'].some((n) => panel(n).hidden)).toBe(false);
    expect(box(menu, 'layers').checked).toBe(true);
  });

  it('follows layout changes from elsewhere and removes its items on unbind', () => {
    const { menu, dock, unbind } = mount();
    dock.setPanelVisible('layers', false);
    expect(box(menu, 'layers').checked).toBe(false);
    unbind();
    expect(menu.querySelectorAll('input[data-panel]')).toHaveLength(0);
    expect(menu.popup.children).toHaveLength(1);
  });
});
