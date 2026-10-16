import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { insertFeature } from '../changes/commands';
import { dimensionValues } from '../dimensions/values';
import { dimensionStyleFunction } from '../layers/dimension';
import { dimensionTarget, type DimensionTarget } from './dimension';
import { defaultProperties } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_LAYER_PROPERTY, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

/**
 * Shared machinery of the angular, radial and survey dimension tools: the point-pick
 * interaction with the raw pointer position, markers of the picked points, the dimension in
 * progress drawn in the active dimension layer's own style, and the insert (GIS value, schema
 * defaults; selected afterwards). Field values are set later by clicking the value.
 */
export abstract class DimensionToolBase extends BaseTool {
  private pointer: PointPickInteraction | null = null;
  private markers: VectorLayer<VectorSource<Feature>> | null = null;
  private dimensionLayer: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly markerSource = new VectorSource<Feature>();
  private readonly dimensionSource = new VectorSource<Feature>();

  /** A click: the snapped coordinate and the raw pointer position (for picking objects). */
  protected abstract onClick(coordinate: Coordinate, raw: Coordinate): void;
  /** A pointer move. */
  protected abstract onMove(coordinate: Coordinate, raw: Coordinate): void;
  /** The dimension in progress as a feature (geometry and properties), or `null`. */
  protected abstract dimension(): Feature | null;
  /** The points to mark as picked. */
  protected abstract picked(): Coordinate[];
  /** Back to the first step. */
  protected abstract reset(): void;

  override canActivate(ctx: ToolContext, _options?: ToolOptions): boolean {
    return dimensionTarget(ctx) !== null;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate, raw) => this.onClick(coordinate, raw),
      move: (coordinate, raw) => this.onMove(coordinate, raw),
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
  }

  protected target(): DimensionTarget | null {
    return this.ctx ? dimensionTarget(this.ctx) : null;
  }

  /** The GIS value of the dimension in progress (metres or degrees), or `null`. */
  protected gisValue(): number | null {
    const ctx = this.ctx;
    const target = this.target();
    const feature = this.dimension();
    if (!ctx || !target || !feature) return null;
    return dimensionValues(feature, target.layer.dimension, ctx.getProjection())?.gis ?? null;
  }

  /**
   * Insert the dimension in progress as one command, select it and start over. `fieldValue` is
   * only given where the dimension has no GIS value (a level's height, a free slope).
   */
  protected insert(fieldValue: number | null = null, extra: Record<string, unknown> = {}): void {
    const ctx = this.ctx;
    const target = this.target();
    const drawn = this.dimension();
    if (!ctx || !target || !drawn) return;
    // Levels and free slopes have no GIS value; the others store theirs.
    const gis = this.gisValue();
    const feature = new Feature({
      ...defaultProperties(target.layer),
      ...drawn.getProperties(),
      ...(gis === null ? {} : { gisValue: Math.round(gis * 1e6) / 1e6 }),
      fieldValue,
      text: null,
      ...extra,
    });
    this.reset();
    if (ctx.execute(insertFeature(target.layerId, feature))) ctx.selection.set([feature]);
  }

  /** Redraw the markers and the dimension in progress; tell the input bar about the step. */
  protected refresh(promptChanged = false): void {
    this.markerSource.clear(true);
    this.markerSource.addFeatures(
      this.picked().map((point) => {
        const feature = new Feature(new Point(point));
        feature.set(PREVIEW_VERTEX_PROPERTY, 'picked');
        return feature;
      }),
    );
    this.dimensionSource.clear(true);
    const feature = this.dimension();
    if (feature) this.dimensionSource.addFeature(feature);
    if (promptChanged) this.ctx?.promptChanged();
  }
}
