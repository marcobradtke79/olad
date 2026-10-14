import { Editor } from '../../core/Editor';
/**
 * `<olcad-layer-style-dialog>`: a modal dialog for the look of the layers. Left the layers in
 * drawing order (top of the list = drawn on top), reordered by drag and drop or the Up / Down
 * buttons (`editor.layers.moveLayer`); right the style of the selected layer — stroke, fill,
 * points, label, text colours, opacity, zoom range — applied live with
 * `editor.layers.setStyle`. Reset layer and Reset all return to the configured styles and
 * order. `open(layerId?)` shows it. Bind with `element.editor = editor`.
 */
export declare class OlcadLayerStyleDialog extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    private dialog;
    private selected;
    /** Set while the dialog itself applies a style, so the form is not rebuilt under the pointer. */
    private applying;
    private dragged;
    private readonly list;
    private readonly form;
    private readonly error;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    get isOpen(): boolean;
    connectedCallback(): void;
    /** Show the dialog, with `layerId` (else the first layer on top) selected. */
    open(layerId?: string): void;
    close(): void;
    private build;
    private render;
    private renderList;
    /** One step up (+1, drawn higher) or down (-1) in the drawing order. */
    private move;
    /** Drop `id` onto `target` in the list: drawn right above it. */
    private dropAbove;
    private renderForm;
    /** Read the form and apply it to layer `id`. */
    private apply;
}
