// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../../core/Editor';
import { Emitter } from '../../core/events';
import { defineElements, type OlcadProjectionSelect } from '../index';
import { projectionOptions } from './OlcadProjectionSelect';

beforeAll(() => defineElements());
beforeEach(() => {
  document.body.replaceChildren();
});

function fakeEditor(viewProjection = 'EPSG:3857') {
  const emitter = new Emitter<EditorEvents>();
  let current = viewProjection;
  const editor = {
    config: {
      view: { projection: viewProjection },
      projections: [
        { code: 'EPSG:25832', def: '+proj=utm', title: 'UTM 32N' },
        { code: 'EPSG:31467', def: '+proj=tmerc' },
      ],
    },
    getProjection: () => current,
    setProjection: vi.fn((code: string) => {
      const from = current;
      current = code;
      emitter.emit('projectionchange', { from, to: code });
    }),
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy: () => emitter.emit('destroy', undefined),
  } as unknown as Editor;
  return editor;
}

describe('projectionOptions', () => {
  it('lists the view projection, the built-ins and the configured codes once each', () => {
    expect(projectionOptions(fakeEditor())).toEqual([
      { code: 'EPSG:3857', label: 'EPSG:3857 (Web Mercator)' },
      { code: 'EPSG:4326', label: 'EPSG:4326 (WGS 84)' },
      { code: 'EPSG:25832', label: 'EPSG:25832 (UTM 32N)' },
      { code: 'EPSG:31467', label: 'EPSG:31467' },
    ]);
    expect(projectionOptions(fakeEditor('EPSG:25832'))[0]).toEqual({
      code: 'EPSG:25832',
      label: 'EPSG:25832 (UTM 32N)',
    });
  });
});

describe('<olcad-projection-select>', () => {
  it('switches the projection and follows projectionchange', () => {
    document.body.innerHTML = '<olcad-projection-select></olcad-projection-select>';
    const el = document.querySelector<OlcadProjectionSelect>('olcad-projection-select')!;
    const select = el.querySelector<HTMLSelectElement>('select')!;
    expect(select.disabled).toBe(true);
    const editor = fakeEditor();
    el.editor = editor;
    expect(select.disabled).toBe(false);
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'EPSG:3857',
      'EPSG:4326',
      'EPSG:25832',
      'EPSG:31467',
    ]);
    expect(select.value).toBe('EPSG:3857');
    select.value = 'EPSG:25832';
    select.dispatchEvent(new Event('change'));
    expect(editor.setProjection).toHaveBeenCalledWith('EPSG:25832');
    expect(select.value).toBe('EPSG:25832');
    editor.setProjection('EPSG:4326'); // through the API
    expect(select.value).toBe('EPSG:4326');
    editor.destroy();
    expect(el.editor).toBeNull();
    expect(select.disabled).toBe(true);
  });
});
