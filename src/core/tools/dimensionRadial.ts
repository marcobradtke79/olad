import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import { buffer, boundingExtent } from 'ol/extent';
import LineString from 'ol/geom/LineString';
import { circumcircle, type CircleDefinition } from '../geometry/circle';
import { fitCircleRun } from '../geometry/circleFit';
import { unitsPerMetre } from '../measure';
import { DimensionToolBase } from './dimensionBase';
import { pickTolerance } from './pointer';
import type { InputRequest, ToolContext, ToolOptions } from './Tool';

/** Variants of the radial dimension tool (`ToolOptions.method`). */
export const DIMENSION_RADIAL_METHODS = ['radius', 'diameter', 'arc'] as const;
export type DimensionRadialMethod = (typeof DIMENSION_RADIAL_METHODS)[number];

export type DimensionRadialStep = 'curve' | 'p1' | 'p2' | 'p3' | 'start' | 'end' | 'place';

/** Prompt shown by the input bar for each step. */
export const DIMENSION_RADIAL_PROMPTS: Record<DimensionRadialStep, string> = {
  curve: 'Click a circle, an arc or a curved edge',
  p1: 'No circle there: click three points on the arc, the first',
  p2: 'Second point on the arc',
  p3: 'Third point on the arc',
  start: 'Start of the arc to dimension: click on the curve',
  end: 'End of the arc: click on the curve',
  place: 'Place the dimension with the pointer: click, or type the offset in {unit}',
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function dimensionRadialMethod(options: ToolOptions = {}): DimensionRadialMethod | null {
  if (options.method === undefined) return 'radius';
  return (DIMENSION_RADIAL_METHODS as readonly string[]).includes(options.method)
    ? (options.method as DimensionRadialMethod)
    : null;
}

const angleOf = (from: Coordinate, to: Coordinate) =>
  Math.atan2(to[1]! - from[1]!, to[0]! - from[0]!);
/** Counter-clockwise angle from `from` to `to`, in [0, 2π). */
const ccw = (from: number, to: number) =>
  (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/**
 * Dimension a circle or an arc in the active dimension layer: click the curve (its circle is
 * fitted from the vertices of linearized circles and arcs; three clicked points on the arc
 * otherwise), for `arc` also its start and end, then place the dimension with the pointer (the
 * radius' direction, or the distance of the arc dimension), which inserts it with its GIS
 * value; the field value is typed later by clicking the value. `radius`
 * and `diameter` store [centre, point on the circle], `arc` [centre, start, end] counter-
 * clockwise.
 */
export class DimensionRadialTool extends DimensionToolBase {
  readonly id = 'dimension-radial';
  private method: DimensionRadialMethod = 'radius';
  private step: DimensionRadialStep = 'curve';
  private circle: CircleDefinition | null = null;
  /** Angle (radians) of the point where the curve was picked: inside the dimensioned arc. */
  private pickAngle = 0;
  /** Three points on the arc (fallback). */
  private points: Coordinate[] = [];
  private start: number | null = null;
  private end: number | null = null;
  /** Direction (radians) of the point on the circle, radius and diameter. */
  private direction = 0;
  /** Offset in metres: leader beyond the circle, or the arc dimension's distance outside. */
  private offset = 0;

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return dimensionRadialMethod(options) !== null && super.canActivate(ctx, options);
  }

  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  override getInputRequest(): InputRequest {
    return this.step === 'place' ? 'value' : null;
  }

  override getPrompt(): string {
    return DIMENSION_RADIAL_PROMPTS[this.step];
  }

  override isIdle(): boolean {
    return this.step === 'curve';
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = dimensionRadialMethod(options) ?? 'radius';
    super.activate(ctx, options);
  }

  protected reset(): void {
    this.circle = null;
    this.points = [];
    this.start = this.end = null;
    this.offset = 0;
    this.goTo('curve');
  }

  override cancel(): void {
    this.reset();
  }

  override removeLastPoint(): boolean {
    switch (this.step) {
      case 'place':
      case 'start':
      case 'p1':
        this.reset();
        return true;
      case 'end':
        this.start = null;
        this.goTo('start');
        return true;
      case 'p2':
      case 'p3':
        this.points.pop();
        this.goTo(this.step === 'p3' ? 'p2' : 'p1');
        return true;
      default:
        return false;
    }
  }

  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'curve') return false;
    this.onClick(coordinate, coordinate);
    return true;
  }

  /** The place step takes the offset (metres) and inserts. */
  override handleLength(metres: number): boolean {
    if (this.step !== 'place' || !(metres >= 0)) return false;
    this.offset = metres;
    this.insert();
    return true;
  }

  override referencePoint(): number[] | null {
    return this.points[this.points.length - 1] ?? this.circle?.center ?? null;
  }

  protected picked(): Coordinate[] {
    return this.circle ? [this.circle.center, ...this.points] : this.points;
  }

  protected dimension(): Feature | null {
    const circle = this.circle;
    if (!circle || this.step !== 'place') return null;
    const { center, radius } = circle;
    const on = (angle: number): Coordinate => [
      center[0]! + radius * Math.cos(angle),
      center[1]! + radius * Math.sin(angle),
    ];
    const geometry =
      this.method === 'arc'
        ? new LineString([center, on(this.start!), on(this.end!)])
        : new LineString([center, on(this.direction)]);
    return new Feature({
      geometry,
      dimType: this.method,
      offset: Math.round(this.offset * 1000) / 1000,
    });
  }

  protected onClick(coordinate: Coordinate, raw: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx) return;
    switch (this.step) {
      case 'curve': {
        const fit = this.fit(ctx, raw);
        if (!fit) {
          this.goTo('p1');
          return;
        }
        this.circle = { center: fit.center, radius: fit.radius };
        this.pickAngle = angleOf(fit.center, raw);
        this.direction = this.pickAngle;
        this.afterCircle();
        return;
      }
      case 'p1':
      case 'p2':
      case 'p3': {
        this.points.push(coordinate);
        if (this.step !== 'p3') {
          this.goTo(this.step === 'p1' ? 'p2' : 'p3');
          return;
        }
        const [a, b, c] = this.points as [Coordinate, Coordinate, Coordinate];
        const circle = circumcircle(a, b, c);
        if (!circle) {
          this.points.pop(); // collinear: wait for another third point
          return;
        }
        this.circle = circle;
        this.pickAngle = angleOf(circle.center, b);
        this.direction = this.pickAngle;
        if (this.method === 'arc') {
          // The three points span the arc: start at the first, end at the third.
          this.setArc(angleOf(circle.center, a), angleOf(circle.center, c));
          this.goTo('place');
        } else this.afterCircle();
        return;
      }
      case 'start':
        this.start = angleOf(this.circle!.center, coordinate);
        this.goTo('end');
        return;
      case 'end':
        this.setArc(this.start!, angleOf(this.circle!.center, coordinate));
        this.goTo('place');
        return;
      case 'place':
        this.place(coordinate);
        this.insert();
        return;
      default:
    }
  }

  protected onMove(coordinate: Coordinate): void {
    if (this.step === 'place') this.place(coordinate);
    this.refresh();
  }

  private afterCircle(): void {
    this.goTo(this.method === 'arc' ? 'start' : 'place');
  }

  /** Order start and end counter-clockwise so the arc holds the picked point. */
  private setArc(a: number, b: number): void {
    if (ccw(a, this.pickAngle) <= ccw(a, b)) {
      this.start = a;
      this.end = b;
    } else {
      this.start = b;
      this.end = a;
    }
  }

  /** The pointer sets the direction of the circle point and the offset beyond the circle. */
  private place(coordinate: Coordinate): void {
    const ctx = this.ctx;
    const circle = this.circle;
    if (!ctx || !circle) return;
    const distance = Math.hypot(
      coordinate[0]! - circle.center[0]!,
      coordinate[1]! - circle.center[1]!,
    );
    if (this.method !== 'arc' && distance > 0) this.direction = angleOf(circle.center, coordinate);
    this.offset =
      Math.max(0, distance - circle.radius) / unitsPerMetre(ctx.getProjection(), circle.center);
  }

  /** The circle of the nearest curved, visible, non-dimension object under the raw pointer. */
  private fit(ctx: ToolContext, raw: Coordinate): CircleDefinition | null {
    const tolerance = pickTolerance(ctx);
    const extent = buffer(boundingExtent([raw]), tolerance);
    let best: CircleDefinition | null = null;
    for (const info of ctx.layers.list()) {
      if (!info.visible || ctx.layers.getConfig(info.id).dimension) continue;
      ctx.layers.getSource(info.id).forEachFeatureInExtent(extent, (feature) => {
        const geometry = feature.getGeometry();
        const fit = geometry && fitCircleRun(geometry, raw, tolerance);
        if (fit && !best) best = { center: fit.center, radius: fit.radius };
      });
    }
    return best;
  }

  private goTo(step: DimensionRadialStep): void {
    this.step = step;
    this.refresh(true);
  }
}
