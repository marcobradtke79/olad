import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { insertFeature } from '../changes/commands';
import type { ResolvedDimensionConfig, ResolvedLayerConfig } from '../config/types';
import { decimalSeparator, formatDimensionNumber } from '../dimensions/format';
import { dimensionValues } from '../dimensions/values';
import { dimensionStyleFunction } from '../layers/dimension';
import { unitsPerMetre } from '../measure';
import { defaultProperties } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

/** Variants of the linear dimension tool (`ToolOptions.method`). */
export const DIMENSION_LINEAR_METHODS = ['aligned', 'rotated'] as const;
export type DimensionLinearMethod = (typeof DIMENSION_LINEAR_METHODS)[number];
export const DEFAULT_DIMENSION_LINEAR_METHOD: DimensionLinearMethod = 'aligned';

export type DimensionLinearStep = 'first' | 'second' | 'line' | 'value';

/** Prompt shown by the input bar for each step; `{gis}` is the measured value. */
export const DIMENSION_LINEAR_PROMPTS: Record<DimensionLinearStep, string> = {
  first: 'First point of the dimension: click (snaps to objects) or type x,y',
  second:
    'Second point: click, or type x,y · @dx,dy · @distance<angle relative to the first point; Escape drops the dimension',
  line: 'Position of the dimension line: click, or type the offset in {unit}; Backspace steps back',
  value:
    'Field value in {unit} [Enter keeps {gis}], or t <text> for a free text; Backspace steps back',
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

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function marker(coordinate: number[]): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, 'picked');
  return feature;
}

/**
 * Draw a linear dimension into the active dimension layer: two measured points (snapped like
 * every tool point), the position of the dimension line (pointer or typed offset), then the
 * field value (Enter keeps the GIS value, a typed length is the field value, `t <text>` a free
 * text). `aligned` measures the true distance, `rotated` the distance along the straightedge.
 * The dimension is inserted as one command and selected; the tool stays active.
 */
