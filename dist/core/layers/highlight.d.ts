import { default as Feature } from 'ol/Feature';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as VectorSource } from 'ol/source/Vector';
import { default as Style } from 'ol/style/Style';
import { ResolvedLayerHighlightConfig } from '../config/types';
/** Layer property marking a layer-highlight overlay (`true`); not an editor layer. */
export declare const LAYER_HIGHLIGHT_PROPERTY = "olcad:layer-highlight";
/** Above the editor layers, below the selection overlay (1000) and tool previews (1001). */
export declare const LAYER_HIGHLIGHT_Z_INDEX = 999;
/** The style of a highlighted layer: a stroke, a fill and a filled circle for points. */
export declare function createLayerHighlightStyle(config: ResolvedLayerHighlightConfig): Style;
/**
 * The overlay of a highlighted layer. It shares the layer's own source, so added, removed,
 * edited, reloaded and reprojected features appear without any mirroring.
 */
export declare function createLayerHighlight(source: VectorSource<Feature>, config: ResolvedLayerHighlightConfig, visible: boolean): VectorLayer<VectorSource<Feature>>;
