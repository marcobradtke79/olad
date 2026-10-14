import { Editor } from '../../core/Editor';
import { OlcadPanel, DockPosition } from './OlcadPanel';
/** Short unit label for the view projection's units. */
export declare function unitLabel(units: string | undefined): string;
/**
 * `<olcad-grid-settings>`: toolbox for grid snap (`editor.grid`). One click on **Grid snap** turns
 * it on or off, the spacing input sets the grid distance in view-projection units, **Show** draws
 * the grid as dots. Bind with `element.editor = editor`.
 */
export declare class OlcadGridSettings extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private readonly toggle;
    private readonly spacing;
    private readonly unit;
    private readonly show;
    private controlsBuilt;
    protected get defaultDock(): DockPosition;
    protected get defaultHeading(): string;
    protected get defaultCompact(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private buildControls;
    private render;
    private unbind;
}
