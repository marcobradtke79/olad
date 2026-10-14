import { Editor } from '../../core/Editor';
import { OlcadPanel, DockPosition } from './OlcadPanel';
/**
 * `<olcad-straightedge>`: toolbox for the parallel straightedge (the rotated crosshair shown
 * in edit mode). A number input sets the x-axis angle in degrees, "Reset" returns to 0°, and
 * "Pick reference" starts a reference pick: the pick box turns yellow and the next click on
 * a geometry aligns the straightedge with the nearest segment. Escape cancels the pick.
 * Bind with `element.editor = editor`.
 */
export declare class OlcadStraightedge extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private readonly input;
    private readonly resetButton;
    private readonly pickButton;
    private readonly hint;
    private controlsBuilt;
    protected get defaultDock(): DockPosition;
    protected get defaultHeading(): string;
    protected get defaultCompact(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private buildControls;
    private applyInput;
    private render;
    private onKeyDown;
    private unbind;
}
