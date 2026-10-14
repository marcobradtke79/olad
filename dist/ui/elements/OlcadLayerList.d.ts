import { Editor } from '../../core/Editor';
/**
 * `<olcad-layer-list>`: basemaps as a radio group and one row per vector layer with its name
 * and icon buttons: visibility, highlight (`editor.layers.setHighlighted`), table (opens the layer
 * in the `<olcad-feature-table>` bound to the same editor, or closes it), edit (switches edit
 * mode on and makes the layer the active one; no tool is started), move (while draft objects
 * are selected, on the rows of the layers that take them: `editor.layers.moveDrafts`), settings
 * (local layers only: name, attributes, delete in `<olcad-layer-editor>`) and info (details
 * below the row). A New layer button above the layers creates a local layer
 * (`editor.localLayers`) in the same dialog. With the `reveal` attribute, selecting draft objects opens the
 * flyout panel the list sits in. Bind with `element.editor = editor`. Renders into light DOM
 * so the theme and host styles apply.
 */
export declare class OlcadLayerList extends HTMLElement {
    private boundEditor;
    private unsubscribe;
    /** Layers whose details are open; kept across re-renders. */
    private readonly expanded;
    /** The dialog for New layer and Layer settings, created on first use; survives re-renders. */
    private layerEditor;
    /** `reveal`: a selection holding draft objects opens the flyout panel the list sits in. */
    get reveal(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private unbind;
    /** Open the enclosing `<olcad-panel flyout>`, if any. Never closes it. */
    private revealPanel;
    private render;
    private heading;
    private renderBasemaps;
    private renderLayers;
    private renderLayer;
    private openLayerEditor;
    private sectionId;
}
