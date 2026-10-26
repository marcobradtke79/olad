import { describe, expect, it } from 'vitest';
import { validateConfig } from './validate';

const base = { target: 'map' };
const layer = { id: 'l', geometryType: 'Point', source: { features: [] } };
const path = (fn: () => void): string => {
  try {
    fn();
  } catch (error) {
    return (error as { path: string }).path;
  }
  return 'no error';
};

describe('validateConfig: view fit and extents', () => {
  it('accepts a fit to an extent or to layers and a lon/lat centre', () => {
    expect(() =>
      validateConfig({
        ...base,
        view: {
          center: [8.4, 49],
          centerProjection: 'EPSG:4326',
          fit: {
            extent: [8.39, 49, 8.41, 49.02],
            projection: 'EPSG:4326',
            padding: [10, 10, 10, 10],
            maxZoom: 18,
          },
        },
      }),
    ).not.toThrow();
    expect(() => validateConfig({ ...base, view: { fit: { layers: true } } })).not.toThrow();
    expect(() => validateConfig({ ...base, view: { fit: { layers: ['a', 'b'] } } })).not.toThrow();
  });

  it('rejects a fit without or with both targets and bad values, naming the path', () => {
    const fit = (value: unknown) => path(() => validateConfig({ ...base, view: { fit: value } }));
    expect(fit({})).toBe('config.view.fit');
    expect(fit({ extent: [0, 0, 1, 1], layers: true })).toBe('config.view.fit');
    expect(fit({ extent: [0, 0, 1] })).toBe('config.view.fit.extent');
    expect(fit({ extent: [0, 0, 1, 1], projection: 'EPSG:99999' })).toBe(
      'config.view.fit.projection',
    );
    expect(fit({ layers: [1] })).toBe('config.view.fit.layers[0]');
    expect(fit({ layers: true, padding: [1, 2] })).toBe('config.view.fit.padding');
    expect(fit({ layers: true, maxZoom: 'x' })).toBe('config.view.fit.maxZoom');
    expect(fit({ layers: true, nearest: true })).toBe('config.view.fit.nearest');
    expect(path(() => validateConfig({ ...base, view: { centerProjection: 'EPSG:99999' } }))).toBe(
      'config.view.centerProjection',
    );
  });

  it('validates the data extent of layers and overlays', () => {
    expect(() =>
      validateConfig({
        ...base,
        layers: [{ ...layer, extent: [8, 49, 9, 50] }],
        overlays: [
          {
            id: 'o',
            type: 'xyz',
            url: 'u',
            extent: [900000, 6200000, 950000, 6300000],
            extentProjection: 'EPSG:3857',
          },
        ],
      }),
    ).not.toThrow();
    expect(path(() => validateConfig({ ...base, layers: [{ ...layer, extent: [8, 49] }] }))).toBe(
      'config.layers[0].extent',
    );
    expect(
      path(() => validateConfig({ ...base, layers: [{ ...layer, extentProjection: 'EPSG:1' }] })),
    ).toBe('config.layers[0].extentProjection');
    expect(
      path(() =>
        validateConfig({ ...base, overlays: [{ id: 'o', type: 'xyz', url: 'u', extent: 'x' }] }),
      ),
    ).toBe('config.overlays[0].extent');
  });
});
