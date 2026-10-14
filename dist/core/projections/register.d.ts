import { Proj4Instance, ProjectionConfig } from '../config/types';
/**
 * Register proj4 definitions with OpenLayers. Uses `instance`, else a global `proj4`
 * (script-tag usage). Throws `ConfigError` when definitions are given but no proj4 is available.
 */
export declare function registerProjections(projections: ProjectionConfig[], instance: Proj4Instance | undefined): void;
