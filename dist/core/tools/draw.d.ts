import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { Coordinate } from 'ol/coordinate';
import { GeometryType, ResolvedLayerConfig } from '../config/types';
import { BaseTool, DrawType, ToolContext, ToolOptions } from './Tool';
/**
 * The single-part type drawn for a layer; multi-part layers get one part per drawing. `null`
 * for a layer that accepts any geometry: the type then comes from `ToolOptions.type`.
 */
export declare function drawType(geometryType: GeometryType): DrawType | null;
export interface DrawTarget {
    layerId: string;
    layer: ResolvedLayerConfig;
    type: DrawType;
}
/**
 * Where and what the draw tool draws: the active layer, or the draft layer while none is
 * active; the layer must exist and allow inserts. A layer with a fixed geometry type dictates
 * the type and refuses a different `options.type`; a layer accepting any geometry draws
 * `options.type`, points by default. `null` when nothing can be drawn.
 */
export declare function drawTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>, options?: ToolOptions): DrawTarget | null;
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
export declare function shapeTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>, shape: 'LineString' | 'Polygon'): ShapeTarget | null;
/** Target for a constructed polygon (rectangle, circle, regular polygon). */
export declare function polygonTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>): PolygonTarget | null;
/** Target for a constructed line (curve). */
export declare function lineTarget(ctx: Pick<ToolContext, 'layers' | 'getActiveLayer' | 'getDraftLayer'>): ShapeTarget | null;
/** Wrap a drawn single-part geometry for a multi-part layer. */
export declare function wrapForLayer(geometry: Geometry, geometryType: GeometryType): Geometry;
/** Schema defaults for a new feature. */
export declare function defaultProperties(layer: ResolvedLayerConfig): Record<string, unknown>;
/** The feature to insert for a drawn geometry: wrapped for the layer type, with schema defaults. */
export declare function prepareInsert(layer: ResolvedLayerConfig, drawn: Geometry): Feature;
/**
 * The last fixed vertex of a drawing in progress, from the sketch geometry of `ol/interaction/Draw`:
 * a LineString sketch ends with the moving vertex, a Polygon sketch ring with the moving vertex
 * and the closing copy of the first. `null` while only the moving vertex exists.
 */
export declare function sketchReference(geometry: Geometry | undefined): Coordinate | null;
/**
 * Insert a drawn geometry into `layerId` and select the new feature, so the attribute form (or
 * any host UI) can capture its attributes right away. Returns whether the insert was accepted.
 */
export declare function onDrawEnd(ctx: ToolContext, layerId: string, layer: ResolvedLayerConfig, drawn: Geometry): boolean;
/**
 * Draw a point, line or polygon into the active layer, or into the draft layer while no layer
 * is active (see `drawTarget`). Click adds vertices, double-click or Enter finishes, Backspace
 * removes the last vertex, Escape aborts. The tool stays active after a drawing so several
 * objects can be inserted in a row. Each inserted feature becomes the selection.
 */
export declare class DrawTool extends BaseTool {
    readonly id = "draw";
    private draw;
    private sketch;
    private target;
    canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
    /** The type in effect, so a UI can show which draw button is pressed. */
    getOptions(): ToolOptions;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /**
     * A typed point: for point layers it is inserted right away, for lines and polygons it
     * becomes the next vertex of the drawing in progress (starting one if needed).
     */
    handleInput(coordinate: number[]): boolean;
    referencePoint(): number[] | null;
    cancel(): void;
    finish(): void;
    removeLastPoint(): boolean;
}
