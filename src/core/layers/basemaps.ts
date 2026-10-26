import type BaseLayer from 'ol/layer/Base';
import type { ResolvedBasemapConfig } from '../config/types';
import { createRasterLayer, type RasterContext } from './raster';

/** Property set on every layer this library creates, holding the basemap id. */
export const BASEMAP_ID_PROPERTY = 'olcad:basemap';

export type BasemapContext = RasterContext;

/**
 * Build one OpenLayers layer for a basemap (`createRasterLayer`, shared with the overlays):
 * visible as configured, marked with the basemap id. A source that cannot be built yields an
 * empty layer and `ctx.onError`, so the editor still starts.
 */
export function createBasemapLayer(basemap: ResolvedBasemapConfig, ctx: BasemapContext): BaseLayer {
  const layer = createRasterLayer(basemap, ctx);
  layer.setVisible(basemap.visible);
  layer.set(BASEMAP_ID_PROPERTY, basemap.id);
  return layer;
}
