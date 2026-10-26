// @vitest-environment jsdom
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import type XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import ImageWMS from 'ol/source/ImageWMS';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRasterLayer } from './raster';

const context = () => ({ getProjection: () => 'EPSG:3857', onError: vi.fn() });

afterEach(() => vi.unstubAllGlobals());

describe('createRasterLayer', () => {
  it('builds tile layers for osm and xyz with the tile grid range', () => {
    const osm = createRasterLayer({ id: 'a', type: 'osm', maxZoom: 18 }, context());
    expect(osm).toBeInstanceOf(TileLayer);
    expect((osm as TileLayer<OSM>).getSource()).toBeInstanceOf(OSM);
    const xyz = createRasterLayer(
      {
        id: 'b',
        type: 'xyz',
        url: 'https://tiles.example.org/{z}/{x}/{y}.png',
        minZoom: 3,
        maxZoom: 12,
        tileSize: 512,
        attribution: 'tiles',
      },
      context(),
    ) as TileLayer<XYZ>;
    const grid = xyz.getSource()!.getTileGrid()!;
    expect(grid.getMinZoom()).toBe(3);
    expect(grid.getMaxZoom()).toBe(12);
    expect(grid.getTileSize(3)).toBe(512);
    expect(xyz.getSource()!.getAttributions()).toBeTypeOf('function');
  });

  it('builds a tiled or a single-image WMS layer', () => {
    const spec = { id: 'w', type: 'wms' as const, url: '/wms', params: { LAYERS: 'x' } };
    const tiled = createRasterLayer(spec, context());
    expect(tiled).toBeInstanceOf(TileLayer);
    expect((tiled as TileLayer<TileWMS>).getSource()).toBeInstanceOf(TileWMS);
    const image = createRasterLayer({ ...spec, tiled: false }, context());
    expect(image).toBeInstanceOf(ImageLayer);
    expect((image as ImageLayer<ImageWMS>).getSource()).toBeInstanceOf(ImageWMS);
  });

  it('builds a vector-tile layer', () => {
    const layer = createRasterLayer(
      { id: 'v', type: 'vector-tile', url: 'https://t/{z}/{x}/{y}.pbf', maxZoom: 14 },
      context(),
    );
    expect(layer).toBeInstanceOf(VectorTileLayer);
  });

  it('loads WMTS capabilities asynchronously and reports a failure', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }));
    vi.stubGlobal('fetch', fetch);
    const ctx = context();
    const layer = createRasterLayer(
      { id: 'm', type: 'wmts', capabilitiesUrl: 'https://wmts.example.org/caps.xml', layer: 'web' },
      ctx,
    );
    expect(layer).toBeInstanceOf(TileLayer);
    expect(fetch).toHaveBeenCalledWith('https://wmts.example.org/caps.xml', {});
    await vi.waitFor(() => expect(ctx.onError).toHaveBeenCalled());
    expect(ctx.onError.mock.calls[0]![0]).toBe('m');
    expect(ctx.onError.mock.calls[0]![1].message).toMatch(/GetCapabilities failed: 404/);
  });

  it('returns an empty layer and reports it when the source cannot be built', () => {
    const ctx = context();
    const layer = createRasterLayer({ id: 'x', type: 'nope' } as never, ctx);
    expect(layer).toBeInstanceOf(TileLayer);
    expect((layer as TileLayer).getSource()).toBeNull();
    const [id, error] = ctx.onError.mock.calls[0]!;
    expect(id).toBe('x');
    expect(error.message).toMatch(/nope/);
  });
});
