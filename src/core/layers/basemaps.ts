import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import type BaseLayer from 'ol/layer/Base';
import type { FeatureLike } from 'ol/Feature';
import type FeatureFormat from 'ol/format/Feature';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import ImageWMS from 'ol/source/ImageWMS';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import VectorTileSource from 'ol/source/VectorTile';
import GeoTIFF from 'ol/source/GeoTIFF';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import MVT from 'ol/format/MVT';
import GeoJSON from 'ol/format/GeoJSON';
import TopoJSON from 'ol/format/TopoJSON';
import type { ResolvedBasemapConfig } from '../config/types';

/** Property set on every layer this library creates, holding the basemap id. */
export const BASEMAP_ID_PROPERTY = 'olcad:basemap';

export interface BasemapContext {
  /** Current view projection code, used to pick WMTS matrix sets. */
  getProjection(): string;
  /** Called when an asynchronous source (WMTS capabilities) fails to load. */
  onError(id: string, error: Error): void;
}

function vectorTileFormat(
  format: 'mvt' | 'geojson' | 'topojson' | undefined,
): FeatureFormat<FeatureLike> {
  switch (format) {
    case 'geojson':
      return new GeoJSON();
    case 'topojson':
      return new TopoJSON();
    default:
      return new MVT();
  }
}

async function loadWmts(
  layer: TileLayer<WMTS>,
  basemap: Extract<ResolvedBasemapConfig, { type: 'wmts' }>,
  ctx: BasemapContext,
): Promise<void> {
  const response = await fetch(basemap.capabilitiesUrl);
  if (!response.ok)
    throw new Error(`GetCapabilities failed: ${response.status} ${response.statusText}`);
  const capabilities = new WMTSCapabilities().read(await response.text());
  const base = {
    layer: basemap.layer,
    matrixSet: basemap.matrixSet,
    format: basemap.format,
    style: basemap.style,
    crossOrigin: basemap.crossOrigin,
  };
  // Prefer a matrix set in the view projection, fall back to whatever the service offers.
  const options =
    optionsFromCapabilities(capabilities, { ...base, projection: ctx.getProjection() }) ??
    optionsFromCapabilities(capabilities, base);
  if (!options) {
    throw new Error(`layer "${basemap.layer}" not found in capabilities`);
  }
  layer.setSource(
    new WMTS({ ...options, attributions: basemap.attribution ?? options.attributions }),
  );
}

/**
 * Build one OpenLayers layer for a basemap. WMTS sources are attached asynchronously.
 * A source that cannot be constructed (for example `geotiff` with the OpenLayers full build but
 * no global `GeoTIFF`) yields an empty layer and `ctx.onError`, so the editor still starts.
 */
export function createBasemapLayer(basemap: ResolvedBasemapConfig, ctx: BasemapContext): BaseLayer {
  let layer: BaseLayer;
  try {
    layer = createLayer(basemap, ctx);
  } catch (error) {
    layer = new TileLayer();
    ctx.onError(basemap.id, error instanceof Error ? error : new Error(String(error)));
  }
  layer.setVisible(basemap.visible);
  layer.set(BASEMAP_ID_PROPERTY, basemap.id);
  return layer;
}

function createLayer(basemap: ResolvedBasemapConfig, ctx: BasemapContext): BaseLayer {
  const attributions = basemap.attribution;
  let layer: BaseLayer;
  switch (basemap.type) {
    case 'osm':
      layer = new TileLayer({ source: new OSM({ attributions, maxZoom: basemap.maxZoom }) });
      break;
    case 'xyz':
      layer = new TileLayer({
        source: new XYZ({
          url: basemap.url,
          attributions,
          minZoom: basemap.minZoom,
          maxZoom: basemap.maxZoom,
          tileSize: basemap.tileSize,
          crossOrigin: basemap.crossOrigin,
        }),
      });
      break;
    case 'wms': {
      const common = {
        url: basemap.url,
        params: basemap.params,
        attributions,
        serverType: basemap.serverType,
        projection: basemap.projection,
        crossOrigin: basemap.crossOrigin,
      };
      layer =
        basemap.tiled === false
          ? new ImageLayer({ source: new ImageWMS(common) })
          : new TileLayer({ source: new TileWMS(common) });
      break;
    }
    case 'wmts': {
      const tileLayer = new TileLayer<WMTS>();
      layer = tileLayer;
      loadWmts(tileLayer, basemap, ctx).catch((error: Error) => ctx.onError(basemap.id, error));
      break;
    }
    case 'vector-tile':
      layer = new VectorTileLayer({
        source: new VectorTileSource<FeatureLike>({
          url: basemap.url,
          format: vectorTileFormat(basemap.format),
          attributions,
          minZoom: basemap.minZoom,
          maxZoom: basemap.maxZoom,
          projection: basemap.projection,
        }),
        ...(basemap.style ? { style: basemap.style } : {}),
      });
      break;
    case 'geotiff':
      layer = new WebGLTileLayer({
        source: new GeoTIFF({
          sources: basemap.sources.map((s) => ({
            url: s.url,
            bands: s.bands,
            min: s.min,
            max: s.max,
            nodata: s.nodata,
          })),
          normalize: basemap.normalize,
          convertToRGB: basemap.convertToRGB,
          ...(attributions ? { attributions } : {}),
        }),
      });
      break;
  }
  return layer;
}
