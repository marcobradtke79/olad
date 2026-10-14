import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type { ResolvedLayerConfig } from '../config/types';
import { offsetGeometry, offsetSide } from '../geometry/offset';
import { unitsPerMetre } from '../measure';
import { drawType, onDrawEnd } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { createSelectInteraction } from './select';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

export type OffsetStep = 'select' | 'distance' | 'side';

/** Prompt shown by the input bar for each step; `distanceAgain` once a distance is remembered. */
export const OFFSET_PROMPTS: Record<OffsetStep | 'distanceAgain', string> = {
  select: 'Select the object to offset: click a line or polygon',
  distance: 'Offset distance: type the distance in {unit} (or with a unit: 5 ft); Escape goes back',
  distanceAgain:
    'Offset distance <{distance}>: type the distance in {unit} (or with its unit: 5 ft), Enter keeps {distance}; Escape goes back',
  side: 'Side: click on the side the offset goes to (inside or outside of a polygon); Escape goes back',
};

const OFFSETABLE = new Set(['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']);

/** Whether a feature's geometry can be offset (lines and polygons, single or multi-part). */
export function isOffsetable(feature: Feature): boolean {
  const geometry = feature.getGeometry();
  return geometry !== undefined && OFFSETABLE.has(geometry.getType());
}

export interface OffsetTarget {
  layerId: string;
  layer: ResolvedLayerConfig;
}

/**
 * The layer an offset copy goes to: the source object's layer when it allows inserts and takes
 * the geometry, else the active layer under the same rule, else the draft layer; `null` when
 * none fits.
 */
export function offsetTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
  sourceLayerId: string | undefined,
  geometry: Geometry,
): OffsetTarget | null {
  const wanted = drawType(geometry.getType() as Parameters<typeof drawType>[0]);
  const fits = (layerId: string | null | undefined): OffsetTarget | null => {
    if (!layerId || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
      return null;
    }
    const layer = ctx.layers.getConfig(layerId);
    const type = drawType(layer.geometryType);
    return type === null || type === wanted ? { layerId, layer } : null;
  };
  return fits(sourceLayerId) ?? fits(ctx.getActiveLayer()) ?? fits(ctx.getDraftLayer());
}

/**
 * CAD-style offset in three steps: select one line or polygon (skipped when exactly one is
 * selected), type the offset distance in metres, then click on the side the copy goes to
 * (left or right of a line, inside or outside of a polygon). The parallel copy is inserted into
 * the source layer (else the active or draft layer) like a drawn geometry and selected, so
 * Enter and another click make the next parallel; the distance is remembered for the session.
 */
export class OffsetTool extends BaseTool {
  readonly id = 'offset';
  private step: OffsetStep = 'select';
  /** Remembered across activations, in metres; `null` until typed once. */
  private distance: number | null = null;
  private select: Interaction | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  /** The distance step expects the offset typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'distance' ? 'value' : null;
  }

  override getPrompt(): string {
    if (this.step === 'distance' && this.distance !== null) {
      return OFFSET_PROMPTS.distanceAgain.replaceAll(
        '{distance}',
        this.ctx ? this.ctx.formatLength(this.distance) : `${this.distance} m`,
      );
    }
    return OFFSET_PROMPTS[this.step];
  }

  /** The offset distance in metres typed last, or `null`. */
  getDistance(): number | null {
    return this.distance;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.select = createSelectInteraction(ctx);
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takeSide(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.select, this.pointer];
    super.activate(ctx, options);
    this.goTo(this.source() ? 'distance' : 'select');
  }

  /** Switching tools keeps the selection: no `cancel` here. */
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
    this.step = 'select';
  }

  /** Enter confirms the remembered distance. */
  override finish(): void {
    if (this.step === 'distance' && this.distance !== null) this.goTo('side');
  }

  /** Escape steps back; from the distance step it also clears the selection. */
  override cancel(): void {
    if (this.step === 'side') {
      this.goTo('distance');
    } else if (this.step === 'distance') {
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

  /** A typed positive length (in metres, converted by the editor) is the offset distance while the tool asks for it. */
  override handleLength(value: number): boolean {
    if (this.step !== 'distance' || !(value > 0) || !Number.isFinite(value)) return false;
    this.distance = value;
    this.goTo('side');
    return true;
  }

  /** A typed point picks the side. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step !== 'side') return false;
    this.takeSide(coordinate);
    return true;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  /** The one object to offset: exactly one selected line or polygon (read-only is fine). */
  private source(): Feature | null {
    const selected = this.ctx?.selection.get() ?? [];
    return selected.length === 1 && isOffsetable(selected[0]!) ? selected[0]! : null;
  }

  /** The offset copy for a side point, or `null` when the point is on the line or it collapses. */
  private offsetFor(coordinate: number[]): Geometry | null {
    const ctx = this.ctx;
    const source = this.source();
    const geometry = source?.getGeometry();
    if (!ctx || !geometry || this.distance === null) return null;
    const sign = offsetSide(geometry, coordinate);
    if (sign === null) return null;
    const anchor = geometry.getClosestPoint(coordinate);
    const units = this.distance * unitsPerMetre(ctx.getProjection(), anchor);
    return offsetGeometry(geometry, sign * units);
  }

  private takeSide(coordinate: number[]): void {
    const ctx = this.ctx;
    const source = this.source();
    const copy = this.offsetFor(coordinate);
    if (!ctx || !source || !copy) return;
    const target = offsetTarget(ctx, ctx.layers.layerOf(source), copy);
    if (!target) return;
    // The copy becomes the selection; the selection listener moves on to the next distance.
    if (onDrawEnd(ctx, target.layerId, target.layer, copy)) this.goTo('select');
  }

  private onPointerMove(coordinate: number[]): void {
    if (this.step !== 'side') return;
    this.previewSource.clear(true);
    const copy = this.offsetFor(coordinate);
    if (copy) this.previewSource.addFeature(new Feature(copy));
  }

  private onSelectionChange = (): void => {
    // Look after the batch: a `set` removes and adds.
    queueMicrotask(() => {
      if (!this.ctx) return;
      const source = this.source();
      if (this.step === 'select' && source) this.goTo('distance');
      else if (this.step !== 'select' && !source) this.goTo('select');
    });
  };

  private applyActivity(): void {
    this.select?.setActive(!this.suspended && this.step === 'select');
    this.pointer?.setActive(!this.suspended && this.step === 'side');
  }

  private goTo(step: OffsetStep): void {
    this.step = step;
    this.previewSource.clear(true);
    this.applyActivity();
    this.ctx?.promptChanged();
    // A selection carried into the select step (the copy just inserted) continues at once.
    if (step === 'select' && this.source()) this.goTo('distance');
  }
}
