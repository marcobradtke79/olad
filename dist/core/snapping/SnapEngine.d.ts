import { Coordinate } from 'ol/coordinate';
import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { Pixel } from 'ol/pixel';
import { ResolvedGridConfig, ResolvedSnappingConfig, SnapMode } from '../config/types';
import { LayerManager } from '../layers/LayerManager';
/** What the pointer snapped to: a geometry snap mode or the grid. */
export type SnapTarget = SnapMode | 'grid';
export interface SnapResult {
    /** Snap location in the view projection. */
    coordinate: Coordinate;
    pixel: Pixel;
    mode: SnapTarget;
    /** Layer and feature of a geometry snap; absent for a grid snap. */
    layer?: string;
    feature?: Feature;
}
/**
 * Every snap candidate a geometry offers for the given modes. `reference` is the last fixed
 * vertex of a drawing in progress; without it the `perpendicular` and `tangent` modes yield
 * nothing.
 */
export declare function snapCandidates(geometry: Geometry, modes: readonly SnapMode[], reference?: Coordinate | null): {
    coordinate: Coordinate;
    mode: SnapMode;
}[];
/**
 * Finds the snap location nearest to the pointer among the vertices, segment midpoints,
 * perpendicular feet and tangent points of the snappable, visible layers. Distances are measured in pixels so the
 * radius is screen-based. Without a geometry snap, and with grid snap on, the nearest grid
 * intersection is the result (no radius: the pointer always sits on the grid).
 */
export declare class SnapEngine {
    private readonly layers;
    private readonly getConfig;
    private readonly getGrid;
    constructor(layers: LayerManager, getConfig: () => ResolvedSnappingConfig, getGrid?: () => ResolvedGridConfig);
    /**
     * @param coordinate pointer position in the view projection
     * @param pixel pointer position in pixels
     * @param resolution map units per pixel
     * @param toPixel converts a coordinate to pixels (the map's `getPixelFromCoordinate`)
     */
    snap(coordinate: Coordinate, pixel: Pixel, resolution: number, toPixel: (coordinate: Coordinate) => Pixel, reference?: Coordinate | null): SnapResult | null;
    /** The nearest grid intersection, when grid snap is on. */
    snapGrid(coordinate: Coordinate, toPixel: (c: Coordinate) => Pixel): SnapResult | null;
    /** The nearest geometry snap within the radius, ignoring the grid. */
    snapGeometry(coordinate: Coordinate, pixel: Pixel, resolution: number, toPixel: (coordinate: Coordinate) => Pixel, reference: Coordinate | null): SnapResult | null;
}
