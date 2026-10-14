import type {
  BasemapConfig,
  EditorConfig,
  LayerConfig,
  ResolvedBasemapConfig,
  ResolvedEditableConfig,
  ResolvedEditorConfig,
  ResolvedLayerConfig,
  ResolvedTextConfig,
} from './types';

export const DEFAULT_PROJECTION = 'EPSG:3857';
export const DEFAULT_CENTER: [number, number] = [0, 0];
export const DEFAULT_ZOOM = 2;

export function resolveBasemap(basemap: BasemapConfig): ResolvedBasemapConfig {
  return { ...basemap, title: basemap.title ?? basemap.id, visible: basemap.visible ?? false };
}

export function resolveEditable(editable: LayerConfig['editable']): ResolvedEditableConfig {
  if (editable === true) return { insert: true, update: true, delete: true };
  if (!editable) return { insert: false, update: false, delete: false };
  return {
    insert: editable.insert ?? false,
    update: editable.update ?? false,
    delete: editable.delete ?? false,
    ...(editable.predicate ? { predicate: editable.predicate } : {}),
  };
}

/** Defaults of a text layer (`layers[].text`). */
export const TEXT_DEFAULTS: ResolvedTextConfig = {
  property: 'text',
  heightProperty: 'textHeight',
  rotationProperty: 'textRotation',
  height: 2.5,
  color: '#111827',
  haloColor: 'rgba(255, 255, 255, 0.85)',
  font: 'sans-serif',
};

/** The resolved text settings, or `undefined` for a layer that is not a text layer. */
export function resolveText(text: LayerConfig['text']): ResolvedTextConfig | undefined {
  if (!text) return undefined;
  return { ...TEXT_DEFAULTS, ...(text === true ? {} : text) };
}

export function resolveLayer(layer: LayerConfig): ResolvedLayerConfig {
  const format = layer.source.format ?? 'geojson';
  const defaultStrategy = format === 'wfs' || layer.source.loader ? 'bbox' : 'all';
  const { text, ...rest } = layer;
  const resolvedText = resolveText(text);
  return {
    ...rest,
    title: layer.title ?? layer.id,
    visible: layer.visible ?? true,
    editable: resolveEditable(layer.editable),
    snappable: layer.snappable ?? true,
    source: { ...layer.source, format, strategy: layer.source.strategy ?? defaultStrategy },
    ...(resolvedText ? { text: resolvedText } : {}),
  };
}

/** Fill in defaults. Expects a config that passed `validateConfig`. */
export function applyDefaults(config: EditorConfig): ResolvedEditorConfig {
  const basemaps = (config.basemaps ?? []).map(resolveBasemap);
  if (basemaps.length > 0 && !basemaps.some((b) => b.visible)) {
    basemaps[0]!.visible = true;
  }
  return {
    ...(config.target !== undefined ? { target: config.target } : {}),
    ...(config.map !== undefined ? { map: config.map } : {}),
    ...(config.proj4 !== undefined ? { proj4: config.proj4 } : {}),
    view: {
      ...config.view,
      projection: config.view?.projection ?? DEFAULT_PROJECTION,
      center: config.view?.center ?? DEFAULT_CENTER,
      zoom: config.view?.zoom ?? DEFAULT_ZOOM,
    },
    projections: (config.projections ?? []).map((p) => ({ ...p })),
    basemaps,
    layers: (config.layers ?? []).map(resolveLayer),
    editMode: config.editMode ?? false,
    cursor: {
      crosshair: true,
      pickBoxSize: 8,
      color: '#1f2933',
      pickColor: '#facc15',
      angle: 0,
      ...config.cursor,
    },
    changes: { fullFeatures: false, ...config.changes },
    locale: config.locale ?? 'en',
    messages: { ...config.messages },
    selection: {
      strokeColor: '#22d3ee',
      strokeWidth: 3,
      fillColor: 'rgba(34, 211, 238, 0.15)',
      pointRadius: 8,
      haloColor: 'rgba(255, 255, 255, 0.6)',
      haloWidth: 3,
      vertexSize: 6,
      inspect: true,
      ...config.selection,
    },
    layerHighlight: {
      strokeColor: '#f59e0b',
      strokeWidth: 3,
      fillColor: 'rgba(245, 158, 11, 0.2)',
      pointRadius: 7,
      ...config.layerHighlight,
    },
    snapping: {
      enabled: true,
      tolerancePx: 12,
      modes: ['vertex', 'midpoint', 'perpendicular'],
      ...config.snapping,
    },
    grid: {
      enabled: false,
      spacing: 10,
      visible: true,
      ...config.grid,
      origin: config.grid?.origin ? [config.grid.origin[0], config.grid.origin[1]] : [0, 0],
    },
    curves: { tolerance: 0.01, ...config.curves },
    units: { length: 'auto', ...config.units },
    constraints: {
      angle: { enabled: false, step: 90, ...config.constraints?.angle },
    },
    draft: { enabled: true, id: 'draft', title: 'Draft', ...config.draft },
  };
}
