import { Coordinate } from 'ol/coordinate';
import { Segment } from '../geometry/segments';
import { BoundaryTool, BoundaryOutcome, BoundaryPrompts, BoundaryTarget } from './boundary';
import { ToolContext } from './Tool';
/** Prompt shown by the input bar for each step, and the notices put in front of it. */
export declare const TRIM_PROMPTS: BoundaryPrompts;
/**
 * CAD-style trim: select the boundary (lines or polygon edges, the selection when the tool
 * starts), then click lines: the clicked part up to the nearest crossings with the boundary is
 * removed. Cutting out an interior piece splits a line into two objects (the second inserted
 * with the same attributes) or a multi-line into two parts.
 */
export declare class TrimTool extends BoundaryTool {
    readonly id = "trim";
    protected readonly prompts: BoundaryPrompts;
    protected outcome(ctx: ToolContext, target: BoundaryTarget, cutters: Segment[], click: Coordinate): BoundaryOutcome;
}
