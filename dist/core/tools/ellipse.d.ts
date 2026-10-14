import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
/** Construction variants of the ellipse tool (`ToolOptions.method`). */
export declare const ELLIPSE_METHODS: readonly ["centre-axis", "axis", "box"];
export type EllipseMethod = (typeof ELLIPSE_METHODS)[number];
export declare const DEFAULT_ELLIPSE_METHOD: EllipseMethod;
export type EllipseStep = 'centre' | 'axis-end' | 'first' | 'second' | 'half-axis' | 'corner' | 'opposite';
/** Prompt shown by the input bar for each step. */
export declare const ELLIPSE_PROMPTS: Record<EllipseStep, string>;
/** The method named by the options (the default when none), or `null` for an unknown one. */
export declare function ellipseMethod(options?: ToolOptions): EllipseMethod | null;
/**
 * Draw an ellipse into the active layer (or the draft layer) by one of three constructions:
 * centre, end of the first axis and the other half-axis; both ends of the first axis and the
 * other half-axis; or the two opposite corners of a box along the straightedge that the
 * ellipse fills. The other half-axis is typed in metres or given by a point at that distance
 * from the first axis. The ellipse is linearized with the configured chord tolerance and
 * inserted like a drawn polygon (schema defaults, multi-part wrapping, selected afterwards);
 * the tool stays active for the next ellipse.
 */
export declare class EllipseTool extends BaseTool {
    readonly id = "ellipse";
    private method;
    /** Fixed points of the construction in progress. */
    private points;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
    /** Reports the construction method in effect, so the toolbar can mirror it. */
    getOptions(): ToolOptions;
    /** The half-axis step expects its length typed (a click works too). */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Escape drops the last fixed point. */
    cancel(): void;
    /** Backspace drops the last fixed point and steps back. */
    removeLastPoint(): boolean;
    /** A typed point is the next point of the construction. */
    handleInput(coordinate: number[]): boolean;
    /**
     * In the half-axis step a typed length (metres, converted by the editor) is the other
     * half-axis. Every length is
     * taken there, so it is never read as a distance to a point; one that is not greater than 0
     * is ignored.
     */
    handleLength(value: number): boolean;
    /**
     * Relative input is measured from the last fixed point; in the half-axis step from the
     * centre of the ellipse.
     */
    referencePoint(): number[] | null;
    private step;
    /** The centre of the ellipse once the first axis is fixed, else `null`. */
    private centre;
    private takePoint;
    /** The ellipse defined by the fixed points and one more point, or `null` when degenerate. */
    private ellipseThrough;
    private insert;
    /** Linearize with the configured tolerance (metres) converted to map units at the centre. */
    private polygon;
    private onPointerMove;
    /** `p` mirrored through `centre`: the other end of an axis through the centre. */
    private reflect;
    private reset;
}
