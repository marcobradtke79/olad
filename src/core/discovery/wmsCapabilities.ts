import { get as getProjection, type ProjectionLike } from 'ol/proj';
import { createXYZ } from 'ol/tilegrid';
import { childAt, children, firstChild, parseXml, textOf, xlinkHref } from '../xml';
import { serviceException } from './serviceError';

export interface WmsLayerInfo {
  /** The `Name`, the `LAYERS` value of GetMap. */
  name: string;
  title: string;
  abstract?: string;
  queryable: boolean;
  /** Title of the nearest titled parent layer below the root layer. */
  group?: string;
  /** First style's legend image. */
  legendUrl?: string;
  /** Scale range (inherited): drawn from `minScale` up to `maxScale`. */
  minScale?: number;
  maxScale?: number;
  /** `[west, south, east, north]` in lon / lat (inherited). */
  extent?: [number, number, number, number];
  /** CRS the layer is offered in (inherited and added up). */
  crs: string[];
  /** Attribution as HTML: the title, linked when the capabilities give a URL. */
  attribution?: string;
}

export interface WmsCapabilities {
  version: string;
  title?: string;
  /** GetMap image formats. */
  formats: string[];
  /** GetFeatureInfo formats. */
  infoFormats: string[];
  /** Named leaf layers in document order. */
  layers: WmsLayerInfo[];
}

/** What a layer passes on to its children (WMS 1.3.0 section 7.2.4.8). */
interface Inherited {
  queryable: boolean;
  crs: string[];
  extent?: [number, number, number, number];
  minScale?: number;
  maxScale?: number;
  attribution?: string;
  legendUrl?: string;
  /** Titles of the ancestors below the root, nearest last. */
  titles: string[];
}

/** Read a WMS GetCapabilities document of version 1.1.1 or 1.3.0. */
export function readWmsCapabilities(xml: string): WmsCapabilities {
  const root = parseXml(xml).documentElement;
  const exception = serviceException(root);
  if (exception) throw new Error(exception);
  if (root.localName !== 'WMS_Capabilities' && root.localName !== 'WMT_MS_Capabilities') {
    throw new Error(`not a WMS capabilities document (root element ${root.localName})`);
  }
  const capability = firstChild(root, 'Capability');
  const formats = (op: string) =>
    (capability ? children(childAt(capability, 'Request', op) ?? capability, 'Format') : [])
      .map((f) => f.textContent?.trim() ?? '')
      .filter(Boolean);
  const layers: WmsLayerInfo[] = [];
  const top = capability && firstChild(capability, 'Layer');
  if (top) walk(top, { queryable: false, crs: [], titles: [] }, layers, true);
  const title = textOf(firstChild(root, 'Service') ?? root, 'Title');
  return {
    version: root.getAttribute('version') ?? '',
    ...(title ? { title } : {}),
    formats: formats('GetMap'),
    infoFormats: formats('GetFeatureInfo'),
    layers,
  };
}

function walk(layer: Element, parent: Inherited, out: WmsLayerInfo[], isRoot: boolean): void {
  const own = inherit(layer, parent);
  const kids = children(layer, 'Layer');
  const title = textOf(layer, 'Title');
  const name = textOf(layer, 'Name');
  if (kids.length === 0) {
    if (name) out.push(info(layer, name, title ?? name, own, parent.titles));
    return;
  }
  const titles = !isRoot && title ? [...parent.titles, title] : parent.titles;
  for (const kid of kids) walk(kid, { ...own, titles }, out, false);
}

