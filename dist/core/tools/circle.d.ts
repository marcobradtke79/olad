import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
/** Construction variants of the circle tool (`ToolOptions.method`). */
export declare const CIRCLE_METHODS: readonly ["centre-radius", "centre-point", "three-point"];
export type CircleMethod = (typeof CIRCLE_METHODS)[number];
export declare const DEFAULT_CIRCLE_METHOD: CircleMethod;
export type CircleStep = 'centre' | 'radius' | 'point' | 'first' | 'second' | 'third';
/** Prompt shown by the input bar for each step. */
export declare const CIRCLE_PROMPTS: Record<CircleStep, string>;
/** The method named by the options (the default when none), or `null` for an unknown one. */
export declare function circleMethod(options?: ToolOptions): CircleMethod | null;
/**
 * Draw a circle into the active layer (or the draft layer) by one of three constructions:
 * centre and radius (typed in metres, or a clicked point at that distance), centre and a point
 * on the circle, or three points on the circle. The circle is linearized with the configured
 * chord tolerance and inserted like a drawn polygon (schema defaults, multi-part wrapping,
 * selected afterwards); the tool stays active for the next circle.
 */
export declare class CircleTool extends BaseTool {
    readonly id = "circle";
    private method;
    private step;
    /** Fixed points of the construction in progress: the centre, or the first two points. */
    private points;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
    /** Reports the construction method in effect, so the toolbar can mirror it. */
    getOptions(): ToolOptions;
    /** The radius step expects the radius typed (a click on the circle works too). */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Escape drops the last fixed point. */
    cancel(): void;
    /** Backspace drops the last fixed point and steps back. */
    removeLastPoint(): boolean;
    /** A typed point is the next point of the construction; in the radius step its distance to the centre is the radius. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input is measured from the centre, or from the last point on the circle. */
    referencePoint(): number[] | null;
    private stepFor;
    private takePoint;
    /** The circle defined by the fixed points and one more point, or `null` when degenerate. */
    private circleThrough;
    /** Linearize with the configured tolerance (metres) converted to map units at the centre. */
    private polygon;
    private onPointerMove;
    private goTo;
}
