import { Editor } from '../../core/Editor';
/**
 * `<olcad-layer-editor>`: a modal dialog that creates a local layer (`editor.localLayers`) or
 * edits one: name, geometry type (fixed once created) and attributes (name, type, label,
 * required, enum values, default). For an existing layer it also deletes it, after a second
 * click. `open()` starts a new layer, `open(layerId)` edits a local layer. `<olcad-layer-list>`
 * creates one for its New layer and Layer settings buttons. Bind with `element.editor = editor`.
 */
export declare class OlcadLayerEditor extends HTMLElement {
    private boundEditor;
    private offDestroy;
    private dialog;
    /** Id of the edited layer, `null` while creating one. */
    private layerId;
    private confirmingDelete;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    /** Whether the dialog is open. */
    get isOpen(): boolean;
    connectedCallback(): void;
    /** Open the dialog for a new layer, or for the local layer `layerId`. */
    open(layerId?: string | null): void;
    close(): void;
    private ensureDialog;
    private render;
}
