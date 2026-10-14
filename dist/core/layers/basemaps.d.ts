import { default as BaseLayer } from 'ol/layer/Base';
import { ResolvedBasemapConfig } from '../config/types';
/** Property set on every layer this library creates, holding the basemap id. */
export declare const BASEMAP_ID_PROPERTY = "olcad:basemap";
export interface BasemapContext {
    /** Current view projection code, used to pick WMTS matrix sets. */
    getProjection(): string;
    /** Called when an asynchronous source (WMTS capabilities) fails to load. */
    onError(id: string, error: Error): void;
}
/**
 * Build one OpenLayers layer for a basemap. WMTS sources are attached asynchronously.
 * A source that cannot be constructed (for example `geotiff` with the OpenLayers full build but
 * no global `GeoTIFF`) yields an empty layer and `ctx.onError`, so the editor still starts.
 */
export declare function createBasemapLayer(basemap: ResolvedBasemapConfig, ctx: BasemapContext): BaseLayer;
