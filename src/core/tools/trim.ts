import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import { composite, insertFeature, updateGeometry } from '../changes/commands';
import type { Segment } from '../geometry/segments';
import { trimLine } from '../geometry/trim';
import {
  BoundaryTool,
  type BoundaryOutcome,
  type BoundaryPrompts,
  type BoundaryTarget,
} from './boundary';
import type { ToolContext } from './Tool';

/** Prompt shown by the input bar for each step, and the notices put in front of it. */
export const TRIM_PROMPTS: BoundaryPrompts = {
  boundary: 'Select the boundary: click the line or polygon to trim at',
  target: 'Click the part of a line to remove; Enter or Escape picks a new boundary',
  miss: 'No line there.',
  readOnly: 'That line cannot be changed.',
  noResult: 'The boundary does not cut that part of the line.',
  noInsert: 'Cutting out the middle needs a new object, and the layer does not allow inserts.',
  rejected: 'The trimmed line is not valid.',
};

/**
 * CAD-style trim: select the boundary (lines or polygon edges, the selection when the tool
 * starts), then click lines: the clicked part up to the nearest crossings with the boundary is
 * removed. Cutting out an interior piece splits a line into two objects (the second inserted
 * with the same attributes) or a multi-line into two parts.
 */
export class TrimTool extends BoundaryTool {
  readonly id = 'trim';
  protected readonly prompts = TRIM_PROMPTS;

  protected outcome(
    ctx: ToolContext,
    target: BoundaryTarget,
    cutters: Segment[],
    click: Coordinate,
  ): BoundaryOutcome {
    const result = trimLine(target.part, cutters, click);
    if (!result) return { failure: 'noResult' };
    const preview = [new LineString(result.removed)];
    const { feature, geometry, partIndex } = target;
    if (geometry instanceof MultiLineString) {
      const parts = geometry.getCoordinates();
      parts.splice(partIndex, 1, ...result.kept);
      return { command: updateGeometry(feature, new MultiLineString(parts)), preview };
    }
    const [first, second] = result.kept;
    if (!second) return { command: updateGeometry(feature, new LineString(first!)), preview };
    if (!ctx.layers.canEdit(target.layerId, 'insert')) return { failure: 'noInsert' };
    const properties = { ...feature.getProperties() };
    delete properties[feature.getGeometryName()];
    const idProperty = ctx.layers.getConfig(target.layerId).idProperty;
    if (idProperty) delete properties[idProperty];
    const copy = new Feature({ ...properties, geometry: new LineString(second) });
    return {
      command: composite(
        [updateGeometry(feature, new LineString(first!)), insertFeature(target.layerId, copy)],
        'trim',
      ),
      preview,
    };
  }
}
