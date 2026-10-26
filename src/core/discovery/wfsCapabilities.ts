import { childAt, children, descendants, firstChild, parseXml, textOf } from '../xml';
import { serviceException } from './serviceError';

export interface WfsFeatureType {
  /** Qualified name (`topp:roads`), the `typeName` of the requests. */
  name: string;
  title?: string;
  abstract?: string;
  /** The default CRS as written (`urn:ogc:def:crs:EPSG::4326`, `EPSG:4326`). */
  defaultCrs?: string;
  otherCrs: string[];
  /** `[west, south, east, north]` in lon / lat. */
  wgs84Bbox?: [number, number, number, number];
}

export interface WfsCapabilities {
  version: string;
  title?: string;
  featureTypes: WfsFeatureType[];
  /** GetFeature output formats the service offers (operation parameters and 1.0.0 result formats). */
  outputFormats: string[];
}

/** Read a WFS GetCapabilities document of version 1.0.0, 1.1.0 or 2.0.0. */
export function readWfsCapabilities(xml: string): WfsCapabilities {
  const root = parseXml(xml).documentElement;
  const exception = serviceException(root);
  if (exception) throw new Error(exception);
  if (root.localName !== 'WFS_Capabilities') {
    throw new Error(`not a WFS capabilities document (root element ${root.localName})`);
  }
  const title =
    textOf(childAt(root, 'ServiceIdentification') ?? root, 'Title') ??
    textOf(childAt(root, 'Service') ?? root, 'Title');
  const list = firstChild(root, 'FeatureTypeList');
  const featureTypes = (list ? children(list, 'FeatureType') : []).flatMap((ft) => {
    const name = textOf(ft, 'Name');
    if (!name) return [];
    const type: WfsFeatureType = {
      name,
      otherCrs: [...children(ft, 'OtherSRS'), ...children(ft, 'OtherCRS')]
        .map((e) => e.textContent?.trim() ?? '')
        .filter(Boolean),
    };
    const typeTitle = textOf(ft, 'Title');
    if (typeTitle) type.title = typeTitle;
    const abstract = textOf(ft, 'Abstract');
    if (abstract) type.abstract = abstract;
    const crs = textOf(ft, 'DefaultSRS') ?? textOf(ft, 'DefaultCRS') ?? textOf(ft, 'SRS');
    if (crs) type.defaultCrs = crs;
    const bbox = wgs84Bbox(ft);
    if (bbox) type.wgs84Bbox = bbox;
    return [type];
  });
  return {
    version: root.getAttribute('version') ?? '',
    ...(title ? { title } : {}),
    featureTypes,
    outputFormats: outputFormats(root),
  };
}

function wgs84Bbox(ft: Element): [number, number, number, number] | undefined {
  const box = firstChild(ft, 'WGS84BoundingBox');
  if (box) {
    const lower = textOf(box, 'LowerCorner')?.split(/\s+/).map(Number);
    const upper = textOf(box, 'UpperCorner')?.split(/\s+/).map(Number);
    const bbox = [lower?.[0], lower?.[1], upper?.[0], upper?.[1]];
    return finiteBox(bbox);
  }
  const latLong = firstChild(ft, 'LatLongBoundingBox'); // 1.0.0
  if (latLong) {
    return finiteBox(['minx', 'miny', 'maxx', 'maxy'].map((a) => Number(latLong.getAttribute(a))));
  }
  return undefined;
}

function finiteBox(values: (number | undefined)[]): [number, number, number, number] | undefined {
  return values.length === 4 && values.every((v) => Number.isFinite(v))
    ? (values as [number, number, number, number])
    : undefined;
}

function outputFormats(root: Element): string[] {
  const formats = new Set<string>();
  for (const op of descendants(root, 'Operation')) {
    if (op.getAttribute('name') !== 'GetFeature') continue;
    for (const param of children(op, 'Parameter')) {
      if (param.getAttribute('name') !== 'outputFormat') continue;
      for (const value of descendants(param, 'Value')) {
        const text = value.textContent?.trim();
        if (text) formats.add(text);
      }
    }
  }
  // 1.0.0: Capability/Request/GetFeature/ResultFormat/<GML2/> <JSON/> …
  const resultFormat = childAt(root, 'Capability', 'Request', 'GetFeature', 'ResultFormat');
  for (const el of resultFormat ? Array.from(resultFormat.children) : []) formats.add(el.localName);
  // 1.1.0 per type: FeatureType/OutputFormats/Format
  for (const el of descendants(root, 'OutputFormats')) {
    for (const format of children(el, 'Format')) {
      const text = format.textContent?.trim();
      if (text) formats.add(text);
    }
  }
  return [...formats];
}
