import { BasemapConfig, EditorConfig, LayerConfig, ResolvedBasemapConfig, ResolvedEditableConfig, ResolvedEditorConfig, ResolvedLayerConfig, ResolvedTextConfig } from './types';
export declare const DEFAULT_PROJECTION = "EPSG:3857";
export declare const DEFAULT_CENTER: [number, number];
export declare const DEFAULT_ZOOM = 2;
export declare function resolveBasemap(basemap: BasemapConfig): ResolvedBasemapConfig;
export declare function resolveEditable(editable: LayerConfig['editable']): ResolvedEditableConfig;
/** Defaults of a text layer (`layers[].text`). */
export declare const TEXT_DEFAULTS: ResolvedTextConfig;
/** The resolved text settings, or `undefined` for a layer that is not a text layer. */
export declare function resolveText(text: LayerConfig['text']): ResolvedTextConfig | undefined;
export declare function resolveLayer(layer: LayerConfig): ResolvedLayerConfig;
/** Fill in defaults. Expects a config that passed `validateConfig`. */
export declare function applyDefaults(config: EditorConfig): ResolvedEditorConfig;
