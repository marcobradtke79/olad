export type * from './types';
export {
  ConfigError,
  validateConfig,
  validateBasemapConfig,
  validateLayerConfig,
  validateOverlayConfig,
} from './validate';
export {
  applyDefaults,
  resolveBasemap,
  resolveEditable,
  resolveLayer,
  resolveOverlay,
  DEFAULT_CENTER,
  DEFAULT_PROJECTION,
  DEFAULT_ZOOM,
} from './defaults';
