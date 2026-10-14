import { Editor } from '../../core/Editor';
import { OlcadPanel, DockPosition } from './OlcadPanel';
/** Step presets offered as buttons, in degrees. */
export declare const ANGLE_PRESETS: readonly number[];
/**
 * `<olcad-angle-lock>`: toolbox for the angle lock (`editor.constraints`). One click on
 * **Lock angle** turns it on or off; the preset buttons and the step input choose the angle
 * step. Directions are counted from the straightedge angle. Bind with `element.editor = editor`.
 */
export declare class OlcadAngleLock extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private readonly toggle;
    private readonly presets;
    private readonly step;
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
