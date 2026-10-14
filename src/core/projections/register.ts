import { get as getProjection } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import { ConfigError } from '../config/validate';
import type { Proj4Instance, ProjectionConfig } from '../config/types';

/**
 * Register proj4 definitions with OpenLayers. Uses `instance`, else a global `proj4`
 * (script-tag usage). Throws `ConfigError` when definitions are given but no proj4 is available.
 */
export function registerProjections(
  projections: ProjectionConfig[],
  instance: Proj4Instance | undefined,
): void {
  if (projections.length === 0) return;
  const proj4 = instance ?? (globalThis as { proj4?: Proj4Instance }).proj4;
  if (!proj4) {
    throw new ConfigError(
      'config.projections',
      'proj4 is required to register projections: pass it as config.proj4 or load it as a global',
    );
  }
  for (const { code, def } of projections) proj4.defs(code, def);
  register(proj4);
  for (const { code } of projections) {
    if (!getProjection(code)) {
      throw new ConfigError('config.projections', `projection "${code}" could not be registered`);
    }
  }
}
