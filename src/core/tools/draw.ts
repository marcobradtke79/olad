import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Draw from 'ol/interaction/Draw';
import type { Coordinate } from 'ol/coordinate';
import { insertFeature } from '../changes/commands';
import type { GeometryType, ResolvedLayerConfig } from '../config/types';
import { BaseTool, type DrawType, type ToolContext, type ToolOptions } from './Tool';

/**
 * The single-part type drawn for a layer; multi-part layers get one part per drawing. `null`
 * for a layer that accepts any geometry: the type then comes from `ToolOptions.type`.
 */
export function drawType(geometryType: GeometryType): DrawType | null {
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      return 'Point';
    case 'LineString':
    case 'MultiLineString':
      return 'LineString';
    case 'Polygon':
    case 'MultiPolygon':
      return 'Polygon';
    case 'Any':
      return null;
  }
}

export interface DrawTarget {
  layerId: string;
  layer: ResolvedLayerConfig;
  type: DrawType;
}

/**
 * Where and what the draw tool draws: the active layer, or the draft layer while none is
 * active; the layer must exist and allow inserts. A layer with a fixed geometry type dictates
 * the type and refuses a different `options.type`; a layer accepting any geometry draws
 * `options.type`, points by default. `null` when nothing can be drawn, also for a dimension
 * layer (its objects come from the dimension tools).
 */
export function drawTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
  options: ToolOptions = {},
): DrawTarget | null {
  const layerId = ctx.getActiveLayer() ?? ctx.getDraftLayer();
  if (layerId === null || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
    return null;
  }
  const layer = ctx.layers.getConfig(layerId);
  // Dimension objects come from the dimension tools only.
  if (layer.dimension) return null;
  const fixed = drawType(layer.geometryType);
  if (fixed !== null && options.type !== undefined && options.type !== fixed) return null;
  return { layerId, layer, type: fixed ?? options.type ?? 'Point' };
}

export interface ShapeTarget {
  layerId: string;
  layer: ResolvedLayerConfig;
}
export type PolygonTarget = ShapeTarget;

/**
 * Where a constructed shape goes: the active layer, or the draft layer while none is active;
 * the layer must exist, allow inserts and accept the shape's type (`LineString` /
 * `MultiLineString` for lines, `Polygon` / `MultiPolygon` for polygons, or `Any`). `null` when
 * no such shape can be inserted.
 */
export function shapeTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
  shape: 'LineString' | 'Polygon',
): ShapeTarget | null {
  const layerId = ctx.getActiveLayer() ?? ctx.getDraftLayer();
  if (layerId === null || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
    return null;
  }
  const layer = ctx.layers.getConfig(layerId);
  if (layer.dimension) return null;
  const type = drawType(layer.geometryType);
  return type === shape || type === null ? { layerId, layer } : null;
}

/** Target for a constructed polygon (rectangle, circle, regular polygon). */
export function polygonTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
): PolygonTarget | null {
  return shapeTarget(ctx, 'Polygon');
}

/** Target for a constructed line (curve). */
export function lineTarget(
  ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>,
): ShapeTarget | null {
  return shapeTarget(ctx, 'LineString');
}

/** Wrap a drawn single-part geometry for a multi-part layer. */
export function wrapForLayer(geometry: Geometry, geometryType: GeometryType): Geometry {
  if (geometryType === 'MultiPoint' && geometry instanceof Point) {
    return new MultiPoint([geometry.getCoordinates()]);
  }
  if (geometryType === 'MultiLineString' && geometry instanceof LineString) {
    return new MultiLineString([geometry.getCoordinates()]);
  }
  if (geometryType === 'MultiPolygon' && geometry instanceof Polygon) {
    return new MultiPolygon([geometry.getCoordinates()]);
  }
  return geometry;
}

/** Schema defaults for a new feature. */
export function defaultProperties(layer: ResolvedLayerConfig): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const field of layer.schema?.fields ?? []) {
    if (field.default !== undefined) properties[field.name] = field.default;
  }
  return properties;
}

