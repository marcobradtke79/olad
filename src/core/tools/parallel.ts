import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type Select from 'ol/interaction/Select';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {
  parallelPath,
  pathLength,
  stationOf,
  subPath,
  type ParallelFailure,
} from '../geometry/parallel';
import { unitsPerMetre } from '../measure';
import { lineTarget, onDrawEnd } from './draw';
import { isOffsetable } from './offset';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { createSelectInteraction } from './select';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type ParallelStep = 'select' | 'start' | 'end';

/** Prompt shown by the input bar for each step. */
export const PARALLEL_PROMPTS: Record<ParallelStep, string> = {
  select: 'Select the line or polygon to draw parallel to: click it',
  start: 'Start point of the parallel: click or type x,y; Escape picks another object',
  end: 'End of the parallel: move along the object and click, or type its length in {unit}, or x,y; Escape drops the start point',
};

const NOTICES: Record<Exclude<ParallelFailure, 'unsupported'>, string> = {
  collapsed: 'No parallel at this distance: the object bends too tightly.',
  'too-close': 'Too close to another part of the object for this distance.',
};

function marker(coordinate: Coordinate, kind: 'picked' | 'hover'): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/** The parallel being drawn: the offset path, where it starts and where it ends so far. */
interface Run {
  path: Coordinate[];
  closed: boolean;
  length: number;
  start: Coordinate;
  from: number;
  /** End station; unwrapped on a closed path so the run can pass the closing vertex. */
  to: number;
}

/**
 * Draw a line parallel to an existing line, polyline or polygon: pick the object, then a start
 * point, whose distance and side fix the parallel; the line follows the object through its
 * bends from the start to the point of the parallel nearest to the pointer (a typed number is
 * its length in metres). A click inserts it into the active layer (or the draft layer) like a
 * drawn line; the object stays the reference for the next parallel until Escape.
 */
export class ParallelTool extends BaseTool {
  readonly id = 'parallel';
  private step: ParallelStep = 'select';
  private reference: Feature | null = null;
  private run: Run | null = null;
  /** Shown in front of the prompt after a start point that gives no parallel. */
  private notice: string | null = null;
  private select: Select | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(ctx: ToolContext): boolean {
    return lineTarget(ctx) !== null;
  }

