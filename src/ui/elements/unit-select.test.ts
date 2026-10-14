// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import type { LengthUnit } from '../../core/units';
import { defineElements, type OlcadUnitSelect } from '../index';

beforeAll(() => defineElements());
beforeEach(() => document.body.replaceChildren());

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  let setting: 'auto' | LengthUnit = 'auto';
  return {
    getProjection: () => 'EPSG:3857',
    units: {
      getLengthSetting: () => setting,
      setLength(next: 'auto' | LengthUnit) {
        setting = next;
        emitter.emit('unitschange', { length: next === 'auto' ? 'm' : next, setting: next });
      },
    },
    on: emitter.on.bind(emitter),
  } as unknown as Editor;
}

describe('<olcad-unit-select>', () => {
  it('offers Auto with the CRS unit and every unit, and sets the default unit', () => {
    const editor = fakeEditor();
    document.body.innerHTML = '<olcad-unit-select></olcad-unit-select>';
    const el = document.querySelector<OlcadUnitSelect>('olcad-unit-select')!;
    el.editor = editor;
    const select = el.querySelector('select')!;
    expect(select.getAttribute('aria-label')).toBe('Length unit');
    expect(select.options[0]!.text).toBe('Auto (m)');
    expect(Array.from(select.options, (o) => o.value)).toEqual([
      'auto',
      'm',
      'km',
      'cm',
      'mm',
      'ft',
      'us-ft',
      'in',
      'yd',
      'mi',
      'nmi',
    ]);
    expect(select.value).toBe('auto');
    select.value = 'ft';
    select.dispatchEvent(new Event('change'));
    expect(editor.units.getLengthSetting()).toBe('ft');
    editor.units.setLength('yd');
    expect(select.value).toBe('yd');
  });
});
