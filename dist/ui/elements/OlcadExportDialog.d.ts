import { Editor } from '../../core/Editor';
/** Fired on the element after a file was exported; `detail` is the `ExportResult`. */
export declare const EXPORT_EVENT = "olcad-export";
/**
 * `<olcad-export-dialog>`: a modal dialog that asks which layers to export, the format
 * (GeoJSON, KML, GML 3.2, GPX) and, for GeoJSON and GML, the CRS; Export writes one file with
 * `editor.exportLayers` and downloads it, then fires `olcad-export`. `open()` shows it, for
 * example from a host's File menu. Bind with `element.editor = editor`.
 */
export declare class OlcadExportDialog extends HTMLElement {
    private boundEditor;
    private offDestroy;
    private dialog;
    /** Format and CRS chosen last; kept between openings. */
    private format;
    private projection;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    get isOpen(): boolean;
    connectedCallback(): void;
    /** Show the dialog with the current layers. */
    open(): void;
    close(): void;
    private render;
}
