export type * from './types';
export {
  ConfigError,
  validateConfig,
  validateBasemapConfig,
  validateLayerConfig,
  validateOverlayConfig,
  validateDiscoverConfig,
} from './validate';
export {
  applyDefaults,
  resolveBasemap,
  resolveEditable,
  resolveLayer,
  resolveOverlay,
  resolveGroup,
  DEFAULT_CENTER,
  DEFAULT_PROJECTION,
  DEFAULT_ZOOM,
} from './defaults';
