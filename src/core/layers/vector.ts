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
import { get as getProjection, transformExtent } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import type { FlatStyleLike } from 'ol/style/flat';
import type { StyleFunction } from 'ol/style/Style';
import type { GeometryType, ResolvedLayerConfig, VectorSourceConfig } from '../config/types';
import type { Locale } from '../i18n';
import { fetchText, ogcUrl } from '../net/fetch';
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
  /** Whether a dimension's measured objects changed (drawn as stale). */
  isDimensionStale?(feature: Feature): boolean;
  originals: OriginalStore;
  onLoad(id: string, features: Feature[]): void;
  onError(id: string, error: Error): void;
  /** A load started (`true`) or ended (`false`), whichever way it ended. */
  onLoading?(id: string, loading: boolean): void;
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

/**
 * Build the GetFeature URL for a WFS source: the standard parameters, then `source.params`
 * (which may override them), then the paging parameters of WFS 2.0.0.
 */
export function wfsUrl(
  source: VectorSourceConfig,
  extent: number[] | undefined,
  srsName: string,
  paging?: { count: number; startIndex: number },
): string {
  const version = source.version ?? '1.1.0';
  return ogcUrl(source.url!, {
    service: 'WFS',
    version,
    request: 'GetFeature',
    [version === '2.0.0' ? 'typeNames' : 'typeName']: source.typeName!,
    srsName,
    outputFormat: source.outputFormat,
    bbox: extent && extent.every(Number.isFinite) ? `${extent.join(',')},${srsName}` : undefined,
    ...source.params,
    ...(paging ? { count: paging.count, startIndex: paging.startIndex } : {}),
  });
}

/**
 * The bbox of a GetFeature request in `srsName` (the data projection, when set): the loader's
 * extent is in the view projection and is transformed when they differ.
 */
export function wfsBboxExtent(extent: number[], viewProjection: string, srsName: string): number[] {
  if (srsName === viewProjection || !extent.every(Number.isFinite)) return extent;
  return transformExtent(extent, viewProjection, srsName);
}

/** `numberReturned` / `numberMatched` of a WFS response (GeoJSON object or GML text). */
function pageCounts(page: string | Record<string, unknown>): {
  returned?: number;
  matched?: number;
} {
  if (typeof page === 'string') {
    const attribute = (name: string) => {
      const match = new RegExp(`\\b${name}="(\\d+)"`).exec(page);
      return match ? Number(match[1]) : undefined;
    };
    return { returned: attribute('numberReturned'), matched: attribute('numberMatched') };
  }
  const count = (value: unknown) =>
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : undefined;
  return { returned: count(page.numberReturned), matched: count(page.numberMatched) };
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

/**
 * The pages of one load: a single page for most sources, one per request for a paged WFS
 * 2.0.0 source (`count` / `startIndex` until `numberMatched` is reached or a page is short).
 */
async function* fetchPages(
  layer: ResolvedLayerConfig,
  extent: number[],
  resolution: number,
  projection: string,
): AsyncGenerator<string | object> {
  const source = layer.source;
  if (source.features) {
    yield { type: 'FeatureCollection', features: source.features };
    return;
  }
  if (source.data !== undefined) {
    yield source.data;
    return;
  }
  if (source.loader) {
    yield await source.loader({
      extent: extent as [number, number, number, number],
      resolution,
      projection,
    });
    return;
  }
  if (source.format !== 'wfs') {
    yield await fetchText(source.url!, source.fetch);
    return;
  }
  const srsName = source.dataProjection ?? projection;
  const bboxExtent =
    source.strategy === 'bbox' ? wfsBboxExtent(extent, projection, srsName) : undefined;
  const pageSize = source.pageSize;
  if (!pageSize) {
    yield await fetchText(wfsUrl(source, bboxExtent, srsName), source.fetch);
    return;
  }
  let startIndex = 0;
  for (;;) {
    const url = wfsUrl(source, bboxExtent, srsName, { count: pageSize, startIndex });
    const text = await fetchText(url, source.fetch);
    const page = isJsonOutput(source.outputFormat)
      ? (JSON.parse(text) as Record<string, unknown>)
      : text;
    yield page;
    const { returned, matched } = pageCounts(page);
    // Without numberReturned the server cannot be paged safely: stop after the first page.
    if (returned === undefined || returned === 0 || returned < pageSize) return;
    startIndex += returned;
    if (matched !== undefined && startIndex >= matched) return;
  }
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
  isDimensionStale: (feature: Feature) => boolean = () => false,
): FlatStyleLike | StyleFunction {
  const flat = override.flat ?? layer.style ?? DEFAULT_STYLES[layer.geometryType];
  if (layer.dimension) {
    return dimensionStyleFunction(layer.dimension, flat, getProjection, locale, isDimensionStale);
  }
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
    attributions: layer.attribution,
    strategy: layer.source.strategy === 'bbox' ? bbox : all,
    loader: (extent, resolution, _projection, success, failure) => {
      const viewProjection = ctx.getProjection();
      ctx.onLoading?.(layer.id, true);
      const loaded: Feature[] = [];
      const load = async () => {
        // Pages are read and added one by one, so a paged layer fills up progressively.
        for await (const data of fetchPages(layer, extent, resolution, viewProjection)) {
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
          loaded.push(...fresh);
        }
      };
      load()
        .then(() => {
          ctx.onLoad(layer.id, loaded);
          success?.(loaded);
        })
        .catch((error: Error) => {
          ctx.onError(layer.id, error);
          failure?.();
        })
        .finally(() => ctx.onLoading?.(layer.id, false));
    },
  });
  const olLayer = new VectorLayer({
    source: vectorSource,
    style: vectorLayerStyle(layer, ctx.getProjection, {}, ctx.locale, (f) =>
      ctx.isDimensionStale ? ctx.isDimensionStale(f) : false,
    ),
    visible: layer.visible,
    opacity: layer.opacity,
    minZoom: layer.minZoom,
    maxZoom: layer.maxZoom,
  });
  olLayer.set(LAYER_ID_PROPERTY, layer.id);
  return olLayer;
}
