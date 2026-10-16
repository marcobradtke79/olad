import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import { buffer, boundingExtent } from 'ol/extent';
import LineString from 'ol/geom/LineString';
import { referenceFor, type DimensionReference } from '../dimensions/references';
import { nearestEdge, segmentAt } from '../geometry/vertices';
import { unitsPerMetre } from '../measure';
import { DimensionToolBase } from './dimensionBase';
import { pickTolerance } from './pointer';
import type { InputRequest, ToolContext, ToolOptions } from './Tool';

/** Variants of the angular dimension tool (`ToolOptions.method`). */
export const DIMENSION_ANGULAR_METHODS = ['points', 'segments'] as const;
export type DimensionAngularMethod = (typeof DIMENSION_ANGULAR_METHODS)[number];

export type DimensionAngularStep = 'leg1' | 'vertex' | 'leg2' | 'segment1' | 'segment2' | 'arc';

/** Prompt shown by the input bar for each step. */
export const DIMENSION_ANGULAR_PROMPTS: Record<DimensionAngularStep, string> = {
  leg1: 'A point on the first leg of the angle: click (snaps to objects) or type x,y',
  vertex: 'The vertex of the angle: click or type x,y',
  leg2: 'A point on the second leg: click, or type relative to the vertex; Escape drops the angle',
  segment1: 'Click the first edge (a segment of a line or polygon)',
  segment2: 'Click the second edge; Escape drops the angle',
  arc: 'Move the pointer into the angle to dimension; click, or type the arc radius in {unit}',
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function dimensionAngularMethod(options: ToolOptions = {}): DimensionAngularMethod | null {
  if (options.method === undefined) return 'points';
  return (DIMENSION_ANGULAR_METHODS as readonly string[]).includes(options.method)
    ? (options.method as DimensionAngularMethod)
    : null;
}

const angleOf = (from: Coordinate, to: Coordinate) =>
  Math.atan2(to[1]! - from[1]!, to[0]! - from[0]!);
const unit = (angle: number): Coordinate => [Math.cos(angle), Math.sin(angle)];

/** Intersection of the infinite lines through two segments, or `null` when they are parallel. */
function intersection(a: [Coordinate, Coordinate], b: [Coordinate, Coordinate]): Coordinate | null {
  const d1 = [a[1][0]! - a[0][0]!, a[1][1]! - a[0][1]!];
  const d2 = [b[1][0]! - b[0][0]!, b[1][1]! - b[0][1]!];
  const cross = d1[0]! * d2[1]! - d1[1]! * d2[0]!;
  const scale = Math.hypot(d1[0]!, d1[1]!) * Math.hypot(d2[0]!, d2[1]!);
  if (!(Math.abs(cross) > 1e-9 * scale)) return null;
  const t = ((b[0][0]! - a[0][0]!) * d2[1]! - (b[0][1]! - a[0][1]!) * d2[0]!) / cross;
  return [a[0][0]! + d1[0]! * t, a[0][1]! + d1[1]! * t];
}

/**
 * Dimension an angle in the active dimension layer: three points (a leg point, the vertex, a
 * leg point; snapped and recorded as references) or two picked edges (the vertex is where their
 * lines meet, also outside the edges). The pointer chooses which of the angles is dimensioned
 * and the radius of the dimension arc; the click inserts the angle with its GIS value (the
 * field angle is typed later by clicking the value). Stored in degrees, counter-clockwise from
 * the first to the second leg point.
 */
export class DimensionAngularTool extends DimensionToolBase {
  readonly id = 'dimension-angular';
  private method: DimensionAngularMethod = 'points';
  private step: DimensionAngularStep = 'leg1';
  /** Picked points (points variant): leg, vertex, leg. */
  private points: Coordinate[] = [];
  private refs: (DimensionReference | null)[] = [];
  /** Picked edges (segments variant). */
  private segments: [Coordinate, Coordinate][] = [];
  private vertex: Coordinate | null = null;
  /** The dimensioned legs (counter-clockwise) and the arc radius in metres. */
  private legs: [Coordinate, Coordinate] | null = null;
  private legRefs: [DimensionReference | null, DimensionReference | null] = [null, null];
  private radius = 0;

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return dimensionAngularMethod(options) !== null && super.canActivate(ctx, options);
  }

  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  override getInputRequest(): InputRequest {
    return this.step === 'arc' ? 'value' : null;
  }

  override getPrompt(): string {
    return DIMENSION_ANGULAR_PROMPTS[this.step];
  }

  override isIdle(): boolean {
    return this.step === 'leg1' || this.step === 'segment1';
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = dimensionAngularMethod(options) ?? 'points';
    super.activate(ctx, options);
  }

  protected reset(): void {
    this.points = [];
    this.refs = [];
    this.segments = [];
    this.vertex = null;
    this.legs = null;
    this.radius = 0;
    this.goTo(this.method === 'segments' ? 'segment1' : 'leg1');
  }

  override cancel(): void {
    this.reset();
  }

  override removeLastPoint(): boolean {
    switch (this.step) {
      case 'arc':
        if (this.method === 'segments') {
          this.segments.pop();
          this.vertex = null;
          this.goTo('segment2');
        } else {
          this.points.pop();
          this.refs.pop();
          this.goTo('leg2');
        }
        this.legs = null;
        return true;
      case 'leg2':
      case 'vertex':
        this.points.pop();
        this.refs.pop();
        this.goTo(this.step === 'leg2' ? 'vertex' : 'leg1');
        return true;
      case 'segment2':
        this.segments.pop();
        this.goTo('segment1');
        return true;
      default:
        return false;
    }
  }

  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'segment1' || this.step === 'segment2') return false;
    this.onClick(coordinate, coordinate);
    return true;
  }

  /** The arc step takes the radius and inserts. */
  override handleLength(metres: number): boolean {
    if (this.step !== 'arc' || !(metres > 0)) return false;
    if (!this.legs) this.chooseSector(null);
    this.radius = metres;
    this.insert();
    return true;
  }

  /** Relative input is measured from the vertex once it is known, else from the first leg point. */
  override referencePoint(): number[] | null {
    return this.vertex ?? this.points[1] ?? this.points[0] ?? null;
  }

  protected picked(): Coordinate[] {
    return this.vertex ? [...this.points, this.vertex] : this.points;
  }

  protected dimension(): Feature | null {
    if (!this.legs || !this.vertex || !(this.radius > 0)) return null;
    const [leg1, leg2] = this.legs;
    const refs = this.legRefs;
    return new Feature({
      geometry: new LineString([leg1, this.vertex, leg2]),
      dimType: 'angular',
      offset: Math.round(this.radius * 1000) / 1000,
      ...(refs.some((r) => r !== null) || this.refs[1]
        ? { refs: [refs[0], this.refs[1] ?? null, refs[1]] }
        : {}),
    });
  }

  protected onClick(coordinate: Coordinate, raw: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ref = referenceFor(ctx.getSnap?.() ?? null, coordinate);
    switch (this.step) {
      case 'leg1':
      case 'vertex':
      case 'leg2': {
        const last = this.points[this.points.length - 1];
        if (last && last[0] === coordinate[0] && last[1] === coordinate[1]) return;
        this.points.push(coordinate);
        this.refs.push(ref);
        if (this.step === 'leg1') this.goTo('vertex');
        else if (this.step === 'vertex') this.goTo('leg2');
        else {
          this.vertex = this.points[1]!;
          this.radius = 0;
          this.goTo('arc');
        }
        return;
      }
      case 'segment1':
      case 'segment2': {
        const segment = this.pick(ctx, raw);
        if (!segment) return;
        if (this.step === 'segment1') {
          this.segments = [segment];
          this.goTo('segment2');
          return;
        }
        const vertex = intersection(this.segments[0]!, segment);
        if (!vertex) return; // parallel: wait for another edge
        this.segments.push(segment);
        this.vertex = vertex;
        this.radius = 0;
        this.goTo('arc');
        return;
      }
      case 'arc':
        this.place(coordinate);
        if (this.radius > 0) this.insert();
        return;
      default:
    }
  }

  protected onMove(coordinate: Coordinate): void {
    if (this.step === 'arc') this.place(coordinate);
    this.refresh();
  }

  /** The sector the pointer is in and its distance from the vertex as the arc radius. */
  private place(coordinate: Coordinate): void {
    const ctx = this.ctx;
    const vertex = this.vertex;
    if (!ctx || !vertex) return;
    this.chooseSector(coordinate);
    const distance = Math.hypot(coordinate[0]! - vertex[0]!, coordinate[1]! - vertex[1]!);
    this.radius = distance / unitsPerMetre(ctx.getProjection(), vertex);
  }

  /** Orient the legs counter-clockwise around the sector containing `pointer` (inner angle when none). */
  private chooseSector(pointer: Coordinate | null): void {
    const vertex = this.vertex!;
    const rays: { angle: number; point: Coordinate; ref: DimensionReference | null }[] = [];
    if (this.method === 'points') {
      rays.push(
        {
          angle: angleOf(vertex, this.points[0]!),
          point: this.points[0]!,
          ref: this.refs[0] ?? null,
        },
        {
          angle: angleOf(vertex, this.points[2]!),
          point: this.points[2]!,
          ref: this.refs[2] ?? null,
        },
      );
    } else {
      // Both directions of each edge's line; a leg point lies on the edge where possible.
      for (const [a, b] of this.segments) {
        const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
        const base = angleOf(a, b);
        for (const angle of [base, base + Math.PI]) {
          const ray = unit(angle);
          const reach = Math.max(
            (a[0]! - vertex[0]!) * ray[0]! + (a[1]! - vertex[1]!) * ray[1]!,
            (b[0]! - vertex[0]!) * ray[0]! + (b[1]! - vertex[1]!) * ray[1]!,
          );
          const along = reach > length * 1e-6 ? reach : length;
          rays.push({
            angle,
            point: [vertex[0]! + ray[0]! * along, vertex[1]! + ray[1]! * along],
            ref: null,
          });
        }
      }
    }
    // The smallest counter-clockwise sector from a ray of one leg to a ray of the other that
    // holds the pointer (without a pointer: the smallest, the inner angle).
    const ccw = (from: number, to: number) => {
      const sweep = (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return sweep === 0 ? 2 * Math.PI : sweep;
    };
    const target = pointer ? angleOf(vertex, pointer) : null;
    const legOf = (i: number) => (this.method === 'points' ? i : Math.floor(i / 2));
    let best: [number, number] | null = null;
    let bestSweep = Infinity;
    for (let i = 0; i < rays.length; i++) {
      for (let j = 0; j < rays.length; j++) {
        if (legOf(i) === legOf(j)) continue;
        const sweep = ccw(rays[i]!.angle, rays[j]!.angle);
        const contains = target === null || ccw(rays[i]!.angle, target) <= sweep;
        if (contains && sweep < bestSweep) {
          bestSweep = sweep;
          best = [i, j];
        }
      }
    }
    if (!best) return;
    const [i, j] = best;
    this.legs = [rays[i]!.point, rays[j]!.point];
    this.legRefs = [rays[i]!.ref, rays[j]!.ref];
  }

  /** The nearest edge of a visible, non-dimension object under the raw pointer. */
  private pick(ctx: ToolContext, raw: Coordinate): [Coordinate, Coordinate] | null {
    const tolerance = pickTolerance(ctx);
    const extent = buffer(boundingExtent([raw]), tolerance);
    let best: [Coordinate, Coordinate] | null = null;
    let bestDistance = tolerance;
    for (const info of ctx.layers.list()) {
      if (!info.visible || ctx.layers.getConfig(info.id).dimension) continue;
      ctx.layers.getSource(info.id).forEachFeatureInExtent(extent, (feature) => {
        const geometry = feature.getGeometry();
        const edge = geometry && nearestEdge(geometry, raw, tolerance);
        const segment = edge && segmentAt(geometry, edge.path);
        if (!edge || !segment) return;
        const distance = Math.hypot(edge.foot[0]! - raw[0]!, edge.foot[1]! - raw[1]!);
        if (distance <= bestDistance) {
          bestDistance = distance;
          best = [segment[0].slice(), segment[1].slice()];
        }
      });
    }
    return best;
  }

  private goTo(step: DimensionAngularStep): void {
    this.step = step;
    this.refresh(true);
  }
}
