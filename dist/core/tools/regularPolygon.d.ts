import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
/** Side count the tool starts with before the user types one. */
export declare const DEFAULT_REGULAR_POLYGON_SIDES = 6;
export type RegularPolygonStep = 'sides' | 'centre' | 'vertex';
/** Prompt shown by the input bar for each step; `{sides}` stands for the current side count. */
export declare const REGULAR_POLYGON_PROMPTS: Record<RegularPolygonStep, string>;
/**
 * Draw a regular polygon (equal sides, 3 or more) into the active layer (or the draft layer):
 * the number of sides (typed, remembered for the session), the centre, then one vertex; the
 * polygon is inscribed in the circle through that vertex. Inserted like a drawn polygon
 * (schema defaults, multi-part wrapping, selected afterwards); the tool stays active for the
 * next polygon with the same side count.
 */
export declare class RegularPolygonTool extends BaseTool {
    readonly id = "regular-polygon";
    /** Remembered across activations. */
    private sides;
    private step;
    private centre;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
    /** The first step expects the number of sides typed. */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    /** The side count in effect (typed, given as an option, or remembered). */
    getSides(): number;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Escape steps back: drop the centre, or return to the number of sides. */
    cancel(): void;
    removeLastPoint(): boolean;
    /** Enter confirms the current side count. */
    finish(): void;
    /** A typed whole number of 3 or more is the side count while the tool asks for it. */
    handleValue(value: number): boolean;
    /** A typed point is the centre (keeping the side count) or the vertex. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input and the perpendicular snap are measured from the centre. */
    referencePoint(): number[] | null;
    private takePoint;
    private onPointerMove;
    private goTo;
}
