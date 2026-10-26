import type Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import GeoJSON from 'ol/format/GeoJSON';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import type Layer from 'ol/layer/Layer';
import type { ProjectionLike } from 'ol/proj';
import ImageWMS from 'ol/source/ImageWMS';
import TileWMS from 'ol/source/TileWMS';
import type { ResolvedOverlayConfig } from '../config/types';
import { fetchText } from '../net/fetch';

/** `INFO_FORMAT` of GetFeatureInfo requests unless the overlay sets one. */
export const DEFAULT_INFO_FORMAT = 'application/json';

/** What one overlay answered to a GetFeatureInfo request at a map position. */
export interface FeatureInfoResult {
  overlay: string;
  title: string;
  /** The features the server returned; their properties are the information, geometries may be missing. */
  features: Feature[];
  /** Set when the request failed or the answer could not be read; `features` is empty then. */
  error?: Error;
}

type WmsOverlay = Extract<ResolvedOverlayConfig, { type: 'wms' }>;

/**
 * The GetFeatureInfo URL of a WMS overlay at a map position (`QUERY_LAYERS` from its `LAYERS`,
 * `INFO_FORMAT` from `infoFormat`), or `undefined` when its source cannot build one.
 */
export function featureInfoUrl(
  layer: Layer,
  config: WmsOverlay,
  coordinate: Coordinate,
  resolution: number,
  projection: ProjectionLike,
): string | undefined {
  const source = layer.getSource();
  if (!(source instanceof TileWMS || source instanceof ImageWMS)) return undefined;
  const layers = Object.entries(config.params).find(([key]) => key.toUpperCase() === 'LAYERS');
  return source.getFeatureInfoUrl(coordinate, resolution, projection, {
    INFO_FORMAT: config.infoFormat ?? DEFAULT_INFO_FORMAT,
    QUERY_LAYERS: layers?.[1],
    FEATURE_COUNT: 10,
  });
}

/**
 * Read a GetFeatureInfo answer: GeoJSON for JSON formats (GeoServer's `application/json`),
 * otherwise OpenLayers' `WMSGetFeatureInfo` format for the GML flavours.
 */
export function readFeatureInfo(text: string, infoFormat: string): Feature[] {
  if (/json/i.test(infoFormat)) {
    if (text.trim() === '') return [];
    return new GeoJSON().readFeatures(text) as Feature[];
  }
  return new WMSGetFeatureInfo().readFeatures(text) as Feature[];
}

/** Query one WMS overlay at a map position. Throws when no URL can be built or the request fails. */
export async function queryFeatureInfo(
  layer: Layer,
  config: WmsOverlay,
  coordinate: Coordinate,
  resolution: number,
  projection: ProjectionLike,
): Promise<Feature[]> {
  const url = featureInfoUrl(layer, config, coordinate, resolution, projection);
  if (!url) throw new Error(`overlay "${config.id}" offers no GetFeatureInfo URL`);
  const text = await fetchText(url, config.fetch);
  return readFeatureInfo(text, config.infoFormat ?? DEFAULT_INFO_FORMAT);
}
