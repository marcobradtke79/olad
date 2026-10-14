import { default as Feature } from 'ol/Feature';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as VectorSource } from 'ol/source/Vector';
/** Layer property marking a tool's preview layer (`true`); not an editor layer. */
export declare const PREVIEW_LAYER_PROPERTY = "olcad:preview";
/** Feature property marking a vertex marker on a preview layer (`'hover'` or `'picked'`). */
export declare const PREVIEW_VERTEX_PROPERTY = "olcad:vertex";
/**
 * The dashed preview layer tools draw their in-progress result on (the moved objects, the
 * displacement vector, the vertex being placed). Vertex markers are features carrying
 * `PREVIEW_VERTEX_PROPERTY`.
 */
export declare function createPreviewLayer(source: VectorSource<Feature>): VectorLayer<VectorSource<Feature>>;
