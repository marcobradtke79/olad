import { BasemapConfig, EditorConfig, LayerConfig } from './types';
/** Thrown by `createEditor` when the configuration is invalid. `path` names the offending option. */
export declare class ConfigError extends Error {
    readonly path: string;
    constructor(path: string, message: string);
}
/** Validate one basemap config, for example before `editor.basemaps.add`. */
export declare function validateBasemapConfig(basemap: unknown, path?: string): asserts basemap is BasemapConfig;
/** Validate one layer config, for example before `editor.layers.add`. */
export declare function validateLayerConfig(layer: unknown, path?: string): asserts layer is LayerConfig;
/**
 * Validate an editor configuration. Throws `ConfigError` naming the offending path.
 * Does not mutate the input.
 */
export declare function validateConfig(config: unknown): asserts config is EditorConfig;
