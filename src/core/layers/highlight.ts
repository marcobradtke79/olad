import type Feature from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import type { ResolvedLayerHighlightConfig } from '../config/types';

/** Layer property marking a layer-highlight overlay (`true`); not an editor layer. */
export const LAYER_HIGHLIGHT_PROPERTY = 'olcad:layer-highlight';

/** Above the editor layers, below the selection overlay (1000) and tool previews (1001). */
export const LAYER_HIGHLIGHT_Z_INDEX = 999;

/** The style of a highlighted layer: a stroke, a fill and a filled circle for points. */
export function createLayerHighlightStyle(config: ResolvedLayerHighlightConfig): Style {
  const stroke = new Stroke({ color: config.strokeColor, width: config.strokeWidth });
  const fill = new Fill({ color: config.fillColor });
  return new Style({
    stroke,
    fill,
    image: new CircleStyle({ radius: config.pointRadius, stroke, fill }),
  });
}

/**
 * The overlay of a highlighted layer. It shares the layer's own source, so added, removed,
 * edited, reloaded and reprojected features appear without any mirroring.
 */
export function createLayerHighlight(
  source: VectorSource<Feature>,
  config: ResolvedLayerHighlightConfig,
  visible: boolean,
): VectorLayer<VectorSource<Feature>> {
  return new VectorLayer({
    source,
    style: createLayerHighlightStyle(config),
    zIndex: LAYER_HIGHLIGHT_Z_INDEX,
    visible,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    properties: { [LAYER_HIGHLIGHT_PROPERTY]: true },
  });
}
