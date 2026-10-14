import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {
  ellipseFromAxis,
  ellipseFromCentre,
  ellipseFromCorners,
  ellipsePolygon,
  type EllipseDefinition,
} from '../geometry/ellipse';
import { rectangleFromCorners } from '../geometry/rectangle';
import { unitsPerMetre } from '../measure';
import { onDrawEnd, polygonTarget } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

/** Construction variants of the ellipse tool (`ToolOptions.method`). */
export const ELLIPSE_METHODS = ['centre-axis', 'axis', 'box'] as const;
export type EllipseMethod = (typeof ELLIPSE_METHODS)[number];
export const DEFAULT_ELLIPSE_METHOD: EllipseMethod = 'centre-axis';

export type EllipseStep =
  'centre' | 'axis-end' | 'first' | 'second' | 'half-axis' | 'corner' | 'opposite';

/** Prompt shown by the input bar for each step. */
export const ELLIPSE_PROMPTS: Record<EllipseStep, string> = {
  centre: 'Centre: click on the map or type x,y',
  'axis-end':
    'End of the first axis: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the centre; Escape drops the centre',
  first: 'First end of the axis: click on the map or type x,y',
  second:
    'Second end of the axis: click or type (relative to the first end); Escape drops the first end',
  'half-axis':
    'Other half-axis: type its length in {unit}, or click a point at that distance from the axis; Escape goes back',
  corner: 'First corner of the box: click on the map or type x,y',
  opposite:
    'Opposite corner: click or type (relative to the first corner); the box follows the straightedge; Escape drops the first corner',
};

