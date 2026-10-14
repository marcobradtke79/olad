import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
export type MirrorStep = 'select' | 'first' | 'second' | 'copy';
/** Prompt shown by the input bar for each step. */
export declare const MIRROR_PROMPTS: Record<MirrorStep, string>;
/**
 * CAD-style mirror: select the objects (skipped when a selection exists; read-only objects may
 * be selected), click or type the two points of the mirror line, then answer `Create a copy?
 * [y/N]`. Enter (or `n`, or a click) mirrors the objects the user may update in place, one
 * command; `y` inserts mirrored copies (one composite, each into its source layer, else the
 * active or draft layer) with the copied attributes, so the attribute popup opens for them.
 * A dashed preview shows the mirrored objects and the line. Afterwards the selection is cleared
 * and the tool asks for the next objects; Escape steps back.
 */
export declare class MirrorTool extends BaseTool {
    readonly id = "mirror";
    private step;
    private first;
    private second;
    /** Shown in front of the next prompt after an operation that skipped objects or failed. */
    private notice;
    private selectInteractions;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(): boolean;
    /** The copy question expects y or n typed. */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter: continue from the selection, or answer "no" to the copy question. */
    finish(): void;
    /** Escape steps back: copy → second → first → select (clearing the selection). */
    cancel(): void;
    removeLastPoint(): boolean;
    handleInput(coordinate: number[]): boolean;
    /** The answer to the copy question: y / yes / j / ja or n / no / nein. */
    handleText(text: string): boolean;
    /** Relative input for the second point is measured from the first. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    /** The selected objects with a geometry. */
    private objects;
    private takePoint;
    private apply;
    private onPointerMove;
    /** Mirrored ghosts and the mirror line, extended across the objects. */
    private updatePreview;
    private onSelectionChange;
    private applyActivity;
    private goTo;
}
