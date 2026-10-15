// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import {
  defineElements,
  type OlcadAttributeForm,
  type OlcadLayerList,
  type OlcadPanel,
  type OlcadToolbar,
} from '../index';

beforeAll(() => {
  defineElements();
});

/**
 * React 19 and Vue set a template attribute as a property when the element has one, before the
 * element is connected. Each such property must accept the value and reflect it.
 */
describe('attribute properties', () => {
  it('reflects name on panels and toolbars', () => {
    for (const tag of ['olcad-panel', 'olcad-toolbar'] as const) {
      const el = document.createElement(tag) as OlcadPanel | OlcadToolbar;
      el.name = 'main';
      expect(el.getAttribute('name')).toBe('main');
      expect(el.name).toBe('main');
      document.body.append(el);
      expect(el.name).toBe('main');
      el.remove();
    }
  });

  it('reflects reveal and popup as boolean attributes', () => {
    const list = document.createElement('olcad-layer-list') as OlcadLayerList;
    list.reveal = true;
    expect(list.hasAttribute('reveal')).toBe(true);
    list.reveal = false;
    expect(list.hasAttribute('reveal')).toBe(false);

    const form = document.createElement('olcad-attribute-form') as OlcadAttributeForm;
    form.popup = true;
    form.reveal = true;
    expect(form.hasAttribute('popup')).toBe(true);
    expect(form.reveal).toBe(true);
    form.popup = false;
    expect(form.popup).toBe(false);
  });
});
