import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { circlePolygon, circumcircle, type CircleDefinition } from '../geometry/circle';
import { unitsPerMetre } from '../measure';
import { onDrawEnd, polygonTarget } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

/** Construction variants of the circle tool (`ToolOptions.method`). */
export const CIRCLE_METHODS = ['centre-radius', 'centre-point', 'three-point'] as const;
export type CircleMethod = (typeof CIRCLE_METHODS)[number];
export const DEFAULT_CIRCLE_METHOD: CircleMethod = 'centre-radius';

export type CircleStep = 'centre' | 'radius' | 'point' | 'first' | 'second' | 'third';

/** Prompt shown by the input bar for each step. */
export const CIRCLE_PROMPTS: Record<CircleStep, string> = {
  centre: 'Centre: click on the map or type x,y',
  radius:
    'Radius: type the radius in {unit}, or click a point on the circle; Escape drops the centre',
  point:
    'Point on the circle: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the centre; Escape drops the centre',
  first: 'First point on the circle: click on the map or type x,y',
  second:
    'Second point on the circle: click or type (relative to the first point); Escape drops the first point',
  third:
    'Third point on the circle: click or type (relative to the second point); Escape drops the second point',
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function circleMethod(options: ToolOptions = {}): CircleMethod | null {
  if (options.method === undefined) return DEFAULT_CIRCLE_METHOD;
  return (CIRCLE_METHODS as readonly string[]).includes(options.method)
    ? (options.method as CircleMethod)
    : null;
}

function marker(coordinate: number[], kind: 'picked' | 'hover'): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/**
 * Draw a circle into the active layer (or the draft layer) by one of three constructions:
 * centre and radius (typed in metres, or a clicked point at that distance), centre and a point
 * on the circle, or three points on the circle. The circle is linearized with the configured
 * chord tolerance and inserted like a drawn polygon (schema defaults, multi-part wrapping,
 * selected afterwards); the tool stays active for the next circle.
 */
export class CircleTool extends BaseTool {
  readonly id = 'circle';
  private method: CircleMethod = DEFAULT_CIRCLE_METHOD;
  private step: CircleStep = 'centre';
  /** Fixed points of the construction in progress: the centre, or the first two points. */
  private points: number[][] = [];
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return circleMethod(options) !== null && polygonTarget(ctx) !== null;
  }

  /** Reports the construction method in effect, so the toolbar can mirror it. */
  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  /** The radius step expects the radius typed (a click on the circle works too). */
  override getInputRequest(): InputRequest {
    return this.step === 'radius' ? 'value' : null;
  }

  override getPrompt(): string {
    return CIRCLE_PROMPTS[this.step];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = circleMethod(options) ?? DEFAULT_CIRCLE_METHOD;
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.points = [];
    this.goTo(this.stepFor(0));
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.points = [];
    this.step = this.stepFor(0);
  }

  /** Escape drops the last fixed point. */
  override cancel(): void {
    this.removeLastPoint();
  }

  /** Backspace drops the last fixed point and steps back. */
  override removeLastPoint(): boolean {
    if (this.points.length === 0) return false;
    this.points.pop();
    this.goTo(this.stepFor(this.points.length));
    return true;
  }

  /** A typed point is the next point of the construction; in the radius step its distance to the centre is the radius. */
  override handleInput(coordinate: number[]): boolean {
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input is measured from the centre, or from the last point on the circle. */
  override referencePoint(): number[] | null {
    return this.points[this.points.length - 1] ?? null;
  }

  private stepFor(fixedPoints: number): CircleStep {
    if (this.method === 'three-point') {
      return fixedPoints === 0 ? 'first' : fixedPoints === 1 ? 'second' : 'third';
    }
    if (fixedPoints === 0) return 'centre';
    return this.method === 'centre-radius' ? 'radius' : 'point';
  }

  private takePoint(coordinate: number[]): void {
    const needed = this.method === 'three-point' ? 3 : 2;
    if (this.points.length < needed - 1) {
      this.points.push(coordinate);
      this.goTo(this.stepFor(this.points.length));
      return;
    }
    const ctx = this.ctx;
    const circle = this.circleThrough(coordinate);
    if (!ctx || !circle) return; // degenerate: wait for another point
    const target = polygonTarget(ctx);
    this.points = [];
    this.goTo(this.stepFor(0));
    if (target) onDrawEnd(ctx, target.layerId, target.layer, this.polygon(ctx, circle));
  }

  /** The circle defined by the fixed points and one more point, or `null` when degenerate. */
  private circleThrough(coordinate: number[]): CircleDefinition | null {
    if (this.method === 'three-point') {
      const [a, b] = this.points;
      return a && b ? circumcircle(a, b, coordinate) : null;
    }
    const centre = this.points[0];
    if (!centre) return null;
    const radius = Math.hypot(coordinate[0]! - centre[0]!, coordinate[1]! - centre[1]!);
    return radius > 0 ? { center: centre, radius } : null;
  }

  /** Linearize with the configured tolerance (metres) converted to map units at the centre. */
  private polygon(ctx: ToolContext, circle: CircleDefinition) {
    const tolerance = ctx.getCurveTolerance() * unitsPerMetre(ctx.getProjection(), circle.center);
    return circlePolygon(circle.center, circle.radius, tolerance);
  }

  private onPointerMove(coordinate: number[]): void {
    const ctx = this.ctx;
    if (!ctx || this.points.length === 0) return;
    this.previewSource.clear(true);
    const features = this.points.map((point) => marker(point, 'picked'));
    const circle = this.circleThrough(coordinate);
    if (circle) features.push(new Feature(this.polygon(ctx, circle)));
    if (this.method === 'centre-radius') {
      features.push(new Feature(new LineString([this.points[0]!, coordinate])));
    } else if (this.method === 'centre-point') {
      features.push(marker(coordinate, 'hover'));
    } else if (!circle) {
      features.push(new Feature(new LineString([...this.points, coordinate])));
    }
    this.previewSource.addFeatures(features);
  }

  private goTo(step: CircleStep): void {
    this.step = step;
    this.previewSource.clear(true);
    this.ctx?.promptChanged();
  }
}
