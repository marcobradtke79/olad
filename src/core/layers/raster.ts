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
import type { FlatStyleLike } from 'ol/style/flat';
import type { FetchConfig, GeoTiffSourceConfig } from '../config/types';
import { fetchInit } from '../net/fetch';

/**
 * What the raster factory needs of a basemap or an overlay: the id (for errors), the attribution
 * and the source options of one raster type; `fetch` applies to the WMTS capabilities request.
 * `minZoom` / `maxZoom` are the tile grid's range here (a basemap's `minZoom` / `maxZoom`, an
 * overlay's `sourceMinZoom` / `sourceMaxZoom`).
 */
export type RasterSpec = { id: string; attribution?: string; fetch?: FetchConfig } & (
  | { type: 'osm'; maxZoom?: number }
  | {
      type: 'xyz';
      url: string;
      minZoom?: number;
      maxZoom?: number;
      tileSize?: number;
      crossOrigin?: string | null;
    }
  | {
      type: 'wms';
      url: string;
      params: Record<string, string | number | boolean>;
      tiled?: boolean;
      serverType?: 'mapserver' | 'geoserver' | 'qgis' | 'carmentaserver';
      projection?: string;
      crossOrigin?: string | null;
    }
  | {
      type: 'wmts';
      capabilitiesUrl: string;
      layer: string;
      matrixSet?: string;
      format?: string;
      style?: string;
      crossOrigin?: string | null;
    }
  | {
      type: 'vector-tile';
      url: string;
      format?: 'mvt' | 'geojson' | 'topojson';
      minZoom?: number;
      maxZoom?: number;
      projection?: string;
      style?: FlatStyleLike;
    }
  | {
      type: 'geotiff';
      sources: GeoTiffSourceConfig[];
      normalize?: boolean;
      convertToRGB?: boolean | 'auto';
    }
);

export interface RasterContext {
  /** Current view projection code, used to pick WMTS matrix sets. */
  getProjection(): string;
  /** Called when a source cannot be built or an asynchronous source (WMTS capabilities) fails to load. */
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
  spec: Extract<RasterSpec, { type: 'wmts' }>,
  ctx: RasterContext,
): Promise<void> {
  const response = await fetch(spec.capabilitiesUrl, fetchInit(spec.fetch));
  if (!response.ok)
    throw new Error(`GetCapabilities failed: ${response.status} ${response.statusText}`);
  const capabilities = new WMTSCapabilities().read(await response.text());
  const base = {
    layer: spec.layer,
    matrixSet: spec.matrixSet,
    format: spec.format,
    style: spec.style,
    crossOrigin: spec.crossOrigin,
  };
  // Prefer a matrix set in the view projection, fall back to whatever the service offers.
  const options =
    optionsFromCapabilities(capabilities, { ...base, projection: ctx.getProjection() }) ??
    optionsFromCapabilities(capabilities, base);
  if (!options) {
    throw new Error(`layer "${spec.layer}" not found in capabilities`);
  }
  layer.setSource(new WMTS({ ...options, attributions: spec.attribution ?? options.attributions }));
}

/**
 * Build one OpenLayers layer for a raster spec (basemaps and overlays share this). WMTS sources
 * are attached asynchronously. A source that cannot be constructed (for example `geotiff` with
 * the OpenLayers full build but no global `GeoTIFF`) yields an empty layer and `ctx.onError`, so
 * the editor still starts. Visibility, opacity, zoom range and id properties are the caller's.
 */
export function createRasterLayer(spec: RasterSpec, ctx: RasterContext): BaseLayer {
  try {
    return createLayer(spec, ctx);
  } catch (error) {
    ctx.onError(spec.id, error instanceof Error ? error : new Error(String(error)));
    return new TileLayer();
  }
}

function createLayer(spec: RasterSpec, ctx: RasterContext): BaseLayer {
  const attributions = spec.attribution;
  let layer: BaseLayer;
  switch (spec.type) {
    case 'osm':
      layer = new TileLayer({ source: new OSM({ attributions, maxZoom: spec.maxZoom }) });
      break;
    case 'xyz':
      layer = new TileLayer({
        source: new XYZ({
          url: spec.url,
          attributions,
          minZoom: spec.minZoom,
          maxZoom: spec.maxZoom,
          tileSize: spec.tileSize,
          crossOrigin: spec.crossOrigin,
        }),
      });
      break;
    case 'wms': {
      const common = {
        url: spec.url,
        params: spec.params,
        attributions,
        serverType: spec.serverType,
        projection: spec.projection,
        crossOrigin: spec.crossOrigin,
      };
      layer =
        spec.tiled === false
          ? new ImageLayer({ source: new ImageWMS(common) })
          : new TileLayer({ source: new TileWMS(common) });
      break;
    }
    case 'wmts': {
      const tileLayer = new TileLayer<WMTS>();
      layer = tileLayer;
      loadWmts(tileLayer, spec, ctx).catch((error: Error) => ctx.onError(spec.id, error));
      break;
    }
    case 'vector-tile':
      layer = new VectorTileLayer({
        source: new VectorTileSource<FeatureLike>({
          url: spec.url,
          format: vectorTileFormat(spec.format),
          attributions,
          minZoom: spec.minZoom,
          maxZoom: spec.maxZoom,
          projection: spec.projection,
        }),
        ...(spec.style ? { style: spec.style } : {}),
      });
      break;
    case 'geotiff':
      layer = new WebGLTileLayer({
        source: new GeoTIFF({
          sources: spec.sources.map((s) => ({
            url: s.url,
            bands: s.bands,
            min: s.min,
            max: s.max,
            nodata: s.nodata,
          })),
          normalize: spec.normalize,
          convertToRGB: spec.convertToRGB,
          ...(attributions ? { attributions } : {}),
        }),
      });
      break;
    default: {
      const unknown: never = spec;
      throw new Error(`unknown raster type "${(unknown as { type: string }).type}"`);
    }
  }
  return layer;
}