function inherit(layer: Element, parent: Inherited): Inherited {
  const queryable = layer.getAttribute('queryable');
  const crs = [...children(layer, 'CRS'), ...children(layer, 'SRS')]
    .flatMap((e) => (e.textContent ?? '').trim().split(/\s+/)) // 1.1.1 allows a list in one SRS
    .filter(Boolean);
  const minScale = Number(textOf(layer, 'MinScaleDenominator'));
  const maxScale = Number(textOf(layer, 'MaxScaleDenominator'));
  const attribution = attributionOf(layer);
  const style = firstChild(layer, 'Style');
  const legend = style && childAt(style, 'LegendURL', 'OnlineResource');
  const legendUrl = legend && xlinkHref(legend);
  return {
    queryable: queryable === null ? parent.queryable : queryable === '1' || queryable === 'true',
    crs: [...new Set([...parent.crs, ...crs])],
    ...((extentOf(layer) ?? parent.extent) ? { extent: extentOf(layer) ?? parent.extent } : {}),
    ...(Number.isFinite(minScale) && textOf(layer, 'MinScaleDenominator')
      ? { minScale }
      : parent.minScale !== undefined
        ? { minScale: parent.minScale }
        : {}),
    ...(Number.isFinite(maxScale) && textOf(layer, 'MaxScaleDenominator')
      ? { maxScale }
      : parent.maxScale !== undefined
        ? { maxScale: parent.maxScale }
        : {}),
    ...((attribution ?? parent.attribution)
      ? { attribution: attribution ?? parent.attribution }
      : {}),
    ...((legendUrl ?? parent.legendUrl) ? { legendUrl: legendUrl ?? parent.legendUrl } : {}),
    titles: parent.titles,
  };
}

function info(
  layer: Element,
  name: string,
  title: string,
  own: Inherited,
  titles: string[],
): WmsLayerInfo {
  const abstract = textOf(layer, 'Abstract');
  const group = titles[titles.length - 1];
  return {
    name,
    title,
    ...(abstract ? { abstract } : {}),
    queryable: own.queryable,
    ...(group ? { group } : {}),
    ...(own.legendUrl ? { legendUrl: own.legendUrl } : {}),
    ...(own.minScale !== undefined ? { minScale: own.minScale } : {}),
    ...(own.maxScale !== undefined ? { maxScale: own.maxScale } : {}),
    ...(own.extent ? { extent: own.extent } : {}),
    crs: own.crs,
    ...(own.attribution ? { attribution: own.attribution } : {}),
  };
}

/** `EX_GeographicBoundingBox` (1.3.0) or `LatLonBoundingBox` (1.1.1) as west, south, east, north. */
function extentOf(layer: Element): [number, number, number, number] | undefined {
  const ex = firstChild(layer, 'EX_GeographicBoundingBox');
  const values = ex
    ? ['westBoundLongitude', 'southBoundLatitude', 'eastBoundLongitude', 'northBoundLatitude'].map(
        (n) => Number(textOf(ex, n)),
      )
    : (() => {
        const ll = firstChild(layer, 'LatLonBoundingBox');
        return ll ? ['minx', 'miny', 'maxx', 'maxy'].map((a) => Number(ll.getAttribute(a))) : [];
      })();
  return values.length === 4 && values.every(Number.isFinite)
    ? (values as [number, number, number, number])
    : undefined;
}

function attributionOf(layer: Element): string | undefined {
  const el = firstChild(layer, 'Attribution');
  if (!el) return undefined;
  const title = textOf(el, 'Title');
  const link = firstChild(el, 'OnlineResource');
  const href = link && xlinkHref(link);
  if (!title) return href ? `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>` : undefined;
  return href ? `<a href="${escapeHtml(href)}">${escapeHtml(title)}</a>` : escapeHtml(title);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/** OGC standardized rendering pixel size in metres (0.28 mm). */
const OGC_PIXEL = 0.00028;

/**
 * The view zoom at which a projection's default tile grid reaches a scale denominator, with
 * two decimals (`S(z) = S0 / 2^z`, `S0` the scale of zoom 0 at 0.28 mm pixels). Exact for Web
 * Mercator tile grids, approximate for other projections; `undefined` when the projection has
 * no extent or units.
 */
export function zoomForScaleDenominator(
  denominator: number,
  projection: ProjectionLike,
): number | undefined {
  const proj = getProjection(projection);
  const extent = proj?.getExtent();
  const metersPerUnit = proj?.getMetersPerUnit();
  if (!proj || !extent || !metersPerUnit || !(denominator > 0)) return undefined;
  const s0 = (createXYZ({ extent }).getResolution(0) * metersPerUnit) / OGC_PIXEL;
  return Math.round(Math.log2(s0 / denominator) * 100) / 100 || 0; // no -0
}
