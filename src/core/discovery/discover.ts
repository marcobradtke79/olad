import type {
  DiscoverConfig,
  FetchConfig,
  LayerConfig,
  OverlayConfig,
  WfsDiscoverConfig,
  WmsDiscoverConfig,
} from '../config/types';
import { ogcUrl } from '../net/fetch';
import { buildWfsLayerConfig, buildWmsOverlayConfig } from './build';
import { readDescribeFeatureType } from './describeFeatureType';
import { nameFilter } from './glob';
import { readWfsCapabilities, type WfsFeatureType } from './wfsCapabilities';
import { readWmsCapabilities } from './wmsCapabilities';

/** Why a discovered name was not added. */
export type DiscoverySkipReason = 'exists' | 'no-geometry' | 'describe-failed' | 'unsupported';

export interface DiscoverySkip {
  name: string;
  reason: DiscoverySkipReason;
  /** The message for `describe-failed` and `unsupported`. */
  error?: string;
}

export interface DiscoveryResult {
  source: { type: DiscoverConfig['type']; url: string };
  /** Ids of the added layers (WFS) or overlays (WMS), in capabilities order. */
  added: string[];
  skipped: DiscoverySkip[];
}

/** What discovery needs from the editor. */
export interface DiscoveryHost {
  /** Whether the id is taken by a layer (the draft layer included) or an overlay. */
  hasId(id: string): boolean;
  addLayer(config: LayerConfig): void;
  addOverlay(config: OverlayConfig): void;
  getProjection(): string;
  fetchText(url: string, fetch: FetchConfig | undefined, signal: AbortSignal): Promise<string>;
}

/** DescribeFeatureType requests in flight at once. */
export const DESCRIBE_CONCURRENCY = 4;

/**
 * Read one source's capabilities and add what it offers. Throws when the capabilities request
 * or document fails (nothing is added then) and when `signal` aborts (nothing more is added).
 */
export async function discover(
  source: DiscoverConfig,
  host: DiscoveryHost,
  signal: AbortSignal,
): Promise<DiscoveryResult> {
  return source.type === 'wfs'
    ? discoverWfs(source, host, signal)
    : discoverWms(source, host, signal);
}

function resultOf(source: DiscoverConfig): DiscoveryResult {
  return { source: { type: source.type, url: source.url }, added: [], skipped: [] };
}

async function discoverWfs(
  source: WfsDiscoverConfig,
  host: DiscoveryHost,
  signal: AbortSignal,
): Promise<DiscoveryResult> {
  const version = source.version ?? '1.1.0';
  const capsUrl = ogcUrl(source.url, {
    SERVICE: 'WFS',
    REQUEST: 'GetCapabilities',
    VERSION: version,
  });
  const caps = readWfsCapabilities(await host.fetchText(capsUrl, source.fetch, signal));
  signal.throwIfAborted();
  const result = resultOf(source);
  const wanted = nameFilter(source.include, source.exclude);
  const types: WfsFeatureType[] = [];
  for (const type of caps.featureTypes) {
    if (!wanted(type.name)) continue;
    if (host.hasId(type.name)) result.skipped.push({ name: type.name, reason: 'exists' });
    else types.push(type);
  }
  // DescribeFeatureType per type, a few at a time; the adds keep the capabilities order.
  const described = await mapLimited(types, DESCRIBE_CONCURRENCY, async (type) => {
    const url = ogcUrl(source.url, {
      SERVICE: 'WFS',
      REQUEST: 'DescribeFeatureType',
      VERSION: version,
      [version === '2.0.0' ? 'TYPENAMES' : 'TYPENAME']: type.name,
    });
    try {
      const all = readDescribeFeatureType(await host.fetchText(url, source.fetch, signal));
      const local = type.name.slice(type.name.indexOf(':') + 1);
      return {
        type,
        schema: all.find((d) => d.name === local) ?? (all.length === 1 ? all[0] : undefined),
      };
    } catch (error) {
      if (signal.aborted) throw error;
      return { type, error: message(error) };
    }
  });
  signal.throwIfAborted();
  for (const { type, schema, error } of described) {
    if (error !== undefined || !schema) {
      result.skipped.push({
        name: type.name,
        reason: 'describe-failed',
        error: error ?? 'the schema does not describe this type',
      });
    } else if (!schema.geometry) {
      result.skipped.push({ name: type.name, reason: 'no-geometry' });
    } else if (host.hasId(type.name)) {
      result.skipped.push({ name: type.name, reason: 'exists' });
    } else {
      try {
        host.addLayer(
          buildWfsLayerConfig(type, { ...schema, geometry: schema.geometry }, source, caps),
        );
        result.added.push(type.name);
      } catch (e) {
        result.skipped.push({ name: type.name, reason: 'unsupported', error: message(e) });
      }
    }
  }
  return result;
}

async function discoverWms(
  source: WmsDiscoverConfig,
  host: DiscoveryHost,
  signal: AbortSignal,
): Promise<DiscoveryResult> {
  const capsUrl = ogcUrl(source.url, {
    SERVICE: 'WMS',
    REQUEST: 'GetCapabilities',
    VERSION: source.version ?? '1.3.0',
  });
  const caps = readWmsCapabilities(await host.fetchText(capsUrl, source.fetch, signal));
  signal.throwIfAborted();
  const result = resultOf(source);
  const wanted = nameFilter(source.include, source.exclude);
  for (const layer of caps.layers) {
    if (!wanted(layer.name)) continue;
    if (host.hasId(layer.name)) {
      result.skipped.push({ name: layer.name, reason: 'exists' });
      continue;
    }
    try {
      host.addOverlay(buildWmsOverlayConfig(layer, source, caps, host.getProjection()));
      result.added.push(layer.name);
    } catch (e) {
      result.skipped.push({ name: layer.name, reason: 'unsupported', error: message(e) });
    }
  }
  return result;
}

/** `map` over `items` with at most `limit` calls pending; results in input order. */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
