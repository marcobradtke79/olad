import { Editor } from '../../core/Editor';
import { ToolOptions } from '../../core/tools';
import { IconName } from '../icons';
import { OlcadPanel, DockPosition } from './OlcadPanel';
/** One construction variant offered by a flyout button. */
export interface ToolVariant {
    /** Variant id, written to `data-variant` on the button and the menu item. */
    id: string;
    /** Accessible name while the variant is shown on the button, and the menu item's text. */
    label: string;
    /** Tooltip text. */
    title: string;
    icon: IconName;
    /** Options passed to `editor.tools.activate` for this variant. */
    options: ToolOptions;
}
export interface ToolButton {
    /** Accessible name. */
    label: string;
    /** Tooltip text. */
    title: string;
    icon: IconName;
    /** The tool the button activates; defaults to the button id. */
    tool?: string;
    /** Options passed to `editor.tools.activate`; the button is pressed while they are in effect. */
    options?: ToolOptions;
    /**
     * Construction variants behind a flyout (a triangle in the button's corner opens it). The
     * button shows the variant chosen last (the first one by default) and activates it on click.
     */
    variants?: ToolVariant[];
}
/** How long the pointer must rest on a flyout button to open its flyout. */
export declare const LONG_PRESS_MS = 400;
/**
 * Tool buttons the toolbar can show, in order. `delete` and `measure-clear` are actions, the
 * others activate tools.
 * The three draw buttons share the `draw` tool and differ in the geometry type; the circle
 * and ellipse buttons are flyouts whose variants share one tool and differ in the method.
 */
export declare const TOOL_BUTTONS: Record<string, ToolButton>;
/** Button ids for the `tools` attribute; `draw` stands for the three draw buttons. */
export declare function toolButtonIds(tools: string | null): string[];
/** The fixed controls a toolbar can show before its tool buttons. */
export type ToolbarControl = 'edit' | 'layer' | 'history';
/**
 * Controls for the `controls` attribute, in their fixed order: `edit` (the edit-mode toggle),
 * `layer` (the active-layer status), `history` (Undo / Redo). All three without the attribute,
 * none for `controls=""`; unknown names are dropped.
 */
export declare function toolbarControls(controls: string | null): ToolbarControl[];
/** Whether a button's options are in effect: every key it sets matches the active options. */
export declare function optionsMatch(button: ToolOptions | undefined, active: ToolOptions): boolean;
/**
 * `<olcad-toolbar>`: a toolbar. A dockable panel (see `OlcadPanel`) whose content is a
 * `role="toolbar"` named by the `heading` with the fixed controls (attribute `controls`: the
 * edit-mode toggle, the active layer, undo / redo; default all, `controls=""` none), the tool
 * buttons (attribute `tools`, default all) and any child elements the host puts inside, so a
 * page can split the buttons over several toolbars (main, draw, modify). Buttons are icons with
 * tooltips; a button with variants is a flyout button. Binds the keyboard shortcuts on
 * `document` unless the `no-keyboard` attribute is set, once per editor however many toolbars
 * share it. Bind with `element.editor = editor`. Docked at the top by default, compact.
 */
export declare class OlcadToolbar extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private unbindKeyboard;
    private readonly editToggle;
    private readonly activeLayer;
    private readonly undoButton;
    private readonly redoButton;
    private readonly toolButtons;
    private readonly flyouts;
    private openFlyoutId;
    /** The content is built once; the dock reconnects the element when it moves it. */
    private rendered;
    protected get defaultDock(): DockPosition;
    protected get defaultHeading(): string;
    protected get defaultCompact(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    connectedCallback(): void;
    /** The variant a flyout button currently shows, or `undefined` for a plain button. */
    currentVariant(id: string): ToolVariant | undefined;
    /** Whether the flyout of a button is open. */
    isFlyoutOpen(id: string): boolean;
    /** The options a button activates its tool with: its variant's, else its own. */
    private buttonOptions;
    private onToolClick;
    /**
     * Whether the button's tool is active with the button's options in effect. A flyout button
     * is pressed whichever of its variants is active.
     */
    private isPressed;
    private renderTools;
    /** Show the variant whose options are in effect, so a tool started elsewhere is mirrored. */
    private mirrorVariant;
    private createFlyout;
    private setVariant;
    private chooseVariant;
    private showFlyout;
    private hideFlyout;
    private onDocumentPointerDown;
    private onFlyoutKeyDown;
    private renderHistory;
    protected applyPlacement(): void;
    disconnectedCallback(): void;
    private unbind;
    private renderEditMode;
    private renderActiveLayer;
    /** Roving focus with arrow keys, as recommended for `role="toolbar"`. */
    private onToolbarKeyDown;
}
