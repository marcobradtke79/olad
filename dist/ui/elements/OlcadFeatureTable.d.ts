import { Editor } from '../../core/Editor';
/** The `<olcad-feature-table>` elements bound to `editor`, in binding order. */
export declare function featureTablesOf(editor: Editor): OlcadFeatureTable[];
/** Called when a table is bound, unbound, opened, switched or closed. Returns the unsubscriber. */
export declare function onFeatureTableChange(listener: () => void): () => void;
/**
 * `<olcad-feature-table>`: the objects of one layer as table rows (id, schema fields, text and
 * height for text layers, geometry type with length or area). `show(layerId)` / the `layer`
 * attribute opens it, `close()` hides it together with its enclosing `<olcad-panel>`. A row
 * click selects the object (Ctrl / Cmd toggles, Shift selects a range), a double click zooms
 * to it, a map selection marks its rows; headers sort, the filter narrows the rows. Rows of
 * inserted and updated objects carry `data-state`. Read-only: attributes are edited in the
 * attribute form. Bind with `element.editor = editor`; `<olcad-layer-list>` opens it through
 * its Table buttons. Renders into light DOM.
 */
export declare class OlcadFeatureTable extends HTMLElement {
    static get observedAttributes(): string[];
    private boundEditor;
    private unsubscribe;
    private changeSet;
    private sort;
    private filter;
    /** The row a Shift+click range starts from. */
    private anchor;
    /** Set while the table itself changes the selection, so it does not scroll. */
    private selecting;
    private built;
    private readonly title_;
    private readonly count;
    private readonly filterInput;
    private readonly closeButton;
    private readonly body;
    /** Id of the layer shown, or `null` when closed. */
    get layer(): string | null;
    set layer(id: string | null);
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    /** Show the objects of `layerId`. */
    show(layerId: string): void;
    /** Hide the table and its panel. */
    close(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private unbind;
    /** Header (title, count, filter, close) once; only the table body is rebuilt. */
    private build;
    private setHidden;
    private render;
    private columns;
    private visibleRows;
    /** Feature id → net change state of this layer's objects. */
    private rowStates;
    private cycleSort;
    private select;
    private zoomTo;
    private scrollToSelection;
}
