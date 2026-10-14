import { Coordinate } from 'ol/coordinate';
import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
/** One object of a template: its source layer, geometry (view projection) and attributes. */
export interface TemplateFeature {
    layer: string;
    geometry: Geometry;
    properties: Record<string, unknown>;
}
/** A named group of objects, stored relative to its base point (view projection). */
export interface Template {
    id: string;
    name: string;
    base: Coordinate;
    features: TemplateFeature[];
}
/** Summary of a template for lists. */
export interface TemplateInfo {
    id: string;
    name: string;
    featureCount: number;
    /** The distinct source layers, in order of first appearance. */
    layers: string[];
}
/** A template as plain JSON (`editor.templates.export()`): GeoJSON geometries in EPSG:4326. */
export interface TemplateJson {
    version: 1;
    id: string;
    name: string;
    crs: 'EPSG:4326';
    /** The base point, `[lon, lat]`. */
    base: [number, number];
    features: {
        layer: string;
        geometry: object;
        properties: Record<string, unknown>;
    }[];
}
export type TemplateChange = {
    id: string | null;
    type: 'add' | 'remove' | 'rename' | 'import';
};
/** Features of the source to copy into a template: the feature and the layer it belongs to. */
export interface TemplateSource {
    feature: Feature;
    layer: string;
    /** The layer's id property, left out of the copied attributes. */
    idProperty?: string;
}
/** Error thrown by `import` for malformed input; the message names the offending path. */
export declare class TemplateImportError extends Error {
    readonly path: string;
    constructor(path: string, message: string);
}
/**
 * Named templates for the session: copies of objects relative to a base point, inserted
 * elsewhere later (`placed`). Geometries are kept in the view projection and transformed on a
 * projection switch (`reproject`). Plain JSON exchange through `export` / `import`; the store
 * never persists anything itself.
 */
export declare class TemplateStore {
    private readonly templates;
    private nextId;
    private readonly onChange;
    constructor(onChange?: (change: TemplateChange) => void);
    list(): TemplateInfo[];
    /** The template, or `undefined`. Geometries are the stored ones: do not modify them. */
    get(id: string): Template | undefined;
    /** The next free default name: `Template 1`, `Template 2` ... */
    suggestName(): string;
    /**
     * Store copies of the objects relative to `base`. Geometries are cloned; attributes are
     * copied without the geometry and the layer's id property. Returns the new id.
     */
    create(sources: TemplateSource[], base: Coordinate, name?: string): string;
    rename(id: string, name: string): void;
    remove(id: string): void;
    /** Remove every template without events (editor teardown). */
    clear(): void;
    /** Transform every stored geometry and base point after a view projection switch. */
    reproject(from: string, to: string): void;
    /**
     * The template's geometries placed with the base point at `at`: translated, then scaled by
     * the ratio of map units per metre at `at` and at the base, so a template keeps its size in
     * metres when inserted at another latitude in Web Mercator (the ratio is 1 in projected CRS).
     */
    placed(template: Template, at: Coordinate, projection: string): Geometry[];
    /** All templates as plain JSON, geometries and base points in EPSG:4326. */
    export(viewProjection: string): TemplateJson[];
    /**
     * Add templates from `export` output. The whole input is validated first (errors name the
     * path, nothing is added on error); ids that already exist get a fresh one. Returns the ids.
     */
    import(json: unknown, viewProjection: string): string[];
    private freshId;
    private require;
}
/**
 * A deep copy of a feature's attributes for a new object: without the geometry and without the
 * layer's id property (the copy gets its own id on insert).
 */
export declare function copyProperties(feature: Feature, idProperty?: string): Record<string, unknown>;
