import { Editor } from '../../core/Editor';
/**
 * `<olcad-unit-select>`: a select for the default length unit (`editor.units.setLength`):
 * `Auto` (the view projection's unit, shown in brackets) or a fixed unit. Lengths typed without
 * a unit are in it; lengths and areas are shown in its system. Bind with `element.editor = editor`.
 */
export declare class OlcadUnitSelect extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    private readonly select;
    private built;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private render;
    private unbind;
}
