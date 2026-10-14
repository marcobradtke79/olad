import { Editor } from '../../core/Editor';
import { OlcadPanel, DockPosition } from './OlcadPanel';
/**
 * `<olcad-snap-settings>`: toolbox for snapping. One click on **Snap** turns it on or off, the
 * radius input sets the snap distance in pixels, the checkboxes choose the snap modes.
 * Bind with `element.editor = editor`.
 */
export declare class OlcadSnapSettings extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private readonly toggle;
    private readonly tolerance;
    private readonly modeInputs;
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
