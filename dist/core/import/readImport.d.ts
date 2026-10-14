import { default as Feature } from 'ol/Feature';
import { FieldConfig } from '../config/types';
import { LocalGeometryType } from '../layers/local';
export type ImportFormat = 'geojson' | 'topojson' | 'kml' | 'gml' | 'gpx';
export interface ImportFormatInfo {
    id: ImportFormat;
    label: string;
    extensions: string[];
}
export declare const IMPORT_FORMATS: readonly ImportFormatInfo[];
/** Objects of one geometry family from one group of the file, ready for one layer. */
export interface ImportGroup {
    /** Stable key for targets (`'0'`, `'1'` ...). */
    key: string;
    /** Suggested layer name: the file's folder / layer / feature type, else the file name. */
    name: string;
    geometryType: LocalGeometryType;
    /** Valid objects in the view projection, with sanitized attribute names; no ids. */
    features: Feature[];
    /** Attributes found, with inferred types; `label` keeps an original name that was changed. */
    fields: FieldConfig[];
    /** Objects left out because their geometry is invalid. */
    invalid: number;
}
export interface ImportPreview {
    format: ImportFormat;
    /** The CRS the file's coordinates were read in. */
    dataProjection: string;
    groups: ImportGroup[];
    /** Objects without a usable geometry (none, or a geometry collection). */
    skipped: number;
}
export interface ReadImportOptions {
    /** File name; its extension picks the format and its base name names the groups. */
    filename?: string;
    /** Force a format instead of detecting it. */
    format?: ImportFormat;
    /** Projection the features are read into. */
    viewProjection: string;
}
/** Thrown for a file that cannot be read; the message is meant for the user. */
export declare class ImportError extends Error {
    constructor(message: string);
}
/**
 * Read a GeoJSON, TopoJSON, KML, GML (2, 3, 3.2) or GPX file into groups of one geometry family
 * each: grouped by the file's own grouping (the `layer` property written by the exporter,
 * TopoJSON objects, top-level KML folders, GML feature types), then split into points, lines
 * and polygons. Throws `ImportError` for unreadable files or an unregistered CRS.
 */
export declare function readImport(text: string, options: ReadImportOptions): ImportPreview;
