import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
/** A feature's state before its first change, in the view projection. */
export interface Snapshot {
    geometry: Geometry | null;
    properties: Record<string, unknown>;
}
export interface TrackedEntry {
    layer: string;
    inserted: boolean;
    deleted: boolean;
    tempId?: string;
    snapshot: Snapshot;
}
export type NetOperation = 'insert' | 'update' | 'delete' | null;
/** User properties of a feature: everything except the geometry. */
export declare function featureProperties(feature: Feature): Record<string, unknown>;
export declare function geometriesEqual(a: Geometry | null | undefined, b: Geometry | null | undefined): boolean;
export declare function valuesEqual(a: unknown, b: unknown): boolean;
/**
 * Remembers every feature touched since the last `accept` / `discard`: whether it was inserted
 * or deleted and a snapshot of its original state. The net change of a feature is derived from
 * these facts and its current state, which is what makes repeated edits collapse.
 */
export declare class ChangeTracker {
    private readonly entries;
    entry(feature: Feature): TrackedEntry | undefined;
    /** Snapshot the feature on first touch. Returns the entry. */
    touch(feature: Feature, layer: string): TrackedEntry;
    markInserted(feature: Feature, layer: string, tempId: string): void;
    /** Undo of an insert: the feature was never there. */
    unmarkInserted(feature: Feature): void;
    markDeleted(feature: Feature, layer: string): void;
    unmarkDeleted(feature: Feature): void;
    netOperation(feature: Feature): NetOperation;
    /** `'geometry'` and the names of properties that differ from the snapshot. */
    changedKeys(feature: Feature): string[];
    isTouched(feature: Feature): boolean;
    isGeometryModified(feature: Feature): boolean;
    isDeletedId(layer: string, id: string | number): boolean;
    /** Every tracked feature with its entry, in first-touch order. */
    all(): [Feature, TrackedEntry][];
    hasChanges(): boolean;
    /** Put a feature back into its snapshot state. */
    restore(feature: Feature): void;
    /** Transform all snapshot geometries when the view projection changes. */
    reproject(from: string, to: string): void;
    dropLayer(layer: string): void;
    clear(): void;
}
