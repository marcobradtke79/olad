import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
export type ScaleStep = 'select' | 'base' | 'factor' | 'target';
/** Prompt shown by the input bar for each step. */
export declare const SCALE_PROMPTS: Record<ScaleStep, string>;
/**
 * CAD-style scale: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter confirms;
 * skipped when a selection exists), pick the base point, then either type a factor or pick a
 * reference point and a target point; the factor is then the ratio of the distances base →
 * target and base → reference. Every selected feature that may be updated is scaled uniformly
 * around the base point, as one command. A dashed preview of the scaled objects and both legs
 * follows the pointer. Afterwards the objects are deselected and the tool asks for the next
 * ones; Escape steps back.
 */
export declare class ScaleTool extends BaseTool {
    readonly id = "scale";
    private step;
    private base;
    private reference;
    /** Shown in front of the prompt after a factor that could not be applied. */
    private notice;
    private editable;
    private selectInteractions;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(): boolean;
    /** The factor step expects a factor typed (a click picks a reference point instead). */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter: a confirmed selection leads to the base point. */
    finish(): void;
    /** Escape steps back; in the base and selection steps it clears the selection. */
    cancel(): void;
    /** Backspace drops the base or the reference point. */
    removeLastPoint(): boolean;
    /**
     * A plain number in the factor step is the factor. Every number is taken there, so it is never
     * read as a distance for the reference point; one that is not greater than 0 only shows a
     * notice.
     */
    handleValue(value: number): boolean;
    /** A typed point is the base, the reference or the target point, depending on the step. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input for the reference and target points is measured from the base point. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    private takePoint;
    private applyScale;
    private onPointerMove;
    private onSelectionChange;
    private hasEditable;
    private goTo;
    private applyActivity;
}
