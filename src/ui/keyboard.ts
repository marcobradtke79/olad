import type { Editor } from '../core/Editor';

/** Tools whose Backspace drops the last point or steps back instead of deleting the selection. */
const STEPPING_TOOLS = [
  'draw',
  'rectangle',
  'circle',
  'ellipse',
  'regular-polygon',
  'curve',
  'parallel',
  'text',
  'dimension-linear',
  'move',
  'modify',
  'rotate',
  'scale',
  'offset',
  'trim',
  'extend',
  'mirror',
  'template-copy',
  'template-insert',
  'measure-distance',
  'measure-area',
  'measure-angle',
];

/**
 * Keyboard shortcuts for the editor, bound on `target` (default: `document`):
 * Escape cancels the active tool (or clears the selection when no tool is active), Enter
 * finishes a drawing, Backspace removes the last vertex while drawing or steps back in the
 * rectangle, circle, ellipse, regular polygon, curve, parallel, text, measure, move, rotate, scale, offset, mirror, trim, extend, template and vertex tools (otherwise deletes the
 * selection), Delete removes the vertex under the pointer in the vertex tool and otherwise deletes the selection, Ctrl / Cmd+Z undoes,
 * Shift+Ctrl / Cmd+Z or Ctrl / Cmd+Y redoes. Keys typed into inputs and editable elements and
 * keys inside an open `<dialog>` (which owns Escape and Enter) are ignored. Returns a function
 * that unbinds. `<olcad-toolbar>` installs this automatically.
 */
export function bindKeyboard(editor: Editor, target: EventTarget = document): () => void {
  const onKeyDown = (event: Event): void => {
    const key = event as KeyboardEvent;
    if (isTyping(key.target) || inDialog(key.target)) return;
    const modifier = key.ctrlKey || key.metaKey;
    let handled = true;
    if (modifier && key.key.toLowerCase() === 'z') {
      if (key.shiftKey) editor.redo();
      else editor.undo();
    } else if (modifier && key.key.toLowerCase() === 'y') {
      editor.redo();
    } else if (modifier) {
      handled = false;
    } else if (key.key === 'Escape') {
      if (editor.tools.getActive() === null) editor.selection.clear();
      else editor.tools.cancel();
    } else if (key.key === 'Enter') {
      // Enter on a focused button or link must keep activating it.
      if (isInteractive(key.target)) return;
      editor.tools.finish();
    } else if (key.key === 'Backspace') {
      const active = editor.tools.getActive();
      if (active && STEPPING_TOOLS.includes(active)) {
        editor.tools.removeLastPoint();
      } else {
        editor.deleteSelection();
      }
    } else if (key.key === 'Delete') {
      // In the vertex tool Delete removes the vertex under the pointer; otherwise the selection.
      const vertexRemoved = editor.tools.getActive() === 'modify' && editor.tools.removeLastPoint();
      if (!vertexRemoved) editor.deleteSelection();
    } else {
      handled = false;
    }
    if (handled) key.preventDefault();
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || target.hasAttribute('role');
}

function inDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('dialog[open]') !== null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
