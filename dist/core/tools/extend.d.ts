import { Coordinate } from 'ol/coordinate';
import { Segment } from '../geometry/segments';
import { BoundaryTool, BoundaryOutcome, BoundaryPrompts, BoundaryTarget } from './boundary';
import { ToolContext } from './Tool';
/** Prompt shown by the input bar for each step, and the notices put in front of it. */
export declare const EXTEND_PROMPTS: BoundaryPrompts;
/**
 * CAD-style extend: select the boundary (lines or polygon edges, the selection when the tool
 * starts), then click lines near an end: that end moves along the direction of its end segment
 * onto the first boundary crossing ahead.
 */
export declare class ExtendTool extends BoundaryTool {
    readonly id = "extend";
    protected readonly prompts: BoundaryPrompts;
    protected outcome(_ctx: ToolContext, target: BoundaryTarget, cutters: Segment[], click: Coordinate): BoundaryOutcome;
}
