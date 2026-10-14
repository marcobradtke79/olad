import type { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import { updateGeometry } from '../changes/commands';
import type { Segment } from '../geometry/segments';
import { extendLine } from '../geometry/trim';
import {
  BoundaryTool,
  type BoundaryOutcome,
  type BoundaryPrompts,
  type BoundaryTarget,
} from './boundary';
import type { ToolContext } from './Tool';

/** Prompt shown by the input bar for each step, and the notices put in front of it. */
export const EXTEND_PROMPTS: BoundaryPrompts = {
  boundary: 'Select the boundary: click the line or polygon to extend to',
  target: 'Click a line near the end to extend; Enter or Escape picks a new boundary',
  miss: 'No line there.',
  readOnly: 'That line cannot be changed.',
  noResult: 'That end does not reach the boundary when extended.',
  noInsert: 'The layer does not allow inserts.',
  rejected: 'The extended line is not valid.',
};

/**
 * CAD-style extend: select the boundary (lines or polygon edges, the selection when the tool
 * starts), then click lines near an end: that end moves along the direction of its end segment
 * onto the first boundary crossing ahead.
 */
export class ExtendTool extends BoundaryTool {
  readonly id = 'extend';
  protected readonly prompts = EXTEND_PROMPTS;

  protected outcome(
    _ctx: ToolContext,
    target: BoundaryTarget,
    cutters: Segment[],
    click: Coordinate,
  ): BoundaryOutcome {
    const result = extendLine(target.part, cutters, click);
    if (!result) return { failure: 'noResult' };
    const preview = [new LineString(result.added)];
    const { feature, geometry, partIndex } = target;
    if (geometry instanceof MultiLineString) {
      const parts = geometry.getCoordinates();
      parts[partIndex] = result.line;
      return { command: updateGeometry(feature, new MultiLineString(parts)), preview };
    }
    return { command: updateGeometry(feature, new LineString(result.line)), preview };
  }
}
