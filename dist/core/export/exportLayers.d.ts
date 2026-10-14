import { default as Feature } from 'ol/Feature';
export type ExportFormat = 'geojson' | 'kml' | 'gml' | 'gpx';
/** What a UI needs to offer a format. `crs` is set when the format allows only that CRS. */
export interface ExportFormatInfo {
    id: ExportFormat;
    label: string;
    mimeType: string;
    extension: string;
    crs?: string;
    /** Geometry types the format cannot hold; such objects are skipped. */
    skips?: string;
}
export declare const EXPORT_FORMATS: readonly ExportFormatInfo[];
export interface ExportOptions {
    format: ExportFormat;
    /** Output CRS for GeoJSON and GML. Default `EPSG:4326`; KML and GPX are always EPSG:4326. */
    projection?: string;
    /** Coordinate decimals. Default 7 for degrees, 3 for metric CRS. */
    decimals?: number;
}
export interface ExportResult {
    content: string;
    mimeType: string;
    extension: string;
    /** Suggested file name: the layer title for one layer, `export-YYYY-MM-DD` for several. */
    filename: string;
    /** Objects written. */
    featureCount: number;
    /** Objects the format cannot hold (GPX: polygons, multi-points). */
    skipped: number;
}
/** One layer to export: features in the view projection. */
export interface ExportLayer {
    id: string;
    title: string;
    features: Feature[];
}
/**
 * Write the objects of several layers into one file of `format`. Features are read in
 * `viewProjection` and never modified. GeoJSON: one FeatureCollection, each feature with a
 * `layer` property; KML: one Folder per layer; GML 3.2: one feature type per layer; GPX:
 * waypoints, routes and tracks of all layers.
 */
export declare function exportLayers(layers: ExportLayer[], options: ExportOptions, viewProjection: string, now?: Date): ExportResult;
