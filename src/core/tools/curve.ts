import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { bezierLineString, chordHandles, type CubicBezier } from '../geometry/bezier';
import { unitsPerMetre } from '../measure';
import { lineTarget, onDrawEnd } from './draw';
import { pickTolerance, PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type CurveStep = 'start' | 'end' | 'shape' | 'handle';
export type CurveHandle = 'start' | 'end';

/** Prompt shown by the input bar for each step. */
export const CURVE_PROMPTS: Record<CurveStep, string> = {
  start: 'Start point: click on the map or type x,y',
  end: 'End point: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the start; Escape drops the start',
  shape:
    'Click a handle to change the entry or exit angle; Enter inserts the curve; Escape drops the end point',
  handle:
    'Handle: click where it goes, or type x,y · @dx,dy · @distance<angle · distance relative to its end point; Escape puts it back',
};

function marker(coordinate: number[], kind: 'picked' | 'hover' | null): Feature {
  const feature = new Feature(new Point(coordinate));
  if (kind) feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/**
 * Draw a curve (cubic Bézier) into the active layer (or the draft layer): start point, end
 * point, then a handle at each end controls the entry and exit angle; click a handle to pick
 * it up, click or type where it goes, as often as needed; Enter inserts the curve linearized
 * with the configured chord tolerance, like a drawn line (schema defaults, multi-part wrapping,
 * selected afterwards). The tool stays active for the next curve.
 */
export class CurveTool extends BaseTool {
  readonly id = 'curve';
  private step: CurveStep = 'start';
  private start: number[] | null = null;
  private end: number[] | null = null;
  private handles: { start: number[]; end: number[] } | null = null;
  private picked: CurveHandle | null = null;
  /** Where the picked handle was, restored by Escape. */
  private pickedFrom: number[] | null = null;
  private hovered: CurveHandle | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext): boolean {
    return lineTarget(ctx) !== null;
  }

  override getPrompt(): string {
    return CURVE_PROMPTS[this.step];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate, raw) => this.onClick(coordinate, raw),
      move: (coordinate, raw) => this.onPointerMove(coordinate, raw),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.reset();
    this.goTo('start');
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.reset();
    this.step = 'start';
  }

  /** Enter inserts the curve (a handle being placed stays where it is). */
  override finish(): void {
    const ctx = this.ctx;
    if (!ctx || !this.start || !this.end || !this.handles) return;
    if (this.step === 'handle') this.placeHandle(this.currentHandle() ?? this.handles.start);
    const target = lineTarget(ctx);
    if (!target) return;
    const curve = this.curve()!;
    const tolerance = ctx.getCurveTolerance() * unitsPerMetre(ctx.getProjection(), curve.start);
    if (onDrawEnd(ctx, target.layerId, target.layer, bezierLineString(curve, tolerance))) {
      this.reset();
      this.goTo('start');
    }
  }

  /** Escape steps back: puts a picked handle back, drops the end point, drops the start. */
  override cancel(): void {
    this.removeLastPoint();
  }

  override removeLastPoint(): boolean {
    if (this.step === 'handle') {
      if (this.picked && this.pickedFrom && this.handles)
        this.handles[this.picked] = this.pickedFrom;
      this.picked = null;
      this.pickedFrom = null;
      this.goTo('shape');
      return true;
    }
    if (this.step === 'shape') {
      this.end = null;
      this.handles = null;
      this.goTo('end');
      return true;
    }
    if (this.step === 'end') {
      this.start = null;
      this.goTo('start');
      return true;
    }
    return false;
  }

  /** A typed point is the start, the end or the picked handle's new position. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'shape') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input: the start while placing the end, the handle's end point while placing it. */
  override referencePoint(): number[] | null {
    if (this.step === 'end') return this.start;
    if (this.step === 'handle' && this.picked)
      return this.picked === 'start' ? this.start : this.end;
    return null;
  }

  /** The curve in progress, or `null` before the end point. */
  curve(): CubicBezier | null {
    if (!this.start || !this.end || !this.handles) return null;
    return {
      start: this.start,
      startHandle: this.handles.start,
      endHandle: this.handles.end,
      end: this.end,
    };
  }

  private reset(): void {
    this.start = null;
    this.end = null;
    this.handles = null;
    this.picked = null;
    this.pickedFrom = null;
    this.hovered = null;
  }

  private currentHandle(): number[] | null {
    return this.picked && this.handles ? this.handles[this.picked] : null;
  }

  private onClick(coordinate: number[], raw: number[]): void {
    if (this.step === 'shape') {
      const handle = this.handleAt(raw);
      if (!handle || !this.handles) return; // a click away from the handles does nothing
      this.picked = handle;
      this.pickedFrom = this.handles[handle];
      this.goTo('handle');
      return;
    }
    this.takePoint(coordinate);
  }

  private takePoint(coordinate: number[]): void {
    if (this.step === 'start') {
      this.start = coordinate;
      this.goTo('end');
    } else if (this.step === 'end') {
      const start = this.start!;
      if (coordinate[0] === start[0] && coordinate[1] === start[1]) return; // no chord
      this.end = coordinate;
      const { startHandle, endHandle } = chordHandles(start, coordinate);
      this.handles = { start: startHandle, end: endHandle };
      this.goTo('shape');
    } else if (this.step === 'handle') {
      this.placeHandle(coordinate);
      this.goTo('shape');
    }
  }

  private placeHandle(coordinate: number[]): void {
    if (this.picked && this.handles) this.handles[this.picked] = coordinate;
    this.picked = null;
    this.pickedFrom = null;
  }

  /** The handle within the pick tolerance of the raw pointer position, the nearer one first. */
  private handleAt(raw: number[]): CurveHandle | null {
    if (!this.ctx || !this.handles) return null;
    const tolerance = pickTolerance(this.ctx);
    const distance = (h: number[]) => Math.hypot(h[0]! - raw[0]!, h[1]! - raw[1]!);
    const candidates = (['start', 'end'] as const)
      .map((handle) => ({ handle, distance: distance(this.handles![handle]) }))
      .filter((c) => c.distance <= tolerance)
      .sort((a, b) => a.distance - b.distance);
    return candidates[0]?.handle ?? null;
  }

  private onPointerMove(coordinate: number[], raw: number[]): void {
    if (this.step === 'end' && this.start) {
      this.previewSource.clear(true);
      this.previewSource.addFeatures([
        marker(this.start, 'picked'),
        new Feature(new LineString([this.start, coordinate])),
      ]);
      return;
    }
    if (this.step === 'handle' && this.picked && this.handles) {
      this.handles[this.picked] = coordinate;
      this.renderShape();
    } else if (this.step === 'shape') {
      this.hovered = this.handleAt(raw);
      this.renderShape();
    }
  }

  /** The dashed curve, the handle legs and the markers (ends picked, handles hover-able). */
  private renderShape(): void {
    const ctx = this.ctx;
    const curve = this.curve();
    this.previewSource.clear(true);
    if (!ctx || !curve) return;
    const tolerance = ctx.getCurveTolerance() * unitsPerMetre(ctx.getProjection(), curve.start);
    const active = this.picked ?? this.hovered;
    this.previewSource.addFeatures([
      new Feature(bezierLineString(curve, tolerance)),
      new Feature(new LineString([curve.start, curve.startHandle])),
      new Feature(new LineString([curve.end, curve.endHandle])),
      marker(curve.start, 'picked'),
      marker(curve.end, 'picked'),
      marker(curve.startHandle, active === 'start' ? 'hover' : null),
      marker(curve.endHandle, active === 'end' ? 'hover' : null),
    ]);
  }

  private goTo(step: CurveStep): void {
    this.step = step;
    this.hovered = null;
    this.previewSource.clear(true);
    if (step === 'shape' || step === 'handle') this.renderShape();
    this.ctx?.promptChanged();
  }
}
