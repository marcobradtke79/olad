import { CubicBezier } from '../geometry/bezier';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type CurveStep = 'start' | 'end' | 'shape' | 'handle';
export type CurveHandle = 'start' | 'end';
/** Prompt shown by the input bar for each step. */
export declare const CURVE_PROMPTS: Record<CurveStep, string>;
/**
 * Draw a curve (cubic Bézier) into the active layer (or the draft layer): start point, end
 * point, then a handle at each end controls the entry and exit angle; click a handle to pick
 * it up, click or type where it goes, as often as needed; Enter inserts the curve linearized
 * with the configured chord tolerance, like a drawn line (schema defaults, multi-part wrapping,
 * selected afterwards). The tool stays active for the next curve.
 */
export declare class CurveTool extends BaseTool {
    readonly id = "curve";
    private step;
    private start;
    private end;
    private handles;
    private picked;
    /** Where the picked handle was, restored by Escape. */
    private pickedFrom;
    private hovered;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Enter inserts the curve (a handle being placed stays where it is). */
    finish(): void;
    /** Escape steps back: puts a picked handle back, drops the end point, drops the start. */
    cancel(): void;
    removeLastPoint(): boolean;
    /** A typed point is the start, the end or the picked handle's new position. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input: the start while placing the end, the handle's end point while placing it. */
    referencePoint(): number[] | null;
    /** The curve in progress, or `null` before the end point. */
    curve(): CubicBezier | null;
    private reset;
    private currentHandle;
    private onClick;
    private takePoint;
    private placeHandle;
    /** The handle within the pick tolerance of the raw pointer position, the nearer one first. */
    private handleAt;
    private onPointerMove;
    /** The dashed curve, the handle legs and the markers (ends picked, handles hover-able). */
    private renderShape;
    private goTo;
}
