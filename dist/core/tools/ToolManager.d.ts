import { InputRequest, Tool, ToolContext, ToolOptions } from './Tool';
export interface ToolManagerEvents {
    onToolChange(id: string | null, options: ToolOptions): void;
}
/** Registry of tools; keeps exactly one active. */
export declare class ToolManager {
    private readonly tools;
    private active;
    private activeOptions;
    private suspended;
    private readonly ctx;
    private readonly events;
    constructor(ctx: ToolContext, events: ToolManagerEvents);
    register(tool: Tool): void;
    list(): string[];
    has(id: string): boolean;
    getActive(): string | null;
    /** Whether the tool (default: the active one) is read-only (`Tool.readOnly`). */
    isReadOnly(id?: string | null): boolean;
    /** The options the active tool works with (`{}` when no tool is active). */
    getActiveOptions(): ToolOptions;
    /** The active tool's prompt, or `null`; `{unit}` becomes the default length unit's symbol. */
    getPrompt(): string | null;
    /** What the active tool's step expects typed (`Tool.getInputRequest`), or `null`. */
    getInputRequest(): InputRequest;
    canActivate(id: string, options?: ToolOptions): boolean;
    /** Activate a tool (deactivating the current one). Returns `false` when `canActivate` is false. */
    activate(id: string, options?: ToolOptions): boolean;
    deactivate(): void;
    cancel(): void;
    finish(): void;
    removeLastPoint(): boolean;
    handleInput(coordinate: number[]): boolean;
    /** Offer a typed plain number to the active tool's current step (`Tool.handleValue`). */
    handleValue(value: number): boolean;
    /** Offer a typed length in metres to the active tool's current step (`Tool.handleLength`). */
    handleLength(metres: number): boolean;
    /** Offer typed text to the active tool's current step (`Tool.handleText`). */
    handleText(text: string): boolean;
    /** The active tool's reference point for perpendicular snapping. */
    referencePoint(): number[] | null;
    /** Pause the active tool's interactions (straightedge pick) without changing the tool. */
    suspend(on: boolean): void;
}
