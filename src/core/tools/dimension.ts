import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { insertFeature } from '../changes/commands';
import type { ResolvedDimensionConfig, ResolvedLayerConfig } from '../config/types';
import { referenceFor, type DimensionReference } from '../dimensions/references';
import { dimensionValues } from '../dimensions/values';
import { DIMENSION_PAPER_MM, dimensionStyleFunction } from '../layers/dimension';
import { unitsPerMetre } from '../measure';
import { defaultProperties } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

/** Variants of the linear dimension tool (`ToolOptions.method`). */
export const DIMENSION_LINEAR_METHODS = [
  'aligned',
  'rotated',
  'chain',
  'baseline',
  'running',
  'tie',
] as const;
export type DimensionLinearMethod = (typeof DIMENSION_LINEAR_METHODS)[number];
export const DEFAULT_DIMENSION_LINEAR_METHOD: DimensionLinearMethod = 'aligned';

export type DimensionLinearStep = 'first' | 'origin' | 'second' | 'line' | 'next';

/** Prompt shown by the input bar for each step. */
export const DIMENSION_LINEAR_PROMPTS: Record<DimensionLinearStep, string> = {
  first: 'First point of the dimension: click (snaps to objects) or type x,y',
  origin: 'Origin of the dimensions: click (snaps to objects) or type x,y',
  second:
    'Second point: click, or type x,y · @dx,dy · @distance<angle relative to the first point; Escape drops the dimension',
  line: 'Position of the dimension line: click, or type the offset in {unit}; Backspace steps back',
  next: 'Next point: click or type (relative to the last point); Enter or Escape ends',
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function dimensionLinearMethod(options: ToolOptions = {}): DimensionLinearMethod | null {
  if (options.method === undefined) return DEFAULT_DIMENSION_LINEAR_METHOD;
  return (DIMENSION_LINEAR_METHODS as readonly string[]).includes(options.method)
    ? (options.method as DimensionLinearMethod)
    : null;
}

export interface DimensionTarget {
  layerId: string;
  layer: ResolvedLayerConfig & { dimension: ResolvedDimensionConfig };
}

/**
 * Where a dimension goes: the active layer, when it is a dimension layer that allows inserts.
 * `null` otherwise (dimensions never go into the draft layer, which is not a dimension layer).
 * The editor makes such a layer active when a dimension tool is activated (`pickDimensionLayer`).
 */
export function dimensionTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer'>,
): DimensionTarget | null {
  const layerId = ctx.getActiveLayer();
  if (layerId === null || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
    return null;
  }
  const layer = ctx.layers.getConfig(layerId);
  return layer.dimension ? { layerId, layer: layer as DimensionTarget['layer'] } : null;
}

/**
 * The layer a dimension tool draws into: the active layer when it is a dimension layer that
 * allows inserts, else the first such layer in the layer list (configured or local), or `null`
 * when there is none. No side effects: the editor makes the pick the active layer on activation.
 */
export function pickDimensionLayer(
  layers: Pick<ToolContext['layers'], 'list' | 'has' | 'canEdit' | 'getConfig' | 'getActive'>,
): string | null {
  const isTarget = (id: string) =>
    layers.has(id) && layers.canEdit(id, 'insert') && Boolean(layers.getConfig(id).dimension);
  const active = layers.getActive();
  if (active !== null && isTarget(active)) return active;
  return layers.list().find((info) => isTarget(info.id))?.id ?? null;
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function marker(coordinate: number[]): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, 'picked');
  return feature;
}

/** Methods that draw a set of dimensions sharing a direction and a `chain` id. */
const SET_METHODS: readonly DimensionLinearMethod[] = ['chain', 'baseline', 'running'];

let chainCounter = 0;
/** A new id for a chain or baseline set. */
function chainId(): string {
  return `c-${Date.now().toString(36)}-${++chainCounter}`;
}

/** The set in progress: its direction, origin, the first line's offset and the last point. */
interface DimensionSet {
  id: string;
  rotation: number;
  origin: number[];
  originRef: DimensionReference | null;
  offset: number;
  last: number[];
  lastRef: DimensionReference | null;
  count: number;
}