export class DimensionLinearTool extends BaseTool {
  readonly id = 'dimension-linear';
  private method: DimensionLinearMethod = DEFAULT_DIMENSION_LINEAR_METHOD;
  private step: DimensionLinearStep = 'first';
  private points: number[][] = [];
  /** Offset of the dimension line in metres, left of the measured direction positive. */
  private offset = 0;
  /** Direction of a rotated dimension in degrees, taken from the straightedge at the second point. */
  private rotation = 0;
  private pointer: PointPickInteraction | null = null;
  private markers: VectorLayer<VectorSource<Feature>> | null = null;
  private dimensionLayer: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly markerSource = new VectorSource<Feature>();
  private readonly dimensionSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return dimensionLinearMethod(options) !== null && dimensionTarget(ctx) !== null;
  }

  /** Reports the variant in effect, so the toolbar can mirror it. */
  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  /** The offset and the field value are typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'line' || this.step === 'value' ? 'value' : null;
  }

  override getPrompt(): string {
    const prompt = DIMENSION_LINEAR_PROMPTS[this.step];
    if (this.step !== 'value' || !this.ctx) return prompt;
    const target = dimensionTarget(this.ctx);
    const gis = this.gisValue();
    if (!target || gis === null) return prompt;
    const decimal = decimalSeparator(this.ctx.getLocale());
    return prompt.replace(
      '{gis}',
      formatDimensionNumber(gis, target.layer.dimension.preset, decimal),
    );
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
    this.step = 'first';
  }

  /** Escape drops the dimension in progress. */
  override cancel(): void {
    if (this.points.length > 0) this.reset();
  }

  /** Enter in the value step keeps the GIS value. */
  override finish(): void {
    if (this.step === 'value') this.insert(null, null);
  }

  /** Backspace steps back one step. */
  override removeLastPoint(): boolean {
    if (this.step === 'value') this.goTo('line');
    else if (this.step === 'line') {
      this.points.pop();
      this.goTo('second');
    } else if (this.step === 'second') this.reset();
    else return false;
    return true;
  }

  /** A typed point is the next measured point, or (in the line step) the dimension line's position. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'value') return false;
    this.take(coordinate);
    return true;
  }

  /** The line step takes the offset, the value step the field value. */
  override handleLength(metres: number): boolean {
    if (this.step === 'line' && metres >= 0) {
      this.offset = Math.sign(this.offset || 1) * metres;
      this.goTo('value');
      this.drawDimension();
      return true;
    }
    if (this.step === 'value' && metres > 0) {
      this.insert(metres, null);
      return true;
    }
    return false;
  }

  /** `t <text>` in the value step inserts the dimension with a free text. */
  override handleText(text: string): boolean {
    if (this.step !== 'value') return false;
    const match = /^t\s+(.+)$/i.exec(text.trim());
    if (!match) return false;
    this.insert(null, match[1]!);
    return true;
  }

  /** Relative input is measured from the first point. */
  override referencePoint(): number[] | null {
    return this.points[0] ?? null;
  }

  private reset(): void {
    this.points = [];
    this.offset = 0;
    this.goTo('first');
  }

  private take(coordinate: number[]): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.step === 'first') {
      this.points = [coordinate];
      this.goTo('second');
    } else if (this.step === 'second') {
      const first = this.points[0]!;
      if (coordinate[0] === first[0] && coordinate[1] === first[1]) return;
      this.rotation = ctx.getStraightedgeAngle();
      this.points = [first, coordinate];
      if (this.method === 'rotated' && Math.abs(this.along()) < 1e-9) {
        this.points = [first];
        return; // nothing measured along the straightedge: wait for another point
      }
      this.offset = 0;
      this.goTo('line');
    } else if (this.step === 'line') {
      this.offset = this.offsetAt(coordinate);
      this.goTo('value');
      this.drawDimension();
    }
  }

  /** Unit vector of the measured direction (map units). */
  private direction(): number[] {
    const [p1, p2] = this.points as [number[], number[]];
    if (this.method === 'rotated') {
      const angle = (this.rotation * Math.PI) / 180;
      return [Math.cos(angle), Math.sin(angle)];
    }
    const length = Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!);
    return [(p2[0]! - p1[0]!) / length, (p2[1]! - p1[1]!) / length];
  }

  /** Signed distance from p1 to p2 along the direction (map units). */
  private along(): number {
    const [p1, p2] = this.points as [number[], number[]];
    const u = this.direction();
    return (p2[0]! - p1[0]!) * u[0]! + (p2[1]! - p1[1]!) * u[1]!;
  }

  /** Offset in metres of a dimension line through `coordinate`. */
  private offsetAt(coordinate: number[]): number {
    const ctx = this.ctx!;
    const [p1, p2] = this.points as [number[], number[]];
    const u = this.direction();
    const across = (coordinate[0]! - p1[0]!) * -u[1]! + (coordinate[1]! - p1[1]!) * u[0]!;
    const mid = [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2];
    return across / unitsPerMetre(ctx.getProjection(), mid);
  }

  /** The feature of the dimension in progress (both points fixed). */
  private feature(): Feature | null {
    if (this.points.length < 2) return null;
    return new Feature({
      geometry: new LineString(this.points.map((p) => p.slice())),
      dimType: this.method,
      offset: round(this.offset, 3),
      ...(this.method === 'rotated' ? { rotation: this.rotation } : {}),
    });
  }

  private gisValue(): number | null {
    const ctx = this.ctx;
    const target = ctx && dimensionTarget(ctx);
    const feature = this.feature();
    if (!ctx || !target || !feature) return null;
    return dimensionValues(feature, target.layer.dimension, ctx.getProjection())?.gis ?? null;
  }

  private insert(fieldValue: number | null, text: string | null): void {
    const ctx = this.ctx;
    const target = ctx && dimensionTarget(ctx);
    const drawn = this.feature();
    const gis = this.gisValue();
    if (!ctx || !target || !drawn || gis === null) return;
    const feature = new Feature({
      ...defaultProperties(target.layer),
      ...drawn.getProperties(),
      gisValue: round(gis, 3),
      fieldValue,
      text,
    });
    this.reset();
    if (ctx.execute(insertFeature(target.layerId, feature))) ctx.selection.set([feature]);
  }

  private onPointerMove(coordinate: number[]): void {
    if (!this.ctx || this.points.length === 0) return;
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
    const feature = this.step === 'line' || this.step === 'value' ? this.feature() : null;
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
