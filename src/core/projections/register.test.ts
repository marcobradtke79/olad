import { get as getProjection } from 'ol/proj';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { registerProjections } from './register';

describe('registerProjections', () => {
  it('does nothing for an empty list', () => {
    expect(() => registerProjections([], undefined)).not.toThrow();
  });

  it('throws when proj4 is missing', () => {
    expect(() =>
      registerProjections([{ code: 'EPSG:31467', def: '+proj=tmerc' }], undefined),
    ).toThrow('config.projections');
  });

  it('registers definitions with OpenLayers', () => {
    registerProjections(
      [{ code: 'EPSG:25833', def: '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs' }],
      proj4,
    );
    expect(getProjection('EPSG:25833')).not.toBeNull();
    expect(getProjection('EPSG:25833')!.getUnits()).toBe('m');
  });

  it('uses a global proj4 when none is passed', () => {
    (globalThis as { proj4?: typeof proj4 }).proj4 = proj4;
    try {
      registerProjections(
        [{ code: 'EPSG:25834', def: '+proj=utm +zone=34 +ellps=GRS80 +units=m +no_defs' }],
        undefined,
      );
      expect(getProjection('EPSG:25834')).not.toBeNull();
    } finally {
      delete (globalThis as { proj4?: typeof proj4 }).proj4;
    }
  });
});
