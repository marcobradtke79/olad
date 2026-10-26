import { describe, expect, it } from 'vitest';
import { applyDefaults } from './defaults';
import { validateConfig, validateDiscoverConfig } from './validate';

const base = { target: 'map' };

describe('validateConfig: discover', () => {
  it('accepts WFS and WMS sources with every option', () => {
    expect(() =>
      validateConfig({
        ...base,
        discover: [
          {
            type: 'wfs',
            url: '/wfs',
            version: '2.0.0',
            outputFormat: 'application/json',
            include: ['test:*'],
            exclude: ['test:dim*'],
            fetch: { credentials: 'include', headers: { Authorization: 'x' } },
            defaults: {
              visible: false,
              editable: { update: true },
              snappable: false,
              style: { 'stroke-color': 'red' },
              minZoom: 10,
              maxZoom: 20,
              group: 'g',
            },
          },
          {
            type: 'wms',
            url: '/wms',
            version: '1.1.1',
            as: 'overlay',
            defaults: {
              visible: true,
              opacity: 0.5,
              minZoom: 1,
              maxZoom: 2,
              tiled: false,
              serverType: 'geoserver',
              crossOrigin: null,
              params: { STYLES: '' },
              attribution: 'a',
              group: 'g',
            },
          },
        ],
      }),
    ).not.toThrow();
    expect(applyDefaults(base).discover).toEqual([]);
  });

  it('names the offending path', () => {
    const check = (source: unknown) => () => validateConfig({ ...base, discover: [source] });
    expect(() => validateConfig({ ...base, discover: {} })).toThrow(/config\.discover:/);
    expect(check({ type: 'wcs', url: '/x' })).toThrow(/config\.discover\[0\]\.type/);
    expect(check({ type: 'wfs' })).toThrow(/config\.discover\[0\]\.url/);
    expect(check({ type: 'wfs', url: '/x', as: 'overlay' })).toThrow(/config\.discover\[0\]/);
    expect(check({ type: 'wfs', url: '/x', version: '1.3.0' })).toThrow(/\.version/);
    expect(check({ type: 'wms', url: '/x', version: '2.0.0' })).toThrow(/\.version/);
    expect(check({ type: 'wms', url: '/x', as: 'basemap' })).toThrow(/\.as/);
    expect(check({ type: 'wfs', url: '/x', include: 'a*' })).toThrow(/\.include/);
    expect(check({ type: 'wfs', url: '/x', defaults: { opacity: 1 } })).toThrow(/\.defaults/);
    expect(check({ type: 'wms', url: '/x', defaults: { editable: true } })).toThrow(/\.defaults/);
    expect(check({ type: 'wms', url: '/x', defaults: { opacity: 2 } })).toThrow(
      /\.defaults\.opacity/,
    );
    expect(check({ type: 'wms', url: '/x', defaults: { params: { A: {} } } })).toThrow(
      /\.defaults\.params\.A/,
    );
    expect(check({ type: 'wfs', url: '/x', defaults: { group: '' } })).toThrow(/\.defaults\.group/);
    expect(check({ type: 'wfs', url: '/x', fetch: { mode: 'cors' } })).toThrow(/\.fetch/);
  });

  it('validates a single source for discovery.run', () => {
    expect(() => validateDiscoverConfig({ type: 'wms', url: '/wms' })).not.toThrow();
    expect(() => validateDiscoverConfig({ type: 'wms' })).toThrow(/discover\.url/);
  });
});
