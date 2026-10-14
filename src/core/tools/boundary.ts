import type { Coordinate } from 'ol/coordinate';
import { boundingExtent, buffer } from 'ol/extent';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type { Command } from '../changes/commands';
import { segmentsOf, type Segment } from '../geometry/segments';
import { pickTolerance, PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { createSelectInteraction } from './select';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type BoundaryStep = 'boundary' | 'target';

/** Why a click in the target step changed nothing. */
export type BoundaryFailure = 'miss' | 'readOnly' | 'noResult' | 'noInsert' | 'rejected';

/** The prompts of a boundary tool: one per step plus the failure notices. */
export type BoundaryPrompts = Record<BoundaryStep | BoundaryFailure, string>;

/** The line clicked in the target step: the feature, the clicked part and its index. */
export interface BoundaryTarget {
  feature: Feature;
  layerId: string;
  geometry: LineString | MultiLineString;
  /** Index of the clicked part of a MultiLineString; 0 for a LineString. */
  partIndex: number;
  part: Coordinate[];
}

/** What a boundary tool makes of a clicked line: commands to run and a preview, or a failure. */
export type BoundaryOutcome =
  { command: Command; preview: Geometry[] } | { failure: BoundaryFailure };

/** The parts of a line geometry. */
function partsOf(geometry: LineString | MultiLineString): Coordinate[][] {
  return geometry instanceof LineString ? [geometry.getCoordinates()] : geometry.getCoordinates();
}

/**
 * Base of the trim and extend tools: first the boundary (the selection when the tool starts,
 * else one picked by click), then any number of clicks on lines, each changing the clicked line
 * against the boundary in one command. The selection is cleared once a line has been changed;
 * the tool keeps the boundary and draws it on its preview layer until Enter or Escape. Lines are
 * hit with the raw pointer position, so snapping never moves the click onto another line.
 */
export abstract class BoundaryTool extends BaseTool {
  protected abstract readonly prompts: BoundaryPrompts;
  private step: BoundaryStep = 'boundary';
  private boundary: Feature[] = [];
  private notice: BoundaryFailure | null = null;
  private select: Interaction | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private readonly hoverSource = new VectorSource<Feature>();
  private hoverLayer: VectorLayer<VectorSource<Feature>> | null = null;
  private suspended = false;

  /** The change for a clicked line against the cutting edges, at the raw click position. */
  protected abstract outcome(
    ctx: ToolContext,
    target: BoundaryTarget,
    cutters: Segment[],
    click: Coordinate,
  ): BoundaryOutcome;

  override canActivate(): boolean {
    return true;
  }

  override getPrompt(): string {
    const prompt = this.prompts[this.step];
    return this.notice ? `${this.prompts[this.notice]} ${prompt}` : prompt;
  }

  /** The boundary features the tool works against; empty in the boundary step. */
  getBoundary(): Feature[] {
    return this.boundary.slice();
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.select = createSelectInteraction(ctx);
    this.pointer = new PointPickInteraction({
      click: (_coordinate, raw) => this.onClick(raw),
      move: (_coordinate, raw) => this.onMove(raw),
    });
    this.preview = createPreviewLayer(this.previewSource);
    this.hoverLayer = createPreviewLayer(this.hoverSource);
    ctx.map.addLayer(this.preview);
    ctx.map.addLayer(this.hoverLayer);
    this.interactions = [this.select, this.pointer];
    super.activate(ctx, options);
    this.takeBoundary();
  }

  /** Switching tools keeps the selection: no `cancel` here. */
  override deactivate(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.selection.collection.un('add', this.onSelectionChange);
      ctx.selection.collection.un('remove', this.onSelectionChange);
      if (this.preview) ctx.map.removeLayer(this.preview);
      if (this.hoverLayer) ctx.map.removeLayer(this.hoverLayer);
    }
    this.previewSource.clear();
    this.hoverSource.clear();
    this.removeInteractions();
    this.select = null;
    this.pointer = null;
    this.preview = null;
    this.hoverLayer = null;
    this.boundary = [];
    this.notice = null;
    this.step = 'boundary';
  }

  /** Enter is done with this boundary: back to picking one. */
  override finish(): void {
    if (this.step === 'target') this.reset();
  }

  /** Escape drops the boundary, or clears the selection while picking one. */
  override cancel(): void {
    if (this.step === 'target') this.reset();
    else this.ctx?.selection.clear();
  }

  override removeLastPoint(): boolean {
    if (this.step === 'boundary') return false;
    this.reset();
    return true;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  private reset(): void {
    this.ctx?.selection.clear();
    this.goTo('boundary');
  }

  /** The selected features with segments become the boundary and the tool moves on. */
  private takeBoundary(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const boundary = ctx.selection.get().filter((feature) => {
      const geometry = feature.getGeometry();
      return geometry !== undefined && segmentsOf(geometry).length > 0;
    });
    if (boundary.length === 0) {
      this.goTo('boundary');
      return;
    }
    this.boundary = boundary;
    this.goTo('target');
  }

  private cutters(): Segment[] {
    return this.boundary.flatMap((feature) => {
      const geometry = feature.getGeometry();
      return geometry ? segmentsOf(geometry) : [];
    });
  }

  /** The nearest line within the pick radius of the raw pointer position, boundary excluded. */
  private hit(ctx: ToolContext, raw: Coordinate): BoundaryTarget | null {
    const tolerance = pickTolerance(ctx);
    const extent = buffer(boundingExtent([raw]), tolerance);
    let best: BoundaryTarget | null = null;
    let bestDistance = tolerance;
    for (const info of ctx.layers.list()) {
      if (!info.visible) continue;
      ctx.layers.getSource(info.id).forEachFeatureInExtent(extent, (feature) => {
        const geometry = feature.getGeometry();
        if (!(geometry instanceof LineString || geometry instanceof MultiLineString)) return;
        if (this.boundary.includes(feature)) return;
        const parts = partsOf(geometry);
        parts.forEach((part, partIndex) => {
          if (part.length < 2) return;
          const closest = new LineString(part).getClosestPoint(raw);
          const distance = Math.hypot(closest[0]! - raw[0]!, closest[1]! - raw[1]!);
          if (distance <= bestDistance) {
            bestDistance = distance;
            best = { feature, layerId: info.id, geometry, partIndex, part };
          }
        });
      });
    }
    return best;
  }

  private evaluate(raw: Coordinate): { target: BoundaryTarget; outcome: BoundaryOutcome } | null {
    const ctx = this.ctx;
    if (!ctx || this.step !== 'target') return null;
    const target = this.hit(ctx, raw);
    if (!target) return null;
    if (!ctx.canUpdate(target.feature)) return { target, outcome: { failure: 'readOnly' } };
    return { target, outcome: this.outcome(ctx, target, this.cutters(), raw) };
  }

  private onClick(raw: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx || this.step !== 'target') return;
    const result = this.evaluate(raw);
    let notice: BoundaryFailure | null;
    if (!result) notice = 'miss';
    else if ('failure' in result.outcome) notice = result.outcome.failure;
    else if (!ctx.execute(result.outcome.command)) notice = 'rejected';
    else {
      notice = null;
      // Done with this line: the selection is cleared, the boundary stays for the next click.
      ctx.selection.clear();
    }
    this.hoverSource.clear(true);
    this.setNotice(notice);
  }

  private onMove(raw: Coordinate): void {
    this.hoverSource.clear(true);
    const result = this.evaluate(raw);
    if (result && 'preview' in result.outcome) {
      for (const geometry of result.outcome.preview)
        this.hoverSource.addFeature(new Feature(geometry));
    }
  }

  private onSelectionChange = (): void => {
    // Look after the batch: a `set` removes and adds. Only the boundary step listens; in the
    // target step the tool clears the selection itself.
    queueMicrotask(() => {
      if (this.ctx && this.step === 'boundary') this.takeBoundary();
    });
  };

  private setNotice(notice: BoundaryFailure | null): void {
    if (notice === this.notice) return;
    this.notice = notice;
    this.ctx?.promptChanged();
  }

  private applyActivity(): void {
    this.select?.setActive(!this.suspended && this.step === 'boundary');
    this.pointer?.setActive(!this.suspended && this.step === 'target');
  }

  private goTo(step: BoundaryStep): void {
    this.step = step;
    this.notice = null;
    if (step === 'boundary') this.boundary = [];
    this.previewSource.clear(true);
    this.hoverSource.clear(true);
    for (const feature of this.boundary) {
      const geometry = feature.getGeometry();
      if (geometry) this.previewSource.addFeature(new Feature(geometry.clone()));
    }
    this.applyActivity();
    this.ctx?.promptChanged();
  }
}
