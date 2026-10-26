// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { LayerConfig, OverlayConfig } from '../config/types';
import { DESCRIBE_CONCURRENCY, discover, mapLimited, type DiscoveryHost } from './discover';
import { fixture } from './fixtures/fixture';

/** A host serving fixtures by request; `taken` ids exist already. */
function fakeHost(options: { taken?: string[]; fail?: (url: URL) => boolean } = {}) {
  const layers: LayerConfig[] = [];
  const overlays: OverlayConfig[] = [];
  const requests: URL[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const host: DiscoveryHost = {
    hasId: (id) =>
      (options.taken ?? []).includes(id) ||
      layers.some((l) => l.id === id) ||
      overlays.some((o) => o.id === id),
    addLayer: (config) => layers.push(config),
    addOverlay: (config) => overlays.push(config),
    getProjection: () => 'EPSG:3857',
    fetchText: async (url, _fetch, signal) => {
      const parsed = new URL(url);
      requests.push(parsed);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise((r) => setTimeout(r, 1));
        signal.throwIfAborted();
        if (options.fail?.(parsed)) throw new Error(`500 for ${parsed.pathname}`);
        const request = parsed.searchParams.get('REQUEST');
        if (request === 'GetCapabilities') {
          return fixture(
            parsed.searchParams.get('SERVICE') === 'WMS' ? 'wms-1.3.0.xml' : 'wfs-1.1.0.xml',
          );
        }
        const type = parsed.searchParams.get('TYPENAME') ?? parsed.searchParams.get('TYPENAMES');
        if (type === 'topp:parcels' || type === 'other:roads')
          return fixture('describe-parcels.xsd');
        if (type === 'topp:points') return fixture('describe-points.xsd');
        // topp:tables: a schema without geometry
        return '<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"><xsd:element name="tables"><xsd:complexType><xsd:sequence><xsd:element name="a" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element></xsd:schema>';
      } finally {
        inFlight--;
      }
    },
  };
  return { host, layers, overlays, requests, maxInFlight: () => maxInFlight };
}

const signal = () => new AbortController().signal;

describe('discover: WFS', () => {
  it('adds the included types in capabilities order and reports the skipped ones', async () => {
    const fake = fakeHost({ taken: ['topp:points'] });
    const result = await discover(
      { type: 'wfs', url: 'http://h/wfs?map=x', exclude: ['other:*'] },
      fake.host,
      signal(),
    );
    expect(result).toEqual({
      source: { type: 'wfs', url: 'http://h/wfs?map=x' },
      added: ['topp:parcels'],
      skipped: [
        { name: 'topp:points', reason: 'exists' },
        { name: 'topp:tables', reason: 'no-geometry' },
      ],
    });
    expect(fake.layers.map((l) => [l.id, l.geometryType])).toEqual([
      ['topp:parcels', 'MultiPolygon'],
    ]);
    const caps = fake.requests[0]!;
    expect(Object.fromEntries(caps.searchParams)).toEqual({
      map: 'x',
      SERVICE: 'WFS',
      REQUEST: 'GetCapabilities',
      VERSION: '1.1.0',
    });
    expect(fake.requests[1]!.searchParams.get('TYPENAME')).toBe('topp:parcels');
  });

  it('skips a type whose schema request fails and asks 2.0.0 with TYPENAMES', async () => {
    const fake = fakeHost({ fail: (url) => url.searchParams.get('TYPENAMES') === 'topp:points' });
    const result = await discover(
      { type: 'wfs', url: 'http://h/wfs', version: '2.0.0', include: ['topp:p*'] },
      fake.host,
      signal(),
    );
    expect(result.added).toEqual(['topp:parcels']);
    expect(result.skipped).toEqual([
      { name: 'topp:points', reason: 'describe-failed', error: '500 for /wfs' },
    ]);
  });

  it('rejects when the capabilities fail and adds nothing', async () => {
    const fake = fakeHost({ fail: (url) => url.searchParams.get('REQUEST') === 'GetCapabilities' });
    await expect(
      discover({ type: 'wfs', url: 'http://h/wfs' }, fake.host, signal()),
    ).rejects.toThrow('500 for /wfs');
    expect(fake.layers).toEqual([]);
  });

  it('adds nothing after an abort', async () => {
    const fake = fakeHost();
    const controller = new AbortController();
    const pending = discover({ type: 'wfs', url: 'http://h/wfs' }, fake.host, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(fake.layers).toEqual([]);
  });

  it('asks at most four schemas at once', async () => {
    const order: number[] = [];
    let active = 0;
    let peak = 0;
    const results = await mapLimited(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      DESCRIBE_CONCURRENCY,
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 10 - n));
        order.push(n);
        active--;
        return n * 2;
      },
    );
    expect(peak).toBe(4);
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(order).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]); // they did overlap
  });
});

describe('discover: WMS', () => {
  it('adds the named leaf layers as overlays and skips taken ids', async () => {
    const fake = fakeHost({ taken: ['loose'] });
    const result = await discover(
      { type: 'wms', url: 'http://h/wms', exclude: ['*:hillshade'], defaults: { visible: false } },
      fake.host,
      signal(),
    );
    expect(result.added).toEqual(['topp:roads', 'other:ortho']);
    expect(result.skipped).toEqual([{ name: 'loose', reason: 'exists' }]);
    expect(fake.overlays.map((o) => [o.id, o.visible, o.group])).toEqual([
      ['topp:roads', false, 'Base group'],
      ['other:ortho', false, 'Untitled-free'],
    ]);
    expect(fake.requests[0]!.searchParams.get('VERSION')).toBe('1.3.0');
  });
});
