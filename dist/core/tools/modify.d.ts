import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type ModifyStep = 'select' | 'idle' | 'placing';
/** Prompt shown by the input bar for each step. */
export declare const MODIFY_PROMPTS: Record<ModifyStep, string>;
/**
 * Vertex editing with CAD grips, in three steps: select one object (skipped when exactly one
 * updatable object is selected), then click a vertex to pick it up (or a segment to pick up a
 * new vertex there), then click or type where it goes. Every placement is one `updateGeometry`
 * command, Alt+click removes a vertex, Escape drops a picked vertex, Enter ends the session and
 * clears the selection. Switching tools keeps the selection.
 */
export declare class ModifyTool extends BaseTool {
    readonly id = "modify";
    private step;
    private feature;
    private pick;
    private hovered;
    private select;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools ends the session but keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter ends the session: the object is deselected and the next one can be picked. */
    finish(): void;
    /** Escape drops a picked vertex, then ends the session, then clears the selection. */
    cancel(): void;
    /** Backspace / Delete: drop the picked vertex, or remove the vertex under the pointer. */
    removeLastPoint(): boolean;
    /** A typed point places the picked vertex. */
    handleInput(coordinate: number[]): boolean;
    /** While placing, relative input, the angle lock and the perpendicular snap work from where the vertex was. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    /** The one object the session edits: exactly one selected feature that may be updated. */
    private target;
    private tolerance;
    private onClick;
    private onMove;
    private pickUp;
    private place;
    private remove;
    private updatePreview;
    private onSelectionChange;
    /** A geometry change from outside (undo, another command) while placing drops the pick. */
    private onGeometryChange;
    private watched;
    private watchGeometry;
    private goTo;
    private applyActivity;
}
/** Clone the geometries of `features` before an interaction mutates them in place. */
export declare function snapshot(features: Feature[]): Map<Feature, Geometry | undefined>;
/**
 * After an interaction moved geometries directly (the move tool translates in place), put the
 * originals back and submit the new geometries as commands, so validation, undo and change
 * tracking see them.
 */
export declare function submitGeometryChanges(ctx: ToolContext, features: Feature[], before: Map<Feature, Geometry | undefined>): boolean;