  override getPrompt(): string {
    const prompt = PARALLEL_PROMPTS[this.step];
    return this.notice ? `${this.notice} ${prompt}` : prompt;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.select = createSelectInteraction(ctx);
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.select as Interaction, this.pointer];
    super.activate(ctx, options);
    this.reference = null;
    this.goTo('select');
  }

  /** Switching tools keeps the selection. */
  override deactivate(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.selection.collection.un('add', this.onSelectionChange);
      ctx.selection.collection.un('remove', this.onSelectionChange);
      if (this.preview) ctx.map.removeLayer(this.preview);
    }
    this.previewSource.clear();
    this.removeInteractions();
    this.select = null;
    this.pointer = null;
    this.preview = null;
    this.reference = null;
    this.run = null;
    this.notice = null;
    this.step = 'select';
  }

  /** Escape steps back: the end drops the start point, the start forgets the object. */
  override cancel(): void {
    if (this.step === 'end') {
      this.goTo('start');
    } else if (this.step === 'start') {
      this.reference = null;
      this.ctx?.selection.clear();
      this.goTo('select');
    } else {
      this.ctx?.selection.clear();
    }
  }

  override removeLastPoint(): boolean {
    if (this.step === 'select') return false;
    this.cancel();
    return true;
  }

  /**
   * In the end step a typed length (metres, converted by the editor) is the length of the line, in the direction the
   * pointer pulls (along the object when it has not moved). Every number is taken there; one
   * that is not greater than 0 is ignored.
   */
  override handleLength(value: number): boolean {
    const { ctx, run } = this;
    if (!ctx || this.step !== 'end' || !run) return false;
    if (!(Number.isFinite(value) && value > 0)) return true;
    const length = value * unitsPerMetre(ctx.getProjection(), run.start);
    const sign = run.to < run.from ? -1 : 1;
    this.finishAt(this.clamp(run, run.from + sign * length));
    return true;
  }

  /** A typed point is the start point, or projected onto the parallel as its end. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'select') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input for the end is measured from the start point. */
  override referencePoint(): number[] | null {
    return this.step === 'end' ? (this.run?.start ?? null) : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  /** The one selected line or polygon (read-only is fine). */
  private selectedReference(): Feature | null {
    const selected = this.ctx?.selection.get() ?? [];
    return selected.length === 1 && isOffsetable(selected[0]!) ? selected[0]! : null;
  }

  private takePoint(coordinate: Coordinate): void {
    if (this.step === 'start') {
      const geometry = this.reference?.getGeometry();
      if (!geometry) return;
      const parallel = parallelPath(geometry, coordinate);
      if (typeof parallel === 'string') {
        if (parallel === 'unsupported') return;
        this.notice = NOTICES[parallel];
        this.ctx?.promptChanged();
        return;
      }
      const from = stationOf(parallel.path, coordinate);
      this.run = {
        path: parallel.path,
        closed: parallel.closed,
        length: pathLength(parallel.path),
        start: coordinate,
        from,
        to: from,
      };
      this.goTo('end');
    } else if (this.step === 'end' && this.run) {
      this.finishAt(this.follow(this.run, coordinate));
    }
  }

  /**
   * The end station for a pointer position: its nearest station, clamped to an open path's
   * ends; on a closed path the change since the last position is added, so the run follows the
   * pointer around the ring (at most once around).
   */
  private follow(run: Run, coordinate: Coordinate): number {
    const raw = stationOf(run.path, coordinate);
    if (!run.closed) return raw;
    const L = run.length;
    const current = ((run.to % L) + L) % L;
    let delta = raw - current;
    if (delta > L / 2) delta -= L;
    else if (delta <= -L / 2) delta += L;
    return this.clamp(run, run.to + delta);
  }

  private clamp(run: Run, to: number): number {
    if (!run.closed) return Math.min(Math.max(to, 0), run.length);
    return Math.min(Math.max(to, run.from - run.length), run.from + run.length);
  }

  private finishAt(to: number): void {
    const { ctx, run } = this;
    if (!ctx || !run) return;
    const piece = subPath(run.path, run.closed, run.from, to);
    if (!piece) return; // no length yet: wait for another point
    const target = lineTarget(ctx);
    if (!target) return;
    this.goTo('start');
    onDrawEnd(ctx, target.layerId, target.layer, new LineString(piece));
  }

  private onPointerMove(coordinate: Coordinate): void {
    const run = this.run;
    if (this.step !== 'end' || !run) return;
    run.to = this.follow(run, coordinate);
    this.previewSource.clear(true);
    const features = [marker(run.start, 'picked')];
    const piece = subPath(run.path, run.closed, run.from, run.to);
    if (piece) {
      features.push(new Feature(new LineString(piece)), marker(piece[piece.length - 1]!, 'hover'));
    }
    this.previewSource.addFeatures(features);
  }

  private onSelectionChange = (): void => {
    // Look after the batch: a `set` removes and adds.
    queueMicrotask(() => {
      if (!this.ctx || this.step !== 'select') return;
      const reference = this.selectedReference();
      if (reference) {
        this.reference = reference;
        this.goTo('start');
      }
    });
  };

  private applyActivity(): void {
    this.select?.setActive(!this.suspended && this.step === 'select');
    this.pointer?.setActive(!this.suspended && this.step !== 'select');
  }

  private goTo(step: ParallelStep): void {
    this.step = step;
    this.notice = null;
    if (step !== 'end') this.run = null;
    this.previewSource.clear(true);
    this.applyActivity();
    this.ctx?.promptChanged();
    // A suitable selection (on activation, or picked) becomes the reference at once.
    if (step === 'select') {
      const reference = this.selectedReference();
      if (reference) {
        this.reference = reference;
        this.goTo('start');
      }
    }
  }
}
