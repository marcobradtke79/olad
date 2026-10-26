import { describe, expect, it } from 'vitest';
import { applyDefaults } from './defaults';
import { validateConfig, validateLayerConfig, validateOverlayConfig } from './validate';

const base = { target: 'map' };
const layer = { id: 'l', geometryType: 'Point', source: { features: [] } };
const wms = { id: 'o', type: 'wms', url: '/wms', params: { LAYERS: 'x' } };

describe('validateConfig: groups', () => {
  it('accepts declared groups and members naming declared or undeclared groups', () => {
    expect(() =>
      validateConfig({
        ...base,
        groups: [{ id: 'infra', title: 'Infrastructure', collapsed: true }, { id: 'base' }],
        layers: [{ ...layer, group: 'infra' }],
        overlays: [{ ...wms, group: 'elsewhere' }],
      }),
    ).not.toThrow();
  });

  it('names the offending path', () => {
    expect(() => validateConfig({ ...base, groups: {} })).toThrow(/config\.groups/);
    expect(() => validateConfig({ ...base, groups: [{ title: 'x' }] })).toThrow(
      /config\.groups\[0\]\.id/,
    );
    expect(() => validateConfig({ ...base, groups: [{ id: '' }] })).toThrow(
      /config\.groups\[0\]\.id/,
    );
    expect(() => validateConfig({ ...base, groups: [{ id: 'a', open: true }] })).toThrow(
      /config\.groups\[0\]/,
    );
    expect(() => validateConfig({ ...base, groups: [{ id: 'a', collapsed: 'no' }] })).toThrow(
      /config\.groups\[0\]\.collapsed/,
    );
    expect(() => validateConfig({ ...base, groups: [{ id: 'a' }, { id: 'a' }] })).toThrow(
      /config\.groups\[1\]\.id.*duplicate group/,
    );
    expect(() => validateConfig({ ...base, layers: [{ ...layer, group: 1 }] })).toThrow(
      /config\.layers\[0\]\.group/,
    );
    expect(() => validateConfig({ ...base, overlays: [{ ...wms, group: '' }] })).toThrow(
      /config\.overlays\[0\]\.group/,
    );
  });

  it('checks the group of runtime layers and overlays', () => {
    expect(() => validateLayerConfig({ ...layer, group: 'g' })).not.toThrow();
    expect(() => validateOverlayConfig({ ...wms, group: 2 })).toThrow(/overlay\.group/);
  });
});

describe('applyDefaults: groups', () => {
  it('defaults the title to the id and collapsed to false', () => {
    const resolved = applyDefaults({
      ...base,
      groups: [{ id: 'a' }, { id: 'b', title: 'B', collapsed: true }],
    });
    expect(resolved.groups).toEqual([
      { id: 'a', title: 'a', collapsed: false },
      { id: 'b', title: 'B', collapsed: true },
    ]);
    expect(applyDefaults(base).groups).toEqual([]);
  });

  it('keeps the members group', () => {
    const resolved = applyDefaults({
      ...base,
      layers: [{ ...layer, geometryType: 'Point', group: 'g' }],
      overlays: [{ id: 'o', type: 'wms', url: '/wms', params: { LAYERS: 'x' }, group: 'g' }],
    });
    expect(resolved.layers[0]!.group).toBe('g');
    expect(resolved.overlays[0]!.group).toBe('g');
  });
});
