import { Editor } from '../../core/Editor';
import { OlcadPanel, DockPosition } from './OlcadPanel';
export type InputBarMessageKind = 'prompt' | 'info' | 'error';
/**
 * `<olcad-input-bar>`: the command line. An output line shows the active tool's prompt (its own
 * `getPrompt` per step, else a default per tool), the
 * result of typed input, validation errors and other editor messages; the text input takes
 * numeric input (`editor.input`). Enter with an empty input finishes the drawing, Escape
 * cancels it. Bind with `element.editor = editor`.
 */
export declare class OlcadInputBar extends OlcadPanel {
    private boundEditor;
    private unsubscribe;
    private readonly output;
    private readonly input;
    private controlsBuilt;
    /** What the active tool's step expects typed, as last applied. */
    private awaiting;
    protected get defaultDock(): DockPosition;
    protected get defaultHeading(): string;
    protected get defaultCompact(): boolean;
    get editor(): Editor | null;
    set editor(editor: Editor | null);
    /** The current output text. */
    get message(): string;
    /** Show a message in the output line. */
    show(text: string, kind?: InputBarMessageKind): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private buildControls;
    private render;
    private showPrompt;
    /**
     * A step that expects typing (`editor.tools.getInputRequest()`) focuses the input, selects
     * what is in it and highlights the bar; when such a step ends, the input gives the focus back
     * so the map's keyboard shortcuts work again. The focus is not taken while a modal dialog is
     * open or another text field outside the bar is being typed in.
     */
    private applyInputRequest;
    private showResult;
    private unbind;
}
