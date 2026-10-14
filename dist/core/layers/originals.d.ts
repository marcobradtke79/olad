import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
export interface OriginalGeometry {
    /** Projection code the stored coordinates are in (the layer's data projection at load time). */
    projection: string;
    /** Geometry as loaded, never transformed. */
    geometry: Geometry;
}
/**
 * Remembers each loaded feature's geometry in its data projection so that
 * projection round trips and change-set export do not degrade untouched coordinates.
 */
export declare class OriginalStore {
    private readonly originals;
    set(feature: Feature, projection: string, geometry: Geometry): void;
    get(feature: Feature): OriginalGeometry | undefined;
    delete(feature: Feature): void;
}
