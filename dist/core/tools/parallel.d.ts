import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type ParallelStep = 'select' | 'start' | 'end';
/** Prompt shown by the input bar for each step. */
export declare const PARALLEL_PROMPTS: Record<ParallelStep, string>;
/**
 * Draw a line parallel to an existing line, polyline or polygon: pick the object, then a start
 * point, whose distance and side fix the parallel; the line follows the object through its
 * bends from the start to the point of the parallel nearest to the pointer (a typed number is
 * its length in metres). A click inserts it into the active layer (or the draft layer) like a
 * drawn line; the object stays the reference for the next parallel until Escape.
 */
export declare class ParallelTool extends BaseTool {
    readonly id = "parallel";
    private step;
    private reference;
    private run;
    /** Shown in front of the prompt after a start point that gives no parallel. */
    private notice;
    private select;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(ctx: ToolContext): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection. */
    deactivate(): void;
    /** Escape steps back: the end drops the start point, the start forgets the object. */
    cancel(): void;
    removeLastPoint(): boolean;
    /**
     * In the end step a typed length (metres, converted by the editor) is the length of the line, in the direction the
     * pointer pulls (along the object when it has not moved). Every number is taken there; one
     * that is not greater than 0 is ignored.
     */
    handleLength(value: number): boolean;
    /** A typed point is the start point, or projected onto the parallel as its end. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input for the end is measured from the start point. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    /** The one selected line or polygon (read-only is fine). */
    private selectedReference;
    private takePoint;
    /**
     * The end station for a pointer position: its nearest station, clamped to an open path's
     * ends; on a closed path the change since the last position is added, so the run follows the
     * pointer around the ring (at most once around).
     */
    private follow;
    private clamp;
    private finishAt;
    private onPointerMove;
    private onSelectionChange;
    private applyActivity;
    private goTo;
}
