import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { insertFeature } from '../changes/commands';
import type { ResolvedLayerConfig, ResolvedTextConfig } from '../config/types';
import { textStyle } from '../layers/text';
import { unitsPerMetre } from '../measure';
import { defaultProperties, drawType, wrapForLayer } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

export type TextStep = 'point' | 'height' | 'text';

/** Prompt shown by the input bar for each step; `{height}` is the height offered. */
export const TEXT_PROMPTS: Record<TextStep, string> = {
  point: 'Insert point of the text: click or type x,y',
  height:
    'Text height <{height}>: type a value in {unit} (or with its unit: 2 m), Enter keeps it; Escape goes back',
  text: 'Text: type it and press Enter; Escape goes back',
};

const INVALID_HEIGHT = 'The text height must be greater than 0.';

export interface TextTarget {
  layerId: string;
  layer: ResolvedLayerConfig & { text: ResolvedTextConfig };
}

/**
 * Where a new text goes: the active layer, or the draft layer while none is active; it must
 * exist, allow inserts, be a text layer (`layers[].text`) and take points. `null` otherwise.
 */
export function textTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
): TextTarget | null {
  const layerId = ctx.getActiveLayer() ?? ctx.getDraftLayer();
  if (layerId === null || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
    return null;
  }
  const layer = ctx.layers.getConfig(layerId);
  if (!layer.text) return null;
  const type = drawType(layer.geometryType);
  return type === 'Point' || type === null
    ? { layerId, layer: layer as TextTarget['layer'] }
    : null;
}

/**
 * Place a text: pick the insert point, give the height in metres (Enter keeps the one offered:
 * the layer's `text.height` at first, then the last one used), then type the text in the
 * command line. The text is inserted as a point feature with the text, its height and the
 * straightedge angle as rotation, into the active text layer or the draft layer, and selected;
 * the tool stays active for the next text.
 */
export class TextTool extends BaseTool {
  readonly id = 'text';
  private step: TextStep = 'point';
  private point: Coordinate | null = null;
  private height: number | null = null;
  /** The height used last, offered for the next text. */
  private lastHeight: number | null = null;
  private notice: string | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext): boolean {
    return textTarget(ctx) !== null;
  }

  /** The height and text steps expect typing. */
  override getInputRequest(): InputRequest {
    return this.step === 'height' ? 'value' : this.step === 'text' ? 'text' : null;
  }

  override getPrompt(): string {
    const height = this.offeredHeight();
    const prompt = TEXT_PROMPTS[this.step].replace(
      '{height}',
      this.ctx ? this.ctx.formatLength(height) : `${height} m`,
    );
    return this.notice ? `${this.notice} ${prompt}` : prompt;
  }

  /** The height in metres offered in the height step. */
  getHeight(): number {
    return this.offeredHeight();
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: () => {},
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.goTo('point');
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.point = null;
    this.height = null;
    this.notice = null;
    this.step = 'point';
  }

  /** Enter keeps the offered height; it does nothing in the other steps. */
  override finish(): void {
    if (this.step !== 'height') return;
    this.height = this.offeredHeight();
    this.goTo('text');
  }

  /** Escape steps back: text → height → point. */
  override cancel(): void {
    if (this.step === 'text') this.goTo('height');
    else if (this.step === 'height') this.goTo('point');
  }

  override removeLastPoint(): boolean {
    if (this.step === 'point') return false;
    this.cancel();
    return true;
  }

  /** A typed length in the height step is the height (metres, converted by the editor); one ≤ 0 is refused. */
  override handleLength(value: number): boolean {
    if (this.step !== 'height') return false;
    if (Number.isFinite(value) && value > 0) {
      this.height = value;
      this.goTo('text');
    } else {
      this.notice = INVALID_HEIGHT;
      this.ctx?.promptChanged();
    }
    return true;
  }

  /** In the text step the typed line is the text, numbers included. */
  override handleText(text: string): boolean {
    if (this.step !== 'text') return false;
    const value = text.trim();
    if (!value) return false;
    this.insert(value);
    return true;
  }

  /** A typed point is the insert point. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step !== 'point') return false;
    this.takePoint(coordinate);
    return true;
  }

  override referencePoint(): number[] | null {
    return null;
  }

  private offeredHeight(): number {
    if (this.lastHeight !== null) return this.lastHeight;
    return (this.ctx && textTarget(this.ctx)?.layer.text.height) || 2.5;
  }

  private takePoint(coordinate: Coordinate): void {
    if (this.step !== 'point') return;
    this.point = [coordinate[0]!, coordinate[1]!];
    this.goTo('height');
  }

  private insert(value: string): void {
    const { ctx, point } = this;
    const target = ctx ? textTarget(ctx) : null;
    if (!ctx || !point || !target) return;
    const height = this.height ?? this.offeredHeight();
    const { text } = target.layer;
    const feature = new Feature({
      ...defaultProperties(target.layer),
      [text.property]: value,
      [text.heightProperty]: height,
      [text.rotationProperty]: ctx.getStraightedgeAngle(),
      geometry: wrapForLayer(new Point(point), target.layer.geometryType),
    });
    if (!ctx.execute(insertFeature(target.layerId, feature))) return;
    this.lastHeight = height;
    ctx.selection.set([feature]);
    this.goTo('point');
  }

  /** A marker at the insert point and, from the text step on, a sample at the height. */
  private showPreview(): void {
    this.previewSource.clear(true);
    const { ctx, point } = this;
    if (!ctx || !point) return;
    const marker = new Feature(new Point(point));
    marker.set(PREVIEW_VERTEX_PROPERTY, 'picked');
    this.previewSource.addFeature(marker);
    const target = textTarget(ctx);
    const resolution = ctx.map.getView?.()?.getResolution?.();
    if (this.step !== 'text' || !target || !resolution) return;
    const height = this.height ?? this.offeredHeight();
    const pixels = (height * unitsPerMetre(ctx.getProjection(), point)) / resolution;
    if (!(pixels >= 1)) return;
    const sample = new Feature(new Point(point));
    sample.setStyle(
      textStyle('Text', Math.min(pixels, 2000), ctx.getStraightedgeAngle(), {
        ...target.layer.text,
        color: 'rgba(34, 211, 238, 0.8)',
      }),
    );
    this.previewSource.addFeature(sample);
  }

  private goTo(step: TextStep): void {
    this.step = step;
    this.notice = null;
    if (step === 'point') {
      this.point = null;
      this.height = null;
    }
    if (step === 'height') this.height = null;
    this.showPreview();
    this.ctx?.promptChanged();
  }
}
