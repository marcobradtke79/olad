import type Layer from 'ol/layer/Layer';
import { LAYER_ID_PROPERTY } from '../layers/vector';

/** OpenLayers layer filter: only the editor's vector layers take part in hit detection. */
export function isEditorLayer(layer: Layer): boolean {
  return layer.get(LAYER_ID_PROPERTY) !== undefined;
}
