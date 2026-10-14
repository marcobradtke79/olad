// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '../core/Editor';
import { bindKeyboard } from './keyboard';

function fakeEditor(active: string | null = null) {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    deleteSelection: vi.fn(),
    selection: { clear: vi.fn() },
    tools: {
      getActive: () => active,
      cancel: vi.fn(),
      finish: vi.fn(),
      removeLastPoint: vi.fn(() => false),
    },
  };
}

const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('bindKeyboard', () => {
  it('maps keys to editor actions and unbinds', () => {
    const editor = fakeEditor('draw');
    const unbind = bindKeyboard(editor as unknown as Editor);
    expect(press(document, 'Escape')).toBe(true);
    expect(editor.tools.cancel).toHaveBeenCalled();
    press(document, 'Enter');
    expect(editor.tools.finish).toHaveBeenCalled();
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalled();
    expect(editor.deleteSelection).not.toHaveBeenCalled();
    press(document, 'Delete');
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
    press(document, 'z', { ctrlKey: true });
    press(document, 'Z', { metaKey: true, shiftKey: true });
    press(document, 'y', { ctrlKey: true });
    expect(editor.undo).toHaveBeenCalledTimes(1);
    expect(editor.redo).toHaveBeenCalledTimes(2);
    expect(press(document, 'a')).toBe(false);
    expect(press(document, 's', { ctrlKey: true })).toBe(false);
    unbind();
    press(document, 'Escape');
    expect(editor.tools.cancel).toHaveBeenCalledTimes(1);
  });

  it('clears the selection with Escape when no tool is active', () => {
    const editor = fakeEditor(null);
    bindKeyboard(editor as unknown as Editor);
    expect(press(document, 'Escape')).toBe(true);
    expect(editor.selection.clear).toHaveBeenCalledTimes(1);
    expect(editor.tools.cancel).not.toHaveBeenCalled();
  });

  it('deletes the selection with Backspace outside drawing and ignores typing', () => {
    const editor = fakeEditor('select');
    bindKeyboard(editor as unknown as Editor);
    press(document, 'Backspace');
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
    const input = document.createElement('input');
    document.body.append(input);
    expect(press(input, 'Backspace')).toBe(false);
    expect(press(input, 'Escape')).toBe(false);
    const button = document.createElement('button');
    document.body.append(button);
    expect(press(button, 'Enter')).toBe(false); // the button keeps its click
    expect(editor.tools.finish).not.toHaveBeenCalled();
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
    expect(editor.tools.cancel).not.toHaveBeenCalled();
    expect(press(button, 'Escape')).toBe(true); // other keys still work on buttons
    expect(editor.tools.cancel).toHaveBeenCalledTimes(1);
    // An open dialog owns its keys (native Escape closes it, Enter submits).
    const dialog = document.createElement('dialog');
    const inside = document.createElement('div');
    dialog.append(inside);
    document.body.append(dialog);
    dialog.setAttribute('open', '');
    expect(press(inside, 'Escape')).toBe(false);
    expect(press(inside, 'Delete')).toBe(false);
    expect(editor.tools.cancel).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
  });
});

describe('Backspace in the move tool', () => {
  it('steps back instead of deleting the selection', () => {
    const editor = fakeEditor('move');
    bindKeyboard(editor as unknown as Editor);
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).not.toHaveBeenCalled();
  });
});

describe('Backspace in the circle tool', () => {
  it('drops the last point instead of deleting the selection', () => {
    const editor = fakeEditor('circle');
    bindKeyboard(editor as unknown as Editor);
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).not.toHaveBeenCalled();
  });
});

describe('Backspace in the regular polygon tool', () => {
  it('steps back instead of deleting the selection', () => {
    const editor = fakeEditor('regular-polygon');
    bindKeyboard(editor as unknown as Editor);
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).not.toHaveBeenCalled();
  });
});

describe('Backspace in the curve tool', () => {
  it('steps back instead of deleting the selection', () => {
    const editor = fakeEditor('curve');
    bindKeyboard(editor as unknown as Editor);
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).not.toHaveBeenCalled();
  });
});

describe('Backspace in the parallel, scale, offset, trim, extend and mirror tools', () => {
  it.each(['parallel', 'text', 'scale', 'offset', 'trim', 'extend', 'mirror', 'measure-distance'])(
    'steps back in %s instead of deleting',
    (tool) => {
      const editor = fakeEditor(tool);
      bindKeyboard(editor as unknown as Editor);
      press(document, 'Backspace');
      expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
      expect(editor.deleteSelection).not.toHaveBeenCalled();
    },
  );
});

describe('Delete and Backspace in the vertex tool', () => {
  it('removes the vertex under the pointer, else deletes the selection', () => {
    const editor = fakeEditor('modify');
    bindKeyboard(editor as unknown as Editor);
    editor.tools.removeLastPoint.mockReturnValueOnce(true);
    press(document, 'Delete');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(1);
    expect(editor.deleteSelection).not.toHaveBeenCalled();
    editor.tools.removeLastPoint.mockReturnValueOnce(false);
    press(document, 'Delete');
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
    press(document, 'Backspace');
    expect(editor.tools.removeLastPoint).toHaveBeenCalledTimes(3);
    expect(editor.deleteSelection).toHaveBeenCalledTimes(1);
  });
});
