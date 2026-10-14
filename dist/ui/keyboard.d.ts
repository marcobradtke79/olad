import { Editor } from '../core/Editor';
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
export declare function bindKeyboard(editor: Editor, target?: EventTarget): () => void;
