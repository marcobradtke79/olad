export type * from './types';
export {
  ConfigError,
  validateConfig,
  validateBasemapConfig,
  validateLayerConfig,
} from './validate';
export {
  applyDefaults,
  resolveBasemap,
  resolveEditable,
  resolveLayer,
  DEFAULT_CENTER,
  DEFAULT_PROJECTION,
  DEFAULT_ZOOM,
} from './defaults';
