import { default as Feature } from 'ol/Feature';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type RotateStep = 'select' | 'center' | 'start' | 'end';
/** Prompt shown by the input bar for each step. */
export declare const ROTATE_PROMPTS: Record<RotateStep, string>;
/** Angle in radians, counter-clockwise, from the ray centre → start to the ray centre → end. */
export declare function rotationAngle(center: number[], start: number[], end: number[]): number;
/** Rotate the geometries of `features` in place by `angle` radians around `anchor`. */
export declare function rotateFeatures(features: Feature[], angle: number, anchor: number[]): void;
/**
 * CAD-style rotate in four steps: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter
 * confirms; skipped when a selection exists), pick the centre of rotation, then a first point
 * that fixes one leg of the angle, then a second point; the angle between the two legs around
 * the centre is applied to every selected feature that may be updated, as one command. A dashed
 * preview of the rotated objects and both legs follows the pointer. Afterwards the objects are
 * deselected and the tool asks for the next ones; Escape steps back.
 */
export declare class RotateTool extends BaseTool {
    readonly id = "rotate";
    private step;
    private center;
    private start;
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
    /** Enter: a confirmed selection leads to the centre. */
    finish(): void;
    /** Escape steps back; in the centre and selection steps it clears the selection. */
    cancel(): void;
    /** Backspace drops the last angle point. */
    removeLastPoint(): boolean;
    /** A typed point is the centre, the first or the second point, depending on the step. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input for the angle points is measured from the centre. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    private takePoint;
    private applyRotation;
    private onPointerMove;
    private onSelectionChange;
    private hasEditable;
    private goTo;
    private applyActivity;
}
