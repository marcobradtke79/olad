import { default as VectorSource } from 'ol/source/Vector';
import { FieldConfig, LayerConfig } from '../config/types';
/** Geometry types a local layer may have. */
export declare const LOCAL_GEOMETRY_TYPES: readonly ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"];
export type LocalGeometryType = (typeof LOCAL_GEOMETRY_TYPES)[number];
/** What `editor.localLayers.create` takes. */
export interface LocalLayerDefinition {
    title: string;
    geometryType: LocalGeometryType;
    fields: FieldConfig[];
}
/** A local layer as listed: its definition plus id and object count. */
export interface LocalLayerInfo extends LocalLayerDefinition {
    id: string;
    featureCount: number;
}
/** Plain JSON of all local layers; geometries are GeoJSON in EPSG:4326. */
export interface LocalLayersJson {
    version: 1;
    layers: (LocalLayerDefinition & {
        id: string;
        features: {
            type: 'FeatureCollection';
            features: Record<string, unknown>[];
        };
    })[];
}
export type LocalLayerChange = {
    id: string | null;
    type: 'create' | 'rename' | 'schema' | 'remove' | 'import';
};
/** Thrown by `import` for malformed data; nothing has been changed. */
export declare class LocalLayerImportError extends Error {
    readonly path: string;
    constructor(path: string, message: string);
}
/** What the local layer store needs from the editor. */
export interface LocalLayersContext {
    /** Add a layer through the editor (validated, listed in `config.layers`). */
    addLayer(config: LayerConfig): void;
    /** Remove a layer through the editor (selection and history are cleaned up). */
    removeLayer(id: string): void;
    hasLayer(id: string): boolean;
    getSource(id: string): VectorSource;
    setTitle(id: string, title: string): void;
    setFields(id: string, fields: FieldConfig[]): void;
    setLocal(id: string, local: boolean): void;
    /** The view projection, in which features are kept in memory. */
    getProjection(): string;
    emit(change: LocalLayerChange): void;
}
/**
 * Layers the user creates in the client: one geometry type and a schema each, fully editable,
 * never in the change set. Kept in memory like the other layers; `export` / `import` give plain
 * JSON so a host (or `persistLocalLayers` of the UI package) can store them in the browser.
 */
export declare class LocalLayers {
    private readonly definitions;
    private counter;
    private featureCounter;
    private readonly ctx;
    constructor(ctx: LocalLayersContext);
    has(id: string): boolean;
    list(): LocalLayerInfo[];
    get(id: string): LocalLayerInfo;
    /** Create a layer; returns its id. Throws a `ConfigError` for an invalid definition. */
    create(definition: LocalLayerDefinition): string;
    rename(id: string, title: string): void;
    /**
     * Replace the attributes. `renamed` maps old field names to new ones so the objects keep
     * their values; values of fields that are gone are removed from the objects. These property
     * changes bypass the command history (local layers are not tracked).
     */
    setFields(id: string, fields: FieldConfig[], options?: {
        renamed?: Record<string, string>;
    }): void;
    /** Remove the layer and its objects. */
    remove(id: string): void;
    export(): LocalLayersJson;
    /**
     * Add the layers of `json`; a layer with an id that exists as a local layer replaces it.
     * Everything is validated first. Objects get fresh ids (`loc-<n>`).
     */
    import(json: unknown): void;
    /** Forget all local layers without removing them (editor teardown). */
    clear(): void;
    private add;
    private info;
    private require;
}