/**
 * Draw linear dimensions into the active dimension layer. Every dimension: its points (snapped
 * like every tool point), then the position of the dimension line (pointer or typed offset),
 * which inserts it with its GIS value; the field value is set afterwards by clicking the value.
 * `aligned` measures the true distance, `rotated` the distance along the straightedge, `tie` a
 * survey tie distance without a dimension line (inserted with its second point). `chain`,
 * `baseline` and `running` go on after the first dimension: every further point adds a span
 * from the last point (chain, all on one line), a stacked dimension from the origin (baseline)
 * or a value on the common line from the origin (running), until Enter or Escape. Each
 * dimension is one command and is selected.
 */
export class DimensionLinearTool extends BaseTool {
  readonly id = 'dimension-linear';
  private method: DimensionLinearMethod = DEFAULT_DIMENSION_LINEAR_METHOD;
  private step: DimensionLinearStep = 'first';
  /** The points of the dimension in progress. */
  private points: number[][] = [];
  /** What each point was snapped to (`null`: typed or free), recorded as the dimension's `refs`. */
  private refs: (DimensionReference | null)[] = [];
  /** Offset of the dimension line in metres, left of the measured direction positive. */
  private offset = 0;
  /** Direction in degrees of a rotated dimension or a set. */
  private rotation = 0;
  private set: DimensionSet | null = null;
  private pointer: PointPickInteraction | null = null;
  private markers: VectorLayer<VectorSource<Feature>> | null = null;
  private dimensionLayer: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly markerSource = new VectorSource<Feature>();
  private readonly dimensionSource = new VectorSource<Feature>();

