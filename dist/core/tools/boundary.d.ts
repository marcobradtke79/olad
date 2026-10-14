import { Coordinate } from 'ol/coordinate';
import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { default as LineString } from 'ol/geom/LineString';
import { default as MultiLineString } from 'ol/geom/MultiLineString';
import { Command } from '../changes/commands';
import { Segment } from '../geometry/segments';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type BoundaryStep = 'boundary' | 'target';
/** Why a click in the target step changed nothing. */
export type BoundaryFailure = 'miss' | 'readOnly' | 'noResult' | 'noInsert' | 'rejected';
/** The prompts of a boundary tool: one per step plus the failure notices. */
export type BoundaryPrompts = Record<BoundaryStep | BoundaryFailure, string>;
/** The line clicked in the target step: the feature, the clicked part and its index. */
export interface BoundaryTarget {
    feature: Feature;
    layerId: string;
    geometry: LineString | MultiLineString;
    /** Index of the clicked part of a MultiLineString; 0 for a LineString. */
    partIndex: number;
    part: Coordinate[];
}
/** What a boundary tool makes of a clicked line: commands to run and a preview, or a failure. */
export type BoundaryOutcome = {
    command: Command;
    preview: Geometry[];
} | {
    failure: BoundaryFailure;
};
/**
 * Base of the trim and extend tools: first the boundary (the selection when the tool starts,
 * else one picked by click), then any number of clicks on lines, each changing the clicked line
 * against the boundary in one command. The selection is cleared once a line has been changed;
 * the tool keeps the boundary and draws it on its preview layer until Enter or Escape. Lines are
 * hit with the raw pointer position, so snapping never moves the click onto another line.
 */
export declare abstract class BoundaryTool extends BaseTool {
    protected abstract readonly prompts: BoundaryPrompts;
    private step;
    private boundary;
    private notice;
    private select;
    private pointer;
    private preview;
    private readonly previewSource;
    private readonly hoverSource;
    private hoverLayer;
    private suspended;
    /** The change for a clicked line against the cutting edges, at the raw click position. */
    protected abstract outcome(ctx: ToolContext, target: BoundaryTarget, cutters: Segment[], click: Coordinate): BoundaryOutcome;
    canActivate(): boolean;
    getPrompt(): string;
    /** The boundary features the tool works against; empty in the boundary step. */
    getBoundary(): Feature[];
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter is done with this boundary: back to picking one. */
    finish(): void;
    /** Escape drops the boundary, or clears the selection while picking one. */
    cancel(): void;
    removeLastPoint(): boolean;
    setSuspended(suspended: boolean): void;
    private reset;
    /** The selected features with segments become the boundary and the tool moves on. */
    private takeBoundary;
    private cutters;
    /** The nearest line within the pick radius of the raw pointer position, boundary excluded. */
    private hit;
    private evaluate;
    private onClick;
    private onMove;
    private onSelectionChange;
    private setNotice;
    private applyActivity;
    private goTo;
}