const STEPS: Record<EllipseMethod, EllipseStep[]> = {
  'centre-axis': ['centre', 'axis-end', 'half-axis'],
  axis: ['first', 'second', 'half-axis'],
  box: ['corner', 'opposite'],
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function ellipseMethod(options: ToolOptions = {}): EllipseMethod | null {
  if (options.method === undefined) return DEFAULT_ELLIPSE_METHOD;
  return (ELLIPSE_METHODS as readonly string[]).includes(options.method)
    ? (options.method as EllipseMethod)
    : null;
}

function marker(coordinate: Coordinate, kind: 'picked' | 'hover'): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/**
 * Draw an ellipse into the active layer (or the draft layer) by one of three constructions:
 * centre, end of the first axis and the other half-axis; both ends of the first axis and the
 * other half-axis; or the two opposite corners of a box along the straightedge that the
 * ellipse fills. The other half-axis is typed in metres or given by a point at that distance
 * from the first axis. The ellipse is linearized with the configured chord tolerance and
 * inserted like a drawn polygon (schema defaults, multi-part wrapping, selected afterwards);
 * the tool stays active for the next ellipse.
 */
export class EllipseTool extends BaseTool {
  readonly id = 'ellipse';
  private method: EllipseMethod = DEFAULT_ELLIPSE_METHOD;
  /** Fixed points of the construction in progress. */
  private points: Coordinate[] = [];
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return ellipseMethod(options) !== null && polygonTarget(ctx) !== null;
  }

  /** Reports the construction method in effect, so the toolbar can mirror it. */
  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  /** The half-axis step expects its length typed (a click works too). */
  override getInputRequest(): InputRequest {
    return this.step() === 'half-axis' ? 'value' : null;
  }

  override getPrompt(): string {
    return ELLIPSE_PROMPTS[this.step()];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = ellipseMethod(options) ?? DEFAULT_ELLIPSE_METHOD;
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.reset([]);
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.points = [];
  }

  /** Escape drops the last fixed point. */
  override cancel(): void {
    this.removeLastPoint();
  }

  /** Backspace drops the last fixed point and steps back. */
  override removeLastPoint(): boolean {
    if (this.points.length === 0) return false;
    this.reset(this.points.slice(0, -1));
    return true;
  }

  /** A typed point is the next point of the construction. */
  override handleInput(coordinate: number[]): boolean {
    this.takePoint(coordinate);
    return true;
  }

  /**
   * In the half-axis step a typed length (metres, converted by the editor) is the other
   * half-axis. Every length is
   * taken there, so it is never read as a distance to a point; one that is not greater than 0
   * is ignored.
   */
  override handleLength(value: number): boolean {
    const ctx = this.ctx;
    const centre = this.centre();
    if (!ctx || this.step() !== 'half-axis' || !centre) return false;
    if (!(Number.isFinite(value) && value > 0)) return true;
    // The second fixed point is an end of the first axis in both constructions.
    const axisEnd = this.points[1]!;
    const a = Math.hypot(axisEnd[0]! - centre[0]!, axisEnd[1]! - centre[1]!);
    const rotation = Math.atan2(axisEnd[1]! - centre[1]!, axisEnd[0]! - centre[0]!);
    const b = value * unitsPerMetre(ctx.getProjection(), centre);
    this.insert({ center: centre, a, b, rotation });
    return true;
  }

  /**
   * Relative input is measured from the last fixed point; in the half-axis step from the
   * centre of the ellipse.
   */
  override referencePoint(): number[] | null {
    if (this.step() === 'half-axis') return this.centre();
    return this.points[this.points.length - 1] ?? null;
  }

  private step(): EllipseStep {
    const steps = STEPS[this.method];
    return steps[Math.min(this.points.length, steps.length - 1)]!;
  }

  /** The centre of the ellipse once the first axis is fixed, else `null`. */
  private centre(): Coordinate | null {
    if (this.method === 'box' || this.points.length < 2) return null;
    const [first, second] = this.points as [Coordinate, Coordinate];
    return this.method === 'axis'
      ? [(first[0]! + second[0]!) / 2, (first[1]! + second[1]!) / 2]
      : first;
  }

  private takePoint(coordinate: Coordinate): void {
    const needed = STEPS[this.method].length;
    if (this.points.length < needed - 1) {
      const last = this.points[this.points.length - 1];
      if (last && last[0] === coordinate[0] && last[1] === coordinate[1]) return; // no axis yet
      this.reset([...this.points, coordinate]);
      return;
    }
    const ellipse = this.ellipseThrough(coordinate);
    if (ellipse) this.insert(ellipse); // degenerate: wait for another point
  }

  /** The ellipse defined by the fixed points and one more point, or `null` when degenerate. */
  private ellipseThrough(coordinate: Coordinate): EllipseDefinition | null {
    const [first, second] = this.points;
    if (!first) return null;
    if (this.method === 'box') {
      return ellipseFromCorners(first, coordinate, this.ctx?.getStraightedgeAngle() ?? 0);
    }
    if (!second) return null;
    return this.method === 'axis'
      ? ellipseFromAxis(first, second, coordinate)
      : ellipseFromCentre(first, second, coordinate);
  }

  private insert(ellipse: EllipseDefinition): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const target = polygonTarget(ctx);
    this.reset([]);
    if (target) onDrawEnd(ctx, target.layerId, target.layer, this.polygon(ctx, ellipse));
  }

  /** Linearize with the configured tolerance (metres) converted to map units at the centre. */
  private polygon(ctx: ToolContext, ellipse: EllipseDefinition) {
    const tolerance = ctx.getCurveTolerance() * unitsPerMetre(ctx.getProjection(), ellipse.center);
    return ellipsePolygon(ellipse, tolerance);
  }

  private onPointerMove(coordinate: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx || this.points.length === 0) return;
    this.previewSource.clear(true);
    const features = this.points.map((point) => marker(point, 'picked'));
    const [first, second] = this.points as [Coordinate, Coordinate | undefined];
    if (this.method === 'box') {
      const box = rectangleFromCorners(first, coordinate, ctx.getStraightedgeAngle());
      if (box) features.push(new Feature(box));
    } else if (!second) {
      features.push(new Feature(new LineString([first, coordinate]))); // the first axis
    } else {
      const start = this.method === 'axis' ? first : second;
      const end = this.method === 'axis' ? second : this.reflect(first, second);
      features.push(new Feature(new LineString([start, end])));
    }
    const ellipse =
      this.points.length === STEPS[this.method].length - 1 ? this.ellipseThrough(coordinate) : null;
    if (ellipse) features.push(new Feature(this.polygon(ctx, ellipse)));
    features.push(marker(coordinate, 'hover'));
    this.previewSource.addFeatures(features);
  }

  /** `p` mirrored through `centre`: the other end of an axis through the centre. */
  private reflect(centre: Coordinate, p: Coordinate): Coordinate {
    return [2 * centre[0]! - p[0]!, 2 * centre[1]! - p[1]!];
  }

  private reset(points: Coordinate[]): void {
    this.points = points;
    this.previewSource.clear(true);
    this.ctx?.promptChanged();
  }
}