  /** Needs a dimension layer that allows inserts; the editor makes it active (`pickDimensionLayer`). */
  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return dimensionLinearMethod(options) !== null && pickDimensionLayer(ctx.layers) !== null;
  }

  /** Reports the variant in effect, so the toolbar can mirror it. */
  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  /** The offset may be typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'line' ? 'value' : null;
  }

  override getPrompt(): string {
    return DIMENSION_LINEAR_PROMPTS[this.step];
  }

  /** Nothing in progress: the first point (or origin) is still to come. */
  override isIdle(): boolean {
    return this.step === 'first' || this.step === 'origin';
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = dimensionLinearMethod(options) ?? DEFAULT_DIMENSION_LINEAR_METHOD;
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.take(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.markers = createPreviewLayer(this.markerSource);
    ctx.map.addLayer(this.markers);
    const target = dimensionTarget(ctx);
    if (target) {
      this.dimensionLayer = new VectorLayer({
        source: this.dimensionSource,
        style: dimensionStyleFunction(
          target.layer.dimension,
          {},
          () => ctx.getProjection(),
          ctx.getLocale(),
        ),
        zIndex: 1001,
      });
      this.dimensionLayer.set(PREVIEW_LAYER_PROPERTY, true);
      ctx.map.addLayer(this.dimensionLayer);
    }
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.reset();
  }

  override deactivate(): void {
    if (this.ctx) {
      if (this.markers) this.ctx.map.removeLayer(this.markers);
      if (this.dimensionLayer) this.ctx.map.removeLayer(this.dimensionLayer);
    }
    this.markerSource.clear();
    this.dimensionSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.markers = null;
    this.dimensionLayer = null;
    this.points = [];
    this.set = null;
    this.step = 'first';
  }

  /** Escape drops the dimension in progress and ends a set. */
  override cancel(): void {
    if (this.points.length > 0 || this.set) this.reset();
  }

  /** Enter ends a set while it waits for its next point. */
  override finish(): void {
    if (this.step === 'next') this.reset();
  }

  /** Backspace steps back one step; while a set waits for its next point it ends the set. */
  override removeLastPoint(): boolean {
    switch (this.step) {
      case 'next':
        this.reset();
        return true;
      case 'line':
        this.points.pop();
        this.refs.pop();
        this.goTo('second');
        return true;
      case 'second':
        this.reset();
        return true;
      default:
        return false;
    }
  }

  /** A typed point is the next measured point, or (in the line step) the dimension line's position. */
  override handleInput(coordinate: number[]): boolean {
    this.take(coordinate);
    return true;
  }

  /** The line step takes the offset (on the side the pointer last showed) and inserts. */
  override handleLength(metres: number): boolean {
    if (this.step !== 'line' || !(metres >= 0)) return false;
    this.offset = Math.sign(this.offset || 1) * metres;
    this.insert();
    return true;
  }

  /** Relative input is measured from the last point of a chain, else from the first point (the origin). */
  override referencePoint(): number[] | null {
    if (this.step === 'next' && this.set) {
      return this.method === 'chain' ? this.set.last : this.set.origin;
    }
    return this.points[0] ?? null;
  }

  private isSet(): boolean {
    return SET_METHODS.includes(this.method);
  }

  /** The stored type of the dimensions this variant draws. */
  private dimType(): 'aligned' | 'rotated' | 'running' | 'tie' {
    if (this.method === 'aligned' || this.method === 'tie') return this.method;
    return this.method === 'running' ? 'running' : 'rotated';
  }

  private reset(): void {
    this.points = [];
    this.refs = [];
    this.offset = 0;
    this.set = null;
    this.goTo(this.method === 'baseline' || this.method === 'running' ? 'origin' : 'first');
  }

  private take(coordinate: number[]): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ref = referenceFor(ctx.getSnap?.() ?? null, coordinate);
    if (this.step === 'first' || this.step === 'origin') {
      this.points = [coordinate];
      this.refs = [ref];
      this.goTo('second');
    } else if (this.step === 'second') {
      const first = this.points[0]!;
      if (coordinate[0] === first[0] && coordinate[1] === first[1]) return;
      // The direction: the straightedge for rotated, else (sets) the first two points.
      this.rotation =
        this.method === 'rotated'
          ? ctx.getStraightedgeAngle()
          : (Math.atan2(coordinate[1]! - first[1]!, coordinate[0]! - first[0]!) * 180) / Math.PI;
      this.points = [first, coordinate];
      if (Math.abs(this.along()) < 1e-9) {
        this.points = [first];
        return; // nothing measured along the direction: wait for another point
      }
      this.refs = [this.refs[0] ?? null, ref];
      this.offset = 0;
      if (this.method === 'tie') this.insert();
      else this.goTo('line');
    } else if (this.step === 'line') {
      this.offset = this.offsetAt(coordinate);
      this.insert();
    } else if (this.step === 'next' && this.set) {
      this.takeNext(ctx, this.set, coordinate, ref);
    }
  }

  /** The next point of a set: a span from the last point (chain) or from the origin. */
  private takeNext(
    ctx: ToolContext,
    set: DimensionSet,
    coordinate: number[],
    ref: DimensionReference | null,
  ): void {
    const chain = this.method === 'chain';
    const from = chain ? set.last : set.origin;
    if (coordinate[0] === from[0] && coordinate[1] === from[1]) return;
    this.points = [from, coordinate];
    if (Math.abs(this.along()) < 1e-9) {
      this.points = [];
      return;
    }
    this.refs = [chain ? set.lastRef : set.originRef, ref];
    if (this.method === 'chain') {
      // On the first span's line: shift the offset by how far this span's start lies across.
      const u = this.direction();
      const across = (from[0]! - set.origin[0]!) * -u[1]! + (from[1]! - set.origin[1]!) * u[0]!;
      this.offset = set.offset - across / unitsPerMetre(ctx.getProjection(), this.midpoint());
    } else if (this.method === 'baseline') {
      const target = dimensionTarget(ctx);
      const spacing = target
        ? (DIMENSION_PAPER_MM.baselineSpacing / 1000) * target.layer.dimension.referenceScale
        : 0;
      this.offset = set.offset + Math.sign(set.offset || 1) * spacing * set.count;
    } else {
      this.offset = set.offset;
    }
    this.insert();
  }

  /** Unit vector of the measured direction (map units). */
  private direction(): number[] {
    const [p1, p2] = this.points as [number[], number[]];
    if (this.dimType() === 'aligned' || this.dimType() === 'tie') {
      const length = Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!);
      return [(p2[0]! - p1[0]!) / length, (p2[1]! - p1[1]!) / length];
    }
    const angle = (this.rotation * Math.PI) / 180;
    return [Math.cos(angle), Math.sin(angle)];
  }

  /** Signed distance from p1 to p2 along the direction (map units). */
  private along(): number {
    const [p1, p2] = this.points as [number[], number[]];
    const u = this.direction();
    return (p2[0]! - p1[0]!) * u[0]! + (p2[1]! - p1[1]!) * u[1]!;
  }

  private midpoint(): number[] {
    const [p1, p2] = this.points as [number[], number[]];
    return [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2];
  }

  /** Offset in metres of a dimension line through `coordinate`. */
  private offsetAt(coordinate: number[]): number {
    const ctx = this.ctx!;
    const p1 = this.points[0]!;
    const u = this.direction();
    const across = (coordinate[0]! - p1[0]!) * -u[1]! + (coordinate[1]! - p1[1]!) * u[0]!;
    return across / unitsPerMetre(ctx.getProjection(), this.midpoint());
  }

  /** The feature of the dimension in progress (both points fixed). */
  private feature(): Feature | null {
    if (this.points.length < 2) return null;
    const type = this.dimType();
    return new Feature({
      geometry: new LineString(this.points.map((p) => p.slice())),
      dimType: type,
      offset: type === 'tie' ? 0 : round(this.offset, 3),
      ...(type === 'rotated' || type === 'running' ? { rotation: round(this.rotation, 6) } : {}),
      ...(this.isSet() ? { chain: this.set?.id ?? null } : {}),
      // What the points were snapped to, so the dimension can tell when they move.
      ...(this.refs.some((ref) => ref !== null)
        ? { refs: [this.refs[0] ?? null, this.refs[1] ?? null].map((r) => r && structuredClone(r)) }
        : {}),
    });
  }

  private gisValue(): number | null {
    const ctx = this.ctx;
    const target = ctx && dimensionTarget(ctx);
    const feature = this.feature();
    if (!ctx || !target || !feature) return null;
    return dimensionValues(feature, target.layer.dimension, ctx.getProjection())?.gis ?? null;
  }

  /** Insert the dimension in progress with its GIS value (the field value comes later). */
  private insert(): void {
    const ctx = this.ctx;
    const target = ctx && dimensionTarget(ctx);
    if (!ctx || !target || this.points.length < 2) return;
    // The first dimension of a set starts it: its id, direction, origin and line.
    if (this.isSet() && !this.set) {
      this.set = {
        id: chainId(),
        rotation: this.rotation,
        origin: this.points[0]!,
        originRef: this.refs[0] ?? null,
        offset: this.offset,
        last: this.points[1]!,
        lastRef: this.refs[1] ?? null,
        count: 0,
      };
    }
    const drawn = this.feature();
    const gis = this.gisValue();
    if (!drawn || gis === null) return;
    const feature = new Feature({
      ...defaultProperties(target.layer),
      ...drawn.getProperties(),
      gisValue: round(gis, 3),
      fieldValue: null,
      text: null,
    });
    const set = this.set;
    if (set) {
      set.last = this.points[1]!;
      set.lastRef = this.refs[1] ?? null;
      set.count++;
      this.points = [];
      this.refs = [];
      this.goTo('next');
    } else this.reset();
    if (ctx.execute(insertFeature(target.layerId, feature))) ctx.selection.set([feature]);
  }

  private onPointerMove(coordinate: number[]): void {
    if (!this.ctx) return;
    if (this.step === 'line') this.offset = this.offsetAt(coordinate);
    this.markerSource.clear(true);
    this.markerSource.addFeatures(this.points.map(marker));
    if (this.step === 'second') {
      this.markerSource.addFeature(new Feature(new LineString([this.points[0]!, coordinate])));
    }
    this.drawDimension();
  }

  /** Draw the dimension in progress in the layer's own dimension style. */
  private drawDimension(): void {
    this.dimensionSource.clear(true);
    const shown = this.step === 'line' || this.method === 'tie';
    const feature = shown ? this.feature() : null;
    if (feature) this.dimensionSource.addFeature(feature);
  }

  private goTo(step: DimensionLinearStep): void {
    this.step = step;
    this.markerSource.clear(true);
    this.markerSource.addFeatures(this.points.map(marker));
    this.drawDimension();
    this.ctx?.promptChanged();
  }
}
