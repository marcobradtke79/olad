import { default as DragBox } from 'ol/interaction/DragBox';
import { default as Select } from 'ol/interaction/Select';
import { BaseTool, ToolContext } from './Tool';
/**
 * The click selection shared by the select tool and the editor's inspect mode: a click selects
 * a feature of an editor layer into the shared selection, Shift+click toggles it, a click on
 * empty map clears. The Selection applies the highlight itself.
 */
export declare function createSelectInteraction(ctx: Pick<ToolContext, 'selection' | 'hitTolerance'>): Select;
/** Box selection with Ctrl / Cmd+drag: every feature of a visible editor layer in the box. */
export declare function createBoxSelectInteraction(ctx: Pick<ToolContext, 'selection' | 'layers'>): DragBox;
/**
 * Select features by click (Shift+click toggles) or by dragging a box with Ctrl / Cmd held.
 * Clicking empty map clears the selection. Only editor layers are hit.
 */
export declare class SelectTool extends BaseTool {
    readonly id = "select";
    activate(ctx: ToolContext): void;
    /** Escape clears the selection ... */
    cancel(): void;
    /** ... but switching tools keeps it, so modify, move and delete can act on it. */
    deactivate(): void;
}
