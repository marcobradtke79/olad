import { PolygonTarget } from './draw';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type RectangleStep = 'first' | 'second';
/** Prompt shown by the input bar for each step. */
export declare const RECTANGLE_PROMPTS: Record<RectangleStep, string>;
export type RectangleTarget = PolygonTarget;
/**
 * Where the rectangle goes: the active layer, or the draft layer while none is active; the
 * layer must exist, allow inserts and accept polygons. `null` when no rectangle can be drawn.
 */
export declare function rectangleTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>): RectangleTarget | null;
/**
 * Draw a rectangle from two corners into the active layer (or the draft layer): the first
 * corner by click or typed `x,y`, the opposite corner by click or typed point relative to the
 * first. The sides follow the straightedge angle, so a rotated straightedge gives rotated
 * rectangles. The polygon is inserted like a drawn one (schema defaults, multi-part wrapping,
 * selected afterwards); the tool stays active for the next rectangle.
 */
export declare class RectangleTool extends BaseTool {
    readonly id = "rectangle";
    private step;
    private first;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Escape drops the first corner. */
    cancel(): void;
    /** Backspace drops the first corner. */
    removeLastPoint(): boolean;
    /** A typed point is the first or the opposite corner. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input for the opposite corner is measured from the first corner. */
    referencePoint(): number[] | null;
    private takePoint;
    private onPointerMove;
    private goTo;
}
