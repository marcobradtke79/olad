import { Editor } from '../../core/Editor';
/**
 * `<olcad-template-list>`: the named templates of `editor.templates`. A **Copy to template**
 * button starts the copy tool; each row shows the name, the object count and icon buttons to
 * insert copies (starts the `template-insert` tool, pressed while it runs), rename the template
 * in place and remove it. Bind with `element.editor = editor`. Renders into light DOM.
 */
export declare class OlcadTemplateList extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    /** The template whose name is being edited. */
    private renaming;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private unbind;
    private render;
    private renderRow;
    /** Inline name editing: Enter or leaving the field saves, Escape cancels. */
    private renameInput;
}
