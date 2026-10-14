import { Editor } from '../../core/Editor';
/** The codes offered for `editor`: the initial view projection, the built-ins and `projections[]`. */
export declare function projectionOptions(editor: Editor): {
    code: string;
    label: string;
}[];
/**
 * `<olcad-projection-select>`: a select that switches the view projection
 * (`editor.setProjection`) between the configured projections. Bind with
 * `element.editor = editor`.
 */
export declare class OlcadProjectionSelect extends HTMLElement {
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
