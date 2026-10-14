import { LAYOUT_CHANGE_EVENT, type OlcadDock } from './elements/OlcadDock';
import type { OlcadMenu } from './elements/OlcadMenubar';

/**
 * Fill `menu` (for example the host's View menu) with items that show and hide the toolbars
 * and panels of `dock`: Show all, Hide all and one checkbox per named panel that can be
 * toggled, labelled with its heading. The items follow layout changes. Returns a function
 * that removes them again.
 */
export function bindPanelMenu(menu: OlcadMenu, dock: OlcadDock): () => void {
  const doc = menu.ownerDocument;
  const items: HTMLElement[] = [];
  const boxes = new Map<string, HTMLInputElement>();

  const action = (text: string, name: string, visible: boolean) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.panelAction = name;
    button.textContent = text;
    button.addEventListener('click', () => dock.setAllPanelsVisible(visible));
    return button;
  };

  const build = () => {
    for (const item of items) item.remove();
    items.length = 0;
    boxes.clear();
    items.push(
      doc.createElement('hr'),
      action('Show all toolbars and panels', 'show-all', true),
      action('Hide all toolbars and panels', 'hide-all', false),
    );
    const panels = dock.listPanels();
    const count = new Map<string, number>();
    for (const { heading } of panels) count.set(heading, (count.get(heading) ?? 0) + 1);
    for (const panel of panels) {
      // Two items with one heading (a Measure toolbar and a Measure panel) say which is which.
      let text = panel.heading;
      if (count.get(text)! > 1) {
        const element = Array.from(dock.querySelectorAll('[name]')).find(
          (el) => el.getAttribute('name') === panel.name,
        );
        text += element?.localName === 'olcad-toolbar' ? ' (toolbar)' : ' (panel)';
      }
      const label = doc.createElement('label');
      const box = doc.createElement('input');
      box.type = 'checkbox';
      box.dataset.panel = panel.name;
      box.checked = !panel.hidden;
      box.addEventListener('change', () => dock.setPanelVisible(panel.name, box.checked));
      boxes.set(panel.name, box);
      label.append(box, ` ${text}`);
      items.push(label);
    }
    // Before the menu is upgraded its children are still its own; it adopts them on build.
    (menu.popup ?? menu).append(...items);
    menu.refresh?.();
  };

  /** Follow a layout change: update the checkboxes in place, rebuild when panels came or went. */
  const update = () => {
    const panels = dock.listPanels();
    const same = panels.length === boxes.size && panels.every((panel) => boxes.has(panel.name));
    if (!same) {
      build();
      return;
    }
    for (const panel of panels) boxes.get(panel.name)!.checked = !panel.hidden;
    menu.refresh?.();
  };

  build();
  dock.addEventListener(LAYOUT_CHANGE_EVENT, update);
  return () => {
    dock.removeEventListener(LAYOUT_CHANGE_EVENT, update);
    for (const item of items) item.remove();
    items.length = 0;
    boxes.clear();
  };
}
