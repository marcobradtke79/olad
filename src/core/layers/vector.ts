import type Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import type FeatureFormat from 'ol/format/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import GML2 from 'ol/format/GML2';
import GML3 from 'ol/format/GML3';
import GML32 from 'ol/format/GML32';
import GPX from 'ol/format/GPX';
import KML from 'ol/format/KML';
import TopoJSON from 'ol/format/TopoJSON';
import WFS from 'ol/format/WFS';
import WKT from 'ol/format/WKT';
import type Geometry from 'ol/geom/Geometry';
import VectorLayer from 'ol/layer/Vector';
import { all, bbox } from 'ol/loadingstrategy';
import { get as getProjection } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import type { FlatStyleLike } from 'ol/style/flat';
import type { StyleFunction } from 'ol/style/Style';
import type { GeometryType, ResolvedLayerConfig, VectorSourceConfig } from '../config/types';
import type { Locale } from '../i18n';
import { dimensionStyleFunction } from './dimension';
import type { OriginalStore } from './originals';
import { textStyleFunction } from './text';

/** Property set on every vector layer this library creates, holding the layer id. */
export const LAYER_ID_PROPERTY = 'olcad:layer';
/** Layer property holding the data projection detected on first load. */
export const DATA_PROJECTION_PROPERTY = 'olcad:dataProjection';

export interface VectorLayerContext {
  getProjection(): string;
  /** Locale of number formats (dimension values). Default `'en'`. */
  locale?: Locale;
  originals: OriginalStore;
  onLoad(id: string, features: Feature[]): void;
  onError(id: string, error: Error): void;
  /** Veto for loaded features by id, for example ones deleted locally but not yet saved. */
  shouldLoad?(layerId: string, featureId: string | number): boolean;
}

/** The style of a layer without `style` in its config, per geometry type. */
export const DEFAULT_STYLES: Record<GeometryType, FlatStyleLike> = {
  Point: {
    'circle-radius': 5,
    'circle-fill-color': '#2563eb',
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1.5,
  },
  MultiPoint: {
    'circle-radius': 5,
    'circle-fill-color': '#2563eb',
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1.5,
  },
  LineString: { 'stroke-color': '#2563eb', 'stroke-width': 2 },
  MultiLineString: { 'stroke-color': '#2563eb', 'stroke-width': 2 },
  Polygon: {
    'stroke-color': '#2563eb',
    'stroke-width': 1.5,
    'fill-color': 'rgba(37, 99, 235, 0.15)',
  },
  MultiPolygon: {
    'stroke-color': '#2563eb',
    'stroke-width': 1.5,
    'fill-color': 'rgba(37, 99, 235, 0.15)',
  },
  // Mixed layers (the draft layer): one style that renders points, lines and polygons.
  Any: {
    'circle-radius': 5,
    'circle-fill-color': '#f59e0b',
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1.5,
    'stroke-color': '#f59e0b',
    'stroke-width': 2,
    'stroke-line-dash': [6, 4],
    'fill-color': 'rgba(245, 158, 11, 0.15)',
  },
};

function gmlFormat(version: VectorSourceConfig['gmlVersion']) {
  switch (version) {
    case '2':
      return new GML2();
    case '3.2':
      return new GML32();
    default:
      return new GML3();
  }
}

/** Build the OpenLayers format for a source config. */
export function createFormat(source: VectorSourceConfig): FeatureFormat<FeatureLike> {
  const format = source.features ? 'geojson' : source.format;
  switch (format) {
    case 'topojson':
      return new TopoJSON();
    case 'kml':
      return new KML({ extractStyles: false, showPointNames: false });
    case 'gpx':
      return new GPX();
    case 'wkt':
      return new WKT({ splitCollection: true });
    case 'gml':
      return gmlFormat(source.gmlVersion);
    case 'wfs':
      if (isJsonOutput(source.outputFormat)) return new GeoJSON();
      return new WFS({
        version: source.version,
        gmlFormat: gmlFormat(source.gmlVersion ?? (source.version === '2.0.0' ? '3.2' : '3')),
      });
    default:
      return new GeoJSON();
  }
}

const isJsonOutput = (outputFormat: string | undefined): boolean =>
  !!outputFormat && /json/i.test(outputFormat);

/** Build the GetFeature URL for a WFS source. */
export function wfsUrl(
  source: VectorSourceConfig,
  extent: number[] | undefined,
  srsName: string,
): string {
  const version = source.version ?? '1.1.0';
  const url = new URL(source.url!, globalThis.location?.href ?? 'http://localhost/');
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', version);
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set(version === '2.0.0' ? 'typeNames' : 'typeName', source.typeName!);
  url.searchParams.set('srsName', srsName);
  if (source.outputFormat) url.searchParams.set('outputFormat', source.outputFormat);
  if (extent && extent.every(Number.isFinite)) {
    url.searchParams.set('bbox', `${extent.join(',')},${srsName}`);
  }
  return url.toString();
}

/** Resolve a CRS identifier (code, URN or URL form) to the registered OpenLayers code. */
export function normalizeCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const match = /EPSG:{1,2}(\d+)$|epsg\.xml#(\d+)$|EPSG\/0\/(\d+)$/i.exec(code);
  const number = match?.[1] ?? match?.[2] ?? match?.[3];
  if (number && getProjection(`EPSG:${number}`)) return `EPSG:${number}`;
  return getProjection(code)?.getCode();
}

