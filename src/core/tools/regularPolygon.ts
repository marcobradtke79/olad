import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { isValidSideCount, regularPolygon } from '../geometry/regularPolygon';
import { onDrawEnd, polygonTarget } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

/** Side count the tool starts with before the user types one. */
export const DEFAULT_REGULAR_POLYGON_SIDES = 6;

export type RegularPolygonStep = 'sides' | 'centre' | 'vertex';

/** Prompt shown by the input bar for each step; `{sides}` stands for the current side count. */
export const REGULAR_POLYGON_PROMPTS: Record<RegularPolygonStep, string> = {
  sides:
    'Number of sides <{sides}>: type 3 or more, Enter keeps {sides}; a click sets the centre with {sides} sides',
  centre: 'Centre: click on the map or type x,y; Escape returns to the number of sides',
  vertex:
    'Vertex: click on the map, or type x,y · @dx,dy · @distance<angle · distance (the circumradius in {unit}) relative to the centre; Escape drops the centre',
};

function marker(coordinate: number[], kind: 'picked' | 'hover'): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/**
 * Draw a regular polygon (equal sides, 3 or more) into the active layer (or the draft layer):
 * the number of sides (typed, remembered for the session), the centre, then one vertex; the
 * polygon is inscribed in the circle through that vertex. Inserted like a drawn polygon
 * (schema defaults, multi-part wrapping, selected afterwards); the tool stays active for the
 * next polygon with the same side count.
 */
export class RegularPolygonTool extends BaseTool {
  readonly id = 'regular-polygon';
  /** Remembered across activations. */
  private sides = DEFAULT_REGULAR_POLYGON_SIDES;
  private step: RegularPolygonStep = 'sides';
  private centre: number[] | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    if (options?.sides !== undefined && !isValidSideCount(options.sides)) return false;
    return polygonTarget(ctx) !== null;
  }

  /** The first step expects the number of sides typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'sides' ? 'value' : null;
  }

  override getPrompt(): string {
    return REGULAR_POLYGON_PROMPTS[this.step].replaceAll('{sides}', String(this.sides));
  }

  /** The side count in effect (typed, given as an option, or remembered). */
  getSides(): number {
    return this.sides;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.centre = null;
    const preset = options?.sides;
    if (preset !== undefined && isValidSideCount(preset)) {
      this.sides = preset;
      this.goTo('centre');
    } else {
      this.goTo('sides');
    }
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.centre = null;
    this.step = 'sides';
  }

  /** Escape steps back: drop the centre, or return to the number of sides. */
  override cancel(): void {
    this.removeLastPoint();
  }

  override removeLastPoint(): boolean {
    if (this.step === 'vertex') {
      this.centre = null;
      this.goTo('centre');
      return true;
    }
    if (this.step === 'centre') {
      this.goTo('sides');
      return true;
    }
    return false;
  }

  /** Enter confirms the current side count. */
  override finish(): void {
    if (this.step === 'sides') this.goTo('centre');
  }

  /** A typed whole number of 3 or more is the side count while the tool asks for it. */
  override handleValue(value: number): boolean {
    if (this.step !== 'sides' || !isValidSideCount(value)) return false;
    this.sides = value;
    this.goTo('centre');
    return true;
  }

  /** A typed point is the centre (keeping the side count) or the vertex. */
  override handleInput(coordinate: number[]): boolean {
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input and the perpendicular snap are measured from the centre. */
  override referencePoint(): number[] | null {
    return this.step === 'vertex' ? this.centre : null;
  }

  private takePoint(coordinate: number[]): void {
    if (this.step !== 'vertex') {
      this.centre = coordinate;
      this.goTo('vertex');
      return;
    }
    const ctx = this.ctx;
    const polygon = this.centre ? regularPolygon(this.centre, coordinate, this.sides) : null;
    if (!ctx || !polygon) return; // the vertex sits on the centre: wait for another point
    const target = polygonTarget(ctx);
    this.centre = null;
    this.goTo('centre');
    if (target) onDrawEnd(ctx, target.layerId, target.layer, polygon);
  }

  private onPointerMove(coordinate: number[]): void {
    if (!this.ctx || this.step !== 'vertex' || !this.centre) return;
    this.previewSource.clear(true);
    const features = [marker(this.centre, 'picked'), marker(coordinate, 'hover')];
    const polygon = regularPolygon(this.centre, coordinate, this.sides);
    if (polygon) features.push(new Feature(polygon));
    features.push(new Feature(new LineString([this.centre, coordinate])));
    this.previewSource.addFeatures(features);
  }

  private goTo(step: RegularPolygonStep): void {
    this.step = step;
    this.previewSource.clear(true);
    this.ctx?.promptChanged();
  }
}
