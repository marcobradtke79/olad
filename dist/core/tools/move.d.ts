import { default as Feature } from 'ol/Feature';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type MoveStep = 'select' | 'base' | 'target';
/** Prompt shown by the input bar for each step. */
export declare const MOVE_PROMPTS: Record<MoveStep, string>;
export { PREVIEW_LAYER_PROPERTY } from './preview';
/** Translate the geometries of `features` in place by the vector (view-projection units). */
export declare function translateFeatures(features: Feature[], dx: number, dy: number): void;
/**
 * CAD-style move in three steps: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter
 * continues; skipped when a selection exists), pick a base point (click or typed `x,y`,
 * snapped like any other point), then the second point (click, or typed `@dx,dy`,
 * `@distance<angle`, `distance` relative to the base point). The displacement is applied to
 * every selected feature that may be updated and submitted as one command. A dashed preview
 * follows the pointer in the last step. After a move the objects are deselected and the tool
 * asks for the next ones; Escape steps back (second point → base point → selection, clearing it).
 */
export declare class MoveTool extends BaseTool {
    readonly id = "move";
    private step;
    private base;
    private editable;
    private selectInteractions;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter: a confirmed selection leads to the base point. */
    finish(): void;
    /** Escape steps back; in the selection step it clears the selection. */
    cancel(): void;
    /** Backspace drops the base point. */
    removeLastPoint(): boolean;
    /** A typed point is the base point or the second point, depending on the step. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input in the second-point step is measured from the base point. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    private takePoint;
    private applyMove;
    private onPointerMove;
    private onSelectionChange;
    private hasEditable;
    private goTo;
    private applyActivity;
}
