import { get as getProjection } from 'ol/proj';
import type {
  LayerConfig,
  WfsDiscoverConfig,
  WmsDiscoverConfig,
  WmsOverlayConfig,
} from '../config/types';
import type { DescribedFeatureType } from './describeFeatureType';
import type { WfsCapabilities, WfsFeatureType } from './wfsCapabilities';
import {
  zoomForScaleDenominator,
  type WmsCapabilities,
  type WmsLayerInfo,
} from './wmsCapabilities';

/** The workspace prefix of a qualified name (`topp:roads` → `topp`), else `undefined`. */
export function workspaceOf(name: string): string | undefined {
  const colon = name.indexOf(':');
  return colon > 0 ? name.slice(0, colon) : undefined;
}

/** A CRS name as OpenLayers knows it (`urn:ogc:def:crs:EPSG::25832` → `EPSG:25832`), else `undefined`. */
export function knownCrs(crs: string | undefined): string | undefined {
  if (!crs) return undefined;
  const epsg = /EPSG(?::+|\/\d*\/?|\.xml#)(\d+)$/i.exec(crs);
  const code = epsg ? `EPSG:${epsg[1]}` : /CRS:?84$/i.test(crs) ? 'EPSG:4326' : crs;
  return getProjection(code) ? code : undefined;
}

/** The GetFeature output format: the configured one, else JSON when offered, else GML (unset). */
function outputFormatFor(source: WfsDiscoverConfig, caps: WfsCapabilities): string | undefined {
  if (source.outputFormat) return source.outputFormat;
  return (
    caps.outputFormats.find((f) => /^application\/json/i.test(f)) ??
    caps.outputFormats.find((f) => /json/i.test(f))
  );
}

/**
 * The layer config of a discovered WFS feature type: a read-only `wfs` layer with the bbox
 * strategy, the geometry type and fields from the schema, the extent from the capabilities and
 * the source's `defaults` (which never replace the id, source, geometry type or schema).
 */
export function buildWfsLayerConfig(
  featureType: WfsFeatureType,
  described: DescribedFeatureType & { geometry: NonNullable<DescribedFeatureType['geometry']> },
  source: WfsDiscoverConfig,
  caps: WfsCapabilities,
): LayerConfig {
  const outputFormat = outputFormatFor(source, caps);
  const dataProjection = knownCrs(featureType.defaultCrs);
  const group = source.defaults?.group ?? workspaceOf(featureType.name);
  const defaults = { ...source.defaults };
  delete defaults.group;
  return {
    id: featureType.name,
    title: featureType.title ?? featureType.name,
    source: {
      format: 'wfs',
      url: source.url,
      typeName: featureType.name,
      version: source.version ?? '1.1.0',
      ...(outputFormat ? { outputFormat } : {}),
      strategy: 'bbox',
      ...(dataProjection ? { dataProjection } : {}),
      ...(source.fetch ? { fetch: source.fetch } : {}),
    },
    geometryType: described.geometry.geometryType,
    ...(described.fields.length > 0 ? { schema: { fields: described.fields } } : {}),
    editable: false,
    ...(group ? { group } : {}),
    ...(featureType.wgs84Bbox
      ? { extent: featureType.wgs84Bbox, extentProjection: 'EPSG:4326' }
      : {}),
    ...defaults,
  };
}

/**
 * The CRS a WMS overlay requests: none (the view projection) when the layer offers it, else
 * EPSG:3857, else EPSG:4326, else none.
 */
function projectionFor(layer: WmsLayerInfo, viewProjection: string): string | undefined {
  const offered = new Set(layer.crs.map((c) => knownCrs(c) ?? c));
  if (offered.size === 0 || offered.has(viewProjection)) return undefined;
  return ['EPSG:3857', 'EPSG:4326'].find((c) => offered.has(c));
}

/**
 * The overlay config of a discovered WMS layer: a tiled, transparent `wms` overlay on the
 * configured URL (never the advertised GetMap URL, which may name a proxy host) with the
 * legend, queryability, zoom range from the scale denominators, extent, attribution and group
 * from the capabilities, then the source's `defaults`.
 */
export function buildWmsOverlayConfig(
  layer: WmsLayerInfo,
  source: WmsDiscoverConfig,
  caps: WmsCapabilities,
  viewProjection: string,
): WmsOverlayConfig {
  const defaults = source.defaults ?? {};
  const minZoom =
    defaults.minZoom ??
    (layer.maxScale !== undefined
      ? zoomForScaleDenominator(layer.maxScale, viewProjection)
      : undefined);
  const maxZoom =
    defaults.maxZoom ??
    (layer.minScale !== undefined
      ? zoomForScaleDenominator(layer.minScale, viewProjection)
      : undefined);
  const projection = projectionFor(layer, viewProjection);
  const group = defaults.group ?? layer.group ?? workspaceOf(layer.name);
  const attribution = defaults.attribution ?? layer.attribution;
  return {
    id: layer.name,
    type: 'wms',
    title: layer.title,
    url: source.url,
    params: {
      ...defaults.params,
      LAYERS: layer.name,
      TRANSPARENT: true,
      VERSION: caps.version || source.version || '1.3.0',
      ...(caps.formats.includes('image/png') ? { FORMAT: 'image/png' } : {}),
    },
    tiled: defaults.tiled ?? true,
    queryable: layer.queryable,
    ...(layer.legendUrl ? { legendUrl: layer.legendUrl } : {}),
    ...(minZoom !== undefined ? { minZoom } : {}),
    ...(maxZoom !== undefined ? { maxZoom } : {}),
    ...(layer.extent ? { extent: layer.extent, extentProjection: 'EPSG:4326' } : {}),
    ...(attribution ? { attribution } : {}),
    ...(projection ? { projection } : {}),
    ...(group ? { group } : {}),
    ...(defaults.visible !== undefined ? { visible: defaults.visible } : {}),
    ...(defaults.opacity !== undefined ? { opacity: defaults.opacity } : {}),
    ...(defaults.serverType ? { serverType: defaults.serverType } : {}),
    ...(defaults.crossOrigin !== undefined ? { crossOrigin: defaults.crossOrigin } : {}),
  };
}