/** The feature to insert for a drawn geometry: wrapped for the layer type, with schema defaults. */
export function prepareInsert(layer: ResolvedLayerConfig, drawn: Geometry): Feature {
  return new Feature({
    ...defaultProperties(layer),
    geometry: wrapForLayer(drawn, layer.geometryType),
  });
}

/**
 * The last fixed vertex of a drawing in progress, from the sketch geometry of `ol/interaction/Draw`:
 * a LineString sketch ends with the moving vertex, a Polygon sketch ring with the moving vertex
 * and the closing copy of the first. `null` while only the moving vertex exists.
 */
export function sketchReference(geometry: Geometry | undefined): Coordinate | null {
  if (geometry instanceof LineString) {
    const coordinates = geometry.getCoordinates();
    return coordinates.length >= 2 ? coordinates[coordinates.length - 2]! : null;
  }
  if (geometry instanceof Polygon) {
    const ring = geometry.getCoordinates()[0] ?? [];
    return ring.length >= 3 ? ring[ring.length - 3]! : null;
  }
  return null;
}

/**
 * Insert a drawn geometry into `layerId` and select the new feature, so the attribute form (or
 * any host UI) can capture its attributes right away. Returns whether the insert was accepted.
 */
export function onDrawEnd(
  ctx: ToolContext,
  layerId: string,
  layer: ResolvedLayerConfig,
  drawn: Geometry,
): boolean {
  const feature = prepareInsert(layer, drawn);
  if (!ctx.execute(insertFeature(layerId, feature))) return false;
  ctx.selection.set([feature]);
  return true;
}

/**
 * Draw a point, line or polygon into the active layer, or into the draft layer while no layer
 * is active (see `drawTarget`). Click adds vertices, double-click or Enter finishes, Backspace
 * removes the last vertex, Escape aborts. The tool stays active after a drawing so several
 * objects can be inserted in a row. Each inserted feature becomes the selection.
 */
export class DrawTool extends BaseTool {
  readonly id = 'draw';
  private draw: Draw | null = null;
  private sketch: Feature | null = null;
  private target: DrawTarget | null = null;

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return drawTarget(ctx, options) !== null;
  }

  /** The type in effect, so a UI can show which draw button is pressed. */
  override getOptions(): ToolOptions {
    return this.target ? { ...this.options, type: this.target.type } : { ...this.options };
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    const target = drawTarget(ctx, options);
    if (!target) throw new Error('The draw tool needs a layer that allows inserts');
    const { layerId, layer } = target;
    const draw = new Draw({ type: target.type, stopClick: true });
    draw.on('drawstart', (event) => {
      this.sketch = event.feature;
    });
    draw.on('drawabort', () => {
      this.sketch = null;
    });
    draw.on('drawend', (event) => {
      this.sketch = null;
      const geometry = event.feature.getGeometry();
      if (geometry) onDrawEnd(ctx, layerId, layer, geometry);
    });
    this.draw = draw;
    this.target = target;
    this.interactions = [draw];
    super.activate(ctx, options);
  }

  override deactivate(): void {
    super.deactivate();
    this.draw = null;
    this.sketch = null;
    this.target = null;
  }

  /**
   * A typed point: for point layers it is inserted right away, for lines and polygons it
   * becomes the next vertex of the drawing in progress (starting one if needed).
   */
  override handleInput(coordinate: number[]): boolean {
    if (!this.draw || !this.ctx || !this.target) return false;
    const { layerId, layer, type } = this.target;
    if (type === 'Point') return onDrawEnd(this.ctx, layerId, layer, new Point(coordinate));
    this.draw.appendCoordinates([coordinate]);
    return true;
  }

  override referencePoint(): number[] | null {
    return sketchReference(this.sketch?.getGeometry());
  }

  override cancel(): void {
    this.draw?.abortDrawing();
  }

  override finish(): void {
    this.draw?.finishDrawing();
  }

  override removeLastPoint(): boolean {
    const drawing = this.sketch !== null;
    this.draw?.removeLastPoint();
    return drawing;
  }
}
