import { ResolvedLayerConfig, ResolvedTextConfig } from '../config/types';
import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
export type TextStep = 'point' | 'height' | 'text';
/** Prompt shown by the input bar for each step; `{height}` is the height offered. */
export declare const TEXT_PROMPTS: Record<TextStep, string>;
export interface TextTarget {
    layerId: string;
    layer: ResolvedLayerConfig & {
        text: ResolvedTextConfig;
    };
}
/**
 * Where a new text goes: the active layer, or the draft layer while none is active; it must
 * exist, allow inserts, be a text layer (`layers[].text`) and take points. `null` otherwise.
 */
export declare function textTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>): TextTarget | null;
/**
 * Place a text: pick the insert point, give the height in metres (Enter keeps the one offered:
 * the layer's `text.height` at first, then the last one used), then type the text in the
 * command line. The text is inserted as a point feature with the text, its height and the
 * straightedge angle as rotation, into the active text layer or the draft layer, and selected;
 * the tool stays active for the next text.
 */
export declare class TextTool extends BaseTool {
    readonly id = "text";
    private step;
    private point;
    private height;
    /** The height used last, offered for the next text. */
    private lastHeight;
    private notice;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext): boolean;
    /** The height and text steps expect typing. */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    /** The height in metres offered in the height step. */
    getHeight(): number;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Enter keeps the offered height; it does nothing in the other steps. */
    finish(): void;
    /** Escape steps back: text → height → point. */
    cancel(): void;
    removeLastPoint(): boolean;
    /** A typed length in the height step is the height (metres, converted by the editor); one ≤ 0 is refused. */
    handleLength(value: number): boolean;
    /** In the text step the typed line is the text, numbers included. */
    handleText(text: string): boolean;
    /** A typed point is the insert point. */
    handleInput(coordinate: number[]): boolean;
    referencePoint(): number[] | null;
    private offeredHeight;
    private takePoint;
    private insert;
    /** A marker at the insert point and, from the text step on, a sample at the height. */
    private showPreview;
    private goTo;
}
