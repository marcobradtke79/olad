import { default as Layer } from 'ol/layer/Layer';
/** OpenLayers layer filter: only the editor's vector layers take part in hit detection. */
export declare function isEditorLayer(layer: Layer): boolean;
