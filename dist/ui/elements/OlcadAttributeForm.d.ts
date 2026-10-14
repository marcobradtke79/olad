import { FieldConfig } from '../../core/config/types';
import { Editor } from '../../core/Editor';
/**
 * `<olcad-attribute-form>`: a form generated from the layer schema for the single selected
 * feature. Apply submits the changed values as one `updateProperties` command; Reset re-reads
 * the feature. Read-only fields, layers without `update` and edit mode off disable the inputs.
 * With the `popup` attribute the form lives in a modal dialog that opens whenever a command
 * inserts a feature (`featureinsert`) into a layer that has attributes. Several inserts (a
 * mirrored or split group) are shown one after another ("1 of 3"): Save or Later moves on to
 * the next, Escape closes the dialog for all of them.
 * Bind with `element.editor = editor`.
 */
export declare class OlcadAttributeForm extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    private subject;
    private error;
    /** Popup mode: the inserted features still to show; the dialog shows the first. */
    private popupQueue;
    /** Popup mode: how many features the current batch had, for the "1 of 3" progress. */
    private popupTotal;
    private dialog;
    get popup(): boolean;
    /**
     * `reveal`: a single selection outside edit mode, or a move of draft objects into a layer
     * (`draftmove`), opens the flyout panel the form sits in.
     */
    get reveal(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private unbind;
    /** Open the enclosing `<olcad-panel flyout>`, if any. Never closes it. */
    private revealPanel;
    /**
     * The feature's layer and schema, or `null` when the selection is not exactly one feature.
     * In popup mode the subject is the feature the dialog was opened for.
     */
    private currentSubject;
    /** Popup mode: done with the shown feature; show the next one or close the dialog. */
    closePopup(): void;
    /** Popup mode: close the dialog and forget every feature still waiting. */
    closeAll(): void;
    /**
     * Re-render. Unless `force` is set, a form the user is typing in is kept so an external
     * change (another user action, an undo) does not wipe the draft.
     */
    private render;
    private ensureDialog;
    private renderInto;
    /** Popup mode: done with this feature (it keeps its attributes); shows the next or closes. */
    private laterButton;
    private renderField;
    private apply;
}
/** The input or select for a field, pre-filled with `value`. */
export declare function createControl(field: FieldConfig, value: unknown): HTMLInputElement | HTMLSelectElement;
/** The typed value of a control; empty inputs yield `undefined` (the property is removed). */
export declare function readControl(field: FieldConfig, control: HTMLInputElement | HTMLSelectElement): unknown;
