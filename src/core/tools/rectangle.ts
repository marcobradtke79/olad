import Feature from 'ol/Feature';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { rectangleFromCorners } from '../geometry/rectangle';
import { onDrawEnd, polygonTarget, type PolygonTarget } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type RectangleStep = 'first' | 'second';

/** Prompt shown by the input bar for each step. */
export const RECTANGLE_PROMPTS: Record<RectangleStep, string> = {
  first: 'First corner: click on the map or type x,y',
  second:
    'Opposite corner: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape drops the first corner',
};

export type RectangleTarget = PolygonTarget;

/**
 * Where the rectangle goes: the active layer, or the draft layer while none is active; the
 * layer must exist, allow inserts and accept polygons. `null` when no rectangle can be drawn.
 */
export function rectangleTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
): RectangleTarget | null {
  return polygonTarget(ctx);
}

/**
 * Draw a rectangle from two corners into the active layer (or the draft layer): the first
 * corner by click or typed `x,y`, the opposite corner by click or typed point relative to the
 * first. The sides follow the straightedge angle, so a rotated straightedge gives rotated
 * rectangles. The polygon is inserted like a drawn one (schema defaults, multi-part wrapping,
 * selected afterwards); the tool stays active for the next rectangle.
 */
export class RectangleTool extends BaseTool {
  readonly id = 'rectangle';
  private step: RectangleStep = 'first';
  private first: number[] | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext): boolean {
    return rectangleTarget(ctx) !== null;
  }

  override getPrompt(): string {
    return RECTANGLE_PROMPTS[this.step];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.goTo('first');
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.first = null;
    this.step = 'first';
  }

  /** Escape drops the first corner. */
  override cancel(): void {
    this.removeLastPoint();
  }

  /** Backspace drops the first corner. */
  override removeLastPoint(): boolean {
    if (this.step !== 'second') return false;
    this.goTo('first');
    return true;
  }

  /** A typed point is the first or the opposite corner. */
  override handleInput(coordinate: number[]): boolean {
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input for the opposite corner is measured from the first corner. */
  override referencePoint(): number[] | null {
    return this.step === 'second' ? this.first : null;
  }

  private takePoint(coordinate: number[]): void {
    if (this.step === 'first') {
      this.first = coordinate;
      this.goTo('second');
      return;
    }
    const ctx = this.ctx;
    const first = this.first;
    if (!ctx || !first) return;
    const polygon = rectangleFromCorners(first, coordinate, ctx.getStraightedgeAngle());
    if (!polygon) return; // no width or no height: wait for another point
    const target = rectangleTarget(ctx);
    this.goTo('first');
    if (target) onDrawEnd(ctx, target.layerId, target.layer, polygon);
  }

  private onPointerMove(coordinate: number[]): void {
    const ctx = this.ctx;
    if (this.step !== 'second' || !this.first || !ctx) return;
    this.previewSource.clear(true);
    const polygon = rectangleFromCorners(this.first, coordinate, ctx.getStraightedgeAngle());
    if (polygon) this.previewSource.addFeature(new Feature(polygon));
  }

  private goTo(step: RectangleStep): void {
    this.step = step;
    if (step === 'first') this.first = null;
    this.previewSource.clear(true);
    this.ctx?.promptChanged();
  }
}