function detectDataProjection(
  source: VectorSourceConfig,
  format: FeatureFormat<FeatureLike>,
  input: string | object,
  viewProjection: string,
): string | undefined {
  if (source.dataProjection) return source.dataProjection;
  switch (source.features ? 'geojson' : source.format) {
    case 'wfs':
      // The GetFeature request asked for the view projection.
      return viewProjection;
    case 'gml':
      return (typeof input === 'string' && /\bsrsName="([^"]+)"/.exec(input)?.[1]) || 'EPSG:4326';
    case 'kml':
    case 'gpx':
      return 'EPSG:4326';
    default:
      return format.readProjection(input as string)?.getCode() ?? 'EPSG:4326';
  }
}

interface ReadResult {
  features: Feature[];
  dataProjection: string;
}

/**
 * Parse raw data into features in the view projection and remember each feature's
 * original geometry in the data projection.
 */
export function readFeatures(
  layer: ResolvedLayerConfig,
  format: FeatureFormat<FeatureLike>,
  data: string | object,
  viewProjection: string,
  originals: OriginalStore,
): ReadResult {
  const source = layer.source;
  const isJson = format instanceof GeoJSON || format instanceof TopoJSON;
  const input = typeof data === 'string' || isJson ? data : JSON.stringify(data);
  const dataProjection = normalizeCode(detectDataProjection(source, format, input, viewProjection));
  if (!dataProjection) {
    throw new Error(`layer "${layer.id}": unknown data projection`);
  }
  // Read without featureProjection so the geometries stay in the data projection.
  const features = format.readFeatures(input as string, { dataProjection }) as Feature[];
  for (const feature of features) {
    if (feature.getId() === undefined && layer.idProperty) {
      const id = feature.get(layer.idProperty) as string | number | undefined;
      if (id !== undefined && id !== null) feature.setId(id);
    }
    const geometry = feature.getGeometry() as Geometry | undefined;
    if (!geometry) continue;
    originals.set(feature, dataProjection, geometry.clone());
    if (dataProjection !== viewProjection) geometry.transform(dataProjection, viewProjection);
  }
  return { features, dataProjection };
}

async function fetchData(
  layer: ResolvedLayerConfig,
  extent: number[],
  resolution: number,
  projection: string,
): Promise<string | object> {
  const source = layer.source;
  if (source.features) return { type: 'FeatureCollection', features: source.features };
  if (source.data !== undefined) return source.data;
  if (source.loader) {
    return source.loader({
      extent: extent as [number, number, number, number],
      resolution,
      projection,
    });
  }
  const url =
    source.format === 'wfs'
      ? wfsUrl(
          source,
          source.strategy === 'bbox' ? extent : undefined,
          source.dataProjection ?? projection,
        )
      : source.url!;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

/**
 * The OpenLayers style of a layer: `flat` (a user style, `editor.layers.setStyle`) or the
 * configured / default flat style; text layers draw their texts through `textStyleFunction`
 * with `text` colours overriding the configured ones, dimension layers their dimensions through
 * `dimensionStyleFunction` with numbers in `locale`.
 */
export function vectorLayerStyle(
  layer: ResolvedLayerConfig,
  getProjection: () => string,
  override: { flat?: FlatStyleLike; text?: { color: string; halo: string } } = {},
  locale: Locale = 'en',
): FlatStyleLike | StyleFunction {
  const flat = override.flat ?? layer.style ?? DEFAULT_STYLES[layer.geometryType];
  if (layer.dimension) return dimensionStyleFunction(layer.dimension, flat, getProjection, locale);
  if (!layer.text) return flat;
  const text = override.text
    ? { ...layer.text, color: override.text.color, haloColor: override.text.halo }
    : layer.text;
  return textStyleFunction(text, flat, getProjection);
}

/** Create the OpenLayers vector layer for a layer config. Loading starts when the map renders it. */
export function createVectorLayer(
  layer: ResolvedLayerConfig,
  ctx: VectorLayerContext,
): VectorLayer<VectorSource<Feature>> {
  const format = createFormat(layer.source);
  const vectorSource = new VectorSource<Feature>({
    strategy: layer.source.strategy === 'bbox' ? bbox : all,
    loader: (extent, resolution, _projection, success, failure) => {
      const viewProjection = ctx.getProjection();
      fetchData(layer, extent, resolution, viewProjection)
        .then((data) => {
          const { features, dataProjection } = readFeatures(
            layer,
            format,
            data,
            viewProjection,
            ctx.originals,
          );
          olLayer.set(DATA_PROJECTION_PROPERTY, dataProjection);
          const fresh = features.filter((f) => {
            const id = f.getId();
            if (id === undefined) return true;
            if (vectorSource.getFeatureById(id)) return false;
            return ctx.shouldLoad?.(layer.id, id) ?? true;
          });
          vectorSource.addFeatures(fresh);
          ctx.onLoad(layer.id, fresh);
          success?.(fresh);
        })
        .catch((error: Error) => {
          ctx.onError(layer.id, error);
          failure?.();
        });
    },
  });
  const olLayer = new VectorLayer({
    source: vectorSource,
    style: vectorLayerStyle(layer, ctx.getProjection, {}, ctx.locale),
    visible: layer.visible,
    minZoom: layer.minZoom,
    maxZoom: layer.maxZoom,
  });
  olLayer.set(LAYER_ID_PROPERTY, layer.id);
  return olLayer;
}
