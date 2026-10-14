import { Editor } from '../../core/Editor';
/** Fired on the element after an import; `detail` is the `ImportResult`. */
export declare const IMPORT_EVENT = "olcad-import";
/**
 * `<olcad-import-dialog>`: a modal dialog that reads a GeoJSON, TopoJSON, KML, GML or GPX file
 * (file input or drop), lists its groups (one geometry type each) and lets the user send each
 * to a new local layer, an existing layer that takes it, or nowhere; Import runs
 * `editor.import.apply` as one undo step and fires `olcad-import`. `open()` shows it, for
 * example from a host's File menu. Bind with `element.editor = editor`.
 */
export declare class OlcadImportDialog extends HTMLElement {
    private boundEditor;
    private offDestroy;
    private dialog;
    private preview;
    private filename;
    private error;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    get isOpen(): boolean;
    connectedCallback(): void;
    /** Show the dialog, empty, ready for a file. */
    open(): void;
    close(): void;
    /** Read a file (from the input or a drop) and show its groups. */
    load(file: File): Promise<void>;
    /** Show the groups of a file's text; errors are shown in the dialog. */
    loadText(text: string, filename: string): void;
    private render;
}
