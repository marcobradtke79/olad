// @vitest-environment jsdom
import Collection from 'ol/Collection';
import type BaseLayer from 'ol/layer/Base';
import type OlMap from 'ol/Map';
import { get as getProjection } from 'ol/proj';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LayerConfig } from '../config/types';
import { LayerManager } from './LayerManager';

function manager() {
  const layers = new Collection<BaseLayer>();
  const map = {
    addLayer: (l: BaseLayer) => layers.push(l),
    removeLayer: (l: BaseLayer) => layers.remove(l),
    getLayers: () => layers,
  } as unknown as OlMap;
  const events = { onChange: vi.fn(), onLoad: vi.fn(), onError: vi.fn(), onActiveChange: vi.fn() };
  return { lm: new LayerManager(map, () => 'EPSG:3857', events), events };
}

const point = (id: number) => ({
  type: 'Feature',
  id,
  properties: { id },
  geometry: { type: 'Point', coordinates: [8.4 + id / 1000, 49] },
});

/** A WFS 2.0.0 emulation serving `total` points in pages of `count`. */
function pagedServer(total: number, fail = false) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (fail)
      return { ok: false, status: 500, statusText: 'Internal Server Error', text: async () => '' };
    const params = new URL(url).searchParams;
    const start = Number(params.get('startIndex') ?? 0);
    const count = Number(params.get('count') ?? total);
    const ids = Array.from({ length: total }, (_, i) => i + 1).slice(start, start + count);
    const body = {
      type: 'FeatureCollection',
      features: ids.map(point),
      numberMatched: total,
      numberReturned: ids.length,
      init,
    };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) };
  });
}

const paged: LayerConfig = {
  id: 'pts',
  geometryType: 'Point',
  source: {
    format: 'wfs',
    url: 'https://example.org/wfs',
    typeName: 'pts',
    version: '2.0.0',
    outputFormat: 'application/json',
    strategy: 'all',
    pageSize: 2,
    fetch: { credentials: 'include', headers: { Authorization: 'Bearer x' } },
  },
};
const load = (lm: LayerManager, id: string, extent = [-1e7, -1e7, 1e7, 1e7]) =>
  lm.getSource(id).loadFeatures(extent, 1, getProjection('EPSG:3857')!);

afterEach(() => vi.unstubAllGlobals());

describe('WFS paging and load state', () => {
  it('reads every page with the configured fetch options and reports loading', async () => {
    const fetch = pagedServer(5);
    vi.stubGlobal('fetch', fetch);
    const { lm, events } = manager();
    lm.add(paged);
    expect(lm.info('pts')).toMatchObject({ loading: false, error: null, featureCount: 0 });
    load(lm, 'pts');
    expect(lm.info('pts').loading).toBe(true);
    expect(events.onChange).toHaveBeenLastCalledWith({ id: 'pts', type: 'load' });
    await vi.waitFor(() => expect(lm.info('pts').loading).toBe(false));
    expect(lm.info('pts').featureCount).toBe(5);
    expect(events.onLoad).toHaveBeenCalledTimes(1);
    expect(events.onLoad.mock.calls[0]![0].features).toHaveLength(5);
    const requested = fetch.mock.calls.map(([url]) => {
      const params = new URL(url).searchParams;
      return `${params.get('count')}@${params.get('startIndex')}`;
    });
    expect(requested).toEqual(['2@0', '2@2', '2@4']);
    expect(fetch.mock.calls[0]![1]).toEqual({
      credentials: 'include',
      headers: { Authorization: 'Bearer x' },
    });
    const loads = events.onChange.mock.calls.filter(([e]) => e.type === 'load');
    expect(loads).toHaveLength(2);
  });

  it('remembers a failed load until the next one succeeds', async () => {
    const failing = pagedServer(3, true);
    vi.stubGlobal('fetch', failing);
    const { lm, events } = manager();
    // bbox strategy: a second, disjoint extent triggers a new load after the failure.
    lm.add({ ...paged, source: { ...paged.source, pageSize: undefined, strategy: 'bbox' } });
    load(lm, 'pts', [0, 0, 100, 100]);
    await vi.waitFor(() => expect(lm.info('pts').error).not.toBeNull());
    expect(lm.info('pts').error).toMatch(/500 Internal Server Error for https:/);
    expect(lm.info('pts').loading).toBe(false);
    expect(events.onError).toHaveBeenCalledTimes(1);
    vi.stubGlobal('fetch', pagedServer(3));
    load(lm, 'pts', [1000, 1000, 1100, 1100]);
    await vi.waitFor(() => expect(lm.info('pts').error).toBeNull());
    expect(lm.info('pts').featureCount).toBe(3);
  });
});
