import { GeoJSONGeometry } from 'ol/format/GeoJSON';
import { ResolvedChangesConfig } from '../config/types';
import { ChangeTracker } from './ChangeTracker';
export interface InsertChange {
    op: 'insert';
    layer: string;
    /** Projection of `geometry`. */
    crs: string;
    tempId: string;
    geometry: GeoJSONGeometry | null;
    properties: Record<string, unknown>;
}
export interface UpdateChange {
    op: 'update';
    layer: string;
    crs: string;
    id: string | number;
    /** Present when the geometry changed (always with `fullFeatures`). */
    geometry?: GeoJSONGeometry | null;
    /** Changed properties only (all with `fullFeatures`). Removed properties are `null`. */
    properties?: Record<string, unknown>;
    /** `'geometry'` and the names of changed properties. */
    changed: string[];
}
export interface DeleteChange {
    op: 'delete';
    layer: string;
    crs: string;
    id: string | number;
}
export type Change = InsertChange | UpdateChange | DeleteChange;
export interface ChangeSet {
    version: 1;
    /** Set when every change has the same `crs`. */
    crs?: string;
    changes: Change[];
}
export interface ExportContext {
    tracker: ChangeTracker;
    /** The projection to export a layer's geometries in (its data projection). */
    dataProjection(layer: string): string;
    viewProjection: string;
    options: ResolvedChangesConfig;
}
/** Derive the net changes of every tracked feature. The result survives `JSON.stringify`. */
export declare function exportChangeSet(ctx: ExportContext): ChangeSet;
