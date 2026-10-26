// @vitest-environment jsdom
import type Layer from 'ol/layer/Layer';
import { get as getProjection } from 'ol/proj';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedOverlayConfig } from '../config/types';
import { featureInfoUrl, queryFeatureInfo, readFeatureInfo } from './featureInfo';
import { createRasterLayer } from './raster';

const config = {
  id: 'parcels-wms',
  title: 'Parcels',
  type: 'wms',
  url: 'https://example.org/wms',
  params: { layers: 'test:parcels', TRANSPARENT: true },
  visible: true,
  opacity: 1,
  queryable: true,
} as Extract<ResolvedOverlayConfig, { type: 'wms' }>;
const layer = () =>
  createRasterLayer(config, { getProjection: () => 'EPSG:3857', onError: vi.fn() }) as Layer;
const collection = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 'test:parcels.1', geometry: null, properties: { owner: 'A', area: 12 } },
  ],
});

afterEach(() => vi.unstubAllGlobals());

describe('featureInfoUrl', () => {
  it('asks the layers of the overlay in the configured format', () => {
    const url = new URL(featureInfoUrl(layer(), config, [935100, 6276400], 2.4, 'EPSG:3857')!);
    expect(url.searchParams.get('REQUEST')).toBe('GetFeatureInfo');
    expect(url.searchParams.get('QUERY_LAYERS')).toBe('test:parcels');
    expect(url.searchParams.get('INFO_FORMAT')).toBe('application/json');
    expect(url.searchParams.get('FEATURE_COUNT')).toBe('10');
    const gml = featureInfoUrl(
      layer(),
      { ...config, infoFormat: 'application/vnd.ogc.gml' },
      [935100, 6276400],
      2.4,
      getProjection('EPSG:3857')!,
    )!;
    expect(new URL(gml).searchParams.get('INFO_FORMAT')).toBe('application/vnd.ogc.gml');
  });
});

describe('readFeatureInfo', () => {
  it('reads GeoJSON answers and treats an empty answer as no features', () => {
    const features = readFeatureInfo(collection, 'application/json');
    expect(features).toHaveLength(1);
    expect(features[0]!.getId()).toBe('test:parcels.1');
    expect(features[0]!.get('owner')).toBe('A');
    expect(readFeatureInfo('', 'application/json')).toEqual([]);
  });

  it('reads GML answers with the WMSGetFeatureInfo format', () => {
    const gml = `<?xml version="1.0" encoding="UTF-8"?>
<msGMLOutput xmlns:gml="http://www.opengis.net/gml">
  <parcels_layer>
    <parcels_feature>
      <gml:boundedBy><gml:Box><gml:coordinates>0,0 1,1</gml:coordinates></gml:Box></gml:boundedBy>
      <owner>B</owner>
    </parcels_feature>
  </parcels_layer>
</msGMLOutput>`;
    const features = readFeatureInfo(gml, 'application/vnd.ogc.gml');
    expect(features).toHaveLength(1);
    expect(features[0]!.get('owner')).toBe('B');
  });
});

describe('queryFeatureInfo', () => {
  it('fetches with the overlay fetch options and reads the answer', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => collection,
    }));
    vi.stubGlobal('fetch', fetch);
    const features = await queryFeatureInfo(
      layer(),
      { ...config, fetch: { credentials: 'include' } },
      [935100, 6276400],
      2.4,
      'EPSG:3857',
    );
    expect(features).toHaveLength(1);
    expect(fetch.mock.calls[0]![0]).toMatch(/REQUEST=GetFeatureInfo/);
    expect(fetch.mock.calls[0]![1]).toEqual({ credentials: 'include' });
  });

  it('throws for a failed request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      })),
    );
    await expect(queryFeatureInfo(layer(), config, [0, 0], 1, 'EPSG:3857')).rejects.toThrow(/500/);
  });
});
