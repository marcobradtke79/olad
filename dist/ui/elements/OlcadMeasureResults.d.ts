import { Editor } from '../../core/Editor';
/**
 * `<olcad-measure-results>`: the measurements of `editor.measurements`, one row each with its
 * kind, name, values and a remove button, plus the measurement in progress and a Clear all
 * button. A click on a row's name zooms the map to it. Bind with `element.editor = editor`.
 * Renders into light DOM.
 */
export declare class OlcadMeasureResults extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private unbind;
    private render;
    private renderLive;
    private renderRow;
}
