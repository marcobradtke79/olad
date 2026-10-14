import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { ResolvedLayerConfig } from '../config/types';
import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
export type OffsetStep = 'select' | 'distance' | 'side';
/** Prompt shown by the input bar for each step; `distanceAgain` once a distance is remembered. */
export declare const OFFSET_PROMPTS: Record<OffsetStep | 'distanceAgain', string>;
/** Whether a feature's geometry can be offset (lines and polygons, single or multi-part). */
export declare function isOffsetable(feature: Feature): boolean;
export interface OffsetTarget {
    layerId: string;
    layer: ResolvedLayerConfig;
}
/**
 * The layer an offset copy goes to: the source object's layer when it allows inserts and takes
 * the geometry, else the active layer under the same rule, else the draft layer; `null` when
 * none fits.
 */
export declare function offsetTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>, sourceLayerId: string | undefined, geometry: Geometry): OffsetTarget | null;
/**
 * CAD-style offset in three steps: select one line or polygon (skipped when exactly one is
 * selected), type the offset distance in metres, then click on the side the copy goes to
 * (left or right of a line, inside or outside of a polygon). The parallel copy is inserted into
 * the source layer (else the active or draft layer) like a drawn geometry and selected, so
 * Enter and another click make the next parallel; the distance is remembered for the session.
 */
export declare class OffsetTool extends BaseTool {
    readonly id = "offset";
    private step;
    /** Remembered across activations, in metres; `null` until typed once. */
    private distance;
    private select;
    private pointer;
    private preview;
    private readonly previewSource;
    private suspended;
    canActivate(): boolean;
    /** The distance step expects the offset typed. */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    /** The offset distance in metres typed last, or `null`. */
    getDistance(): number | null;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter confirms the remembered distance. */
    finish(): void;
    /** Escape steps back; from the distance step it also clears the selection. */
    cancel(): void;
    removeLastPoint(): boolean;
    /** A typed positive length (in metres, converted by the editor) is the offset distance while the tool asks for it. */
    handleLength(value: number): boolean;
    /** A typed point picks the side. */
    handleInput(coordinate: number[]): boolean;
    setSuspended(suspended: boolean): void;
    /** The one object to offset: exactly one selected line or polygon (read-only is fine). */
    private source;
    /** The offset copy for a side point, or `null` when the point is on the line or it collapses. */
    private offsetFor;
    private takeSide;
    private onPointerMove;
    private onSelectionChange;
    private applyActivity;
    private goTo;
}
